'use strict';

// ---- Tablero ----
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// ---- Colores por índice de celda/pieza ----
// 1-7: tetrominós estándar · 8: basura · 9-13: piezas no estándar · 14: comodín (tinte)
const COLORS = [
  null,
  '#4dd0e1', // 1  I - cyan
  '#ffd54f', // 2  O - yellow
  '#ba68c8', // 3  T - purple
  '#81c784', // 4  S - green
  '#e57373', // 5  Z - red
  '#64b5f6', // 6  J - blue
  '#ffb74d', // 7  L - orange
  '#78909c', // 8  basura
  '#f06292', // 9  + (X-pentominó)
  '#4db6ac', // 10 U (U-pentominó)
  '#9575cd', // 11 Y (Y-pentominó)
  '#fff176', // 12 single (1x1)
  '#a1887f', // 13 hollow (3x3 hueco)
  '#eeeeee', // 14 comodín (tinte)
];

const GARBAGE_COLOR = 8;
const WILD_COLOR = 14;

// ---- Formas (matrices cuadradas: rotateCW = transpuesta + inversión de fila) ----
const PIECES = [];
PIECES[1] = [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]]; // I
PIECES[2] = [[2,2],[2,2]];                              // O
PIECES[3] = [[0,3,0],[3,3,3],[0,0,0]];                 // T
PIECES[4] = [[0,4,4],[4,4,0],[0,0,0]];                 // S
PIECES[5] = [[5,5,0],[0,5,5],[0,0,0]];                 // Z
PIECES[6] = [[6,0,0],[6,6,6],[0,0,0]];                 // J
PIECES[7] = [[0,0,7],[7,7,7],[0,0,0]];                 // L
PIECES[9]  = [[0,9,0],[9,9,9],[0,9,0]];                // + (X-pentominó)
PIECES[10] = [[10,0,10],[10,10,10],[0,0,0]];           // U
PIECES[11] = [[0,11,0,0],[11,11,0,0],[0,11,0,0],[0,11,0,0]]; // Y
PIECES[12] = [[12]];                                    // single 1x1
PIECES[13] = [[13,13,13],[13,0,13],[13,13,13]];        // 3x3 hueco

const STANDARD_TYPES = [1, 2, 3, 4, 5, 6, 7];
const PENTOMINO_TYPES = [9, 10, 11, 12, 13];
const PENTOMINO_CHANCE = 0.12; // probabilidad de que la siguiente pieza sea no estándar
const POWERUP_EVERY = 10;      // líneas entre power-ups

const LINE_SCORES = [0, 100, 300, 500, 800];

const GRID_COLORS = { dark: '#22222e', light: '#d8d8e4' };
const THEME_STORAGE_KEY = 'tetris-theme';
const AUDIO_STORAGE_KEY = 'tetris-muted';
