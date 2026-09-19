'use strict';

const MODES = {
  marathon: { id: 'marathon', name: 'Maratón (clásico)' },

  sprint40: {
    id: 'sprint40',
    name: 'Sprint 40 líneas',
    setup() { sprintElapsed = 0; },
    onTick(dt) { sprintElapsed += dt; },
    winCheck() { return lines >= 40; },
  },

  garbage: {
    id: 'garbage',
    name: 'Basura ascendente',
    setup() { garbageTimer = 0; },
    onTick(dt) {
      garbageTimer += dt;
      if (garbageTimer >= 10000) {
        garbageTimer -= 10000;
        insertGarbageRow();
        if (collide(current.shape, current.x, current.y)) endGame();
      }
    },
  },

  preset: {
    id: 'preset',
    name: 'Bloques pre-colocados',
    setup() { seedPresetBlocks(); },
  },

  invisible: {
    id: 'invisible',
    name: 'Piezas invisibles',
    setup() { hideLocked = true; revealTimer = 0; },
    onTick(dt) { if (revealTimer > 0) revealTimer = Math.max(0, revealTimer - dt); },
    onLock() { revealTimer = 500; },
  },

  reverse: { id: 'reverse', name: 'Rotación inversa (nivel 5+)' },
};

let activeModeId = 'marathon';
let sprintElapsed = 0;
let garbageTimer = 0;
let hideLocked = false;
let revealTimer = 0;

function getActiveMode() {
  return MODES[activeModeId] || MODES.marathon;
}

function resetModeState() {
  hideLocked = false;
  revealTimer = 0;
  sprintElapsed = 0;
  garbageTimer = 0;
}

function setupMode() {
  resetModeState();
  const mode = getActiveMode();
  if (mode.setup) mode.setup();
}

function tickMode(dt) {
  const mode = getActiveMode();
  if (mode.onTick) mode.onTick(dt);
  if (mode.winCheck && mode.winCheck()) winGame();
}

function notifyModeLock() {
  const mode = getActiveMode();
  if (mode.onLock) mode.onLock();
}

function shouldRotateReversed() {
  return activeModeId === 'reverse' && level >= 5;
}

function insertGarbageRow() {
  const gapCol = Math.floor(Math.random() * COLS);
  const row = new Array(COLS).fill(GARBAGE_COLOR);
  row[gapCol] = 0;
  board.shift();
  board.push(row);
  // Sube la pieza en juego junto con la pila para que no quede enterrada de golpe.
  if (current) current.y = Math.max(0, current.y - 1);
  sfx('garbage');
}

function seedPresetBlocks() {
  const presetRows = 6;
  for (let r = ROWS - presetRows; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (Math.random() < 0.55) board[r][c] = GARBAGE_COLOR;

  // Deja siempre al menos un hueco por fila sembrada.
  for (let r = ROWS - presetRows; r < ROWS; r++)
    if (board[r].every(v => v)) board[r][Math.floor(Math.random() * COLS)] = 0;
}

function winGame() {
  if (gameOver) return;
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = '¡OBJETIVO CUMPLIDO!';
  overlayScore.textContent = activeModeId === 'sprint40'
    ? `Tiempo: ${(sprintElapsed / 1000).toFixed(1)}s · Puntuación: ${score.toLocaleString()}`
    : `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}
