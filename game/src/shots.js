// The screenshot scenes behind ?shot=start|play|win|caught. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot that
// follows waypoints, waits out a vision cone that covers its path, and spends a tool when a
// cone will not move, so the frame is what a short game really looks like and the same seed
// always gives the same frame. The win scene starts Rook with a staged purse of 150 coins,
// as if the gold bars were already pocketed, so the tools are there to spend.

import { STEP, TOOLS } from './config.js';
import { EVENT_CAUGHT, EVENT_ESCAPED } from './world.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 3;
const WIN_LIMIT_SECONDS = 300;
const CAUGHT_LIMIT_SECONDS = 120;

/** Waypoints from the door to the Diamond and back out: along the bottom, up the east
 *  lane past the crates, across the top hall, and in through the vault's south opening —
 *  a route that never asks Rook to slide around a wall's end. */
const TO_DIAMOND = [
  { x: 836, y: 650 },
  { x: 836, y: 250 },
  { x: 640, y: 250 },
  { x: 640, y: 118 },
];
const TO_EXIT = [
  { x: 640, y: 250 },
  { x: 836, y: 250 },
  { x: 836, y: 650 },
  { x: 640, y: 650 },
  { x: 640, y: 720 },
];

/** Is a point inside any live cone right now (a wall may still hide it; this is the pilot's
 *  rough read, and the world's own sight check has the last word). */
function pointInAnyCone(state, x, y) {
  for (const cone of state.cones) {
    if (cone.off) continue;
    const dx = x - cone.x;
    const dy = y - cone.y;
    if (Math.hypot(dx, dy) > cone.range) continue;
    let diff = Math.atan2(dy, dx) - cone.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < cone.half) return cone;
  }
  return null;
}

/** Steer toward a waypoint. Rook moves through a cone rather than around it: a sweeping
 *  cone covers any one spot for a second or two, so walking on costs less alarm than
 *  waiting in it, and backing away only herds Rook into the next cone. The one exception
 *  is a panic tool: when the alarm is already hot and a cone covers the next step, Rook
 *  spends smoke on a guard or an EMP on a camera as he keeps moving. Returns the steer
 *  vector and the tools to spend. */
function autopilot(state, waypoint) {
  const thief = state.thief;
  const dx = waypoint.x - thief.x;
  const dy = waypoint.y - thief.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 8) return { steer: { x: 0, y: 0 }, smoke: false, emp: false, arrived: true };
  const toward = { x: dx / distance, y: dy / distance };
  const blocking = pointInAnyCone(state, thief.x + toward.x * 24, thief.y + toward.y * 24);
  const panic = blocking && state.alarm > 60;
  return {
    steer: toward,
    smoke: panic && blocking.kind === 'guard' && state.coins >= TOOLS.smoke.cost,
    emp: panic && blocking.kind === 'camera' && state.coins >= TOOLS.emp.cost,
    arrived: false,
  };
}

/**
 * Set `world` to the named scene (start, play, win or caught; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'win' && name !== 'caught') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { x: 0, y: 0 }, false, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'caught') {
    // Walk Rook into Marlow's patrol lane and stand in the cone until the alarm fills.
    for (let index = 0; index < CAUGHT_LIMIT_SECONDS / STEP; index += 1) {
      const drive = autopilot(state, { x: 208, y: 400 });
      const events = world.step(STEP, drive.steer, false, false);
      if (events & EVENT_CAUGHT) return { screen: SCREEN_CAUGHT, best: state.score };
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === 'play') {
    state.coins = 0;
    let waypoint = 0;
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      const drive = autopilot(state, TO_DIAMOND[waypoint]);
      if (drive.arrived) waypoint = Math.min(waypoint + 1, TO_DIAMOND.length - 1);
      const events = world.step(STEP, drive.steer, drive.smoke, drive.emp);
      if (events & EVENT_CAUGHT) return { screen: SCREEN_CAUGHT, best: state.score };
      if (events & EVENT_ESCAPED) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  // Win: the full run, diamond then the door, with a staged purse for the tools.
  state.coins = 150;
  let route = TO_DIAMOND;
  let waypoint = 0;
  for (let index = 0; index < WIN_LIMIT_SECONDS / STEP; index += 1) {
    const drive = autopilot(state, route[waypoint]);
    if (drive.arrived) {
      waypoint += 1;
      if (waypoint >= route.length) {
        if (route === TO_DIAMOND) {
          route = TO_EXIT;
          waypoint = 0;
        } else {
          waypoint = route.length - 1;
        }
      }
    }
    const events = world.step(STEP, drive.steer, drive.smoke, drive.emp);
    if (events & EVENT_ESCAPED) return { screen: SCREEN_WIN, best: state.score };
    if (events & EVENT_CAUGHT) return { screen: SCREEN_PLAY, best: state.score };
  }
  return { screen: SCREEN_PLAY, best: state.score };
}
