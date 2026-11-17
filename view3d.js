/* ============================================================
   view3d.js — proiezione prospettica trackball 3D, sfera
   armillare graduata, campo stellare a parallasse e tavole
   evolutive con geometria costruttiva
   ============================================================ */
import { state, RM, clamp } from './data.js';
import { getThemeTokens, registerThemeHook } from './theme.js';

const FOV = 2.6;

export function project3D(x, y, z, out, c = state.cam3D) {
  const { W, H } = state;
  const m = c.rot;
  const x1 = m[0] * x + m[1] * y + m[2] * z;
  const y2 = m[4] * x + m[5] * y + m[6] * z;
  const z2 = m[8] * x + m[9] * y + m[10] * z;

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
  const minS = state.W <= 760 ? 28 : 24;
  return clamp(38 * Math.sqrt(zoom), minS, 104);
};

/* ---------- sfondo e luce cursore pre-renderizzati ---------- */
let bg = null;
let spotSprite = null;

export function buildBackground() {
  const cvT = getThemeTokens().canvas;
  const { W, H } = state;
  const w = Math.max(1, Math.ceil(W * 0.5));
  const h = Math.max(1, Math.ceil(H * 0.5));
  bg = document.createElement('canvas');
  bg.width = w; bg.height = h;
  const g = bg.getContext('2d');
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.85);
  r.addColorStop(0, cvT.bg0);
  r.addColorStop(0.52, cvT.bg1);
  r.addColorStop(1, cvT.bg2);
  g.fillStyle = r;
  g.fillRect(0, 0, w, h);

  if (!spotSprite) {
    spotSprite = document.createElement('canvas');
    spotSprite.width = spotSprite.height = 256;
    const sg = spotSprite.getContext('2d');
    const gr = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, cvT.spot0);
    gr.addColorStop(0.5, cvT.spot1);
    gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sg.fillStyle = gr;
    sg.fillRect(0, 0, 256, 256);
  }
}

let art = null, artKey = '', artT = -1;

export function invalidateView3DTheme() {
  spotSprite = null;
  artT = -1;
  if (state.W > 0 && state.H > 0) buildBackground();
}

registerThemeHook(invalidateView3DTheme);

const dust = Array.from({ length: 85 }, (_, idx) => ({
  x: Math.random(),
  y: Math.random(),
  z: idx < 45 ? Math.random() * 0.45 : 0.45 + Math.random() * 0.55,
  s: idx < 45 ? Math.random() * 0.9 + 0.35 : Math.random() * 1.6 + 0.6,
  p: Math.random() * 6.3,
  v: Math.random() * 0.00028 + 0.00008
}));

function drawDust(cx, t) {
  if (state.ecoMode) return;
  const cvT = getThemeTokens().canvas;
  const { W, H, cam3D } = state;
  cx.fillStyle = cvT.dust;
  cx.beginPath();
  for (const d of dust) {
    if (!RM) { d.y -= d.v; if (d.y < 0) d.y = 1; }
    const x = (((d.x * W - cam3D.yaw * W * 0.18 * (0.25 + d.z) + cam3D.panX * 0.22 * d.z) % W) + W) % W;
    const y = (((d.y * H - cam3D.pitch * H * 0.12 * d.z + cam3D.panY * 0.14 * d.z) % H) + H) % H;
    const rad = d.s * (0.55 + d.z * 0.75) * (0.78 + 0.22 * Math.sin(t * 0.002 + d.p));
    cx.moveTo(x + rad, y);
    cx.arc(x, y, rad, 0, Math.PI * 2);
  }
  cx.fill();
}

const _p = { sx: 0, sy: 0, scale: 1, zOrder: 0 };
const _p2 = { sx: 0, sy: 0, scale: 1, zOrder: 0 };

