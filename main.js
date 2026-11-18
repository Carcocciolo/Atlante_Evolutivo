/* ============================================================
   main.js — ciclo di rendering, filamenti curvi 3D, reticolo
   ottico di puntamento, viste orbitali archetipi, telemetria
   ============================================================ */
import { state, RM, CARD, ease, clamp, rgba, esc, markDirty } from './data.js';
import { getThemeTokens, getResolvedTheme, PALETTE_MAP } from './theme.js';
import {
  geoOffset, geoThumbSize, layoutHubs, drawGeoBase, drawGeoHalos, drawGeoLabels, loadLand, screenToGeo
} from './geo.js';
import { project3D, thumbSize3D, draw3DBackground, buildBackground } from './view3d.js';
import { stepCamera, zoomBy, focusOn, focusOnSpecimen, rotateScreenSpace } from './camera.js';
import {
  show, showSpecimen, selectCallout, closeSelection, bindUI, setAutoRotate, similarityPercent, syncOrbitHUD
} from './ui.js';
import { SPECIMENS, pickSpecimen, pickCallout } from './specimens.js';
import { autoload, bindLoaderUI } from './loader.js';
import { playHover, unlockAudio } from './audio.js';

const $ = s => document.querySelector(s);
const cv = $('#cv');
const cx = cv.getContext('2d', { alpha: false });
const wrap = $('#wrap');
const tipEl = $('#tip');
const telTextEl = $('#telemetry-text');
const axisReadoutEl = $('#axis-readout');
const astrolabeSvg = $('#astrolabe-svg');
const vernierNeedle = $('#vernier-needle');
const vernierVal = $('#vernier-val');

const order = [];
const off = {};
const glowCache = new Map();
const flags = { busy: false, moved: false };
let lastView = '', lastN = -1, lastTel = '', lastAxis = '', lastVernier = '', lastAstro = '';
let sheenSprite = null;

let prevCamX = 0, prevCamY = 0;

function glow(color) {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  r.addColorStop(0, rgba(color, 0.85));
  r.addColorStop(0.24, rgba(color, 0.38));
  r.addColorStop(0.6, rgba(color, 0.1));
  r.addColorStop(1, rgba(color, 0));
  g.fillStyle = r;
  g.fillRect(0, 0, 96, 96);
  glowCache.set(color, c);
  return c;
}

function getSheen() {
  if (sheenSprite) return sheenSprite;
  sheenSprite = document.createElement('canvas');
  sheenSprite.width = sheenSprite.height = 128;
  const g = sheenSprite.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 128);
  gr.addColorStop(0, 'rgba(255, 252, 245, 0)');
  gr.addColorStop(0.42, 'rgba(255, 252, 245, 0.24)');
  gr.addColorStop(0.5, 'rgba(255, 255, 255, 0.36)');
  gr.addColorStop(0.58, 'rgba(255, 252, 245, 0.12)');
  gr.addColorStop(1, 'rgba(255, 252, 245, 0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return sheenSprite;
}

function pickLevel(cards, devW) {
  for (let i = 0; i < cards.length; i++) if (cards[i].width >= devW * 0.8) return cards[i];
  return cards[cards.length - 1];
}

/* ---------- telemetria ottica, verniero & astrolabio live ---------- */
function updateTelemetry() {
  const pal = PALETTE_MAP.get(state.palette);
  const palName = pal ? pal.name.toUpperCase() : 'PRISMA PLATINO';
  let txt;
  if (state.viewMode === '3d') {
    const z = state.cam3D.zoom.toFixed(2);
    if (state.specimenSel >= 0 && SPECIMENS[state.specimenSel]) {
      const spec = SPECIMENS[state.specimenSel];
      const deg = Math.round(((state.orbitPhase * 180 / Math.PI) % 360 + 360) % 360);
      txt = `ORBITA · ${spec.name.toUpperCase()} · FASE ${String(deg).padStart(3, '0')}°`;
      syncOrbitHUD();
    } else {
      txt = `SPAZIO 3D · ${z}× · ${palName}`;
    }

    const yawDeg = Math.round(((state.cam3D.yaw * 180 / Math.PI) % 360 + 360) % 360);
    const pitchDeg = Math.round(clamp(state.cam3D.pitch * 180 / Math.PI, -90, 90));
    const axStr = `YAW ${String(yawDeg).padStart(3, '0')}° · PITCH ${pitchDeg >= 0 ? '+' : ''}${pitchDeg}° · FOV ${z}×`;
    if (axisReadoutEl && axStr !== lastAxis) {
      lastAxis = axStr;
      axisReadoutEl.textContent = axStr;
    }
    if (astrolabeSvg && !state.ecoMode) {
      const aStr = `rotate(${(state.cam3D.yaw * 57.2958).toFixed(1)}deg)`;
      if (aStr !== lastAstro) {
        lastAstro = aStr;
        astrolabeSvg.style.transform = aStr;
      }
    }
    if (vernierNeedle && vernierVal && !state.ecoMode) {
      const pct = clamp(50 - (pitchDeg / 90) * 42, 8, 92);
      const vStr = `${pitchDeg >= 0 ? '+' : ''}${pitchDeg}°`;
      if (vStr !== lastVernier) {
        lastVernier = vStr;
        vernierNeedle.style.top = `${pct.toFixed(1)}%`;
        vernierVal.textContent = vStr;
      }
    }
  } else {
    const geo = state.mx > 0 ? screenToGeo(state.mx, state.my) : null;
    if (geo) {
      const latStr = `${Math.abs(geo.lat).toFixed(1)}°${geo.lat >= 0 ? 'N' : 'S'}`;
      const lonStr = `${Math.abs(geo.lon).toFixed(1)}°${geo.lon >= 0 ? 'E' : 'O'}`;
      txt = `MAPPA · ${latStr} ${lonStr} · ${state.camGeo.k.toFixed(1)}×`;
      if (vernierNeedle && vernierVal && !state.ecoMode) {
        const pct = clamp(50 - (geo.lat / 90) * 44, 8, 92);
        if (latStr !== lastVernier) {
          lastVernier = latStr;
          vernierNeedle.style.top = `${pct.toFixed(1)}%`;
          vernierVal.textContent = latStr;
        }
      }
    } else {
      txt = `PLANISFERO · ${state.camGeo.k.toFixed(1)}× · ${palName}`;
    }
  }
  if (telTextEl && txt !== lastTel) {
    lastTel = txt;
    telTextEl.textContent = txt;
  }
}

