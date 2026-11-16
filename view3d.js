/* view3d.js — Spazio 3D orbitale, render on-demand e hit-test diretto */
import { state, isVisible, nearestIndices } from './data.js';
import { getGeoProjection, drawGeoGridAndHubs } from './geo.js';

export const cam3D = {
  yaw: 0.35,
  pitch: 0.18,
  dist: 1150,
  autoRotate: true
};

export const viewState = {
  mode: 'thumb',       // 'thumb' | 'dot'
  viewMode: '3d',      // '3d' | 'geo'
  is2DInspect: false,  // true SOLO quando è aperta la scheda 2D di un'immagine
  hovered: -1,
  selected: -1,
  needsDraw: true
};

let W = 0, H = 0, dpr = 1;
let projected = [];
let stars = [];

(function initStars() {
  stars = Array.from({ length: 70 }, (_, i) => {
    const u = ((i * 73) % 100) / 100 * Math.PI * 2;
    const v = Math.acos(2 * (((i * 37) % 100) / 100) - 1);
    const r = 700 + ((i * 53) % 420);
    return {
      x: r * Math.sin(v) * Math.cos(u),
      y: r * Math.cos(v),
      z: r * Math.sin(v) * Math.sin(u),
      r: 1 + (i % 3) * 0.6,
      a: 0.16 + (i % 4) * 0.05
    };
  });
})();

export function setCanvasMetrics(cv, wrap) {
  dpr = Math.min(1.75, window.devicePixelRatio || 1);
  W = wrap.clientWidth;
  H = wrap.clientHeight;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  viewState.needsDraw = true;
}

export function getViewportSize() {
  return { W, H };
}

function project3D(wx, wy, wz) {
  const cosY = Math.cos(cam3D.yaw), sinY = Math.sin(cam3D.yaw);
  const cosP = Math.cos(cam3D.pitch), sinP = Math.sin(cam3D.pitch);
  const x1 = wx * cosY - wz * sinY;
  const z1 = wx * sinY + wz * cosY;
  const y2 = wy * cosP - z1 * sinP;
  const z2 = wy * sinP + z1 * cosP;
  const fov = Math.min(W, H) * 0.92;
  const denom = Math.max(180, cam3D.dist + z2);
  const scale = fov / denom;
  return {
    sx: W / 2 + x1 * scale,
    sy: H / 2 + y2 * scale,
    scale,
    depth: z2
  };
}

function nodeWorldCoords(it) {
  if (viewState.viewMode === '3d') {
    const r = Math.min(W, H) * 0.46;
    return { wx: it.x * r, wy: it.y * r, wz: it.z * r };
  }
  const proj = getGeoProjection(W, H);
  const pt = proj([it.lon, it.lat]) || [W / 2, H / 2];
  return { wx: pt[0] - W / 2, wy: pt[1] - H / 2, wz: 0 };
}

export function renderScene(cx) {
  if (viewState.is2DInspect) return;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.fillStyle = '#1c0c06';
  cx.fillRect(0, 0, W, H);

  for (let i = 0; i < stars.length; i++) {
    const st = stars[i];
    const p = project3D(st.x, st.y, st.z);
    if (p.sx < -20 || p.sx > W + 20 || p.sy < -20 || p.sy > H + 20) continue;
    cx.fillStyle = `rgba(246, 196, 150, ${st.a})`;
    cx.beginPath();
    cx.arc(p.sx, p.sy, st.r * p.scale * 160, 0, Math.PI * 2);
    cx.fill();
  }

  if (viewState.viewMode === 'geo') {
    drawGeoGridAndHubs(cx, W, H);
  }

  const items = state.items;
  if (!items.length) return;

  projected = items.map((it, i) => {
    const wc = nodeWorldCoords(it);
    const p = project3D(wc.wx, wc.wy, wc.wz);
    const size = Math.min(108, Math.max(22, 62 * p.scale * 190));
    return { sx: p.sx, sy: p.sy, size, depth: p.depth, idx: i };
  });

  // Connessioni tra tavole affini
  cx.lineWidth = 1;
  cx.globalAlpha = 0.2;
  items.forEach((a, i) => {
    if (!isVisible(i)) return;
    (state.NM[i] || []).forEach(j => {
      if (!items[j] || !isVisible(j)) return;
      cx.beginPath();
      cx.moveTo(projected[i].sx, projected[i].sy);
      cx.lineTo(projected[j].sx, projected[j].sy);
      cx.strokeStyle = state.col[a.cat];
      cx.stroke();
    });
  });
  cx.globalAlpha = 1;

  // Raggi verso i 5 più affini al passaggio del mouse
  const hIdx = viewState.hovered;
  if (hIdx >= 0 && state.Dm && projected[hIdx]) {
    cx.strokeStyle = '#ffe2bd';
    cx.lineWidth = 1.5;
    cx.setLineDash([5, 6]);
    cx.globalAlpha = 0.65;
    nearestIndices(hIdx, 5).forEach(j => {
      if (!projected[j]) return;
      cx.beginPath();
      cx.moveTo(projected[hIdx].sx, projected[hIdx].sy);
      cx.lineTo(projected[j].sx, projected[j].sy);
      cx.stroke();
    });
    cx.setLineDash([]);
    cx.globalAlpha = 1;
  }

  // Ordina per profondità dal più lontano al più vicino
  const ordered = [...projected].sort((a, b) => b.depth - a.depth);

  ordered.forEach(o => {
    const i = o.idx, it = items[i], c = state.col[it.cat];
    const vis = isVisible(i);
    const isHov = i === hIdx;
    const depthFade = Math.max(0.32, Math.min(1, 1 - (o.depth + 500) / 1400));

    if (!vis) {
      cx.globalAlpha = 0.16 * depthFade;
      cx.beginPath(); cx.arc(o.sx, o.sy, 3, 0, Math.PI * 2);
      cx.fillStyle = c; cx.fill();
      cx.globalAlpha = 1;
      return;
    }

    if (!it.ready || viewState.mode !== 'thumb' || !it.polaroid) {
      cx.globalAlpha = depthFade;
      cx.beginPath(); cx.arc(o.sx, o.sy, isHov ? 9 : 6, 0, Math.PI * 2);
      cx.fillStyle = c; cx.fill();
      if (isHov) { cx.lineWidth = 2; cx.strokeStyle = '#fff'; cx.stroke(); }
      cx.globalAlpha = 1;
      return;
    }

    // Disegno offscreen pre-renderizzato (zero shadowBlur per frame)
    const s = o.size * (isHov ? 1.18 : 1);
    const aspect = it.polaroid.height / it.polaroid.width;
    const dw = s;
    const dh = s * aspect;

    cx.save();
    cx.globalAlpha = depthFade;
    cx.drawImage(it.polaroid, o.sx - dw / 2, o.sy - dh / 2, dw, dh);
    if (isHov) {
      cx.lineWidth = 2.5;
      cx.strokeStyle = '#ee9a5b';
      cx.strokeRect(o.sx - dw / 2, o.sy - dh / 2, dw, dh);
    }
    cx.restore();
  });
}

export function pickNode(px, py) {
  for (let idx = projected.length - 1; idx >= 0; idx--) {
    const p = projected[idx];
    if (!p || !isVisible(idx)) continue;
    const half = (viewState.mode === 'thumb' ? p.size / 2 : 11);
    if (Math.abs(px - p.sx) <= half && Math.abs(py - p.sy) <= half) return idx;
  }
  return -1;
}
