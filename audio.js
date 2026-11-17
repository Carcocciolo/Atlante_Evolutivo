/* ============================================================
   audio.js — sintetizzatore Web Audio procedurale per
   feedback tattili ottici e paesaggio sonoro generativo
   ============================================================ */
import { state } from './data.js';

let ctx = null;
let masterGain = null;
let musicGain = null;
let musicTimer = 0;
let musicRunning = false;
let lastHoverAt = 0;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.24;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.0001;
    musicGain.connect(masterGain);
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {});
  }
}

export function playHover() {
  if (!state.soundEnabled) return;
  const now = performance.now();
  if (now - lastHoverAt < 55) return;
  lastHoverAt = now;

  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(760 + Math.random() * 140, t);
  osc.frequency.exponentialRampToValueAtTime(1120, t + 0.045);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.06);
}

export function playClick(freq = 460) {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (c.state !== 'running') return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + 0.075);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.14, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.09);
}

export function playSelect(cat = '') {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (c.state !== 'running') return;
  const t = c.currentTime;
  const base = cat.includes('Pettirossi') ? 523.25 : cat.includes('Grilli') ? 587.33 : 440;
  [1, 1.25, 1.5].forEach((ratio, idx) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = idx === 0 ? 'sine' : 'triangle';
    const start = t + idx * 0.032;
    osc.frequency.setValueAtTime(base * ratio, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.11 / (idx + 1), start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.36);
  });
}

export function playSwitch(toGeo = false) {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (c.state !== 'running') return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(toGeo ? 320 : 540, t);
  osc.frequency.exponentialRampToValueAtTime(toGeo ? 620 : 300, t + 0.18);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.14, t + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.21);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.22);
}

export function playThemeSwitch(isLight = false) {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (c.state !== 'running') return;
  const t = c.currentTime;
  const notes = isLight ? [523.25, 659.25, 783.99] : [493.88, 392.0, 293.66];
  notes.forEach((f, idx) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    const st = t + idx * 0.04;
    osc.frequency.setValueAtTime(f, st);
    g.gain.setValueAtTime(0.0001, st);
    g.gain.linearRampToValueAtTime(0.09, st + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, st + 0.25);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(st);
    osc.stop(st + 0.27);
  });
}

const SCALE = [220, 261.63, 293.66, 329.63, 392.0, 440, 523.25, 659.25];

function triggerAmbientNote() {
  if (!musicRunning || !state.musicEnabled) return;
  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime;
  const freq = SCALE[Math.floor(Math.random() * SCALE.length)];
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
  osc.connect(g);
  g.connect(musicGain);
  osc.start(t);
  osc.stop(t + 3.5);
}

export function syncMusic() {
  const c = ensureCtx();
  if (!c) return;
  if (state.musicEnabled) {
    if (c.state === 'suspended') c.resume().catch(() => {});
    musicGain.gain.cancelScheduledValues(c.currentTime);
    musicGain.gain.setTargetAtTime(0.38, c.currentTime, 0.4);
    if (!musicRunning) {
      musicRunning = true;
      triggerAmbientNote();
      musicTimer = setInterval(triggerAmbientNote, 2100);
    }
  } else {
    musicRunning = false;
    clearInterval(musicTimer);
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(c.currentTime);
      musicGain.gain.setTargetAtTime(0.0001, c.currentTime, 0.25);
    }
  }
}