/* ---------- picking ---------- */
function pickPlate(px, py) {
  const { items, proj, mode } = state;
  const isTouch = state.W <= 760;
  const hitBoost = isTouch ? 1.18 : 1;
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k], it = items[i];
    if (!it || !it.vis || it.vf < 0.5) continue;
    const o = proj[i];
    if (it.ready && mode === 'thumb') {
      const s = o.size * hitBoost, pad = s * CARD.pad;
      if (Math.abs(px - o.sx) <= s / 2 + pad && py >= o.sy - s / 2 - pad && py <= o.sy + s / 2 + s * CARD.bottom) return i;
    } else if (Math.hypot(px - o.sx, py - o.sy) <= Math.max(isTouch ? 16 : 10, 9 * o.scale)) return i;
  }
  return -1;
}

function setTip(h, specIdx = -1) {
  if (h >= 0) {
    const it = state.items[h];
    tipEl.innerHTML = `<b>${esc(it.r.subject || it.r.id)}</b><span>${esc(it.r.id)} · ${esc(it.siteName)}</span>`;
    tipEl.classList.add('is-on');
    placeTip(state.mx, state.my);
    return;
  }
  if (specIdx >= 0 && SPECIMENS[specIdx]) {
    const sp = SPECIMENS[specIdx];
    tipEl.innerHTML = `<b>${esc(sp.name)}</b><span>${esc(sp.scientificName)} · Clicca per orbita 3D</span>`;
    tipEl.classList.add('is-on');
    placeTip(state.mx, state.my);
    return;
  }
  tipEl.classList.remove('is-on');
}

function placeTip(px, py) {
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  tipEl.style.transform = `translate3d(${clamp(px + 16, 8, state.W - w - 8)}px, ${clamp(py + 16, 8, state.H - h - 8)}px, 0)`;
}

/* ============================================================
   rendering, in passi separati
   ============================================================ */
