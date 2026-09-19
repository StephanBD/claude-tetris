# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Extended Tetris implemented in vanilla JavaScript with HTML5 Canvas. No build step, no dependencies, no package.json — `index.html`, `style.css`, and a set of classic `<script>` files that run directly in a browser and share one global scope (no ES modules, no bundler).

## Running the game

There is no build/lint/test tooling. To run:

```bash
start index.html       # Windows: open directly
# or serve locally (needed if testing anything that requires http:// origin)
python3 -m http.server 8000
npx serve .
```

Then open the file or `http://localhost:8000` in a browser. To verify a change works, actually open the page and play — there are no automated tests. The browser console is the fastest way to poke at state directly (e.g. `board`, `current`, `queue`, `energy`) while testing a scenario.

## Architecture

Game logic is split across several classic `<script>` files, loaded **in this order** from `index.html` (order matters — later files call functions/read state defined in earlier ones, and `game.js` must load last since it calls `init()` on load):

| File | Responsibility |
|---|---|
| `config.js` | All tunable constants: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`, pentomino/power-up chances. |
| `audio.js` | `sfx(name)` — WebAudio-synthesized sound effects (no audio files), plus mute state (`Audio_.toggleMute()`, persisted to `localStorage`). |
| `fx.js` | Floating combat-text and cell-flash effects drawn over the board (`spawnFloatingText`, `spawnFlash`, `updateFx`/`drawFx`). |
| `board.js` | Pure board mechanics: `createBoard`, `collide`, `rotateCW`/`rotateCCW`, `merge`, `clearLines` (returns lines cleared, no scoring side effects), `compactColumns`, `isBoardEmpty`. |
| `pieces.js` | 7-bag randomizer + pentomino injection, the 5-piece `queue`, and piece positioning (`randomPiece`, `createQueue`/`refillQueue`, `resetPiecePosition`, `grantSinglePiece`). |
| `scoring.js` | Combo counter, T-spin detection (`detectTSpin`), back-to-back multiplier, perfect-clear bonus — all funneled through `registerLock(cleared, tspin)`. |
| `powerups.js` | Assigns a power (`bomb`/`bolt`/`dye`/`gravity`/`freeze`) to standard pieces every `POWERUP_EVERY` lines and applies its effect on lock (`applyPower`). |
| `abilities.js` | Energy bar, the 5-option ability menu (queue preview, piece swap, slow time, undo-last-lock via `takeSnapshot`/`undoLastLock`, extra hold), reusing `#overlay`. |
| `modes.js` | Game-mode table (`MODES`): marathon, sprint-40, rising garbage, preset board, invisible pieces, reversed rotation — each with optional `setup()`/`onTick(dt)`/`onLock()`/`winCheck()` hooks. |
| `game.js` | DOM refs, the render loop, input handling, and `init()` — ties every module's state together. |

Key pieces of state and mechanics, mostly unchanged from the original design:

- **Board model**: `board` is a `ROWS × COLS` matrix (20×10); each cell is `0` (empty) or a color index (see `config.js`: 1–7 standard tetrominoes, 8 garbage, 9–13 non-standard pieces, 14 the "dye" wildcard).
- **Piece representation**: all shapes (including the pentominoes) are hardcoded **square** matrices in `PIECES`, because `rotateCW`/`rotateCCW` (`board.js`) are a transpose + row reversal, not a lookup table.
- **Collision & wall kicks**: `collide(shape, ox, oy)` checks bounds/overlap against `board`. `tryRotate()` (`game.js`) picks `rotateCW` or `rotateCCW` based on `shouldRotateReversed()` (reverse-rotation mode), then tries kick offsets `[0,-1,1,-2,2,-3,3]` — wider than a standard implementation to accommodate 5-wide pentominoes.
- **Piece queue & hold**: `queue` (5 pieces) replaces a single `next`; `spawn()` shifts it and calls `refillQueue()`. `doHold()` (`game.js`) sends the falling piece to `hold` and pulls from `queue`, or swaps with the held piece; `holdUsed` blocks a second hold until the piece locks (reset in `lockPiece()`).
- **Locking a piece** (`lockPiece()` in `game.js`): `takeSnapshot()` (undo) → `merge()` → `applyPower(current)` → `detectTSpin(current)` **before** `clearLines()` (T-spin corner checks need the pre-clear board; clearing splices rows and would invalidate them) → `clearLines()` → `registerLock(cleared, tspin)` (all scoring) → energy/power-up/mode-lock notifications → `spawn()`.
- **Scoring**: `registerLock()` (`scoring.js`) combines base line score (`LINE_SCORES × level`, or the T-spin table), a ×1.5 back-to-back bonus, a combo bonus (`50 × combo × level`), and a perfect-clear bonus (`2000 × level`) into one `score` update, and increments `level`/`dropInterval` the same way as before. Hard drop still adds 2 pts/row, soft drop 1 pt/row (`game.js`).
- **Timers, not `setTimeout`**: every timed effect (power-up freeze, ability slow-time, garbage cadence, invisible-mode reveal flash, sprint clock) is decremented from the `dt` passed into `loop(ts)`, so pausing (which cancels the `requestAnimationFrame`) freezes them correctly.
- **Rendering** (`game.js`): `draw()` clears and redraws the grid, locked board (skipped in invisible mode outside its reveal flash), ghost piece (`ghostY()`, `globalAlpha = 0.2`), the current piece (with a power-up glyph if it has one), then `drawFx()`. `drawPiecePreview()` is a generic, size-agnostic preview renderer shared by the hold panel, the next-piece panel, and the "show next 5" ability (`drawNextPanel()`/`drawHoldPanel()`).

Tunable constants live in `config.js`. If `COLS`/`ROWS`/`BLOCK` change, the `#board` canvas `width`/`height` in `index.html` must be updated to match (`COLS × BLOCK`, `ROWS × BLOCK`).

Input is handled by a single `keydown` listener at the bottom of `game.js`: arrow keys to move/rotate/soft-drop, `X` to rotate, `Space` for hard drop, `C`/`Shift` for hold, `E` for the ability menu (when charged, digits `1`–`5` pick an option), `P` to pause, `M` to mute. There's no separate input module. The `<select id="mode-select">` in the side panel picks the active game mode and restarts the game on `change`.
