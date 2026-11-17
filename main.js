/* ============================================================
   main.js — ciclo di rendering, input e avvio
   ============================================================ */
import { state, RM, CARD, ease, clamp, rgba, esc, markDirty } from './data.js';
import {
  geoOffset, geoThumbSize, layoutHubs, drawGeoBase, drawGeoHalos, drawGeoLabels, loadLand
} from './geo.js';
import { project3D, thumbSize3D, draw3DBackground, drawClusterLabels, buildBackground } from './view3d.js';
import { stepCamera, zoomBy, focusOn } from './camera.js';
import { show, closeSelection, bindUI, setAutoRotate } from './ui.js';
import { autoload, bindLoaderUI } from './loader.js';

const $ = s => document.querySelector(s);
const cv = $('#cv');
const cx = cv.getContext('2d', { alpha: false });
const wrap = $('#wrap');
const tipEl = $('#tip');

const order = [];
const off = {};
const glowCache = new Map();
const flags = { busy: false, moved: false };
let lastView = '', lastN = -1;
let prevYaw = state.cam3D.yaw, prevGeoX = state.camGeo.x;
let sheenSprite = null;

/** Sprite luminoso per categoria (si disegna in modalità additiva). */
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

/** Riflesso satinato diagonale pre-renderizzato per le card in primo piano. */
function getSheen() {
  if (sheenSprite) return sheenSprite;
  sheenSprite = document.createElement('canvas');
  sheenSprite.width = sheenSprite.height = 128;
  const g = sheenSprite.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 128);
  gr.addColorStop(0, 'rgba(255, 248, 235, 0)');
  gr.addColorStop(0.42, 'rgba(255, 248, 235, 0.24)');
  gr.addColorStop(0.5, 'rgba(255, 255, 255, 0.36)');
  gr.addColorStop(0.58, 'rgba(255, 248, 235, 0.12)');
  gr.addColorStop(1, 'rgba(255, 248, 235, 0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return sheenSprite;
}

/** Livello mip più piccolo che copre ancora la larghezza richiesta (in pixel del dispositivo). */
function pickLevel(cards, devW) {
  for (let i = 0; i < cards.length; i++) if (cards[i].width >= devW * 0.8) return cards[i];
  return cards[cards.length - 1];
}

/* ---------- picking ---------- */
function pick(px, py) {
  const { items, proj, mode } = state;
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k], it = items[i];
    if (!it || !it.vis || it.vf < 0.5) continue;
    const o = proj[i];
    if (it.ready && mode === 'thumb') {
      const s = o.size, pad = s * CARD.pad;
      if (Math.abs(px - o.sx) <= s / 2 + pad && py >= o.sy - s / 2 - pad && py <= o.sy + s / 2 + s * CARD.bottom) return i;
    } else if (Math.hypot(px - o.sx, py - o.sy) <= Math.max(10, 9 * o.scale)) return i;
  }
  return -1;
}

function setTip(h) {
  if (h < 0) return tipEl.classList.remove('is-on');
  const it = state.items[h];
  tipEl.innerHTML = `<b>${esc(it.r.subject || it.r.id)}</b><span>${esc(it.r.id)} · ${esc(it.siteName)}</span>`;
  tipEl.classList.add('is-on');
  placeTip(state.mx, state.my);
}

function placeTip(px, py) {
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  tipEl.style.transform = `translate3d(${clamp(px + 16, 8, state.W - w - 8)}px, ${clamp(py + 16, 8, state.H - h - 8)}px, 0)`;
}

/* ============================================================
   rendering, in passi separati
   ============================================================ */

