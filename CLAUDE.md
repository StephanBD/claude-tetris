# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris implemented in vanilla JavaScript with HTML5 Canvas. No build step, no dependencies, no package.json — three files (`index.html`, `style.css`, `game.js`) that run directly in a browser.

## Running the game

There is no build/lint/test tooling. To run:

```bash
start index.html       # Windows: open directly
# or serve locally (needed if testing anything that requires http:// origin)
python3 -m http.server 8000
npx serve .
```

Then open the file or `http://localhost:8000` in a browser. To verify a change works, actually open the page and play — there are no automated tests.

## Architecture

All game logic lives in `game.js`, organized around a few core pieces of state and functions:

- **Board model**: `board` is a `ROWS × COLS` matrix (20×10); each cell is `0` (empty) or an index 1–7 into `COLORS`/`PIECES` identifying which tetromino locked there.
- **Piece representation**: the 7 tetrominoes are hardcoded square matrices in `PIECES`. Rotation (`rotateCW`) is a transpose + row reversal, not a lookup table — this is why piece shapes are stored as square (e.g. 4×4 for I, 3×3 for T/S/Z/J/L, 2×2 for O).
- **Collision & wall kicks**: `collide(shape, ox, oy)` checks bounds and overlap against `board`. `tryRotate()` rotates then attempts offsets `[0, -1, 1, -2, 2]` (basic wall kick) before giving up.
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulating elapsed time in `dropAccum` and advancing the piece one row once `dropAccum >= dropInterval`. Pausing/resuming cancels/restarts this loop rather than gating logic inside it.
- **Locking a piece**: `lockPiece()` → `merge()` (bakes the falling piece into `board`) → `clearLines()` (scans bottom-up, splices full rows, unshifts empty ones at top) → `spawn()` (promotes `next` to `current`, generates a new `next`, and calls `endGame()` if the new piece immediately collides).
- **Scoring/leveling**: line-clear score uses `LINE_SCORES` (`[0,100,300,500,800]`) × `level`; hard drop adds 2 pts/row, soft drop 1 pt/row. `level` increments every 10 lines cleared, and `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Rendering**: `draw()` clears and redraws the grid, locked board, ghost piece (`ghostY()` projects `current` straight down, drawn at `globalAlpha = 0.2`), then the current piece — in that order, on `<canvas id="board">`. `drawNext()` renders the preview piece on a separate small canvas.

Tunable constants live at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, the `#board` canvas `width`/`height` in `index.html` must be updated to match (`COLS × BLOCK`, `ROWS × BLOCK`).

Input is handled by a single `keydown` listener at the bottom of `game.js` (arrow keys, `X` to rotate, `Space` for hard drop, `P` to pause) — there's no separate input module.
