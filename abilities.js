'use strict';

const ABILITY_ENERGY_PER_LINE = 25;
const ABILITY_MAX_ENERGY = 100;

const ABILITIES = [
  { key: '1', name: 'Ver siguientes 5', apply: () => { showFullQueue = true; } },
  { key: '2', name: 'Intercambiar pieza actual', apply: () => { current = randomPiece(); } },
  { key: '3', name: 'Ralentizar 10s', apply: () => { slowTimer = 10000; } },
  { key: '4', name: 'Deshacer última colocación', apply: () => { undoLastLock(); } },
  { key: '5', name: 'Hold extra', apply: () => { holdUsed = false; } },
];

let energy = 0;
let showFullQueue = false;
let slowTimer = 0;
let lastSnapshot = null;
let abilityMenuOpen = false;

function resetAbilities() {
  energy = 0;
  showFullQueue = false;
  slowTimer = 0;
  lastSnapshot = null;
  abilityMenuOpen = false;
  updateEnergyHUD();
}

function gainEnergy(amount) {
  if (!amount) return;
  energy = Math.min(ABILITY_MAX_ENERGY, energy + amount);
  updateEnergyHUD();
}

function updateEnergyHUD() {
  if (energyFillEl) energyFillEl.style.width = `${energy}%`;
}

// Guarda una foto del estado justo antes de que la pieza actual se asiente,
// para poder deshacer la última colocación (una sola vez).
function takeSnapshot() {
  lastSnapshot = {
    board: board.map(row => [...row]),
    score, lines, level, combo, b2bActive,
    current: { type: current.type, shape: current.shape.map(r => [...r]), x: current.x, y: current.y, power: current.power },
  };
}

function undoLastLock() {
  if (!lastSnapshot) return;
  board = lastSnapshot.board.map(row => [...row]);
  score = lastSnapshot.score;
  lines = lastSnapshot.lines;
  level = lastSnapshot.level;
  combo = lastSnapshot.combo;
  b2bActive = lastSnapshot.b2bActive;
  current = { ...lastSnapshot.current, shape: lastSnapshot.current.shape.map(r => [...r]) };
  lastSnapshot = null;
  updateHUD();
}

function openAbilityMenu() {
  if (energy < ABILITY_MAX_ENERGY || gameOver || paused) return;
  abilityMenuOpen = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'HABILIDAD';
  overlayScore.innerHTML = ABILITIES.map(a => `${a.key}. ${a.name}`).join('<br>');
  overlay.classList.remove('hidden');
}

function chooseAbility(key) {
  const ability = ABILITIES.find(a => a.key === key);
  if (!ability) return;
  ability.apply();
  energy = 0;
  updateEnergyHUD();
  closeAbilityMenu();
  sfx('ability');
  spawnFloatingText(ability.name.toUpperCase(), '#7aa2f7');
}

function closeAbilityMenu() {
  abilityMenuOpen = false;
  overlay.classList.add('hidden');
  overlayScore.innerHTML = '';
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

function updateAbilityTimers(dt) {
  if (slowTimer > 0) slowTimer = Math.max(0, slowTimer - dt);
}
