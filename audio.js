'use strict';

// Efectos de sonido sintetizados con WebAudio (sin assets binarios).
const Audio_ = (() => {
  let ctx = null;
  let muted = localStorage.getItem(AUDIO_STORAGE_KEY) === '1';

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, opts = {}) {
    if (muted) return;
    try {
      const ac = ensureCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = opts.type || 'square';
      osc.frequency.value = freq;
      gain.gain.value = opts.volume ?? 0.08;
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    } catch (e) {
      // Audio no disponible (autoplay bloqueado, navegador sin soporte, etc.)
    }
  }

  function sequence(freqs, stepDuration, opts) {
    freqs.forEach((f, i) => setTimeout(() => tone(f, stepDuration, opts), i * stepDuration * 1000));
  }

  const SFX = {
    move: () => tone(220, 0.03, { volume: 0.03 }),
    rotate: () => tone(330, 0.05, { volume: 0.05 }),
    lock: () => tone(150, 0.06, { volume: 0.06 }),
    line: () => tone(523.25, 0.12, { volume: 0.08 }),
    tetris: () => sequence([523.25, 659.25, 783.99, 1046.5], 0.09, { volume: 0.09 }),
    tspin: () => sequence([440, 554.37, 659.25], 0.08, { volume: 0.08 }),
    combo: (n) => tone(440 + Math.min(n, 10) * 40, 0.08, { volume: 0.07 }),
    perfect: () => sequence([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.1, { volume: 0.1 }),
    powerup: () => sequence([300, 500, 700], 0.06, { volume: 0.06 }),
    hold: () => tone(200, 0.05, { volume: 0.05, type: 'sine' }),
    gameover: () => sequence([440, 349.23, 293.66, 220], 0.15, { volume: 0.08 }),
    ability: () => sequence([392, 523.25, 659.25], 0.08, { volume: 0.08 }),
    garbage: () => tone(90, 0.15, { volume: 0.07, type: 'sawtooth' }),
  };

  function play(name, ...args) {
    if (SFX[name]) SFX[name](...args);
  }

  function toggleMute() {
    muted = !muted;
    localStorage.setItem(AUDIO_STORAGE_KEY, muted ? '1' : '0');
    return muted;
  }

  function isMuted() { return muted; }

  return { play, toggleMute, isMuted };
})();

function sfx(name, ...args) { Audio_.play(name, ...args); }
