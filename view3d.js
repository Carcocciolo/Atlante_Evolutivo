/* ============================================================
   view3d.js — proiezione prospettica, sfondo immersivo
   (gradiente, polvere con parallasse, anelli, illustrazioni)
   ed etichette dei gruppi
   ============================================================ */
import { state, RM, clamp } from './data.js';

const FOV = 2.6;

/** Proietta un punto 3D; scrive il risultato in `out` per non allocare ad ogni frame. */
export function project3D(x, y, z, out, c = state.cam3D) {
  const { W, H } = state;
  const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  const depth = FOV / Math.max(0.35, FOV + z2);
  const k = Math.min(W, H) * 0.44 * c.zoom * depth;
  out.sx = W / 2 + c.panX + x1 * k;
  out.sy = H / 2 + c.panY + y2 * k;
  out.scale = depth;
  out.zOrder = z2;
  return out;
}

export const thumbSize3D = zoom => clamp(38 * Math.sqrt(zoom), 24, 104);

/* ---------- sfondo ---------- */
let bg = null;
export function buildBackground() {
  const { W, H } = state;
  const w = Math.ceil(W * 0.6), h = Math.ceil(H * 0.6);   // 1.2× lo schermo, mezza risoluzione
  bg = document.createElement('canvas');
  bg.width = w; bg.height = h;
  const g = bg.getContext('2d');
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.78);
  r.addColorStop(0, '#7a3216');
  r.addColorStop(0.5, '#3b170b');
  r.addColorStop(1, '#150704');
  g.fillStyle = r;
  g.fillRect(0, 0, w, h);
}

const dust = Array.from({ length: 90 }, () => ({
  x: Math.random(), y: Math.random(), z: Math.random(),
  s: Math.random() * 1.6 + 0.4, p: Math.random() * 6.3, v: Math.random() * 0.00035 + 0.0001
}));

function drawDust(cx, t) {
  const { W, H, cam3D } = state;
  for (const d of dust) {
    if (!RM) { d.y -= d.v; if (d.y < 0) d.y = 1; }
    const x = (((d.x * W - cam3D.yaw * W * 0.16 * (0.3 + d.z) + cam3D.panX * 0.2 * d.z) % W) + W) % W;
    const y = (((d.y * H - cam3D.pitch * H * 0.1 * d.z) % H) + H) % H;
    cx.fillStyle = `rgba(255, 214, 170, ${(0.12 + 0.3 * d.z) * (0.65 + 0.35 * Math.sin(t * 0.002 + d.p))})`;
    cx.beginPath();
    cx.arc(x, y, d.s * (0.6 + d.z * 0.7), 0, Math.PI * 2);
    cx.fill();
  }
}

const _p = { sx: 0, sy: 0, scale: 1, zOrder: 0 };

function drawRings(cx) {
  cx.save();
  cx.lineWidth = 1;
  cx.setLineDash([4, 10]);
  [[0.95, 0.14], [0.55, 0.08]].forEach(([R, a]) => {
    cx.strokeStyle = `rgba(250, 205, 165, ${a})`;
    cx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const ang = (i / 72) * Math.PI * 2;
      project3D(Math.cos(ang) * R, 0, Math.sin(ang) * R, _p);
      if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  });
  cx.restore();
}

export function draw3DBackground(cx, t, focus) {
  const { W, H, cam3D, mx, my } = state;
  const px = clamp(cam3D.panX * 0.05, -W * 0.09, W * 0.09);
  const py = clamp(cam3D.panY * 0.05, -H * 0.09, H * 0.09);
  cx.drawImage(bg, -W * 0.1 + px, -H * 0.1 + py, W * 1.2, H * 1.2);

  if (mx > 0) {
    const sg = cx.createRadialGradient(mx, my, 0, mx, my, 260);
    sg.addColorStop(0, 'rgba(255, 205, 150, 0.14)');
    sg.addColorStop(1, 'rgba(255, 205, 150, 0)');
    cx.fillStyle = sg;
    cx.fillRect(0, 0, W, H);
  }

  drawDust(cx, t);
  drawRings(cx);

  cx.save();
  cx.globalAlpha = 1 - 0.6 * focus;
  drawBackgroundArt(cx, t);
  cx.restore();
}