function drawRings(cx) {
  if (state.ecoMode) return;
  const cvT = getThemeTokens().canvas;
  cx.save();
  cx.lineWidth = 1;

  // Equatore astrolabico principale e orbita interna
  cx.setLineDash([3, 7]);
  [[1.04, cvT.ringOuter], [0.56, cvT.ringInner]].forEach(([R, stroke]) => {
    cx.strokeStyle = stroke;
    cx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const ang = (i / 72) * Math.PI * 2;
      project3D(Math.cos(ang) * R, 0, Math.sin(ang) * R, _p);
      if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  });

  // Tacche graduate sull'equatore astrolabico (36 settori da 10°)
  cx.setLineDash([]);
  cx.strokeStyle = cvT.ringOuter;
  cx.beginPath();
  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2;
    const isCard = i % 9 === 0;
    const r0 = isCard ? 0.96 : i % 3 === 0 ? 0.99 : 1.01;
    const r1 = isCard ? 1.11 : i % 3 === 0 ? 1.08 : 1.06;
    project3D(Math.cos(ang) * r0, 0, Math.sin(ang) * r0, _p);
    project3D(Math.cos(ang) * r1, 0, Math.sin(ang) * r1, _p2);
    cx.moveTo(_p.sx, _p.sy);
    cx.lineTo(_p2.sx, _p2.sy);
  }
  cx.stroke();

  // Indicatori cardinali sull'equatore (0°, 90°, 180°, 270°)
  cx.font = '500 9.5px "JetBrains Mono", monospace';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillStyle = cvT.ringOuter;
  const cardinals = ['0°', '90°', '180°', '270°'];
  for (let c = 0; c < 4; c++) {
    const ang = (c / 4) * Math.PI * 2;
    project3D(Math.cos(ang) * 1.17, 0, Math.sin(ang) * 1.17, _p);
    if (_p.scale > 0.62) {
      cx.globalAlpha = clamp((_p.scale - 0.62) * 1.4, 0.25, 0.78);
      cx.fillText(cardinals[c], _p.sx, _p.sy);
    }
  }
  cx.globalAlpha = 1;

  // Anello eclittico inclinato di 23.5°
  const tilt = 0.41;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  cx.setLineDash([2, 8]);
  cx.strokeStyle = cvT.ringMeridian;
  cx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const ang = (i / 72) * Math.PI * 2;
    const bx = Math.cos(ang) * 1.04;
    const bz = Math.sin(ang) * 1.04;
    project3D(bx * ct, bx * st, bz, _p);
    if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  }
  cx.stroke();

  // Meridiano verticale ortogonale
  cx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const ang = (i / 72) * Math.PI * 2;
    project3D(Math.cos(ang) * 1.04, Math.sin(ang) * 1.04, 0, _p);
    if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  }
  cx.stroke();

  // Asse polare zenit-nadir con nodi terminali
  cx.setLineDash([2, 9]);
  project3D(0, -1.10, 0, _p);
  project3D(0, 1.10, 0, _p2);
  cx.beginPath();
  cx.moveTo(_p.sx, _p.sy);
  cx.lineTo(_p2.sx, _p2.sy);
  cx.stroke();
  cx.setLineDash([]);
  cx.fillStyle = cvT.ringOuter;
  cx.beginPath();
  cx.arc(_p.sx, _p.sy, 2.5, 0, Math.PI * 2);
  cx.arc(_p2.sx, _p2.sy, 2.5, 0, Math.PI * 2);
  cx.fill();

  cx.restore();
}

export function draw3DBackground(cx, t, focus) {
  const { W, H, cam3D, mx, my, ecoMode } = state;
  const px = clamp(cam3D.panX * 0.05, -W * 0.09, W * 0.09);
  const py = clamp(cam3D.panY * 0.05, -H * 0.09, H * 0.09);
  if (bg) cx.drawImage(bg, -W * 0.1 + px, -H * 0.1 + py, W * 1.2, H * 1.2);

  if (!ecoMode && mx > 0 && spotSprite) {
    cx.drawImage(spotSprite, mx - 260, my - 260, 520, 520);
  }

  drawDust(cx, t);
  drawRings(cx);

  if (!ecoMode) {
    drawArtLayer(cx, t, 1 - 0.65 * focus);
  }
}

function drawArtLayer(cx, t, alpha) {
  const { W, H, cam3D } = state;
  const sc = 1;
  const key = `${W}|${H}|${state.palette}|${state.themeMode}`;
  if (!art) art = document.createElement('canvas');
  if (artKey !== key) {
    art.width = Math.max(1, Math.round(W * sc));
    art.height = Math.max(1, Math.round(H * sc));
    artKey = key;
    artT = -1;
  }
  if (artT < 0 || (!RM && t - artT > 240)) {
    const g = art.getContext('2d');
    g.setTransform(sc, 0, 0, sc, 0, 0);
    g.clearRect(0, 0, W, H);
    drawBackgroundArt(g, t);
    artT = t;
  }
  cx.globalAlpha = alpha;
  cx.drawImage(art, cam3D.panX * 0.08, cam3D.panY * 0.05, W, H);
  cx.globalAlpha = 1;
}

