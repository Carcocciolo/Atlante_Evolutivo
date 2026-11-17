/* ============================================================
   view3d.js — proiezione prospettica, sfera armillare,
   nebulose di categoria e illustrazioni interattive
   ============================================================ */
import { state, RM, clamp, rgba } from './data.js';

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

/* ---------- sfondo, luce cursore e sprite nebulosa ---------- */
let bg = null;
let spotSprite = null;
const nebulaCache = new Map();

function nebulaSprite(color) {
  let c = nebulaCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, rgba(color, 0.22));
  r.addColorStop(0.42, rgba(color, 0.08));
  r.addColorStop(1, rgba(color, 0));
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  nebulaCache.set(color, c);
  return c;
}

export function buildBackground() {
  const { W, H } = state;
  const w = Math.max(1, Math.ceil(W * 0.5));
  const h = Math.max(1, Math.ceil(H * 0.5));
  bg = document.createElement('canvas');
  bg.width = w; bg.height = h;
  const g = bg.getContext('2d');
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.78);
  r.addColorStop(0, '#3b170b');
  r.addColorStop(0.52, '#190804');
  r.addColorStop(1, '#080201');
  g.fillStyle = r;
  g.fillRect(0, 0, w, h);

  if (!spotSprite) {
    spotSprite = document.createElement('canvas');
    spotSprite.width = spotSprite.height = 256;
    const sg = spotSprite.getContext('2d');
    const gr = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255, 196, 140, 0.11)');
    gr.addColorStop(1, 'rgba(255, 196, 140, 0)');
    sg.fillStyle = gr;
    sg.fillRect(0, 0, 256, 256);
  }
}

const dust = Array.from({ length: 65 }, () => ({
  x: Math.random(), y: Math.random(), z: Math.random(),
  s: Math.random() * 1.5 + 0.5, p: Math.random() * 6.3, v: Math.random() * 0.0003 + 0.0001
}));

function drawDust(cx, t) {
  const { W, H, cam3D } = state;
  cx.fillStyle = 'rgba(255, 214, 170, 0.22)';
  cx.beginPath();
  for (const d of dust) {
    if (!RM) { d.y -= d.v; if (d.y < 0) d.y = 1; }
    const x = (((d.x * W - cam3D.yaw * W * 0.16 * (0.3 + d.z) + cam3D.panX * 0.2 * d.z) % W) + W) % W;
    const y = (((d.y * H - cam3D.pitch * H * 0.1 * d.z) % H) + H) % H;
    const rad = d.s * (0.6 + d.z * 0.7) * (0.8 + 0.2 * Math.sin(t * 0.002 + d.p));
    cx.moveTo(x + rad, y);
    cx.arc(x, y, rad, 0, Math.PI * 2);
  }
  cx.fill();
}

const _p = { sx: 0, sy: 0, scale: 1, zOrder: 0 };

