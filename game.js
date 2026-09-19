'use strict';

// Estado global del tablero y de la partida. Las constantes (COLS, ROWS,
// PIECES, COLORS...) viven en config.js; el resto de módulos (board.js,
// pieces.js, scoring.js, powerups.js, abilities.js, modes.js) leen y escriben
// estas variables directamente, sin módulos ES, como scripts clásicos.
const themeToggleBtn = document.getElementById('theme-toggle');
const muteBtn = document.getElementById('mute-toggle');
const modeSelect = document.getElementById('mode-select');
const infoToggleBtn = document.getElementById('info-toggle');
const infoTooltip = document.getElementById('info-tooltip');

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboSection = document.getElementById('combo-section');
const comboEl = document.getElementById('combo');
const timerSection = document.getElementById('timer-section');
const timerEl = document.getElementById('timer');
const energyFillEl = document.getElementById('energy-fill');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');

let board, current, queue, hold, holdUsed;
let score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let currentTheme = 'dark';

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function updateMuteButton() {
  muteBtn.textContent = Audio_.isMuted() ? '🔇' : '🔊';
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastMoveWasRotation = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function tryRotate() {
  const rotate = shouldRotateReversed() ? rotateCCW : rotateCW;
  const rotated = rotate(current.shape);
  const kicks = [0, -1, 1, -2, 2, -3, 3];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastMoveWasRotation = true;
      sfx('rotate');
      return;
    }
  }
}

function lockPiece() {
  takeSnapshot();
  merge();
  applyPower(current);
  const tspin = detectTSpin(current);
  const cleared = clearLines();
  registerLock(cleared, tspin);
  gainEnergy(cleared * ABILITY_ENERGY_PER_LINE);
  notifyLinesForPowerup(cleared);
  notifyModeLock();
  holdUsed = false;
  sfx('lock');
  spawn();
}

function spawn() {
  current = queue.shift();
  refillQueue();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNextPanel();
}

function doHold() {
  if (holdUsed || gameOver || paused) return;
  sfx('hold');
  if (!hold) {
    hold = { ...current };
    current = queue.shift();
    refillQueue();
  } else {
    const swap = hold;
    hold = { type: current.type, shape: current.shape, x: current.x, y: current.y, power: current.power };
    current = swap;
  }
  resetPiecePosition(current);
  lastMoveWasRotation = false;
  holdUsed = true;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawHoldPanel();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  if (combo > 0) {
    comboSection.classList.remove('hidden');
    comboEl.textContent = `x${combo}`;
  } else {
    comboSection.classList.add('hidden');
  }
}

function updateTimerHUD() {
  if (activeModeId === 'sprint40') {
    timerSection.classList.remove('hidden');
    timerEl.textContent = `${(sprintElapsed / 1000).toFixed(1)}s`;
  } else {
    timerSection.classList.add('hidden');
  }
}

// ---- Dibujo ----

function paintCell(context, px, py, colorIndex, size, alpha, glyph) {
  if (!colorIndex) return;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = COLORS[colorIndex];
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(px + 1, py + 1, size - 2, 4);
  if (glyph) {
    context.fillStyle = '#fff';
    context.font = `${Math.floor(size * 0.6)}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(glyph, px + size / 2, py + size / 2 + 1);
  }
  context.globalAlpha = 1;
}

function drawBlock(context, x, y, colorIndex, size, alpha, glyph) {
  paintCell(context, x * size, y * size, colorIndex, size, alpha, glyph);
}

// Preview genérico centrado en un canvas cuadrado (hold, next, cola completa).
function drawPiecePreview(context, targetCanvas, shape, alpha) {
  context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  if (!shape) return;
  const dim = Math.max(4, shape.length, shape[0].length);
  const cell = targetCanvas.width / dim;
  const offX = (dim - shape[0].length) / 2;
  const offY = (dim - shape.length) / 2;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) paintCell(context, (offX + c) * cell, (offY + r) * cell, shape[r][c], cell, alpha);
}

function drawGrid() {
  ctx.strokeStyle = GRID_COLORS[currentTheme];
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // tablero (oculto en modo "piezas invisibles" salvo el destello tras bloquear)
  const showLocked = !hideLocked || revealTimer > 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (showLocked) drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // pieza actual (con glifo de power-up si lleva uno)
  const glyph = current.power ? POWER_GLYPHS[current.power] : null;
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK, 1, glyph);

  drawFx(ctx);
}

function drawNextPanel() {
  if (!showFullQueue) {
    drawPiecePreview(nextCtx, nextCanvas, queue[0].shape);
    return;
  }
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const count = Math.min(5, queue.length);
  const rowH = nextCanvas.height / count;
  for (let i = 0; i < count; i++) {
    const shape = queue[i].shape;
    const dim = Math.max(shape.length, shape[0].length);
    const cell = Math.min(rowH / dim, nextCanvas.width / dim);
    const offX = (nextCanvas.width - shape[0].length * cell) / 2;
    const offY = i * rowH + (rowH - shape.length * cell) / 2;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) paintCell(nextCtx, offX + c * cell, offY + r * cell, shape[r][c], cell);
  }
}

function drawHoldPanel() {
  drawPiecePreview(holdCtx, holdCanvas, hold ? hold.shape : null);
  holdCanvas.classList.toggle('locked', holdUsed && !!hold);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
  sfx('gameover');
}

function togglePause() {
  if (gameOver || abilityMenuOpen) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;

  updateFx(dt);
  updatePowerups(dt);
  updateAbilityTimers(dt);
  tickMode(dt);
  updateTimerHUD();
  if (gameOver) return; // tickMode pudo terminar la partida (sprint / basura)

  if (freezeTimer <= 0) {
    const effectiveInterval = slowTimer > 0 ? dropInterval * 2.5 : dropInterval;
    dropAccum += dt;
    if (dropAccum >= effectiveInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        lastMoveWasRotation = false;
      } else {
        lockPiece();
        if (gameOver) return;
      }
    }
  }

  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  activeModeId = modeSelect ? modeSelect.value : 'marathon';
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  hold = null;
  holdUsed = false;

  resetFx();
  resetScoring();
  resetPowerups();
  resetAbilities();
  setupMode(); // puede sembrar bloques (modo "preset") antes de generar piezas

  queue = createQueue();
  spawn();
  updateHUD();
  updateTimerHUD();
  drawHoldPanel();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (abilityMenuOpen) {
    if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
      chooseAbility(e.code.slice(-1));
    }
    return;
  }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'KeyM') { Audio_.toggleMute(); updateMuteButton(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) { current.x--; lastMoveWasRotation = false; sfx('move'); }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) { current.x++; lastMoveWasRotation = false; sfx('move'); }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      doHold();
      break;
    case 'KeyE':
      openAbilityMenu();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
themeToggleBtn.addEventListener('click', toggleTheme);
muteBtn.addEventListener('click', () => { Audio_.toggleMute(); updateMuteButton(); });
if (modeSelect) modeSelect.addEventListener('change', init);

infoToggleBtn.addEventListener('click', e => {
  e.stopPropagation();
  infoTooltip.classList.toggle('hidden');
});
document.addEventListener('click', e => {
  if (!infoTooltip.classList.contains('hidden') && !infoTooltip.contains(e.target) && e.target !== infoToggleBtn) {
    infoTooltip.classList.add('hidden');
  }
});

initTheme();
updateMuteButton();
init();