function updateItems(t, dt, is3D, baseSize, hubs, impulseX, impulseY) {
  const S = state, items = S.items, n = items.length;
  const noAnim = RM || S.ecoMode;
  const rm = noAnim ? 0 : 1;
  const mv = 1 - Math.exp(-dt * (noAnim ? 60 : 4.5));
  const vk = 1 - Math.exp(-dt * (noAnim ? 60 : 9));
  const float = (S.autoRotate && !noAnim && S.sel < 0 && S.specimenSel < 0) ? 1 : 0;

  while (S.proj.length < n) S.proj.push({ sx: 0, sy: 0, scale: 1, zOrder: 0, size: 0 });
  S.proj.length = n;

  for (let i = 0; i < n; i++) {
    const it = items[i], o = S.proj[i];

    let d = it.tx - it.x; it.x += d * mv; if (Math.abs(d) > 5e-4) flags.moved = true;
    d = it.ty - it.y; it.y += d * mv; if (Math.abs(d) > 5e-4) flags.moved = true;
    d = it.tz - it.z; it.z += d * mv; if (Math.abs(d) > 5e-4) flags.moved = true;

    const vt = it.vis ? 1 : 0;
    it.vf += (vt - it.vf) * vk; if (Math.abs(vt - it.vf) > 0.01) flags.busy = true;
    const isActive = (i === S.hov || i === S.sel);
    const ht = isActive ? 1 : 0;
    it.hs += (ht - it.hs) * vk; if (Math.abs(ht - it.hs) > 0.01) flags.busy = true;
    const ap = noAnim ? 1 : (t - it.b) / 700;
    it.a = ap >= 1 ? 1 : ap <= 0 ? 0 : ease(ap);
    if (ap < 1) flags.busy = true;

    if (is3D) {
      project3D(
        it.x + Math.cos(t * 0.0011 + i * 1.7) * 0.0045 * rm * float,
        it.y + Math.sin(t * 0.0015 + i) * 0.0055 * rm * float,
        it.z, o
      );
    } else {
      const h = hubs.get(it.hubId);
      geoOffset(it, baseSize, off);
      o.sx = h.x + off.dx; o.sy = h.y + off.dy;
      o.scale = 1;
      o.zOrder = it.hubRank;
    }

    if (noAnim) {
      it.rot = isActive ? 0 : it.baseRot;
      it.tiltY = 0;
    } else {
      const targetRot = isActive ? 0 : it.baseRot;
      const depthFactor = is3D ? clamp(o.scale, 0.55, 1.45) : 1;
      const mass = 0.72 + (i % 5) * 0.13;

      if (!isActive && (Math.abs(impulseX) > 1e-4 || Math.abs(impulseY) > 1e-4)) {
        const sideSign = (i % 2 === 0 ? 1 : -1) * 0.35;
        const torque = (-impulseX * 1.15 + impulseY * sideSign) * mass * depthFactor;
        it.vrot += torque;
        it.vtiltY += impulseY * 0.9 * mass * depthFactor;
      }

      const stiffness = isActive ? 62 : 26;
      const damping = isActive ? 12.5 : 7.8;
      const force = (targetRot - it.rot) * stiffness;
      it.vrot = (it.vrot + force * dt) * Math.exp(-damping * dt);
      it.rot = clamp(it.rot + it.vrot * dt, -0.36, 0.36);

      const forceY = -it.tiltY * (isActive ? 55 : 24);
      it.vtiltY = (it.vtiltY + forceY * dt) * Math.exp(-8.2 * dt);
      it.tiltY = clamp(it.tiltY + it.vtiltY * dt, -0.22, 0.22);

      if (
        Math.abs(targetRot - it.rot) > 0.0012 ||
        Math.abs(it.vrot) > 0.003 ||
        Math.abs(it.tiltY) > 0.0015 ||
        Math.abs(it.vtiltY) > 0.003
      ) {
        flags.busy = true;
      }
    }

    o.size = baseSize * o.scale * (i === S.sel ? 1.72 : 1) * (1 + 0.32 * it.hs) * (0.55 + 0.45 * it.a) * (0.45 + 0.55 * it.vf);
    it.sx = o.sx; it.sy = o.sy; it.sc = o.scale;
  }
  if (flags.moved) flags.busy = true;
}

function sortOrder(n) {
  order.length = n;
  for (let i = 0; i < n; i++) order[i] = i;
  const P = state.proj;
  order.sort((a, b) => P[b].zOrder - P[a].zOrder);
}

const catStats = new Map();
function computeClusterStats() {
  for (const s of catStats.values()) s.n = 0;
  for (const it of state.items) {
    if (!it.vis) continue;
    let s = catStats.get(it.cat);
    if (!s) catStats.set(it.cat, s = { n: 0, x: 0, top: 0, z: 0, sx: 0, sy: 0, sxx: 0, syy: 0 });
    if (s.n === 0) { s.x = s.z = s.sx = s.sy = s.sxx = s.syy = 0; s.top = 9; }
    s.n++; s.x += it.x; s.z += it.z;
    s.sx += it.sx; s.sy += it.sy; s.sxx += it.sx * it.sx; s.syy += it.sy * it.sy;
    if (it.y < s.top) s.top = it.y;
  }
}

function drawAuras(baseSize) {
  const S = state;
  if (S.ecoMode) return;
  const isLight = getResolvedTheme() === 'light';
  cx.globalCompositeOperation = isLight ? 'multiply' : 'lighter';
  cx.globalAlpha = (isLight ? 0.11 : 0.18) * (1 - 0.6 * S.focus);
  for (const [cat, s] of catStats) {
    if (s.n < 2) continue;
    const mx = s.sx / s.n, my = s.sy / s.n;
    const v = Math.max(0, s.sxx / s.n - mx * mx + s.syy / s.n - my * my);
    const R = Math.sqrt(v) * 2.4 + baseSize * 1.45;
    cx.drawImage(glow(S.col[cat]), mx - R, my - R, R * 2, R * 2);
  }
  cx.globalCompositeOperation = 'source-over';
  cx.globalAlpha = 1;
}

