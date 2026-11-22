// Midnight Vault: every tuning number, colour and the vault layout in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size. The top 64 pixels are the HUD bar; the
// heist itself plays in the room below it.

export const FIELD = { width: 1280, height: 720, hudHeight: 64 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Rook the thief: a circle that slips between the walls, fast enough to outrun a patrol. */
export const THIEF = {
  radius: 14,
  speed: 245,
  startX: 640,
  startY: 648,
};

/** A guard walks its waypoints and looks where it walks; its cone is what you must read. */
export const GUARD = {
  radius: 15,
  speed: 82,
  chaseSpeed: 132,
  coneRange: 245,
  coneHalfAngle: 0.66,
};

/** A camera sits on a wall and sweeps its cone back and forth, never blinking. */
export const CAMERA = {
  coneRange: 285,
  coneHalfAngle: 0.52,
  sweep: 0.7,
};

/** The alarm: how fast being seen fills it, how fast hiding drains it, and the caught line. */
export const ALARM = {
  risePerSecond: 36,
  fallPerSecond: 16,
  caughtAt: 100,
  guardChaseAbove: 55,
};

/** Tools, bought with coins from the side loot. Smoke blinds every eye near Rook; an EMP
 *  switches every camera off for a while. Both are spent from the same coin purse. */
export const TOOLS = {
  smoke: { key: 'Digit1', label: 'SMOKE', cost: 30, radius: 150, seconds: 5 },
  emp: { key: 'Digit2', label: 'EMP', cost: 50, seconds: 8 },
};

/** What each piece of loot is worth: coins buy tools, points win the night. */
export const LOOT = {
  goldCoins: 25,
  goldPoints: 50,
  diamondPoints: 200,
  timeBonusStart: 300,
  timeBonusPerSecond: 2,
};

/** Walls and cover, as rectangles {x, y, w, h}. The outer wall has one gap at the bottom:
 *  the door Rook slips in through, and the only way back out with the Diamond. */
export const WALLS = [
  { x: 0, y: 64, w: 1280, h: 16 }, // top wall
  { x: 0, y: 704, w: 592, h: 16 }, // bottom wall, left of the door
  { x: 688, y: 704, w: 592, h: 16 }, // bottom wall, right of the door
  { x: 0, y: 64, w: 16, h: 656 }, // left wall
  { x: 1264, y: 64, w: 16, h: 656 }, // right wall
  { x: 400, y: 200, w: 16, h: 320 }, // left corridor wall
  { x: 864, y: 200, w: 16, h: 320 }, // right corridor wall
  { x: 544, y: 80, w: 16, h: 100 }, // vault alcove, left jamb
  { x: 720, y: 80, w: 16, h: 100 }, // vault alcove, right jamb
];

/** Cover: crates and planters that block a guard's and a camera's line of sight. */
export const COVER = [
  { x: 500, y: 300, w: 92, h: 52, kind: 'case' },
  { x: 688, y: 300, w: 92, h: 52, kind: 'case' },
  { x: 560, y: 480, w: 120, h: 52, kind: 'case' },
  { x: 452, y: 560, w: 62, h: 62, kind: 'crate' },
  { x: 950, y: 560, w: 62, h: 62, kind: 'crate' },
  { x: 180, y: 560, w: 56, h: 56, kind: 'plant' },
  { x: 1044, y: 560, w: 56, h: 56, kind: 'plant' },
];

/** The patrols: each guard walks its waypoints in a loop, looking where it walks. */
export const GUARDS = [
  {
    name: 'Marlow',
    waypoints: [
      { x: 208, y: 180 },
      { x: 208, y: 620 },
    ],
  },
  {
    name: 'Petra',
    waypoints: [
      { x: 500, y: 440 },
      { x: 780, y: 440 },
    ],
  },
];

/** The cameras: fixed to a wall, sweeping their cone across the room. */
export const CAMERAS = [
  { name: 'Cam A', x: 880, y: 100, baseAngle: Math.PI * 0.75, sweep: 0.6 },
  { name: 'Cam B', x: 1262, y: 380, baseAngle: Math.PI, sweep: 0.55 },
];

/** The loot: three gold bars out in the open, and the Diamond in the vault alcove. */
export const LOOT_SPOTS = [
  { kind: 'gold', x: 260, y: 400 },
  { kind: 'gold', x: 836, y: 420 },
  { kind: 'gold', x: 640, y: 500 },
  { kind: 'diamond', x: 640, y: 118 },
];

/** The vault pedestal and the exit door, drawn and named so the plan is obvious. */
export const VAULT = { x: 600, y: 96, w: 80, h: 44 };
export const EXIT = { x: 592, y: 688, w: 96, h: 16 };

export const PALETTE = {
  backdrop: '#0b0d12',
  hud: '#141824',
  hudLine: '#2a3040',
  floor: '#1d2331',
  floorTile: '#232a3a',
  wall: '#3a4358',
  wallTop: '#4a5468',
  vault: '#2c2417',
  vaultTrim: '#f2c94c',
  caseGlass: '#31445e',
  caseTrim: '#5a6b8a',
  crate: '#6b5433',
  plant: '#2e5d3a',
  thief: '#4fc3f7',
  thiefRing: '#bfe9ff',
  guard: '#e5534b',
  guardCone: 'rgba(229, 83, 75, 0.20)',
  guardConeEdge: 'rgba(229, 83, 75, 0.55)',
  camera: '#e5534b',
  cameraCone: 'rgba(242, 201, 76, 0.16)',
  cameraConeEdge: 'rgba(242, 201, 76, 0.5)',
  cameraOff: '#5a6274',
  gold: '#f2c94c',
  diamond: '#7fe7ff',
  smoke: 'rgba(180, 188, 200, 0.55)',
  alarmLow: '#f2c94c',
  alarmHigh: '#e5534b',
  alarmTrack: '#2a3040',
  text: '#eef1f5',
  muted: '#8b93a3',
  panel: '#1a1f2c',
  button: '#252b38',
  buttonHot: '#31405e',
  exitClosed: '#5a6274',
  exitOpen: '#58d68d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best getaway score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault.best';
