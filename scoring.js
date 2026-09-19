'use strict';

// Estado de puntuación avanzada. `resetScoring()` se llama desde init().
let combo = -1;              // -1 = sin racha; se incrementa en cada línea limpiada
let b2bActive = false;       // true si la última limpieza "difícil" (tetris/T-spin) sigue activa
let lastMoveWasRotation = false; // para detectar T-spin: solo cuenta si el último movimiento fue rotar

function resetScoring() {
  combo = -1;
  b2bActive = false;
  lastMoveWasRotation = false;
}

function isCellBlocked(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return !!board[r][c];
}

// Detección aproximada de T-spin: la pieza debe ser una T, el último
// movimiento debe haber sido una rotación, y al menos 2 de las 4 esquinas del
// bounding box 3x3 deben estar ocupadas (3-4 = T-spin completo, 2 = mini).
function detectTSpin(piece) {
  if (!piece || piece.type !== 3 || !lastMoveWasRotation) return null;
  const { x, y } = piece;
  const corners = [
    isCellBlocked(y, x), isCellBlocked(y, x + 2),
    isCellBlocked(y + 2, x), isCellBlocked(y + 2, x + 2),
  ];
  const count = corners.filter(Boolean).length;
  if (count >= 3) return 'full';
  if (count === 2) return 'mini';
  return null;
}

// Se llama una vez por pieza bloqueada con el número de líneas eliminadas
// (puede ser 0) y el tipo de T-spin ya detectado (game.js lo calcula antes de
// clearLines(), porque clearLines desplaza filas y invalidaría las esquinas).
function registerLock(cleared, tspin) {
  let gained = 0;
  let isDifficult = false;
  let label = null;

  if (tspin) {
    const table = tspin === 'mini' ? [100, 200, 400] : [400, 800, 1200, 1600];
    gained = (table[Math.min(cleared, table.length - 1)] || 0) * level;
    isDifficult = cleared > 0;
    label = tspin === 'mini' ? 'T-SPIN MINI' : 'T-SPIN';
    if (cleared > 0) label += ` x${cleared}`;
    sfx('tspin');
  } else if (cleared > 0) {
    gained = (LINE_SCORES[cleared] || 0) * level;
    isDifficult = cleared === 4;
    if (cleared === 4) { label = 'TETRIS'; sfx('tetris'); }
    else sfx('line');
  }

  if (cleared > 0) {
    if (isDifficult && b2bActive) {
      gained = Math.floor(gained * 1.5);
      label = (label ? label + ' ' : '') + 'B2B';
    }
    b2bActive = isDifficult;

    combo++;
    if (combo > 0) {
      gained += 50 * combo * level;
      sfx('combo', combo);
      spawnFloatingText(`COMBO x${combo}`, '#7aa2f7');
    }

    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);

    if (cleared === 4) grantSinglePiece();
  } else {
    combo = -1;
    if (!tspin) b2bActive = false;
  }

  if (label) spawnFloatingText(label, '#ffd54f');

  if (gained) score += gained;

  if (cleared > 0 && isBoardEmpty()) {
    score += 2000 * level;
    spawnFloatingText('PERFECT CLEAR', '#81c784');
    sfx('perfect');
  }

  updateHUD();
}
