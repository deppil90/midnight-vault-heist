// The heist's rules and state, with no drawing and no browser in it: Rook the thief, the
// patrolling guards and sweeping cameras, what their cones can see, the alarm, the loot and
// the tools, and the getaway. step() advances one fixed step and returns what happened as
// bit flags, so the caller can react without the world knowing about screens or sound.

import {
  ALARM,
  CAMERA,
  CAMERAS,
  COVER,
  EXIT,
  FIELD,
  GUARD,
  GUARDS,
  LOOT,
  LOOT_SPOTS,
  THIEF,
  TOOLS,
  VAULT,
  WALLS,
} from './config.js';

export const EVENT_LOOT = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_TOOL = 8;

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

function segmentHitsRect(ax, ay, bx, by, rect) {
  if (ax >= rect.x && ax <= rect.x + rect.w && ay >= rect.y && ay <= rect.y + rect.h) return true;
  if (bx >= rect.x && bx <= rect.x + rect.w && by >= rect.y && by <= rect.y + rect.h) return true;
  const x2 = rect.x + rect.w;
  const y2 = rect.y + rect.h;
  return (
    segmentsCross(ax, ay, bx, by, rect.x, rect.y, x2, rect.y) ||
    segmentsCross(ax, ay, bx, by, x2, rect.y, x2, y2) ||
    segmentsCross(ax, ay, bx, by, x2, y2, rect.x, y2) ||
    segmentsCross(ax, ay, bx, by, rect.x, y2, rect.x, rect.y)
  );
}

function segmentHitsCircle(ax, ay, bx, by, cx, cy, radius) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(cx - ax, cy - ay) < radius;
  const t = clamp(((cx - ax) * dx + (cy - ay) * dy) / lengthSquared, 0, 1);
  const nearestX = ax + t * dx;
  const nearestY = ay + t * dy;
  return Math.hypot(cx - nearestX, cy - nearestY) < radius;
}

function circleHitsRects(x, y, radius, rects) {
  for (const rect of rects) {
    const nearestX = clamp(x, rect.x, rect.x + rect.w);
    const nearestY = clamp(y, rect.y, rect.y + rect.h);
    if (Math.hypot(x - nearestX, y - nearestY) < radius) return true;
  }
  return false;
}

/** Slide a circle along the walls: try x, then y, keeping whichever move stays clear. */
function slideCircle(body, dx, dy, radius) {
  const nextX = body.x + dx;
  if (!circleHitsRects(nextX, body.y, radius, WALLS) && !circleHitsRects(nextX, body.y, radius, COVER)) {
    body.x = nextX;
  }
  const nextY = body.y + dy;
  if (!circleHitsRects(body.x, nextY, radius, WALLS) && !circleHitsRects(body.x, nextY, radius, COVER)) {
    body.y = nextY;
  }
}

