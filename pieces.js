'use strict';

const QUEUE_SIZE = 5;

let pieceBag = [];

function refillBag() {
  pieceBag = [...STANDARD_TYPES];
  for (let i = pieceBag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
  }
}

function nextBagType() {
  if (pieceBag.length === 0) refillBag();
  return pieceBag.pop();
}

function spawnPosition(shape) {
  return {
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  const pos = spawnPosition(shape);
  return { type, shape, x: pos.x, y: pos.y, power: null };
}

function randomPiece() {
  let type;
  if (Math.random() < PENTOMINO_CHANCE) {
    type = PENTOMINO_TYPES[Math.floor(Math.random() * PENTOMINO_TYPES.length)];
  } else {
    type = nextBagType();
  }
  const piece = makePiece(type);
  if (typeof maybeAssignPower === 'function') maybeAssignPower(piece);
  return piece;
}

// Pieza 1x1 concedida como recompensa (p.ej. tras un Tetris) — se encola al frente.
function grantSinglePiece() {
  queue.unshift(makePiece(12));
}

function createQueue() {
  const q = [];
  for (let i = 0; i < QUEUE_SIZE; i++) q.push(randomPiece());
  return q;
}

function refillQueue() {
  while (queue.length < QUEUE_SIZE) queue.push(randomPiece());
}

// Recoloca una pieza (p.ej. al salir del hold) en su posición de spawn estándar.
function resetPiecePosition(piece) {
  const pos = spawnPosition(piece.shape);
  piece.x = pos.x;
  piece.y = pos.y;
}