export function drawClusterLabels(cx, labels, alpha) {
  const cvT = getThemeTokens().canvas;
  cx.save();
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.lineJoin = 'round';
  cx.lineWidth = 3.5;
  for (const L of labels) {
    project3D(L.x, L.y, L.z, _p);
    const a = clamp((_p.scale - 0.55) / 0.8, 0.22, 1) * alpha;
    cx.font = `italic 600 ${Math.max(14, 19 * _p.scale)}px Fraunces, Georgia, serif`;
    cx.globalAlpha = a;
    cx.strokeStyle = cvT.labelStroke;
    cx.strokeText(L.text, _p.sx, _p.sy);
    cx.fillStyle = L.color;
    cx.fillText(L.text, _p.sx, _p.sy);
  }
  cx.restore();
}

/* ---------- illustrazioni di sfondo con geometria costruttiva ---------- */
function drawBlueprintHalo(cx, rgb, sa, r1, r2) {
  cx.save();
  cx.strokeStyle = rgb + (0.18 * sa).toFixed(2) + ')';
  cx.lineWidth = 0.85;
  cx.setLineDash([2, 6]);
  cx.beginPath();
  cx.arc(0, 0, r1, 0, Math.PI * 2);
  cx.moveTo(r2, 0);
  cx.arc(0, 0, r2, 0, Math.PI * 2);
  cx.moveTo(-r2 - 14, 0); cx.lineTo(r2 + 14, 0);
  cx.moveTo(0, -r2 - 14); cx.lineTo(0, r2 + 14);
  cx.stroke();
  cx.restore();
}