export function createHeist(random) {
  const thief = { x: THIEF.startX, y: THIEF.startY, radius: THIEF.radius };
  const guards = GUARDS.map((spec) => ({
    name: spec.name,
    waypoints: spec.waypoints,
    target: 1,
    x: spec.waypoints[0].x,
    y: spec.waypoints[0].y,
    angle: Math.PI / 2,
    seesThief: false,
  }));
  const cameras = CAMERAS.map((spec) => ({
    name: spec.name,
    x: spec.x,
    y: spec.y,
    baseAngle: spec.baseAngle,
    sweep: spec.sweep,
    angle: spec.baseAngle,
    seesThief: false,
  }));
  const loot = LOOT_SPOTS.map((spot) => ({ kind: spot.kind, x: spot.x, y: spot.y, taken: false }));
  const state = {
    thief,
    guards,
    cameras,
    loot,
    cones: [],
    alarm: 0,
    coins: 0,
    score: 0,
    elapsed: 0,
    smoke: null,
    empTimer: 0,
    diamondTaken: false,
    exitOpen: false,
    seen: false,
    status: 'playing',
  };

  function reset() {
    thief.x = THIEF.startX;
    thief.y = THIEF.startY;
    for (let index = 0; index < guards.length; index += 1) {
      guards[index].x = GUARDS[index].waypoints[0].x;
      guards[index].y = GUARDS[index].waypoints[0].y;
      guards[index].target = 1;
      guards[index].angle = Math.PI / 2;
      guards[index].seesThief = false;
    }
    for (let index = 0; index < cameras.length; index += 1) {
      cameras[index].angle = CAMERAS[index].baseAngle;
      cameras[index].seesThief = false;
    }
    for (const piece of loot) piece.taken = false;
    state.cones = [];
    state.alarm = 0;
    state.coins = 0;
    state.score = 0;
    state.elapsed = 0;
    state.smoke = null;
    state.empTimer = 0;
    state.diamondTaken = false;
    state.exitOpen = false;
    state.seen = false;
    state.status = 'playing';
  }

  /** A straight look from an eye to the thief: inside the cone, in range, and no wall,
   *  no cover and no smoke in the way. */
  function eyeSeesThief(eyeX, eyeY, angle, range, halfAngle) {
    const dx = thief.x - eyeX;
    const dy = thief.y - eyeY;
    const distance = Math.hypot(dx, dy);
    if (distance > range) return false;
    if (Math.abs(angleDifference(Math.atan2(dy, dx), angle)) > halfAngle) return false;
    for (const wall of WALLS) if (segmentHitsRect(eyeX, eyeY, thief.x, thief.y, wall)) return false;
    for (const block of COVER) if (segmentHitsRect(eyeX, eyeY, thief.x, thief.y, block)) return false;
    if (state.smoke && segmentHitsCircle(eyeX, eyeY, thief.x, thief.y, state.smoke.x, state.smoke.y, state.smoke.radius)) return false;
    return true;
  }

  function stepGuard(guard, dt) {
    if (guard.seesThief) {
      // A guard that has Rook in its cone closes in; Rook is faster, so it stays escapable.
      const dx = thief.x - guard.x;
      const dy = thief.y - guard.y;
      const distance = Math.hypot(dx, dy) || 1;
      guard.angle = Math.atan2(dy, dx);
      slideCircle(guard, (dx / distance) * GUARD.chaseSpeed * dt, (dy / distance) * GUARD.chaseSpeed * dt, GUARD.radius);
      return;
    }
    const goal = guard.waypoints[guard.target];
    const dx = goal.x - guard.x;
    const dy = goal.y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) {
      guard.target = (guard.target + 1) % guard.waypoints.length;
      return;
    }
    guard.angle = Math.atan2(dy, dx);
    slideCircle(guard, (dx / distance) * GUARD.speed * dt, (dy / distance) * GUARD.speed * dt, GUARD.radius);
  }

  function spendTool(tool) {
    if (state.status !== 'playing') return false;
    if (state.coins < tool.cost) return false;
    state.coins -= tool.cost;
    return true;
  }

  /**
   * One fixed step. `steer` is the normalised movement vector; `smoke` and `emp` ask for a
   * tool this step. Returns EVENT_* flags for the caller.
   */
  function step(dt, steer, smoke, emp) {
    let events = 0;
    if (state.status !== 'playing') return events;
    state.elapsed += dt;

    if (smoke && spendTool(TOOLS.smoke)) {
      state.smoke = { x: thief.x, y: thief.y, radius: TOOLS.smoke.radius, t: TOOLS.smoke.seconds };
      events |= EVENT_TOOL;
    }
    if (emp && spendTool(TOOLS.emp)) {
      state.empTimer = TOOLS.emp.seconds;
      events |= EVENT_TOOL;
    }
    if (state.smoke) {
      state.smoke.t -= dt;
      if (state.smoke.t <= 0) state.smoke = null;
    }
    if (state.empTimer > 0) state.empTimer = Math.max(0, state.empTimer - dt);

    const length = Math.hypot(steer.x, steer.y) || 1;
    slideCircle(thief, (steer.x / length) * THIEF.speed * dt, (steer.y / length) * THIEF.speed * dt, THIEF.radius);
    // Rook stays inside the room: the door is the only way out, and the getaway below
    // claims the win before Rook can wander off the bottom of the field.
    thief.x = clamp(thief.x, THIEF.radius, FIELD.width - THIEF.radius);
    thief.y = clamp(thief.y, FIELD.hudHeight + THIEF.radius, FIELD.height - 8);

    // The eyes first: what every guard and camera sees this step decides the alarm.
    state.seen = false;
    state.cones = [];
    for (const guard of guards) {
      guard.seesThief = eyeSeesThief(guard.x, guard.y, guard.angle, GUARD.coneRange, GUARD.coneHalfAngle);
      if (guard.seesThief) state.seen = true;
      state.cones.push({ kind: 'guard', x: guard.x, y: guard.y, angle: guard.angle, range: GUARD.coneRange, half: GUARD.coneHalfAngle, hot: guard.seesThief, off: false });
    }
    for (const camera of cameras) {
      camera.angle = camera.baseAngle + Math.sin(state.elapsed * CAMERA.sweep) * camera.sweep;
      camera.seesThief = state.empTimer <= 0 && eyeSeesThief(camera.x, camera.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle);
      if (camera.seesThief) state.seen = true;
      state.cones.push({ kind: 'camera', x: camera.x, y: camera.y, angle: camera.angle, range: CAMERA.coneRange, half: CAMERA.coneHalfAngle, hot: camera.seesThief, off: state.empTimer > 0 });
    }

    for (const guard of guards) stepGuard(guard, dt);

    state.alarm = clamp(state.alarm + (state.seen ? ALARM.risePerSecond : -ALARM.fallPerSecond) * dt, 0, ALARM.caughtAt);
    if (state.alarm >= ALARM.caughtAt) {
      state.status = 'caught';
      return events | EVENT_CAUGHT;
    }

    for (const piece of loot) {
      if (piece.taken) continue;
      if (Math.hypot(thief.x - piece.x, thief.y - piece.y) > 34) continue;
      piece.taken = true;
      events |= EVENT_LOOT;
      if (piece.kind === 'diamond') {
        state.diamondTaken = true;
        state.exitOpen = true;
        state.score += LOOT.diamondPoints;
      } else {
        state.coins += LOOT.goldCoins;
        state.score += LOOT.goldPoints;
      }
    }

    if (state.diamondTaken && thief.x > EXIT.x && thief.x < EXIT.x + EXIT.w && thief.y > 700) {
      state.status = 'escaped';
      state.score += Math.max(0, LOOT.timeBonusStart - Math.floor(state.elapsed) * LOOT.timeBonusPerSecond);
      return events | EVENT_ESCAPED;
    }
    return events;
  }

  reset();
  return { state, reset, step, vault: VAULT, exit: EXIT };
}
