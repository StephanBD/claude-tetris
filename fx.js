'use strict';

// Textos flotantes y destellos dibujados encima del tablero (canvas #board).
let floatingTexts = []; // { text, life, maxLife, color }
let flashCells = [];    // { r, c, life, maxLife, color }

function spawnFloatingText(text, color = '#ffffff') {
  floatingTexts.push({ text, life: 900, maxLife: 900, color });
}

function spawnFlash(cells, color = 'rgba(255,255,255,0.7)') {
  cells.forEach(([r, c]) => flashCells.push({ r, c, life: 300, maxLife: 300, color }));
}

function updateFx(dt) {
  if (floatingTexts.length) {
    floatingTexts.forEach(t => t.life -= dt);
    floatingTexts = floatingTexts.filter(t => t.life > 0);
  }
  if (flashCells.length) {
    flashCells.forEach(f => f.life -= dt);
    flashCells = flashCells.filter(f => f.life > 0);
  }
}

function drawFx(context) {
  flashCells.forEach(f => {
    context.globalAlpha = Math.max(0, f.life / f.maxLife) * 0.6;
    context.fillStyle = f.color;
    context.fillRect(f.c * BLOCK, f.r * BLOCK, BLOCK, BLOCK);
  });
  context.globalAlpha = 1;

  if (floatingTexts.length) {
    context.textAlign = 'center';
    context.font = 'bold 20px system-ui, sans-serif';
    floatingTexts.forEach((t, i) => {
      const alpha = Math.max(0, t.life / t.maxLife);
      const offsetY = (1 - alpha) * -24;
      context.globalAlpha = alpha;
      context.fillStyle = t.color;
      context.fillText(t.text, COLS * BLOCK / 2, COLS * BLOCK / 2 - 40 + offsetY - i * 26);
    });
    context.globalAlpha = 1;
  }
}

function resetFx() {
  floatingTexts = [];
  flashCells = [];
}