/** Nome di ogni gruppo sospeso al centro della sua nuvola di tavole. */
export function drawClusterLabels(cx, labels, alpha) {
  cx.save();
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.lineJoin = 'round';
  cx.lineWidth = 3;
  for (const L of labels) {
    project3D(L.x, L.y, L.z, _p);
    const a = clamp((_p.scale - 0.55) / 0.8, 0.18, 1) * alpha;
    cx.font = `italic 600 ${Math.max(13, 17 * _p.scale)}px Fraunces, Georgia, serif`;
    cx.globalAlpha = a;
    cx.strokeStyle = 'rgba(20, 8, 4, 0.75)';
    cx.strokeText(L.text, _p.sx, _p.sy);
    cx.fillStyle = L.color;
    cx.fillText(L.text, _p.sx, _p.sy);
  }
  cx.restore();
}

/* ---------- illustrazioni di sfondo (Archaeopteryx, pettirosso, grillo) ---------- */
function drawBackgroundArt(cx, t) {
  const { W, H, cam3D } = state;
  const s = Math.min(W, H) / 560;
  const rm = RM ? 0 : 1;
  const px = cam3D.panX * 0.08;
  const py = cam3D.panY * 0.05;
  const F = 'Fraunces,Georgia,serif';

  const cap = (a, b, x, y, rgb) => {
    const sg = rgb || 'rgba(250,214,176,';
    const m = Math.min(310, W * 0.8);
    x = Math.min(W - m / 2 - 8, Math.max(m / 2 + 8, x));
    cx.textAlign = 'center';
    cx.fillStyle = sg + '.58)';
    cx.font = 'italic 600 ' + Math.max(14, 18 * s) + 'px ' + F;
    cx.fillText(a, x, y, m);
    cx.fillStyle = sg + '.38)';
    cx.font = 'italic 400 ' + Math.max(11.5, 13.5 * s) + 'px ' + F;
    cx.fillText(b, x, y + Math.max(16, 19 * s), m);
  };

  // 1. ARCHAEOPTERYX
  cx.save();
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  cx.translate(W * 0.56 + px, H * 0.21 + py + Math.sin(t * 0.0005) * 8 * rm);
  cx.rotate(-0.1 + Math.sin(t * 0.0004) * 0.02 * rm);
  cx.scale(s * 0.95, s * 0.95);
  cx.strokeStyle = 'rgba(255,138,36,.68)';
  cx.fillStyle = 'rgba(255,196,48,.12)';
  cx.lineWidth = 1.8;
  cx.beginPath();
  cx.ellipse(0, 0, 46, 19, -0.25, 0, 7);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.moveTo(-38, -12);
  cx.quadraticCurveTo(-56, -28, -64, -34);
  cx.moveTo(-60, -38);
  cx.arc(-70, -38, 10, 0, 7);
  cx.moveTo(-79, -38);
  cx.lineTo(-96, -33);
  cx.lineTo(-80, -31);
  cx.stroke();
  cx.fillRect(-74, -42, 2.5, 2.5);
  cx.strokeStyle = 'rgba(255,176,40,.65)';
  cx.beginPath();
  for (let i = 0; i < 16; i++) {
    const x = 44 + i * 11, y = 8 + i * 1.1 + Math.sin(t * 0.0012 + i * 0.4) * 2.5 * rm;
    cx.moveTo(x, y);
    cx.lineTo(x + 16, y + 14);
    cx.moveTo(x, y);
    cx.lineTo(x + 16, y - 4);
  }
  cx.moveTo(42, 6);
  cx.bezierCurveTo(110, 10, 170, 22, 230, 22);
  cx.moveTo(42, 12);
  cx.bezierCurveTo(110, 26, 170, 38, 230, 32);
  cx.stroke();
  const fl = Math.sin(t * 0.0014) * 0.12 * rm;
  cx.strokeStyle = 'rgba(255,214,70,.75)';
  cx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -2.6 + k * 0.2 + fl, L = 60 + k * 7, ex = -4 + Math.cos(a) * L, ey = -14 + Math.sin(a) * L;
    cx.moveTo(-4, -14);
    cx.quadraticCurveTo((-4 + ex) / 2 + 8, (-14 + ey) / 2 - 10, ex, ey);
  }
  cx.stroke();
  cx.strokeStyle = 'rgba(255,138,36,.68)';
  cx.beginPath();
  cx.moveTo(-2, 16);
  cx.lineTo(-10, 40);
  cx.lineTo(-24, 56);
  cx.lineTo(-34, 60);
  cx.moveTo(-24, 56);
  cx.lineTo(-30, 64);
  cx.moveTo(-24, 56);
  cx.lineTo(-18, 64);
  cx.stroke();
  cx.restore();
  cap('archaeopteryx', 'Giurassico, circa 150 milioni di anni fa', W * 0.56 + px + 35 * s, H * 0.21 + py + 108 * s, 'rgba(255,172,52,');

  // 2. PETTIROSSO — Erithacus rubecula
  cx.save();
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  cx.translate(W * 0.22 - px * 0.9, H * 0.77 + py + Math.sin(t * 0.0006 + 1.2) * 6 * rm);
  cx.scale(s * 0.95, s * 0.95);
  cx.strokeStyle = 'rgba(250,206,162,.62)';
  cx.fillStyle = 'rgba(250,206,162,.08)';
  cx.lineWidth = 1.7;
  cx.beginPath();
  cx.ellipse(0, 0, 36, 26, -0.35, 0, 7);
  cx.fill();
  cx.stroke();
  cx.fillStyle = 'rgba(255,108,58,.28)';
  cx.strokeStyle = 'rgba(255,118,68,.75)';
  cx.beginPath();
  cx.arc(16, -8, 17, -1.6, 1.4);
  cx.fill();
  cx.stroke();
  cx.strokeStyle = 'rgba(250,206,162,.68)';
  cx.beginPath();
  cx.arc(22, -22, 15, 0, 7);
  cx.stroke();
  cx.fillStyle = 'rgba(255,228,196,.85)';
  cx.beginPath();
  cx.arc(26, -24, 2.3, 0, 7);
  cx.fill();
  cx.beginPath();
  cx.moveTo(36, -23);
  cx.lineTo(49, -20);
  cx.lineTo(36, -18);
  cx.stroke();
  cx.beginPath();
  cx.moveTo(-8, -10);
  cx.quadraticCurveTo(-28, 2, -46, 18);
  cx.moveTo(-30, 14);
  cx.lineTo(-68, 34);
  cx.lineTo(-64, 41);
  cx.lineTo(-26, 20);
  cx.moveTo(-2, 23);
  cx.lineTo(-6, 48);
  cx.moveTo(-14, 48);
  cx.lineTo(4, 48);
  cx.moveTo(8, 21);
  cx.lineTo(6, 46);
  cx.moveTo(-2, 46);
  cx.lineTo(14, 46);
  cx.stroke();
  cx.restore();
  cap('Erithacus rubecula', 'il Pettirosso: erede vivente dei teropodi aviani', W * 0.22 - px * 0.9, H * 0.77 + py + 76 * s, 'rgba(255,152,102,');

  // 3. GRILLO DI KAUAI
  cx.save();
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  cx.translate(W * 0.78 + px * 1.2, H * 0.74 + py + Math.cos(t * 0.0006) * 5 * rm);
  cx.scale(s * 0.95, s * 0.95);
  cx.strokeStyle = 'rgba(112,200,86,.68)';
  cx.fillStyle = 'rgba(112,200,86,.12)';
  cx.lineWidth = 1.8;
  cx.beginPath();
  cx.ellipse(0, 0, 42, 13, 0, 0, 7);
  cx.fill();
  cx.stroke();
  cx.beginPath();
  cx.arc(52, -3, 11, 0, 7);
  cx.stroke();
  cx.beginPath();
  [-1, 1].forEach(d => {
    cx.moveTo(60, -10);
    cx.bezierCurveTo(90, -40 + Math.sin(t * 0.003 + d) * 6 * rm, 120, -30 + d * 10, 150, -60 + d * 14 + Math.sin(t * 0.0025) * 8 * rm);
  });
  cx.moveTo(-30, -10);
  cx.quadraticCurveTo(0, -30, 34, -8);
  cx.quadraticCurveTo(0, -12, -30, -10);
  cx.moveTo(-10, 8);
  cx.lineTo(-40, -14);
  cx.lineTo(-66, 26);
  cx.lineTo(-76, 34);
  cx.moveTo(28, 10);
  cx.lineTo(38, 32);
  cx.lineTo(30, 42);
  cx.moveTo(10, 11);
  cx.lineTo(16, 34);
  cx.lineTo(8, 44);
  cx.moveTo(-42, 0);
  cx.lineTo(-62, -6);
  cx.moveTo(-42, 3);
  cx.lineTo(-64, 6);
  cx.stroke();
  cx.setLineDash([2, 7]);
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.0005 + i / 3) % 1;
    cx.strokeStyle = 'rgba(140,222,104,' + (Math.pow(1 - q, 3) * 0.7) + ')';
    cx.beginPath();
    cx.arc(0, -20, 14 + q * 80, -1.4, -0.2);
    cx.stroke();
  }
  cx.setLineDash([]);
  cx.restore();
  cap('Kauai: i grilli che hanno perso il canto', 'l’ala piatta li rende muti e li salva dalla mosca parassita', W * 0.78 + px * 1.2 - 20 * s, H * 0.74 + py + 72 * s, 'rgba(132,214,100,');
}

