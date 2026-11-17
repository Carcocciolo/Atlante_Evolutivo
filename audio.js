/* ============================================================
   audio.js — suoni UI procedurali e paesaggio sonoro evolutivo
   generati interamente tramite Web Audio API (zero file esterni)
   ============================================================ */
import { state } from './data.js';

let ctx = null;
let musicRunning = false;
let musicTimer = null;
let musicMaster = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/** Suono morbido quando si passa sopra una tavola. */
export function playHover() {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(760, now + 0.045);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.025, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

/** Suono tattile per clic su pulsanti e controlli. */
export function playClick(pitch = 420) {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(pitch, now);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.65, now + 0.07);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

/** Accordo cristallino al cambio palette o tema chiaro/scuro. */
export function playThemeSwitch(isLight = false) {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  const notes = isLight ? [523.25, 659.25, 783.99] : [392.0, 493.88, 659.25];
  notes.forEach((f, idx) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + idx * 0.03);
    gain.gain.setValueAtTime(0.0001, now + idx * 0.03);
    gain.gain.linearRampToValueAtTime(0.032, now + idx * 0.03 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.03 + 0.24);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + idx * 0.03);
    osc.stop(now + idx * 0.03 + 0.26);
  });
}

/** Accordo caldo all'apertura di una tavola. */
export function playSelect(cat = '') {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  const freqs = cat.includes('Grilli')
    ? [392.0, 493.88, 587.33]
    : cat.includes('Pettirossi')
    ? [349.23, 440.0, 523.25]
    : [293.66, 369.99, 440.0];

  freqs.forEach((f, idx) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + idx * 0.025);

    gain.gain.setValueAtTime(0.0001, now + idx * 0.025);
    gain.gain.linearRampToValueAtTime(0.04, now + idx * 0.025 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.025 + 0.34);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + idx * 0.025);
    osc.stop(now + idx * 0.025 + 0.36);
  });
}

/** Transizione morbida tra vista Spazio 3D e Mappa. */
export function playSwitch(toGeo = false) {
  if (!state.soundEnabled) return;
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(toGeo ? 260 : 380, now);
  osc.frequency.exponentialRampToValueAtTime(toGeo ? 390 : 250, now + 0.18);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.055, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.24);
}

/* ---------- Musica ambientale generativa (scala pentatonica calda) ---------- */
const SCALE = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0];

function triggerAmbientNote() {
  if (!musicRunning || !state.musicEnabled) return;
  const c = ensureCtx();
  if (!c || !musicMaster) return;

  const now = c.currentTime;
  const f = SCALE[Math.floor(Math.random() * SCALE.length)];
  const dur = 3.2 + Math.random() * 2.4;

  const osc = c.createOscillator();
  const sub = c.createOscillator();
  const filter = c.createBiquadFilter();
  const env = c.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(f, now);

  sub.type = 'triangle';
  sub.frequency.setValueAtTime(f * 0.5, now);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(640, now);

  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(0.045, now + dur * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(filter);
  sub.connect(filter);
  filter.connect(env);
  env.connect(musicMaster);

  osc.start(now);
  sub.start(now);
  osc.stop(now + dur + 0.05);
  sub.stop(now + dur + 0.05);

  musicTimer = setTimeout(triggerAmbientNote, 1600 + Math.random() * 1900);
}

export function syncMusic() {
  if (state.musicEnabled) {
    const c = ensureCtx();
    if (!c) return;
    if (!musicMaster) {
      musicMaster = c.createGain();
      musicMaster.gain.value = 0.85;
      musicMaster.connect(c.destination);
    }
    if (!musicRunning) {
      musicRunning = true;
      musicMaster.gain.setTargetAtTime(0.85, c.currentTime, 0.3);
      triggerAmbientNote();
    }
  } else if (musicRunning) {
    musicRunning = false;
    clearTimeout(musicTimer);
    if (ctx && musicMaster) {
      musicMaster.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
    }
  }
}

/** Sblocca AudioContext al primo gesto dell'utente se la musica è attiva. */
export function unlockAudio() {
  if (state.musicEnabled && !musicRunning) {
    syncMusic();
  } else if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
