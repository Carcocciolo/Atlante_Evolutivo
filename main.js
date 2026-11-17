/* ============================================================
   main.js — ciclo di rendering ultra-fluido, input, hover e avvio
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

function glow(color) {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  r.addColorStop(0, rgba(color, 0.85));
  r.addColorStop(0.22, rgba(color, 0.4));
  r.addColorStop(1, rgba(color, 0));
  g.fillStyle = r;
  g.fillRect(0, 0, 96, 96);
  glowCache.set(color, c);
  return c;
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

/* ---------- rendering ---------- */
function render(t, dt) {
  const S = state, { W, H, dpr, items, viewMode, col, mode } = S;
  const is3D = viewMode === '3d';
  const rm = RM ? 0 : 1;
  let busy = false;

  const focusGoal = S.sel >= 0 ? 1 : 0;
  S.focus += (focusGoal - S.focus) * (1 - Math.exp(-dt * (RM ? 40 : 6)));
  if (Math.abs(focusGoal - S.focus) > 0.004) busy = true;
  if (stepCamera(dt)) busy = true;

  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'low';

  const n = items.length;
  const baseSize = is3D ? thumbSize3D(S.cam3D.zoom) : geoThumbSize(S.camGeo.k);
  let hubs = null;

  if (is3D) {
    draw3DBackground(cx, t, S.focus);
    if (S.autoRotate && !RM && S.sel < 0) busy = true;
  } else {
    drawGeoBase(cx);
    if (n) { hubs = layoutHubs(baseSize); drawGeoHalos(cx); }
  }

  if (S.focus > 0.01) {
    cx.fillStyle = `rgba(12, 4, 2, ${0.34 * S.focus})`;
    cx.fillRect(0, 0, W, H);
  }

  /* --- aggiornamento e proiezione --- */
  while (S.proj.length < n) S.proj.push({ sx: 0, sy: 0, scale: 1, zOrder: 0, size: 0 });
  S.proj.length = n;
  const mv = 1 - Math.exp(-dt * (RM ? 60 : 4.5));
  const vk = 1 - Math.exp(-dt * (RM ? 60 : 9));

  for (let i = 0; i < n; i++) {
    const it = items[i], o = S.proj[i];

    let d = it.tx - it.x; it.x += d * mv; if (Math.abs(d) > 5e-4) busy = true;
    d = it.ty - it.y; it.y += d * mv; if (Math.abs(d) > 5e-4) busy = true;
    d = it.tz - it.z; it.z += d * mv; if (Math.abs(d) > 5e-4) busy = true;

    const vt = it.vis ? 1 : 0;
    it.vf += (vt - it.vf) * vk; if (Math.abs(vt - it.vf) > 0.01) busy = true;
    const ht = (i === S.hov || i === S.sel) ? 1 : 0;
    it.hs += (ht - it.hs) * vk; if (Math.abs(ht - it.hs) > 0.01) busy = true;
    const ap = (t - it.b) / 700;
    it.a = ap >= 1 ? 1 : ap <= 0 ? 0 : ease(ap);
    if (ap < 1) busy = true;

    if (is3D) {
      const floatPhase = (S.autoRotate && !RM && S.sel < 0) ? 1 : 0;
      project3D(
        it.x + Math.cos(t * 0.0011 + i * 1.7) * 0.004 * rm * floatPhase,
        it.y + Math.sin(t * 0.0015 + i) * 0.005 * rm * floatPhase,
        it.z, o
      );
    } else {
      const h = hubs.get(it.hubId);
      geoOffset(it, baseSize, off);
      o.sx = h.x + off.dx; o.sy = h.y + off.dy;
      o.scale = 1;
      o.zOrder = it.hubRank;
    }
    o.size = baseSize * o.scale * (i === S.sel ? 1.7 : 1) * (1 + 0.3 * it.hs) * (0.55 + 0.45 * it.a) * (0.45 + 0.55 * it.vf);
    it.sx = o.sx; it.sy = o.sy; it.sc = o.scale;
  }

  order.length = n;
  for (let i = 0; i < n; i++) order[i] = i;
  order.sort((a, b) => S.proj[b].zOrder - S.proj[a].zOrder);

  /* --- legami tra tavole simili (solo in vista 3D) --- */
  if (n && is3D) {
    cx.lineWidth = 1;
    cx.globalAlpha = 0.17 * (1 - 0.6 * S.focus);
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

  /* --- legami attivi su hover/selezione --- */
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
    if (!RM) busy = true;
  }

  /* --- tavole: fast-path senza save()/restore()/rotate() --- */
  const margin = baseSize * 2.2;
  const drawNode = (i, big) => {
    const it = items[i], o = S.proj[i];
    if (!big && (o.sx < -margin || o.sx > W + margin || o.sy < -margin || o.sy > H + margin)) return;

    const c = col[it.cat];
    const dim = (S.sel >= 0 && !big) ? 1 - 0.66 * S.focus : 1;
    const depth = (is3D ? clamp(o.scale * 0.92, 0.35, 1) : 1) * dim;

    if (it.vf < 0.98) {
      cx.globalAlpha = 0.22 * depth * (1 - it.vf);
      cx.fillStyle = c;
      cx.beginPath(); cx.arc(o.sx, o.sy, 3 * o.scale, 0, 6.2832); cx.fill();
    }
    if (it.vf < 0.02) return;

    const live = it.ready && mode === 'thumb';
    if (big || (i === S.hov && live)) {
      const R = (live ? o.size : 22) * 1.5;
      cx.globalCompositeOperation = 'lighter';
      cx.globalAlpha = (big ? 0.55 : 0.4) * depth;
      cx.drawImage(glow(c), o.sx - R, o.sy - R, R * 2, R * 2);
      cx.globalCompositeOperation = 'source-over';
    }

    if (!live) {
      const r = (big ? 11 : 6.5) * o.scale * (1 + 0.4 * it.hs) * it.vf;
      cx.globalCompositeOperation = 'lighter';
      cx.globalAlpha = 0.7 * depth;
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
    const x0 = Math.round(o.sx - s / 2 - pad);
    const y0 = Math.round(o.sy - s / 2 - pad);

    cx.globalAlpha = Math.min(1, it.a * 1.4) * depth * it.vf;
    cx.fillStyle = 'rgba(8, 3, 1, 0.36)';
    cx.fillRect(x0 + s * 0.03, y0 + s * 0.05, w, h);
    cx.drawImage(it.card, x0, y0, w, h);

    if (big || S.hov === i) {
      cx.lineWidth = big ? 3 : 2;
      cx.strokeStyle = big ? '#ee9a5b' : c;
      cx.strokeRect(x0, y0, w, h);
    }
  };

  for (const i of order) if (i !== S.sel && i !== S.hov) drawNode(i, false);
  if (S.hov >= 0 && S.hov !== S.sel && items[S.hov]) drawNode(S.hov, false);
  if (S.sel >= 0 && items[S.sel]) drawNode(S.sel, true);
  cx.globalAlpha = 1;

  /* --- etichette dei gruppi --- */
  if (is3D) {
    const acc = {};
    for (const it of items) {
      if (!it.vis) continue;
      const a = acc[it.cat] || (acc[it.cat] = { x: 0, top: 9, z: 0, n: 0 });
      a.x += it.x; a.z += it.z; a.n++;
      if (it.y < a.top) a.top = it.y;
    }
    const labels = [];
    for (const cat in acc) {
      const a = acc[cat];
      if (a.n >= 2) labels.push({ text: cat, color: col[cat], x: a.x / a.n, y: a.top - 0.16, z: a.z / a.n });
    }
    drawClusterLabels(cx, labels, 0.75 * (1 - 0.7 * S.focus));
  } else if (n) drawGeoLabels(cx);

  /* --- onda d'urto alla selezione --- */
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
      busy = true;
    }
    cx.globalAlpha = 1;
  }

  /* --- dissolvenza al cambio vista --- */
  const sp = (t - S.switchT) / 520;
  if (sp < 1) {
    cx.fillStyle = `rgba(20, 8, 4, ${0.92 * (1 - sp) ** 2})`;
    cx.fillRect(0, 0, W, H);
    busy = true;
  }

  /* --- hover aggiornato anche quando è la camera a muoversi --- */
  if (S.mx > -100 && !S.drag && n) {
    const h = pick(S.mx, S.my);
    if (h !== S.hov) { S.hov = h; setTip(h); cv.style.cursor = h >= 0 ? 'pointer' : 'grab'; busy = true; }
  }

  S.dirty = busy;
}

/* ---------- input ---------- */
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

/* ---------- dimensioni e ciclo ---------- */
function syncSize() {
  state.dpr = 1;
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

let last = 0;
requestAnimationFrame(function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000) || 0.016;
  last = t;
  if (state.dirty) render(t, dt);
  requestAnimationFrame(loop);
});

/* ---------- avvio ---------- */
bindUI();
bindLoaderUI();
loadLand();
autoload();
if (document.fonts) document.fonts.ready.then(markDirty);
