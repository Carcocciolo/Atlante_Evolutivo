/* ============================================================
   audio.js — feedback acustico tattile e paesaggio sonoro
   generativo Web Audio API
   ============================================================ */
import { state } from './data.js';

let ctx = null;
let droneNodes = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {});
  }
}

function tone(freq, dur = 0.08, gain = 0.035, type = 'sine', delay = 0) {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  const now = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

let lastHoverT = 0;
export function playHover() {
  const now = performance.now();
  if (now - lastHoverT < 55) return;
  lastHoverT = now;
  tone(880, 0.045, 0.018, 'sine');
}

export function playClick(freq = 560) {
  tone(freq, 0.075, 0.032, 'triangle');
}

export function playSelect(catIdx = 0) {
  const roots = [392.0, 440.0, 329.63, 493.88];
  const f = roots[Math.abs(catIdx) % roots.length];
  tone(f, 0.22, 0.035, 'sine', 0);
  tone(f * 1.5, 0.28, 0.026, 'sine', 0.045);
}

export function playSwitch(mode) {
  if (mode === 'geo') {
    tone(440, 0.14, 0.028, 'sine', 0);
    tone(587.33, 0.18, 0.028, 'sine', 0.05);
  } else {
    tone(587.33, 0.14, 0.028, 'sine', 0);
    tone(440, 0.18, 0.028, 'sine', 0.05);
  }
}

export function playThemeSwitch() {
  tone(523.25, 0.12, 0.024, 'sine', 0);
  tone(659.25, 0.16, 0.022, 'sine', 0.04);
}

export function syncMusic() {
  const c = ensureCtx();
  if (!c) return;
  if (state.musicEnabled && !droneNodes) {
    const master = c.createGain();
    master.gain.setValueAtTime(0.0001, c.currentTime);
    master.gain.exponentialRampToValueAtTime(0.022, c.currentTime + 1.5);
    master.connect(c.destination);

    const freqs = [110, 164.81, 220];
    const oscs = freqs.map((f, idx) => {
      const o = c.createOscillator();
      o.type = idx === 0 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(f, c.currentTime);
      o.connect(master);
      o.start();
      return o;
    });
    droneNodes = { master, oscs };
  } else if (!state.musicEnabled && droneNodes) {
    const { master, oscs } = droneNodes;
    droneNodes = null;
    try {
      master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
      setTimeout(() => oscs.forEach(o => { try { o.stop(); } catch (_) {} }), 600);
    } catch (_) {}
  }
}