/** Filamenti curvi di costellazione e vettori di affinità con percentuale. */
function drawLinks(t) {
  const S = state, items = S.items, n = items.length, col = S.col;
  const cvT = getThemeTokens().canvas;
  const isLight = getResolvedTheme() === 'light';

  if (n && S.viewMode === '3d') {
    cx.lineWidth = isLight ? 1.1 : 1;
    cx.globalAlpha = (S.ecoMode ? 0.14 : (isLight ? 0.25 : 0.20)) * (1 - 0.65 * S.focus);
    for (const cat of Object.keys(col)) {
      cx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = items[i];
        if (a.cat !== cat || !a.vis) continue;
        for (let k = 0; k < 2 && k < a.nn.length; k++) {
          const b = items[a.nn[k]];
          if (!b || !b.vis) continue;
          const mx = (a.sx + b.sx) * 0.5 - (b.sy - a.sy) * 0.12;
          const my = (a.sy + b.sy) * 0.5 + (b.sx - a.sx) * 0.12;
          cx.moveTo(a.sx, a.sy);
          cx.quadraticCurveTo(mx, my, b.sx, b.sy);
        }
      }
      cx.strokeStyle = col[cat];
      cx.stroke();
    }
  }

  if (n && (S.hov >= 0 || S.sel >= 0)) {
    cx.save();
    cx.lineWidth = 1.65;
    cx.setLineDash([5, 7]);
    cx.lineDashOffset = (RM || S.ecoMode) ? 0 : -t * 0.045;
    cx.strokeStyle = cvT.linkHighlight;
    for (const k of [S.hov, S.sel]) {
      if (k < 0 || !items[k]) continue;
      const a = items[k];
      cx.globalAlpha = k === S.sel ? 0.90 : 0.65;
      cx.beginPath();
      for (const j of a.nn) {
        const b = items[j];
        if (!b || !b.vis) continue;
        const mx = (a.sx + b.sx) * 0.5 - (b.sy - a.sy) * 0.14;
        const my = (a.sy + b.sy) * 0.5 + (b.sx - a.sx) * 0.14;
        cx.moveTo(a.sx, a.sy);
        cx.quadraticCurveTo(mx, my, b.sx, b.sy);
      }
      cx.stroke();

      if (!S.ecoMode && k === S.sel) {
        cx.setLineDash([]);
        cx.font = '600 9.5px "JetBrains Mono", monospace';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        for (let idx = 0; idx < Math.min(3, a.nn.length); idx++) {
          const j = a.nn[idx];
          const b = items[j];
          if (!b || !b.vis) continue;
          const sim = similarityPercent(k, j);
          if (!sim) continue;
          const lx = (a.sx * 0.45 + b.sx * 0.55) - (b.sy - a.sy) * 0.07;
          const ly = (a.sy * 0.45 + b.sy * 0.55) + (b.sx - a.sx) * 0.07;
          cx.globalAlpha = 0.88;
          cx.fillStyle = cvT.labelStroke;
          cx.fillRect(lx - 16, ly - 8, 32, 16);
          cx.strokeStyle = cvT.linkHighlight;
          cx.lineWidth = 1;
          cx.strokeRect(lx - 16, ly - 8, 32, 16);
          cx.fillStyle = cvT.linkHighlight;
          cx.fillText(`${sim}%`, lx, ly + 0.5);
        }
        cx.setLineDash([5, 7]);
        cx.lineWidth = 1.65;
      }
    }
    cx.restore();
    if (!RM && !S.ecoMode) flags.busy = true;
  }
}

/** Mirino ottico rotante attorno al vetrino puntato o selezionato. */
function drawTargetReticle(x, y, radius, color, t, isSelected) {
  if (state.ecoMode) return;
  cx.save();
  cx.translate(x, y);
  const spin = RM ? 0 : t * (isSelected ? 0.0007 : 0.0012);
  cx.rotate(spin);

  cx.strokeStyle = color;
  cx.lineWidth = isSelected ? 1.6 : 1.25;
  cx.globalAlpha = isSelected ? 0.85 : 0.65;
  cx.setLineDash([10, 8]);
  cx.beginPath();
  cx.arc(0, 0, radius, 0, Math.PI * 2);
  cx.stroke();

  cx.rotate(-spin * 2.1);
  cx.setLineDash([3, 11]);
  cx.beginPath();
  cx.arc(0, 0, radius + 7, 0, Math.PI * 2);
  cx.stroke();

  cx.restore();
}

