// Drawing only: the heist's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Flat shapes and canvas text: the room, the vision cones, the thief, the guards,
// the cameras, the loot, the smoke, and the HUD with its alarm meter and tool buttons.

import { COVER, EXIT, FIELD, FONT, PALETTE, TOOLS, VAULT, WALLS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };
const BUTTON = { width: 132, height: 40, gap: 10 };

function roundedRect(context, x, y, w, h, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const buttons = {
    smoke: { x: 0, y: 0, w: BUTTON.width, h: BUTTON.height },
    emp: { x: 0, y: 0, w: BUTTON.width, h: BUTTON.height },
  };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  /** Canvas pixels (what a pointer event reports) back into field coordinates. */
  function canvasToField(px, py) {
    return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
  }

  function drawCone(cone) {
    if (cone.off) return;
    const hot = cone.hot;
    context.beginPath();
    context.moveTo(cone.x, cone.y);
    context.arc(cone.x, cone.y, cone.range, cone.angle - cone.half, cone.angle + cone.half);
    context.closePath();
    context.fillStyle = cone.kind === 'guard' ? (hot ? 'rgba(229, 83, 75, 0.34)' : PALETTE.guardCone) : (hot ? 'rgba(242, 201, 76, 0.30)' : PALETTE.cameraCone);
    context.fill();
    context.strokeStyle = cone.kind === 'guard' ? PALETTE.guardConeEdge : PALETTE.cameraConeEdge;
    context.lineWidth = 1.5;
    context.stroke();
  }

  function drawRoom(state) {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, FIELD.hudHeight, FIELD.width, FIELD.height - FIELD.hudHeight);
    context.fillStyle = PALETTE.floorTile;
    for (let x = 16; x < FIELD.width; x += 64) {
      for (let y = FIELD.hudHeight + 16; y < FIELD.height; y += 64) {
        if (((x + y) / 64) % 2 === 0) context.fillRect(x, y, 60, 60);
      }
    }
    // The vault alcove: dark stone, gold trim, and the pedestal the Diamond sits on.
    context.fillStyle = PALETTE.vault;
    context.fillRect(VAULT.x - 40, 80, VAULT.w + 80, 64);
    context.strokeStyle = PALETTE.vaultTrim;
    context.lineWidth = 2;
    context.strokeRect(VAULT.x - 40, 80, VAULT.w + 80, 64);
    context.fillStyle = PALETTE.wallTop;
    context.fillRect(VAULT.x, VAULT.y, VAULT.w, VAULT.h);
    // The exit door at the bottom: grey shut, green and glowing once the Diamond is taken.
    context.fillStyle = state.exitOpen ? PALETTE.exitOpen : PALETTE.exitClosed;
    context.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    if (state.exitOpen) {
      context.fillStyle = 'rgba(88, 214, 141, 0.25)';
      context.fillRect(EXIT.x - 12, EXIT.y - 26, EXIT.w + 24, 26);
      text('EXIT', EXIT.x + EXIT.w / 2, EXIT.y - 6, 15, PALETTE.exitOpen, 'center');
    }
    for (const wall of WALLS) {
      context.fillStyle = PALETTE.wall;
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.fillStyle = PALETTE.wallTop;
      context.fillRect(wall.x, wall.y, wall.w, 3);
    }
    for (const block of COVER) {
      if (block.kind === 'case') {
        context.fillStyle = PALETTE.caseTrim;
        context.fillRect(block.x, block.y, block.w, block.h);
        context.fillStyle = PALETTE.caseGlass;
        context.fillRect(block.x + 4, block.y + 4, block.w - 8, block.h - 8);
      } else if (block.kind === 'crate') {
        context.fillStyle = PALETTE.crate;
        context.fillRect(block.x, block.y, block.w, block.h);
        context.strokeStyle = '#4a3a22';
        context.lineWidth = 2;
        context.strokeRect(block.x + 5, block.y + 5, block.w - 10, block.h - 10);
      } else {
        context.fillStyle = PALETTE.plant;
        context.beginPath();
        context.arc(block.x + block.w / 2, block.y + block.h / 2, block.w / 2, 0, Math.PI * 2);
        context.fill();
      }
    }
    for (const piece of state.loot) {
      if (piece.taken) continue;
      if (piece.kind === 'diamond') {
        context.fillStyle = PALETTE.diamond;
        context.beginPath();
        context.moveTo(piece.x, piece.y - 14);
        context.lineTo(piece.x + 12, piece.y);
        context.lineTo(piece.x, piece.y + 14);
        context.lineTo(piece.x - 12, piece.y);
        context.closePath();
        context.fill();
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(piece.x - 4, piece.y - 5, 2.5, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = PALETTE.gold;
        context.fillRect(piece.x - 13, piece.y - 7, 26, 14);
        context.fillStyle = '#ffe27a';
        context.fillRect(piece.x - 13, piece.y - 7, 26, 4);
      }
    }
    text('VAULT', 640, 168, 13, PALETTE.vaultTrim, 'center');
  }

  function drawActors(state) {
    for (const cone of state.cones) drawCone(cone);
    if (state.smoke) {
      context.fillStyle = PALETTE.smoke;
      context.beginPath();
      context.arc(state.smoke.x, state.smoke.y, state.smoke.radius, 0, Math.PI * 2);
      context.fill();
    }
    for (const camera of state.cameras) {
      context.fillStyle = state.empTimer > 0 ? PALETTE.cameraOff : PALETTE.camera;
      context.fillRect(camera.x - 9, camera.y - 9, 18, 18);
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(camera.x + Math.cos(camera.angle) * 5, camera.y + Math.sin(camera.angle) * 5, 3, 0, Math.PI * 2);
      context.fill();
      if (camera.seesThief) text('!', camera.x, camera.y - 16, 22, PALETTE.alarmHigh, 'center');
    }
    for (const guard of state.guards) {
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#7a1f1a';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.lineTo(guard.x + Math.cos(guard.angle) * 18, guard.y + Math.sin(guard.angle) * 18);
      context.stroke();
      text(guard.name, guard.x, guard.y - 22, 12, PALETTE.muted, 'center');
      if (guard.seesThief) text('!', guard.x, guard.y - 36, 24, PALETTE.alarmHigh, 'center');
    }
    const thief = state.thief;
    context.fillStyle = PALETTE.thief;
    context.beginPath();
    context.arc(thief.x, thief.y, thief.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.thiefRing;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(thief.x, thief.y, thief.radius + 3, 0, Math.PI * 2);
    context.stroke();
    text('ROOK', thief.x, thief.y - 22, 12, PALETTE.thief, 'center');
  }

  function drawToolButton(button, label, sub, affordable, active) {
    context.fillStyle = active ? PALETTE.buttonHot : PALETTE.button;
    roundedRect(context, button.x, button.y, button.w, button.h, 7);
    context.fill();
    context.strokeStyle = affordable || active ? PALETTE.text : PALETTE.muted;
    context.lineWidth = 1.5;
    roundedRect(context, button.x, button.y, button.w, button.h, 7);
    context.stroke();
    text(label, button.x + button.w / 2, button.y + 17, 15, affordable || active ? PALETTE.text : PALETTE.muted, 'center');
    text(sub, button.x + button.w / 2, button.y + 33, 12, PALETTE.muted, 'center');
  }

  function drawHud(state) {
    context.fillStyle = PALETTE.hud;
    context.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
    context.fillStyle = PALETTE.hudLine;
    context.fillRect(0, FIELD.hudHeight - 2, FIELD.width, 2);
    text('MIDNIGHT VAULT', 20, 26, 22, PALETTE.text, 'left');
    text(state.diamondTaken ? 'Get to the EXIT!' : 'Steal the Diamond, then reach the EXIT', 20, 48, 13, PALETTE.muted, 'left');
    // The alarm meter: the number that decides whether Rook gets caught.
    const alarmX = 470;
    const alarmW = 300;
    const alarmRatio = state.alarm / 100;
    text('ALARM', alarmX, 22, 14, state.alarm > 55 ? PALETTE.alarmHigh : PALETTE.text, 'left');
    context.fillStyle = PALETTE.alarmTrack;
    roundedRect(context, alarmX, 28, alarmW, 16, 8);
    context.fill();
    context.fillStyle = state.alarm > 55 ? PALETTE.alarmHigh : PALETTE.alarmLow;
    if (alarmRatio > 0) {
      roundedRect(context, alarmX, 28, Math.max(16, alarmW * alarmRatio), 16, 8);
      context.fill();
    }
    text(`${Math.floor(state.alarm)}%`, alarmX + alarmW + 10, 43, 15, state.alarm > 55 ? PALETTE.alarmHigh : PALETTE.text, 'left');
    text(state.seen ? 'SPOTTED!' : 'hidden', alarmX, 58, 12, state.seen ? PALETTE.alarmHigh : PALETTE.muted, 'left');
    text(`Score ${state.score}`, 850, 26, 17, PALETTE.text, 'left');
    text(`Coins ${state.coins}`, 850, 48, 14, PALETTE.gold, 'left');
    buttons.smoke.x = 1000;
    buttons.smoke.y = 12;
    buttons.emp.x = 1000 + BUTTON.width + BUTTON.gap;
    buttons.emp.y = 12;
    const smokeActive = state.smoke !== null;
    const empActive = state.empTimer > 0;
    drawToolButton(buttons.smoke, '[1] SMOKE', smokeActive ? `${Math.ceil(state.smoke.t)}s` : `${TOOLS.smoke.cost} coins`, state.coins >= TOOLS.smoke.cost, smokeActive);
    drawToolButton(buttons.emp, '[2] EMP', empActive ? `${Math.ceil(state.empTimer)}s` : `${TOOLS.emp.cost} coins`, state.coins >= TOOLS.emp.cost, empActive);
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.hudLine;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  /** Paint one frame: the room, the actors, the HUD, then a panel for the screen. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawRoom(state);
    drawActors(state);
    drawHud(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('MIDNIGHT VAULT', ['Slip past the guards and the cameras.', 'Grab the Diamond, then get out the door.', 'Move with WASD or arrows. Tools: 1 Smoke, 2 EMP.', `Best getaway: ${best}`], 'Press Space or click to start');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The patrols are waiting.'], 'Press P to resume');
    } else if (screen === SCREEN_CAUGHT) {
      drawPanel('CAUGHT!', [`The alarm hit 100%. Score ${state.score}.`, `Best getaway: ${best}`], 'Press Space or click to try again');
    } else if (screen === SCREEN_WIN) {
      drawPanel('GETAWAY!', [`Rook escaped with the Diamond. Score ${state.score}.`, `Best getaway: ${best}`], 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, canvasToField, toolButtons: () => buttons };
}