function drawBackgroundArt(cx, t) {
  const cvT = getThemeTokens().canvas;
  const { W, H } = state;
  const s = Math.min(W, H) / 560;
  const rm = RM ? 0 : 1;
  const px = 0, py = 0;
  const F = 'Fraunces,Georgia,serif';
  const fa = cvT.artFillAlpha;
  const sa = cvT.artStrokeAlpha;

  const cap = (a, b, x, y, rgb) => {
    const sg = rgb || cvT.art1;
    const m = Math.min(310, W * 0.8);
    x = Math.min(W - m / 2 - 8, Math.max(m / 2 + 8, x));
    cx.textAlign = 'center';
    cx.fillStyle = sg + (0.68 * sa).toFixed(2) + ')';
    cx.font = 'italic 600 ' + Math.max(14, 18 * s) + 'px ' + F;
    cx.fillText(a, x, y, m);
    cx.fillStyle = sg + (0.46 * sa).toFixed(2) + ')';
    cx.font = 'italic 400 ' + Math.max(11.5, 13.5 * s) + 'px ' + F;
    cx.fillText(b, x, y + Math.max(16, 19 * s), m);
  };

  // 1. ARCHAEOPTERYX
  const c1 = cvT.art1;
  cx.save();
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  cx.translate(W * 0.56 + px, H * 0.21 + py + Math.sin(t * 0.0005) * 7 * rm);
  cx.rotate(-0.08 + Math.sin(t * 0.0004) * 0.018 * rm);
  cx.scale(s * 0.95, s * 0.95);
  drawBlueprintHalo(cx, c1, sa, 46, 78);

  cx.strokeStyle = c1 + (0.68 * sa).toFixed(2) + ')';
  cx.fillStyle = c1 + fa.toFixed(2) + ')';
  cx.lineWidth = 1.65;
  cx.beginPath();
  cx.moveTo(-36, -12);
  cx.bezierCurveTo(-12, -24, 24, -18, 42, 4);
  cx.bezierCurveTo(22, 20, -14, 22, -36, 8);
  cx.closePath();
  cx.fill();
  cx.stroke();

  cx.beginPath();
  cx.moveTo(-34, -8);
  cx.quadraticCurveTo(-54, -22, -62, -34);
  cx.moveTo(-30, 2);
  cx.quadraticCurveTo(-48, -12, -58, -26);
  cx.moveTo(-58, -36);
  cx.arc(-68, -36, 10, 0, Math.PI * 2);
  cx.moveTo(-78, -37);
  cx.lineTo(-98, -31);
  cx.lineTo(-78, -29);
  cx.stroke();
  cx.fillStyle = c1 + (0.85 * sa).toFixed(2) + ')';
  cx.beginPath();
  cx.arc(-71, -38, 1.8, 0, Math.PI * 2);
  cx.fill();

  cx.strokeStyle = c1 + (0.62 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.4;
  cx.beginPath();
  cx.moveTo(42, 4);
  cx.quadraticCurveTo(130, 14, 224, 24);
  cx.stroke();
  cx.strokeStyle = c1 + (0.42 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.2;
  cx.beginPath();
  for (let i = 1; i <= 15; i++) {
    const u = i / 15;
    const bx = 42 + u * 182;
    const by = 4 + u * 20 + Math.sin(t * 0.0012 + i * 0.35) * 2 * rm;
    const fan = 10 + Math.sin(u * Math.PI) * 14;
    cx.moveTo(bx, by);
    cx.quadraticCurveTo(bx + 10, by - fan * 0.6, bx + 20, by - fan);
    cx.moveTo(bx, by);
    cx.quadraticCurveTo(bx + 10, by + fan * 0.6, bx + 20, by + fan);
  }
  cx.stroke();

  const fl = Math.sin(t * 0.0014) * 0.09 * rm;
  cx.strokeStyle = c1 + (0.72 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.5;
  cx.beginPath();
  for (let k = 0; k < 11; k++) {
    const a = -2.65 + k * 0.19 + fl;
    const L = 56 + k * 6.5;
    const ex = -6 + Math.cos(a) * L;
    const ey = -12 + Math.sin(a) * L;
    cx.moveTo(-6, -12);
    cx.quadraticCurveTo((-6 + ex) / 2 + 6, (-12 + ey) / 2 - 9, ex, ey);
  }
  cx.moveTo(-42, -46);
  cx.quadraticCurveTo(-50, -54, -55, -52);
  cx.moveTo(-36, -52);
  cx.quadraticCurveTo(-43, -61, -49, -59);
  cx.moveTo(-29, -57);
  cx.quadraticCurveTo(-35, -66, -41, -65);
  cx.stroke();

  cx.strokeStyle = c1 + (0.66 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.6;
  cx.beginPath();
  cx.moveTo(2, 16);
  cx.lineTo(-8, 38);
  cx.lineTo(-22, 54);
  cx.lineTo(-33, 58);
  cx.moveTo(-22, 54);
  cx.lineTo(-29, 63);
  cx.moveTo(-22, 54);
  cx.lineTo(-17, 63);
  cx.stroke();
  cx.restore();
  cap('archaeopteryx', 'Giurassico, circa 150 milioni di anni fa', W * 0.56 + px + 35 * s, H * 0.21 + py + 106 * s, c1);

  // 2. PETTIROSSO
  const c2 = cvT.art2;
  cx.save();
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  cx.translate(W * 0.22 - px * 0.9, H * 0.77 + py + Math.sin(t * 0.0006 + 1.2) * 5 * rm);
  cx.scale(s * 0.96, s * 0.96);
  drawBlueprintHalo(cx, c2, sa, 38, 62);

  cx.strokeStyle = c1 + (0.36 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.4;
  cx.beginPath();
  cx.moveTo(-46, 52);
  cx.quadraticCurveTo(2, 46, 48, 50);
  cx.moveTo(24, 48);
  cx.lineTo(36, 41);
  cx.stroke();

  cx.strokeStyle = c1 + (0.62 * sa).toFixed(2) + ')';
  cx.fillStyle = c1 + (fa * 0.8).toFixed(2) + ')';
  cx.lineWidth = 1.6;
  cx.beginPath();
  cx.moveTo(-24, 8);
  cx.lineTo(-64, 29);
  cx.lineTo(-59, 36);
  cx.lineTo(-18, 17);
  cx.closePath();
  cx.fill();
  cx.stroke();

  cx.beginPath();
  cx.moveTo(10, -34);
  cx.bezierCurveTo(28, -34, 34, -18, 32, -4);
  cx.bezierCurveTo(32, 16, 14, 26, -8, 22);
  cx.bezierCurveTo(-28, 18, -34, -2, -22, -16);
  cx.bezierCurveTo(-12, -26, -2, -34, 10, -34);
  cx.fill();
  cx.stroke();

  cx.fillStyle = c2 + (0.28 * sa).toFixed(2) + ')';
  cx.strokeStyle = c2 + (0.78 * sa).toFixed(2) + ')';
  cx.beginPath();
  cx.moveTo(22, -26);
  cx.bezierCurveTo(34, -18, 34, 4, 18, 15);
  cx.bezierCurveTo(6, 12, 6, -12, 22, -26);
  cx.fill();
  cx.stroke();

  cx.strokeStyle = c1 + (0.58 * sa).toFixed(2) + ')';
  cx.beginPath();
  cx.moveTo(-4, -10);
  cx.quadraticCurveTo(-24, 0, -40, 14);
  cx.moveTo(-10, -3);
  cx.quadraticCurveTo(-26, 5, -37, 15);
  cx.stroke();

  cx.fillStyle = c1 + (0.9 * sa).toFixed(2) + ')';
  cx.beginPath();
  cx.arc(21, -22, 2.5, 0, Math.PI * 2);
  cx.fill();
  cx.strokeStyle = c1 + (0.75 * sa).toFixed(2) + ')';
  cx.beginPath();
  cx.moveTo(31, -22);
  cx.lineTo(45, -19);
  cx.lineTo(31, -17);
  cx.stroke();

  cx.lineWidth = 1.4;
  cx.beginPath();
  cx.moveTo(-4, 22);
  cx.lineTo(-9, 47);
  cx.moveTo(-14, 48);
  cx.lineTo(-3, 47);
  cx.moveTo(7, 21);
  cx.lineTo(5, 47);
  cx.moveTo(0, 47);
  cx.lineTo(11, 47);
  cx.stroke();
  cx.restore();
  cap('Erithacus rubecula', 'il Pettirosso: erede vivente dei teropodi aviani', W * 0.22 - px * 0.9, H * 0.77 + py + 76 * s, c2);

  // 3. GRILLO DI KAUAI
  const c3 = cvT.art3;
  cx.save();
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  cx.translate(W * 0.78 + px * 1.2, H * 0.74 + py + Math.cos(t * 0.0006) * 5 * rm);
  cx.scale(s * 0.96, s * 0.96);
  drawBlueprintHalo(cx, c3, sa, 38, 64);

  cx.strokeStyle = c3 + (0.68 * sa).toFixed(2) + ')';
  cx.fillStyle = c3 + (fa * 1.1).toFixed(2) + ')';
  cx.lineWidth = 1.65;
  cx.beginPath();
  cx.ellipse(-4, 2, 38, 12, -0.04, 0, Math.PI * 2);
  cx.fill();
  cx.stroke();

  cx.beginPath();
  cx.ellipse(34, -2, 12, 11, 0, 0, Math.PI * 2);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.arc(50, -3, 9.5, 0, Math.PI * 2);
  cx.fill();
  cx.stroke();
  cx.fillStyle = c3 + (0.85 * sa).toFixed(2) + ')';
  cx.beginPath();
  cx.arc(53, -5, 2, 0, Math.PI * 2);
  cx.fill();

  cx.fillStyle = c3 + (fa * 1.3).toFixed(2) + ')';
  cx.strokeStyle = c3 + (0.72 * sa).toFixed(2) + ')';
  cx.beginPath();
  cx.moveTo(-28, -8);
  cx.quadraticCurveTo(2, -23, 30, -8);
  cx.quadraticCurveTo(2, -12, -28, -8);
  cx.fill();
  cx.stroke();

  cx.strokeStyle = c3 + (0.55 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.3;
  cx.beginPath();
  [-1, 1].forEach(d => {
    cx.moveTo(57, -9);
    cx.bezierCurveTo(
      88, -38 + Math.sin(t * 0.003 + d) * 5 * rm,
      118, -32 + d * 10,
      148, -58 + d * 14 + Math.sin(t * 0.0025) * 7 * rm
    );
  });
  cx.stroke();

  cx.fillStyle = c3 + (fa * 1.4).toFixed(2) + ')';
  cx.strokeStyle = c3 + (0.76 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.6;
  cx.beginPath();
  cx.moveTo(-4, 6);
  cx.quadraticCurveTo(-24, -22, -40, -15);
  cx.quadraticCurveTo(-28, 2, -4, 6);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.moveTo(-40, -15);
  cx.lineTo(-64, 26);
  cx.lineTo(-76, 33);
  cx.moveTo(32, 8);
  cx.lineTo(41, 30);
  cx.lineTo(34, 40);
  cx.moveTo(14, 10);
  cx.lineTo(20, 32);
  cx.lineTo(12, 42);
  cx.moveTo(-40, 2);
  cx.lineTo(-60, -4);
  cx.moveTo(-40, 5);
  cx.lineTo(-62, 9);
  cx.stroke();

  cx.setLineDash([2, 7]);
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.0005 + i / 3) % 1;
    cx.strokeStyle = c3 + (Math.pow(1 - q, 3) * 0.65 * sa).toFixed(2) + ')';
    cx.beginPath();
    cx.arc(2, -18, 14 + q * 78, -1.4, -0.2);
    cx.stroke();
  }
  cx.setLineDash([]);
  cx.restore();
  cap('Kauai: i grilli che hanno perso il canto', 'l’ala piatta li rende muti e li salva dalla mosca parassita', W * 0.78 + px * 1.2 - 20 * s, H * 0.74 + py + 72 * s, c3);
}
