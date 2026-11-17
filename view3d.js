/* ============================================================
   view3d.js — proiezione prospettica 3D (con supporto pivot
   orbitale), sfondo stellato e sfera armillare
   ============================================================ */
import { state, RM } from './data.js';
import { getThemeTokens, getResolvedTheme, registerThemeHook } from './theme.js';
import { drawSpecimens3D } from './specimens.js';

const FOV = 2.6;

export function project3D(x, y, z, out, c = state.cam3D) {
  const { W, H } = state;
  const m = c.rot;
  const dx = x - (c.targetX || 0);
  const dy = y - (c.targetY || 0);
  const dz = z - (c.targetZ || 0);

  const x1 = m[0] * dx + m[1] * dy + m[2] * dz;
  const y2 = m[4] * dx + m[5] * dy + m[6] * dz;
  const z2 = m[8] * dx + m[9] * dy + m[10] * dz;

  const depth = FOV / Math.max(0.35, FOV + z2);
  const baseScale = W <= 760 ? 0.48 : 0.44;
  const k = Math.min(W, H) * baseScale * c.zoom * depth;
  out.sx = W / 2 + c.panX + x1 * k;
  out.sy = H / 2 + c.panY + y2 * k;
  out.scale = depth;
  out.zOrder = z2;
  return out;
}

export const thumbSize3D = zoom => {
  const minS = state.W <= 760 ? 34 : 30;
  return Math.max(minS, Math.min(92, 46 * Math.pow(zoom, 0.6)));
};

let bg = null;
const dust = Array.from({ length: 75 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.5 + Math.random() * 1.4,
  s: 0.2 + Math.random() * 0.8
}));

export function buildBackground() {
  const cvT = getThemeTokens().canvas;
  const { W, H } = state;
  if (!W || !H) return;
  const w = Math.max(1, Math.ceil(W / 2)), h = Math.max(1, Math.ceil(H / 2));
  bg = document.createElement('canvas');
  bg.width = w; bg.height = h;
  const g = bg.getContext('2d');
  const base = g.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
  base.addColorStop(0, cvT.bg0);
  base.addColorStop(0.55, cvT.bg1);
  base.addColorStop(1, cvT.bg2);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  const spot = g.createRadialGradient(w * 0.28, h * 0.26, 0, w * 0.28, h * 0.26, Math.max(w, h) * 0.55);
  spot.addColorStop(0, cvT.spot0);
  spot.addColorStop(0.45, cvT.spot1);
  spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = spot;
  g.fillRect(0, 0, w, h);
}

export function invalidateView3DTheme() {
  bg = null;
  if (state.W > 0 && state.H > 0) buildBackground();
}

registerThemeHook(invalidateView3DTheme);

const _p = {};

function drawArmillarySphere(cx, focus) {
  const cvT = getThemeTokens().canvas;
  const { W, H } = state;
  const R = 1.04;
  const alphaScale = 1 - 0.55 * focus;
  if (alphaScale <= 0.05) return;

  cx.save();
  cx.globalAlpha = alphaScale;

  const rings = [
    { axis: 'y', tilt: 0, style: cvT.ringOuter, width: 1.2, dash: [] },
    { axis: 'x', tilt: 0.41, style: cvT.ringMeridian, width: 1.0, dash: [4, 7] },
    { axis: 'z', tilt: -0.32, style: cvT.ringInner, width: 0.95, dash: [2, 8] }
  ];

  for (const ring of rings) {
    cx.strokeStyle = ring.style;
    cx.lineWidth = ring.width;
    cx.setLineDash(ring.dash);
    cx.beginPath();
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      let x = 0, y = 0, z = 0;
      if (ring.axis === 'y') {
        x = Math.cos(a) * R;
        z = Math.sin(a) * R;
        y = Math.sin(a) * R * Math.sin(ring.tilt);
      } else if (ring.axis === 'x') {
        y = Math.cos(a) * R;
        z = Math.sin(a) * R;
        x = Math.sin(a) * R * Math.sin(ring.tilt);
      } else {
        x = Math.cos(a) * R;
        y = Math.sin(a) * R;
        z = Math.cos(a) * R * Math.sin(ring.tilt);
      }
      project3D(x, y, z, _p);
      if (i === 0) cx.moveTo(_p.sx, _p.sy);
      else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  }
  cx.setLineDash([]);

  // Polo nord e polo sud dell'asse polare dell'atlante
  project3D(0, -R * 1.08, 0, _p);
  if (_p.sx > -20 && _p.sx < W + 20 && _p.sy > -20 && _p.sy < H + 20) {
    cx.fillStyle = cvT.ringOuter;
    cx.beginPath(); cx.arc(_p.sx, _p.sy, 2.5, 0, Math.PI * 2); cx.fill();
  }
  project3D(0, R * 1.08, 0, _p);
  if (_p.sx > -20 && _p.sx < W + 20 && _p.sy > -20 && _p.sy < H + 20) {
    cx.fillStyle = cvT.ringOuter;
    cx.beginPath(); cx.arc(_p.sx, _p.sy, 2.5, 0, Math.PI * 2); cx.fill();
  }

  cx.restore();
}

export function draw3DBackground(cx, t, focus = 0) {
  const cvT = getThemeTokens().canvas;
  const isLight = getResolvedTheme() === 'light';
  const { W, H } = state;
  if (!bg) buildBackground();
  cx.drawImage(bg, 0, 0, W, H);

  if (!state.ecoMode) {
    const drift = RM ? 0 : t * 0.000018;
    cx.fillStyle = cvT.dust;
    for (const d of dust) {
      const x = ((d.x + drift * d.s) % 1) * W;
      const y = ((d.y + drift * d.s * 0.4) % 1) * H;
      cx.fillRect(x, y, d.r, d.r);
    }
  }

  // Sfera armillare 3D
  drawArmillarySphere(cx, focus);

  // Archetipi evolutivi 3D interattivi, piani orbitali e callout anatomici
  drawSpecimens3D(cx, t);

  // Anelli ottici di inquadratura del viewport
  const r = Math.min(W, H) * 0.37;
  const s = r * (0.9 + 0.1 * state.cam3D.zoom);
  cx.save();
  cx.globalAlpha = 1 - 0.55 * focus;
  cx.strokeStyle = cvT.ringOuter;
  cx.lineWidth = isLight ? 1.15 : 1;
  cx.setLineDash([2, 9]);
  cx.beginPath(); cx.arc(W / 2, H / 2, s, 0, Math.PI * 2); cx.stroke();

  cx.strokeStyle = cvT.ringInner;
  cx.setLineDash([14, 10, 2, 10]);
  cx.beginPath(); cx.arc(W / 2, H / 2, s * 0.62, 0, Math.PI * 2); cx.stroke();
  cx.restore();
}

export function drawClusterLabels(cx, labels, alpha) {
  if (alpha < 0.02 || !labels.length) return;
  const cvT = getThemeTokens().canvas;
  cx.save();
  cx.textAlign = 'center';
  cx.lineJoin = 'round';
  cx.lineWidth = 4;
  cx.strokeStyle = cvT.labelStroke;
  for (const l of labels) {
    project3D(l.x, l.y, l.z, _p);
    cx.globalAlpha = alpha * Math.min(1, Math.max(0.25, _p.scale));
    cx.font = 'italic 600 15.5px Fraunces, Georgia, serif';
    cx.strokeText(l.text, _p.sx, _p.sy);
    cx.fillStyle = l.color;
    cx.fillText(l.text, _p.sx, _p.sy);
  }
  cx.restore();
}