function drawNode(i, big, is3D, baseSize, t) {
  const S = state, it = S.items[i], o = S.proj[i], dpr = S.dpr, { W, H } = S;
  const cvT = getThemeTokens().canvas;
  const isLight = getResolvedTheme() === 'light';
  const margin = baseSize * 2.2;
  if (!big && (o.sx < -margin || o.sx > W + margin || o.sy < -margin || o.sy > H + margin)) return;

  const c = S.col[it.cat];
  const hasFocus = (S.sel >= 0 || S.specimenSel >= 0);
  const dim = (hasFocus && !big) ? 1 - (S.specimenSel >= 0 ? 0.78 : 0.66) * S.focus : 1;
  const depth = (is3D ? clamp(o.scale * 0.92, 0.35, 1) : 1) * dim;

  if (it.vf < 0.98) {
    cx.globalAlpha = 0.22 * depth * (1 - it.vf);
    cx.fillStyle = c;
    cx.beginPath(); cx.arc(o.sx, o.sy, 3 * o.scale, 0, 6.2832); cx.fill();
  }
  if (it.vf < 0.02) return;

  const live = it.ready && S.mode === 'thumb';
  if (!S.ecoMode && (big || (i === S.hov && live))) {
    const R = (live ? o.size : 22) * 1.65;
    cx.globalCompositeOperation = isLight ? 'multiply' : 'lighter';
    cx.globalAlpha = (big ? (isLight ? 0.32 : 0.62) : (isLight ? 0.22 : 0.44)) * depth;
    cx.drawImage(glow(c), o.sx - R, o.sy - R, R * 2, R * 2);
    cx.globalCompositeOperation = 'source-over';
  }

  if (big || S.hov === i) {
    const retR = live ? o.size * 0.86 : (big ? 22 : 16);
    drawTargetReticle(o.sx, o.sy, retR, big ? cvT.linkHighlight : c, t, big);
  }

  if (!live) {
    const r = (big ? 11 : 6.5) * o.scale * (1 + 0.4 * it.hs) * it.vf;
    if (!S.ecoMode && !isLight) {
      cx.globalCompositeOperation = 'lighter';
      cx.globalAlpha = 0.72 * depth;
      cx.drawImage(glow(c), o.sx - r * 3, o.sy - r * 3, r * 6, r * 6);
      cx.globalCompositeOperation = 'source-over';
    }
    cx.globalAlpha = depth;
    cx.fillStyle = c;
    cx.beginPath(); cx.arc(o.sx, o.sy, r, 0, 6.2832); cx.fill();
    if (big) { cx.lineWidth = 2.5; cx.strokeStyle = cvT.dotRing; cx.stroke(); }
    cx.globalAlpha = 1;
    return;
  }

  const s = o.size, pad = s * CARD.pad;
  const w = s * (1 + 2 * CARD.pad), h = s * (1 + CARD.pad + CARD.bottom);
  const img = pickLevel(it.cards, w * dpr);
  const rot = it.rot;
  const tiltScaleY = 1 - Math.abs(it.tiltY || 0) * 0.28;
  const skewX = (it.tiltY || 0) * 0.22;

  const cs = Math.cos(rot) * dpr, sn = Math.sin(rot) * dpr;
  const alpha = Math.min(1, it.a * 1.4) * depth * it.vf;

  cx.globalAlpha = alpha;
  cx.setTransform(
    cs + sn * skewX,
    sn,
    -sn * tiltScaleY,
    cs * tiltScaleY,
    o.sx * dpr,
    o.sy * dpr
  );

  if (!S.ecoMode) {
    const lift = 1 + it.hs * 1.4;
    cx.fillStyle = big ? cvT.cardShadowBig : cvT.cardShadow;
    cx.fillRect(-s / 2 - pad + s * 0.03 * lift, -s / 2 - pad + s * 0.055 * lift, w, h);
  }

  cx.drawImage(img, -s / 2 - pad, -s / 2 - pad, w, h);

  if (!S.ecoMode && (it.hs > 0.05 || Math.abs(it.vrot) > 0.025 || Math.abs(it.tiltY || 0) > 0.02)) {
    const tiltGlow = clamp(Math.abs(it.vrot) * 0.45 + Math.abs(it.tiltY || 0) * 0.8, 0, 0.22);
    const sheenAlpha = alpha * (0.28 * it.hs + tiltGlow);
    if (sheenAlpha > 0.02) {
      cx.globalCompositeOperation = 'lighter';
      cx.globalAlpha = sheenAlpha;
      const shift = Math.sin(S.cam3D.yaw * 1.6 + rot * 4 + (it.tiltY || 0) * 3 + i * 0.4) * (w * 0.24);
      cx.drawImage(getSheen(), -s / 2 - pad + shift, -s / 2 - pad, w * 0.85, h);
      cx.globalCompositeOperation = 'source-over';
      cx.globalAlpha = alpha;
    }
  }

  if (big || S.hov === i) {
    cx.lineWidth = big ? 2.4 : 1.7;
    cx.strokeStyle = big ? cvT.linkHighlight : c;
    cx.strokeRect(-s / 2 - pad, -s / 2 - pad, w, h);
  }
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawOverlays(t, is3D) {
  const S = state, n = S.items.length;
  const cvT = getThemeTokens().canvas;

  if (!is3D && n) drawGeoLabels(cx);

  if (!S.ecoMode && S.fx.length) {
    S.fx = S.fx.filter(f => t - f.t0 < 1100);
    for (const f of S.fx) {
      const p = (t - f.t0) / 1100, it = f.it;
      cx.globalAlpha = 1 - p;
      cx.strokeStyle = cx.fillStyle = f.c;
      cx.lineWidth = 2;
      cx.beginPath(); cx.arc(it.sx, it.sy, 10 + p * 130 * it.sc, 0, 6.2832); cx.stroke();
      for (const sp of f.sp) {
        const d = sp.v * p * (2 - p) * it.sc;
        cx.beginPath();
        cx.arc(it.sx + Math.cos(sp.a) * d, it.sy + Math.sin(sp.a) * d, 2.5 * (1 - p) + 0.5, 0, 6.2832);
        cx.fill();
      }
      flags.busy = true;
    }
    cx.globalAlpha = 1;
  }

  const sp = (t - S.switchT) / 520;
  if (!S.ecoMode && sp < 1) {
    const alpha = Math.pow(1 - sp, 2);
    cx.save();
    cx.globalAlpha = alpha;
    cx.fillStyle = cvT.switchFlash;
    cx.fillRect(0, 0, S.W, S.H);
    cx.restore();
    flags.busy = true;
  }
}

function render(t, dt) {
  const S = state, { W, H, dpr, items, viewMode } = S;
  const cvT = getThemeTokens().canvas;
  const is3D = viewMode === '3d';
  const n = items.length;
  flags.busy = flags.moved = false;

  const focusGoal = (S.sel >= 0 || S.specimenSel >= 0) ? 1 : 0;
  S.focus += (focusGoal - S.focus) * (1 - Math.exp(-dt * ((RM || S.ecoMode) ? 40 : 6)));
  if (Math.abs(focusGoal - S.focus) > 0.004) flags.busy = true;

  const camMoving = stepCamera(dt);
  if (camMoving) flags.busy = true;

  let impulseX = 0, impulseY = 0;
  if (is3D) {
    const dyaw = S.cam3D.yaw - prevCamX;
    const dpitch = S.cam3D.pitch - prevCamY;
    prevCamX = S.cam3D.yaw;
    prevCamY = S.cam3D.pitch;
    if (S.drag || Math.abs(S.spin.yaw) + Math.abs(S.spin.pitch) > 0.02) {
      impulseX = clamp(dyaw * 14, -1.6, 1.6);
      impulseY = clamp(dpitch * 14, -1.6, 1.6);
    }
  } else {
    const dx = S.camGeo.x - prevCamX;
    const dy = S.camGeo.y - prevCamY;
    prevCamX = S.camGeo.x;
    prevCamY = S.camGeo.y;
    if (S.drag) {
      impulseX = clamp(dx * 0.024, -1.5, 1.5);
      impulseY = clamp(dy * 0.024, -1.5, 1.5);
    }
  }

  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'low';

  const baseSize = is3D ? thumbSize3D(S.cam3D.zoom) : geoThumbSize(S.camGeo.k);
  let hubs = null;

  if (is3D) {
    draw3DBackground(cx, t, S.focus);
    if (!RM && !S.ecoMode) flags.busy = true;
  } else {
    if (drawGeoBase(cx, t)) flags.busy = true;
    if (n) {
      hubs = layoutHubs(baseSize);
      drawGeoHalos(cx, t);
      if (!RM && !S.ecoMode) flags.busy = true;
    }
  }

  if (S.focus > 0.01 && S.specimenSel < 0) {
    cx.save();
    cx.globalAlpha = S.focus;
    cx.fillStyle = cvT.focusDim;
    cx.fillRect(0, 0, W, H);
    cx.restore();
  }

  updateItems(t, dt, is3D, baseSize, hubs, impulseX, impulseY);

  if (flags.moved || camMoving || n !== lastN || viewMode !== lastView) sortOrder(n);
  lastN = n; lastView = viewMode;

  if (is3D) { computeClusterStats(); drawAuras(baseSize); }
  drawLinks(t);

  for (const i of order) if (i !== S.sel && i !== S.hov) drawNode(i, false, is3D, baseSize, t);
  if (S.hov >= 0 && S.hov !== S.sel && items[S.hov]) drawNode(S.hov, false, is3D, baseSize, t);
  if (S.sel >= 0 && items[S.sel]) drawNode(S.sel, true, is3D, baseSize, t);
  cx.globalAlpha = 1;

  drawOverlays(t, is3D);
  updateTelemetry();

  if (S.mx > -100 && !S.drag) {
    const cHov = pickCallout(S.mx, S.my);
    const h = cHov >= 0 ? -1 : pickPlate(S.mx, S.my);
    const spHov = (cHov < 0 && h < 0) ? pickSpecimen(S.mx, S.my) : -1;

    if (cHov !== S.calloutHov || h !== S.hov || spHov !== S.specimenHov) {
      S.calloutHov = cHov;
      S.hov = h;
      S.specimenHov = spHov;
      if (h >= 0 || spHov >= 0 || cHov >= 0) playHover();
      setTip(h, spHov);
      cv.style.cursor = (h >= 0 || spHov >= 0 || cHov >= 0) ? 'pointer' : 'grab';
      flags.busy = true;
    }
  }
  S.dirty = flags.busy;
}

/* ============================================================
   input
   ============================================================ */
const pointers = new Map();
let pinch = null;
const pinchDist = () => {
  const [a, b] = [...pointers.values()];
  return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
};

cv.addEventListener('pointerdown', e => {
  unlockAudio();
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    state.drag = null;
    pinch = pinchDist();
    return;
  }
  state.goal3D.rot.set(state.cam3D.rot);
  Object.assign(state.goal3D, {
    yaw: state.cam3D.yaw, pitch: state.cam3D.pitch,
    zoom: state.cam3D.zoom, panX: state.cam3D.panX, panY: state.cam3D.panY
  });
  Object.assign(state.goalGeo, state.camGeo);
  state.spin.yaw = state.spin.pitch = 0;
  state.drag = {
    x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lastT: performance.now(),
    panX: state.goal3D.panX, panY: state.goal3D.panY,
    geoX: state.goalGeo.x, geoY: state.goalGeo.y,
    pan: e.shiftKey || e.button === 1 || e.button === 2,
    moved: false
  };
  markDirty();
});

cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  state.mx = px; state.my = py;
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (state.viewMode === 'geo') updateTelemetry();

  if (pointers.size === 2 && pinch) {
    const p = pinchDist();
    zoomBy(p.d / pinch.d, p.mx - r.left, p.my - r.top);
    pinch = p;
    return;
  }

  const d = state.drag;
  if (d) {
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    const stepX = e.clientX - d.lx, stepY = e.clientY - d.ly;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 5) {
      d.moved = true;
      cv.style.cursor = 'grabbing';
      tipEl.classList.remove('is-on');
      state.hov = -1;
      state.specimenHov = -1;
      state.calloutHov = -1;
    }
    if (!d.moved) return;
    if (state.viewMode === 'geo') {
      state.goalGeo.x = d.geoX + dx;
      state.goalGeo.y = d.geoY + dy;
    } else if (d.pan) {
      state.goal3D.panX = d.panX + dx;
      state.goal3D.panY = d.panY + dy;
    } else if (state.specimenSel >= 0) {
      setAutoRotate(false, false);
      const dPhase = stepX * 0.0085;
      const dElev = stepY * 0.0042;
      state.orbitPhase += dPhase;
      state.orbitElev = clamp(state.orbitElev + dElev, -0.48, 0.48);

      const now = performance.now(), dtm = (now - d.lastT) / 1000;
      if (dtm > 0.001) {
        const vy = dPhase / dtm;
        state.spin.yaw = clamp(state.spin.yaw * 0.55 + vy * 0.45, -8, 8);
      }
    } else {
      setAutoRotate(false, false);
      const dyaw = stepX * 0.0068;
      const dpitch = stepY * 0.0068;
      state.goal3D.yaw += dyaw;
      state.goal3D.pitch += dpitch;
      rotateScreenSpace(state.goal3D.rot, dyaw, dpitch);

      const now = performance.now(), dtm = (now - d.lastT) / 1000;
      if (dtm > 0.001) {
        const vy = dyaw / dtm, vp = dpitch / dtm;
        state.spin.yaw = clamp(state.spin.yaw * 0.55 + vy * 0.45, -8, 8);
        state.spin.pitch = clamp(state.spin.pitch * 0.55 + vp * 0.45, -8, 8);
      }
    }
    d.lastT = performance.now();
    d.lx = e.clientX;
    d.ly = e.clientY;
    markDirty();
    return;
  }

  if (e.pointerType === 'mouse') {
    const cHov = pickCallout(px, py);
    const h = cHov >= 0 ? -1 : pickPlate(px, py);
    const spHov = (cHov < 0 && h < 0) ? pickSpecimen(px, py) : -1;

    if (cHov !== state.calloutHov || h !== state.hov || spHov !== state.specimenHov) {
      state.calloutHov = cHov;
      state.hov = h;
      state.specimenHov = spHov;
      if (h >= 0 || spHov >= 0 || cHov >= 0) playHover();
      setTip(h, spHov);
      markDirty();
    } else if (h >= 0 || spHov >= 0) {
      placeTip(px, py);
    }
    cv.style.cursor = (h >= 0 || spHov >= 0 || cHov >= 0) ? 'pointer' : 'grab';
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (e.pointerType !== 'mouse') {
    state.mx = state.my = -999;
    state.hov = -1;
    state.specimenHov = -1;
    state.calloutHov = -1;
    tipEl.classList.remove('is-on');
  }
  const d = state.drag;
  state.drag = null;
  if (d) {
    if (!d.moved && e.type === 'pointerup') {
      const r = cv.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;

      const cHit = pickCallout(px, py);
      if (cHit >= 0) {
        selectCallout(cHit);
      } else {
        const spHit = pickSpecimen(px, py);
        const h = pickPlate(px, py);
        if (spHit >= 0 && (state.specimenSel >= 0 || h < 0)) {
          showSpecimen(spHit);
        } else if (h >= 0) {
          show(h);
        } else {
          closeSelection();
        }
      }
    } else if (performance.now() - d.lastT > 90) {
      state.spin.yaw = state.spin.pitch = 0;
    }
    cv.style.cursor = (state.hov >= 0 || state.specimenHov >= 0 || state.calloutHov >= 0) ? 'pointer' : 'grab';
  }
  markDirty();
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerleave', e => {
  if (e.pointerType !== 'mouse') return;
  state.hov = -1;
  state.specimenHov = -1;
  state.calloutHov = -1;
  state.mx = state.my = -999;
  tipEl.classList.remove('is-on');
  updateTelemetry();
  markDirty();
});