/** Sfera armillare 3D: anelli orbitali inclinati nello spazio. */
function drawArmillary(cx) {
  cx.save();
  cx.lineWidth = 1;
  const rings = [
    { R: 0.98, tiltX: 0.0, tiltZ: 0.0, a: 0.13, dash: [4, 10] },
    { R: 0.94, tiltX: 0.68, tiltZ: 0.25, a: 0.08, dash: [2, 12] },
    { R: 0.94, tiltX: -0.62, tiltZ: -0.35, a: 0.07, dash: [2, 14] },
    { R: 0.54, tiltX: 0.12, tiltZ: -0.1, a: 0.07, dash: [3, 9] }
  ];
  for (const ring of rings) {
    cx.setLineDash(ring.dash);
    cx.strokeStyle = `rgba(250, 205, 165, ${ring.a})`;
    cx.beginPath();
    const cx0 = Math.cos(ring.tiltX), sx0 = Math.sin(ring.tiltX);
    const cz0 = Math.cos(ring.tiltZ), sz0 = Math.sin(ring.tiltZ);
    for (let i = 0; i <= 64; i++) {
      const ang = (i / 64) * Math.PI * 2;
      const x0 = Math.cos(ang) * ring.R;
      const z0 = Math.sin(ang) * ring.R;
      const y1 = -z0 * sx0;
      const z1 = z0 * cx0;
      const x2 = x0 * cz0 - y1 * sz0;
      const y2 = x0 * sz0 + y1 * cz0;
      project3D(x2, y2, z1, _p);
      if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  }
  cx.restore();
}

/** Nebulose colorate soffuse dietro i baricentri dei cluster 3D. */
export function drawClusterNebulae(cx, focus) {
  const { items, col, W, H, cam3D } = state;
  if (!items.length) return;
  const acc = {};
  for (const it of items) {
    if (!it.vis) continue;
    const a = acc[it.cat] || (acc[it.cat] = { x: 0, y: 0, z: 0, n: 0 });
    a.x += it.x; a.y += it.y; a.z += it.z; a.n++;
  }
  cx.save();
  cx.globalCompositeOperation = 'lighter';
  const baseR = Math.min(W, H) * 0.34 * cam3D.zoom;
  for (const cat in acc) {
    const a = acc[cat];
    if (a.n < 2 || !col[cat]) continue;
    project3D(a.x / a.n, a.y / a.n, a.z / a.n, _p);
    const r = baseR * _p.scale;
    const boost = state.hovCat === cat ? 1.55 : 1.0;
    cx.globalAlpha = clamp(_p.scale * 0.85, 0.3, 1) * (1 - 0.55 * focus) * boost;
    cx.drawImage(nebulaSprite(col[cat]), _p.sx - r, _p.sy - r, r * 2, r * 2);
  }
  cx.restore();
}

export function draw3DBackground(cx, t, focus) {
  const { W, H, cam3D, mx, my } = state;
  const px = clamp(cam3D.panX * 0.05, -W * 0.09, W * 0.09);
  const py = clamp(cam3D.panY * 0.05, -H * 0.09, H * 0.09);
  if (bg) cx.drawImage(bg, -W * 0.1 + px, -H * 0.1 + py, W * 1.2, H * 1.2);

  if (mx > 0 && spotSprite) {
    cx.drawImage(spotSprite, mx - 260, my - 260, 520, 520);
  }

  drawDust(cx, t);
  drawArmillary(cx);
  drawClusterNebulae(cx, focus);

  drawBackgroundArt(cx, t, 1 - 0.65 * focus);
}

/** Nome di ogni gruppo sospeso al centro della sua nuvola di tavole. */
export function drawClusterLabels(cx, labels, alpha) {
  cx.save();
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.lineJoin = 'round';
  cx.lineWidth = 3.5;
  for (const L of labels) {
    project3D(L.x, L.y, L.z, _p);
    const a = clamp((_p.scale - 0.55) / 0.8, 0.22, 1) * alpha;
    cx.font = `italic 600 ${Math.max(13, 17 * _p.scale)}px Fraunces, Georgia, serif`;
    cx.globalAlpha = a;
    cx.strokeStyle = 'rgba(10, 3, 1, 0.88)';
    cx.strokeText(L.text, _p.sx, _p.sy);
    cx.fillStyle = L.color;
    cx.fillText(L.text, _p.sx, _p.sy);
  }
  cx.restore();
}

/* ---------- helper evidenziazione categoria per le illustrazioni ---------- */
function artHighlight(catName) {
  const active = state.hovCat || (state.sel >= 0 && state.items[state.sel]?.cat) || '';
  if (!active) return 1.0;
  return active === catName ? 1.55 : 0.42;
}

/* ---------- illustrazioni di sfondo (Archaeopteryx, pettirosso, grillo) ---------- */
function drawBackgroundArt(cx, t, baseAlpha = 1) {
  const { W, H, cam3D } = state;
  const s = Math.min(W, H) / 560;
  const rm = RM ? 0 : 1;
  const px = cam3D.panX * 0.08;
  const py = cam3D.panY * 0.05;
  const F = 'Fraunces,Georgia,serif';

  const cap = (a, b, x, y, rgb, mult = 1) => {
    const sg = rgb || 'rgba(250,214,176,';
    const m = Math.min(310, W * 0.8);
    x = Math.min(W - m / 2 - 8, Math.max(m / 2 + 8, x));
    cx.textAlign = 'center';
    cx.fillStyle = sg + clamp(0.68 * mult, 0.2, 1).toFixed(2) + ')';
    cx.font = 'italic 600 ' + Math.max(14, 18 * s) + 'px ' + F;
    cx.fillText(a, x, y, m);
    cx.fillStyle = sg + clamp(0.44 * mult, 0.14, 0.95).toFixed(2) + ')';
    cx.font = 'italic 400 ' + Math.max(11.5, 13.5 * s) + 'px ' + F;
    cx.fillText(b, x, y + Math.max(16, 19 * s), m);
  };

  // 1. ARCHAEOPTERYX
  const hArch = artHighlight('Archaeopteryx');
  cx.save();
  cx.globalAlpha = baseAlpha * clamp(hArch, 0.35, 1.3);
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  cx.translate(W * 0.56 + px, H * 0.21 + py + Math.sin(t * 0.0005) * 7 * rm);
  cx.rotate(-0.08 + Math.sin(t * 0.0004) * 0.018 * rm);
  cx.scale(s * 0.95, s * 0.95);

  cx.strokeStyle = 'rgba(255,152,56,.68)';
  cx.fillStyle = 'rgba(255,180,68,.09)';
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
  cx.fillStyle = 'rgba(255,210,120,.85)';
  cx.beginPath();
  cx.arc(-71, -38, 1.8, 0, Math.PI * 2);
  cx.fill();

  cx.strokeStyle = 'rgba(255,182,64,.62)';
  cx.lineWidth = 1.4;
  cx.beginPath();
  cx.moveTo(42, 4);
  cx.quadraticCurveTo(130, 14, 224, 24);
  cx.stroke();
  cx.strokeStyle = 'rgba(255,182,64,.42)';
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
  cx.strokeStyle = 'rgba(255,214,96,.72)';
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

  cx.strokeStyle = 'rgba(255,152,56,.66)';
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
  cap('archaeopteryx', 'Giurassico, circa 150 milioni di anni fa', W * 0.56 + px + 35 * s, H * 0.21 + py + 106 * s, 'rgba(255,176,68,', hArch);

  // 2. PETTIROSSO — Erithacus rubecula
  const hRob = artHighlight('Pettirossi');
  cx.save();
  cx.globalAlpha = baseAlpha * clamp(hRob, 0.35, 1.3);
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  cx.translate(W * 0.22 - px * 0.9, H * 0.77 + py + Math.sin(t * 0.0006 + 1.2) * 5 * rm);
  cx.scale(s * 0.96, s * 0.96);

  cx.strokeStyle = 'rgba(210,165,125,.34)';
  cx.lineWidth = 1.4;
  cx.beginPath();
  cx.moveTo(-46, 52);
  cx.quadraticCurveTo(2, 46, 48, 50);
  cx.moveTo(24, 48);
  cx.lineTo(36, 41);
  cx.stroke();

  cx.strokeStyle = 'rgba(250,206,162,.62)';
  cx.fillStyle = 'rgba(250,206,162,.07)';
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

  cx.fillStyle = 'rgba(255,104,54,.30)';
  cx.strokeStyle = 'rgba(255,122,72,.78)';
  cx.beginPath();
  cx.moveTo(22, -26);
  cx.bezierCurveTo(34, -18, 34, 4, 18, 15);
  cx.bezierCurveTo(6, 12, 6, -12, 22, -26);
  cx.fill();
  cx.stroke();

  cx.strokeStyle = 'rgba(250,206,162,.58)';
  cx.beginPath();
  cx.moveTo(-4, -10);
  cx.quadraticCurveTo(-24, 0, -40, 14);
  cx.moveTo(-10, -3);
  cx.quadraticCurveTo(-26, 5, -37, 15);
  cx.stroke();

  cx.fillStyle = 'rgba(255,236,210,.9)';
  cx.beginPath();
  cx.arc(21, -22, 2.5, 0, Math.PI * 2);
  cx.fill();
  cx.strokeStyle = 'rgba(250,206,162,.75)';
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
  cap('Erithacus rubecula', 'il Pettirosso: erede vivente dei teropodi aviani', W * 0.22 - px * 0.9, H * 0.77 + py + 76 * s, 'rgba(255,152,102,', hRob);

  // 3. GRILLO DI KAUAI — Teleogryllus oceanicus
  const hGril = artHighlight('Grilli');
  cx.save();
  cx.globalAlpha = baseAlpha * clamp(hGril, 0.35, 1.3);
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  cx.translate(W * 0.78 + px * 1.2, H * 0.74 + py + Math.cos(t * 0.0006) * 5 * rm);
  cx.scale(s * 0.96, s * 0.96);

  cx.strokeStyle = 'rgba(116,208,88,.68)';
  cx.fillStyle = 'rgba(116,208,88,.11)';
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
  cx.fillStyle = 'rgba(185,245,155,.85)';
  cx.beginPath();
  cx.arc(53, -5, 2, 0, Math.PI * 2);
  cx.fill();

  cx.fillStyle = 'rgba(130,224,102,.14)';
  cx.strokeStyle = 'rgba(130,224,102,.72)';
  cx.beginPath();
  cx.moveTo(-28, -8);
  cx.quadraticCurveTo(2, -23, 30, -8);
  cx.quadraticCurveTo(2, -12, -28, -8);
  cx.fill();
  cx.stroke();

  cx.strokeStyle = 'rgba(116,208,88,.55)';
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

  cx.fillStyle = 'rgba(116,208,88,.16)';
  cx.strokeStyle = 'rgba(116,208,88,.76)';
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
    cx.strokeStyle = 'rgba(140,222,104,' + (Math.pow(1 - q, 3) * 0.65) + ')';
    cx.beginPath();
    cx.arc(2, -18, 14 + q * 78, -1.4, -0.2);
    cx.stroke();
  }
  cx.setLineDash([]);
  cx.restore();
  cap('Kauai: i grilli che hanno perso il canto', 'l’ala piatta li rende muti e li salva dalla mosca parassita', W * 0.78 + px * 1.2 - 20 * s, H * 0.74 + py + 72 * s, 'rgba(132,214,100,', hGril);
}
