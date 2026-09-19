'use strict';

const POWER_TYPES = ['bomb', 'bolt', 'dye', 'gravity', 'freeze'];
const POWER_GLYPHS = { bomb: '💣', bolt: '⚡', dye: '🎨', gravity: '⬇', freeze: '❄' };

let linesUntilPowerup = POWERUP_EVERY;
let powerupPending = false;
let freezeTimer = 0;

function resetPowerups() {
  linesUntilPowerup = POWERUP_EVERY;
  powerupPending = false;
  freezeTimer = 0;
}

// Cuenta líneas hacia el siguiente power-up; llamado desde lockPiece() con el
// número de líneas que se acaban de limpiar.
function notifyLinesForPowerup(cleared) {
  if (!cleared) return;
  linesUntilPowerup -= cleared;
  if (linesUntilPowerup <= 0) {
    powerupPending = true;
    linesUntilPowerup += POWERUP_EVERY;
  }
}

// Solo las piezas estándar (1-7) pueden llevar power-up.
function maybeAssignPower(piece) {
  if (powerupPending && piece.type <= 7) {
    piece.power = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
    powerupPending = false;
  }
}

// Aplica el efecto de la pieza recién bloqueada. Se llama tras merge() y
// antes de clearLines(), usando la posición de la pieza para anclar el efecto.
function applyPower(piece) {
  if (!piece.power) return;
  const cx = piece.x + Math.floor(piece.shape[0].length / 2);
  const cy = piece.y + Math.floor(piece.shape.length / 2);
  const flashed = [];

  switch (piece.power) {
    case 'bomb':
      for (let r = cy - 1; r <= cy + 1; r++)
        for (let c = cx - 1; c <= cx + 1; c++)
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c]) {
            board[r][c] = 0;
            flashed.push([r, c]);
          }
      spawnFloatingText('BOMBA', '#e57373');
      break;
    case 'bolt':
      if (cy >= 0 && cy < ROWS)
        for (let c = 0; c < COLS; c++)
          if (board[cy][c]) { board[cy][c] = 0; flashed.push([cy, c]); }
      for (let r = 0; r < ROWS; r++)
        if (cx >= 0 && cx < COLS && board[r][cx]) { board[r][cx] = 0; flashed.push([r, cx]); }
      spawnFloatingText('RAYO', '#64b5f6');
      break;
    case 'dye': {
      const targetColor = (cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS) ? board[cy][cx] : 0;
      if (targetColor) {
        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++)
            if (board[r][c] === targetColor) { board[r][c] = WILD_COLOR; flashed.push([r, c]); }
      }
      spawnFloatingText('TINTE', '#eeeeee');
      break;
    }
    case 'gravity':
      compactColumns();
      spawnFloatingText('GRAVEDAD', '#ba68c8');
      break;
    case 'freeze':
      freezeTimer = 5000;
      spawnFloatingText('CONGELAR', '#4dd0e1');
      break;
  }

  spawnFlash(flashed);
  sfx('powerup');
}

function updatePowerups(dt) {
  if (freezeTimer > 0) freezeTimer = Math.max(0, freezeTimer - dt);
}