/** Anima, proietta e calcola la fisica di oscillazione/allineamento di ogni tavola. */
function updateItems(t, dt, is3D, baseSize, hubs, angularImpulse) {
  const S = state, items = S.items, n = items.length;
  const rm = RM ? 0 : 1;
  const mv = 1 - Math.exp(-dt * (RM ? 60 : 4.5));
  const vk = 1 - Math.exp(-dt * (RM ? 60 : 9));
  const float = (S.autoRotate && !RM && S.sel < 0) ? 1 : 0;

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
    const ap = (t - it.b) / 700;
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

    // Fisica di rotazione: oscillazione fluida al trascinamento + riallineamento a 0° su hover/clic
    if (RM) {
      it.rot = isActive ? 0 : it.baseRot;
    } else {
      const targetRot = isActive ? 0 : it.baseRot;
      // Impulso proporzionale al movimento della camera (solo se non è selezionata/puntata)
      if (!isActive && angularImpulse !== 0) {
        const weight = 0.65 + (i % 5) * 0.14;
        const depthFactor = is3D ? clamp(o.scale, 0.5, 1.4) : 1;
        it.vrot += angularImpulse * weight * depthFactor;
      }
      // Molla smorzata verso l'angolo obiettivo (più rigida quando si riallinea al clic/hover)
      const stiffness = isActive ? 54 : 22;
      const damping = isActive ? 11.5 : 6.8;
      const force = (targetRot - it.rot) * stiffness;
      it.vrot = (it.vrot + force * dt) * Math.exp(-damping * dt);
      it.rot = clamp(it.rot + it.vrot * dt, -0.42, 0.42);

      if (Math.abs(targetRot - it.rot) > 0.0015 || Math.abs(it.vrot) > 0.004) {
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

/* statistiche per categoria: servono ad alone e nome del gruppo in 3D */
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

/** Alone morbido sotto ogni nuvola di tavole: i gruppi si leggono a colpo d'occhio. */
function drawAuras(baseSize) {
  const S = state;
  cx.globalCompositeOperation = 'lighter';
  cx.globalAlpha = 0.17 * (1 - 0.6 * S.focus);
  for (const [cat, s] of catStats) {
    if (s.n < 2) continue;
    const mx = s.sx / s.n, my = s.sy / s.n;
    const v = Math.max(0, s.sxx / s.n - mx * mx + s.syy / s.n - my * my);
    const R = Math.sqrt(v) * 2.4 + baseSize * 1.4;
    cx.drawImage(glow(S.col[cat]), mx - R, my - R, R * 2, R * 2);
  }
  cx.globalCompositeOperation = 'source-over';
  cx.globalAlpha = 1;
}

function drawLinks(t) {
  const S = state, items = S.items, n = items.length, col = S.col;
  if (n && S.viewMode === '3d') {
    cx.lineWidth = 1;
    cx.globalAlpha = 0.18 * (1 - 0.6 * S.focus);
    for (const cat of Object.keys(col)) {
      cx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = items[i];
        if (a.cat !== cat || !a.vis) continue;
        for (let k = 0; k < 2 && k < a.nn.length; k++) {
          const b = items[a.nn[k]];
          if (!b || !b.vis) continue;
          cx.moveTo(a.sx, a.sy); cx.lineTo(b.sx, b.sy);
        }
      }
      cx.strokeStyle = col[cat];
      cx.stroke();
    }
  }
  if (n && (S.hov >= 0 || S.sel >= 0)) {
    cx.lineWidth = 1.6;
    cx.setLineDash([6, 8]);
    cx.lineDashOffset = -t * 0.04;
    cx.strokeStyle = '#ffe2bd';
    for (const k of [S.hov, S.sel]) {
      if (k < 0 || !items[k]) continue;
      cx.globalAlpha = k === S.sel ? 0.85 : 0.55;
      cx.beginPath();
      for (const j of items[k].nn) {
        if (!items[j] || !items[j].vis) continue;
        cx.moveTo(items[k].sx, items[k].sy); cx.lineTo(items[j].sx, items[j].sy);
      }
      cx.stroke();
    }
    cx.setLineDash([]);
    cx.globalAlpha = 1;
    if (!RM) flags.busy = true;
  }
}

function drawNode(i, big, is3D, baseSize) {
  const S = state, it = S.items[i], o = S.proj[i], dpr = S.dpr, { W, H } = S;
  const margin = baseSize * 2.2;
  if (!big && (o.sx < -margin || o.sx > W + margin || o.sy < -margin || o.sy > H + margin)) return;

  const c = S.col[it.cat];
  const dim = (S.sel >= 0 && !big) ? 1 - 0.66 * S.focus : 1;
  const depth = (is3D ? clamp(o.scale * 0.92, 0.35, 1) : 1) * dim;

  if (it.vf < 0.98) {
    cx.globalAlpha = 0.22 * depth * (1 - it.vf);
    cx.fillStyle = c;
    cx.beginPath(); cx.arc(o.sx, o.sy, 3 * o.scale, 0, 6.2832); cx.fill();
  }
  if (it.vf < 0.02) return;

  const live = it.ready && S.mode === 'thumb';
  if (big || (i === S.hov && live)) {
    const R = (live ? o.size : 22) * 1.6;
    cx.globalCompositeOperation = 'lighter';
    cx.globalAlpha = (big ? 0.6 : 0.42) * depth;
    cx.drawImage(glow(c), o.sx - R, o.sy - R, R * 2, R * 2);
    cx.globalCompositeOperation = 'source-over';
  }

  if (!live) {
    const r = (big ? 11 : 6.5) * o.scale * (1 + 0.4 * it.hs) * it.vf;
    cx.globalCompositeOperation = 'lighter';
    cx.globalAlpha = 0.72 * depth;
    cx.drawImage(glow(c), o.sx - r * 3, o.sy - r * 3, r * 6, r * 6);
    cx.globalCompositeOperation = 'source-over';
    cx.globalAlpha = depth;
    cx.fillStyle = c;
    cx.beginPath(); cx.arc(o.sx, o.sy, r, 0, 6.2832); cx.fill();
    if (big) { cx.lineWidth = 2.5; cx.strokeStyle = '#f4efe3'; cx.stroke(); }
    cx.globalAlpha = 1;
    return;
  }

  const s = o.size, pad = s * CARD.pad;
  const w = s * (1 + 2 * CARD.pad), h = s * (1 + CARD.pad + CARD.bottom);
  const img = pickLevel(it.cards, w * dpr);
  const rot = it.rot;
  const cs = Math.cos(rot) * dpr, sn = Math.sin(rot) * dpr;
  const alpha = Math.min(1, it.a * 1.4) * depth * it.vf;

  cx.globalAlpha = alpha;
  cx.setTransform(cs, sn, -sn, cs, o.sx * dpr, o.sy * dpr);

  // Ombra morbida espansa quando la tavola è sollevata (hover o selezione)
  const lift = 1 + it.hs * 1.4;
  cx.fillStyle = big ? 'rgba(6, 2, 1, 0.55)' : 'rgba(8, 3, 1, 0.36)';
  cx.fillRect(-s / 2 - pad + s * 0.03 * lift, -s / 2 - pad + s * 0.055 * lift, w, h);

  // Card Polaroid
  cx.drawImage(img, -s / 2 - pad, -s / 2 - pad, w, h);

  // Riflesso satinato che scorre in base all'angolo di rotazione della camera e della card
  if (it.hs > 0.05 || (is3D && o.scale > 0.85)) {
    const sheenAlpha = alpha * (0.28 * it.hs + (is3D ? clamp((o.scale - 0.85) * 0.45, 0, 0.22) : 0));
    if (sheenAlpha > 0.02) {
      cx.globalCompositeOperation = 'lighter';
      cx.globalAlpha = sheenAlpha;
      const shift = Math.sin(S.cam3D.yaw * 1.6 + rot * 3 + i * 0.4) * (w * 0.22);
      cx.drawImage(getSheen(), -s / 2 - pad + shift, -s / 2 - pad, w * 0.85, h);
      cx.globalCompositeOperation = 'source-over';
      cx.globalAlpha = alpha;
    }
  }

  // Bordo luminoso su hover o selezione
  if (big || S.hov === i) {
    cx.lineWidth = big ? 2.5 : 1.8;
    cx.strokeStyle = big ? '#f6b26b' : c;
    cx.strokeRect(-s / 2 - pad, -s / 2 - pad, w, h);
  }
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawOverlays(t, is3D, baseSize) {
  const S = state, n = S.items.length;

  if (is3D) {
    const labels = [];
    for (const [cat, s] of catStats) {
      if (s.n >= 2) labels.push({ text: cat, color: S.col[cat], x: s.x / s.n, y: s.top - 0.16, z: s.z / s.n });
    }
    drawClusterLabels(cx, labels, 0.78 * (1 - 0.7 * S.focus));
  } else if (n) drawGeoLabels(cx);

  if (S.fx.length) {
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
  if (sp < 1) {
    cx.fillStyle = `rgba(20, 8, 4, ${0.92 * (1 - sp) ** 2})`;
    cx.fillRect(0, 0, S.W, S.H);
    flags.busy = true;
  }
}

function render(t, dt) {
  const S = state, { W, H, dpr, items, viewMode } = S;
  const is3D = viewMode === '3d';
  const n = items.length;
  flags.busy = flags.moved = false;

  const focusGoal = S.sel >= 0 ? 1 : 0;
  S.focus += (focusGoal - S.focus) * (1 - Math.exp(-dt * (RM ? 40 : 6)));
  if (Math.abs(focusGoal - S.focus) > 0.004) flags.busy = true;

  const camMoving = stepCamera(dt);
  if (camMoving) flags.busy = true;

  // Calcola l'impulso angolare dalla velocità effettiva della camera
  let angularImpulse = 0;
  if (is3D) {
    const dyaw = S.cam3D.yaw - prevYaw;
    prevYaw = S.cam3D.yaw;
    // Ignora l'auto-rotazione lentissima, reagisci soprattutto al trascinamento e all'inerzia
    if (S.drag || Math.abs(S.spin.yaw) > 0.02) {
      angularImpulse = clamp(dyaw * 14, -1.8, 1.8);
    }
  } else {
    const dx = S.camGeo.x - prevGeoX;
    prevGeoX = S.camGeo.x;
    if (S.drag) angularImpulse = clamp(dx * 0.022, -1.5, 1.5);
  }

  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'low';

  const baseSize = is3D ? thumbSize3D(S.cam3D.zoom) : geoThumbSize(S.camGeo.k);
  let hubs = null;

  if (is3D) {
    draw3DBackground(cx, t, S.focus);
    if (S.autoRotate && !RM && S.sel < 0) flags.busy = true;
  } else {
    if (drawGeoBase(cx, t)) flags.busy = true;
    if (n) { hubs = layoutHubs(baseSize); drawGeoHalos(cx); }
  }

  if (S.focus > 0.01) {
    cx.fillStyle = `rgba(12, 4, 2, ${0.34 * S.focus})`;
    cx.fillRect(0, 0, W, H);
  }

  updateItems(t, dt, is3D, baseSize, hubs, angularImpulse);

  if (flags.moved || camMoving || n !== lastN || viewMode !== lastView) sortOrder(n);
  lastN = n; lastView = viewMode;

  if (is3D) { computeClusterStats(); drawAuras(baseSize); }
  drawLinks(t);

  for (const i of order) if (i !== S.sel && i !== S.hov) drawNode(i, false, is3D, baseSize);
  if (S.hov >= 0 && S.hov !== S.sel && items[S.hov]) drawNode(S.hov, false, is3D, baseSize);
  if (S.sel >= 0 && items[S.sel]) drawNode(S.sel, true, is3D, baseSize);
  cx.globalAlpha = 1;

  drawOverlays(t, is3D, baseSize);

  if (S.mx > -100 && !S.drag && n) {
    const h = pick(S.mx, S.my);
    if (h !== S.hov) { S.hov = h; setTip(h); cv.style.cursor = h >= 0 ? 'pointer' : 'grab'; flags.busy = true; }
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
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    state.drag = null;
    pinch = pinchDist();
    return;
  }
  Object.assign(state.goal3D, state.cam3D);
  Object.assign(state.goalGeo, state.camGeo);
  state.spin.yaw = state.spin.pitch = 0;
  state.drag = {
    x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lastT: performance.now(),
    yaw: state.goal3D.yaw, pitch: state.goal3D.pitch, panX: state.goal3D.panX, panY: state.goal3D.panY,
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

  if (pointers.size === 2 && pinch) {
    const p = pinchDist();
    zoomBy(p.d / pinch.d, p.mx - r.left, p.my - r.top);
    pinch = p;
    return;
  }

  const d = state.drag;
  if (d) {
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 5) {
      d.moved = true;
      cv.style.cursor = 'grabbing';
      tipEl.classList.remove('is-on');
      state.hov = -1;
    }
    if (!d.moved) return;
    if (state.viewMode === 'geo') {
      state.goalGeo.x = d.geoX + dx;
      state.goalGeo.y = d.geoY + dy;
    } else if (d.pan) {
      state.goal3D.panX = d.panX + dx;
      state.goal3D.panY = d.panY + dy;
    } else {
      setAutoRotate(false, false);
      state.goal3D.yaw = d.yaw + dx * 0.0065;
      state.goal3D.pitch = clamp(d.pitch + dy * 0.0065, -1.35, 1.35);
      const now = performance.now(), dtm = (now - d.lastT) / 1000;
      if (dtm > 0.001) {
        const vy = (e.clientX - d.lx) * 0.0065 / dtm, vp = (e.clientY - d.ly) * 0.0065 / dtm;
        state.spin.yaw = clamp(state.spin.yaw * 0.6 + vy * 0.4, -8, 8);
        state.spin.pitch = clamp(state.spin.pitch * 0.6 + vp * 0.4, -8, 8);
        d.lastT = now; d.lx = e.clientX; d.ly = e.clientY;
      }
    }
    markDirty();
    return;
  }

  if (e.pointerType === 'mouse') {
    const h = pick(px, py);
    if (h !== state.hov) { state.hov = h; setTip(h); markDirty(); }
    else if (h >= 0) placeTip(px, py);
    cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (e.pointerType !== 'mouse') {
    state.mx = state.my = -999;
    state.hov = -1;
    tipEl.classList.remove('is-on');
  }
  const d = state.drag;
  state.drag = null;
  if (d) {
    if (!d.moved && e.type === 'pointerup') {
      const r = cv.getBoundingClientRect();
      const h = pick(e.clientX - r.left, e.clientY - r.top);
      if (h >= 0) show(h); else closeSelection();
    } else if (performance.now() - d.lastT > 90) {
      state.spin.yaw = state.spin.pitch = 0;
    }
    cv.style.cursor = state.hov >= 0 ? 'pointer' : 'grab';
  }
  markDirty();
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerleave', e => {
  if (e.pointerType !== 'mouse') return;
  state.hov = -1; state.mx = state.my = -999;
  tipEl.classList.remove('is-on');
  markDirty();
});

cv.addEventListener('wheel', e => {
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  zoomBy(Math.exp(clamp(-dy, -120, 120) * 0.0016), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

/* suggerimento iniziale */
const hint = $('#hint');
const hideHint = () => hint && hint.classList.add('is-gone');
cv.addEventListener('pointerdown', hideHint, { once: true });
cv.addEventListener('wheel', hideHint, { once: true, passive: true });
setTimeout(hideHint, 12000);

/* ============================================================
   dimensioni, risoluzione adattiva e ciclo
   ============================================================ */
const dprLevels = () => {
  const m = Math.min(window.devicePixelRatio || 1, 2);
  return [...new Set([m, Math.min(m, 1.5), 1])];
};
let dprLevel = 0;
state.dpr = dprLevels()[0];

function syncSize() {
  state.W = wrap.clientWidth || innerWidth;
  state.H = wrap.clientHeight || innerHeight;
  cv.width = Math.round(state.W * state.dpr);
  cv.height = Math.round(state.H * state.dpr);
  buildBackground();
  if (state.sel >= 0 && state.items[state.sel]) focusOn(state.items[state.sel]);
  markDirty();
}
syncSize();
new ResizeObserver(syncSize).observe(wrap);

const perf = { sum: 0, n: 0, fast: 0, best: 1e9, bad: [0, 0, 0] };
function tuneDpr(ms) {
  if (state.busy) { perf.sum = perf.n = perf.fast = 0; return; }
  if (ms > 500) return;
  perf.sum += Math.min(ms, 120); perf.n++;
  if (perf.n < 40) return;
  const avg = perf.sum / perf.n;
  perf.sum = perf.n = 0;
  perf.best = Math.min(perf.best, avg);
  const levels = dprLevels();
  if (avg > 23 && dprLevel < levels.length - 1) {
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
