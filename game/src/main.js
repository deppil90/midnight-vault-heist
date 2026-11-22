// Boot and the one loop: input is read every frame, the heist advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, caught and getaway.
//
// ?seed=N fixes the patrol timings. ?shot=start|play|win|caught (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createHeist, EVENT_CAUGHT, EVENT_ESCAPED, EVENT_LOOT } from './world.js';
import { ACTION_CONFIRM, ACTION_EMP, ACTION_PAUSE, ACTION_SMOKE, createInput } from './input.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const heist = createHeist(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, heist);
  let painted = 0;
  function paint() {
    renderer.draw(heist.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each catch.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    heist.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Steal the Diamond, then reach the exit.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_CAUGHT;
    if (heist.state.score > best) {
      best = heist.state.score;
      saveBest(best);
    }
    announce(won ? `Getaway! Score ${heist.state.score}. Best ${best}.` : `Caught! Score ${heist.state.score}. Best ${best}.`);
  }

  function handleClicks() {
    const buttons = renderer.toolButtons();
    for (const click of input.takeClicks()) {
      const field = renderer.canvasToField(click.x, click.y);
      if (screen !== SCREEN_PLAY) continue;
      if (field.x >= buttons.smoke.x && field.x <= buttons.smoke.x + buttons.smoke.w && field.y >= buttons.smoke.y && field.y <= buttons.smoke.y + buttons.smoke.h) {
        heist.step(0, { x: 0, y: 0 }, true, false);
      } else if (field.x >= buttons.emp.x && field.x <= buttons.emp.x + buttons.emp.w && field.y >= buttons.emp.y && field.y <= buttons.emp.y + buttons.emp.h) {
        heist.step(0, { x: 0, y: 0 }, false, true);
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return actions;
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      heist.step(STEP, { x: 0, y: 0 }, false, false);
      return;
    }
    const events = heist.step(
      STEP,
      input.steer(),
      Boolean(actions & ACTION_SMOKE),
      Boolean(actions & ACTION_EMP),
    );
    if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_CAUGHT) endGame(false);
    else if (events & EVENT_LOOT) {
      announce(heist.state.diamondTaken ? 'Diamond taken. Get to the exit!' : `Loot taken. ${heist.state.coins} coins.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    handleClicks();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      // One-shot presses belong to the first step of the frame only: a tool bought once
      // must never be charged twice because a slow frame ran two steps.
      let firstStep = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(heist.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the alarm fill unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