cv.addEventListener('wheel', e => {
  e.preventDefault();
  unlockAudio();
  const r = cv.getBoundingClientRect();
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  zoomBy(Math.exp(clamp(-dy, -120, 120) * 0.0016), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

const hint = $('#hint');
const hideHint = () => hint && hint.classList.add('is-gone');
cv.addEventListener('pointerdown', hideHint, { once: true });
cv.addEventListener('wheel', hideHint, { once: true, passive: true });
setTimeout(hideHint, 12000);

/* ============================================================
   dimensioni, risoluzione adattiva e ciclo
   ============================================================ */
const dprLevels = () => {
  if (state.ecoMode) return [1];
  const m = Math.min(window.devicePixelRatio || 1, 1.5);
  return [...new Set([m, 1])];
};
let dprLevel = 0;
state.dpr = dprLevels()[0];

export function syncSize() {
  const levels = dprLevels();
  if (dprLevel >= levels.length) dprLevel = levels.length - 1;
  state.dpr = levels[dprLevel];
  state.W = wrap.clientWidth || innerWidth;
  state.H = wrap.clientHeight || innerHeight;
  cv.width = Math.round(state.W * state.dpr);
  cv.height = Math.round(state.H * state.dpr);
  buildBackground();
  if (state.specimenSel >= 0 && SPECIMENS[state.specimenSel]) focusOnSpecimen(SPECIMENS[state.specimenSel]);
  else if (state.sel >= 0 && state.items[state.sel]) focusOn(state.items[state.sel]);
  markDirty();
}
syncSize();
new ResizeObserver(syncSize).observe(wrap);

const perf = { sum: 0, n: 0, fast: 0, best: 1e9, bad: [0, 0] };
function tuneDpr(ms) {
  if (state.ecoMode) return;
  if (state.busy) { perf.sum = perf.n = perf.fast = 0; return; }
  if (ms > 500) return;
  perf.sum += Math.min(ms, 120); perf.n++;
  if (perf.n < 18) return;
  const avg = perf.sum / perf.n;
  perf.sum = perf.n = 0;
  perf.best = Math.min(perf.best, avg);
  const levels = dprLevels();
  if (avg > 18 && dprLevel < levels.length - 1) {
    perf.bad[dprLevel]++;
    dprLevel++; perf.fast = 0;
    state.dpr = levels[dprLevel]; syncSize();
  } else if (avg < perf.best * 1.15 && dprLevel > 0 && perf.bad[dprLevel - 1] < 2) {
    if (++perf.fast >= 4) { perf.fast = 0; dprLevel--; state.dpr = levels[dprLevel]; syncSize(); }
  } else perf.fast = 0;
}

let last = 0, wasRendered = false;
requestAnimationFrame(function loop(t) {
  const raw = t - last;
  const isInteracting = Boolean(state.drag || state.hov >= 0 || state.specimenHov >= 0 || state.calloutHov >= 0 || state.fx.length);
  const minInterval = state.ecoMode ? 32 : (isInteracting ? 15 : 24);
  if (raw < minInterval) {
    requestAnimationFrame(loop);
    return;
  }
  last = t;
  if (state.dirty) {
    render(t, Math.min(0.05, raw / 1000) || 0.016);
    if (wasRendered) tuneDpr(raw);
    wasRendered = true;
  } else wasRendered = false;
  requestAnimationFrame(loop);
});

/* ---------- avvio ---------- */
bindUI();
bindLoaderUI();
loadLand();
autoload();
if (document.fonts) document.fonts.ready.then(markDirty);
