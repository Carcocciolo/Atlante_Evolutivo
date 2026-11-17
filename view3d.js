/* ============================================================
   view3d.js — proiezione prospettica libera (matrice 3x3 senza
   gimbal lock), sfondo antracite caldo, griglia cartografica
   e tavole naturalistiche in cache
   ============================================================ */
import { state, RM, clamp } from './data.js';

const FOV = 2.6;

/** Proietta un punto 3D tramite matrice di rotazione 3x3; scrive in `out` a zero allocazioni. */
export function project3D(x, y, z, out, c = state.cam3D) {
  const { W, H } = state;
  const m = c.rot;
  const x1 = m[0] * x + m[1] * y + m[2] * z;
  const y2 = m[3] * x + m[4] * y + m[5] * z;
  const z2 = m[6] * x + m[7] * y + m[8] * z;
  const depth = FOV / Math.max(0.35, FOV + z2);
  const k = Math.min(W, H) * 0.44 * c.zoom * depth;
  out.sx = W / 2 + c.panX + x1 * k;
  out.sy = H / 2 + c.panY + y2 * k;
  out.scale = depth;
  out.zOrder = z2;
  return out;
}

export const thumbSize3D = zoom => clamp(38 * Math.sqrt(zoom), 24, 104);

/* ---------- sfondo antracite caldo + griglia cartografica ---------- */
let bg = null;
let spotSprite = null;

export function buildBackground() {
  const { W, H } = state;
  const w = Math.max(1, Math.ceil(W));
  const h = Math.max(1, Math.ceil(H));
  bg = document.createElement('canvas');
  bg.width = w; bg.height = h;
  const g = bg.getContext('2d');

  // Gradiente antracite / nero caldo museale
  const r = g.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
  r.addColorStop(0, '#361c12');
  r.addColorStop(0.48, '#1b0f0b');
  r.addColorStop(1, '#0b0706');
  g.fillStyle = r;
  g.fillRect(0, 0, w, h);

  // Griglia cartografica sottile (reticolo primario + suddivisioni secondarie + croci geodetiche)
  const step = Math.max(72, Math.round(Math.min(w, h) / 9));
  const sub = step / 4;
  const ox = (w * 0.5) % step;
  const oy = (h * 0.5) % step;

  g.lineWidth = 1;
  g.strokeStyle = 'rgba(255, 218, 180, 0.024)';
  g.beginPath();
  for (let x = ox % sub; x < w; x += sub) {
    const px = Math.round(x) + 0.5;
    g.moveTo(px, 0); g.lineTo(px, h);
  }
  for (let y = oy % sub; y < h; y += sub) {
    const py = Math.round(y) + 0.5;
    g.moveTo(0, py); g.lineTo(w, py);
  }
  g.stroke();

  g.strokeStyle = 'rgba(255, 214, 170, 0.055)';
  g.beginPath();
  for (let x = ox; x < w; x += step) {
    const px = Math.round(x) + 0.5;
    g.moveTo(px, 0); g.lineTo(px, h);
  }
  for (let y = oy; y < h; y += step) {
    const py = Math.round(y) + 0.5;
    g.moveTo(0, py); g.lineTo(w, py);
  }
  g.stroke();

  g.strokeStyle = 'rgba(242, 166, 90, 0.14)';
  g.beginPath();
  for (let x = ox; x < w; x += step) {
    for (let y = oy; y < h; y += step) {
      const px = Math.round(x) + 0.5;
      const py = Math.round(y) + 0.5;
      g.moveTo(px - 3.5, py); g.lineTo(px + 3.5, py);
      g.moveTo(px, py - 3.5); g.lineTo(px, py + 3.5);
    }
  }
  g.stroke();

  const mask = g.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  mask.addColorStop(0, 'rgba(11, 7, 6, 0)');
  mask.addColorStop(1, 'rgba(11, 7, 6, 0.72)');
  g.fillStyle = mask;
  g.fillRect(0, 0, w, h);

  if (!spotSprite) {
    spotSprite = document.createElement('canvas');
    spotSprite.width = spotSprite.height = 256;
    const sg = spotSprite.getContext('2d');
    const gr = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255, 195, 140, 0.11)');
    gr.addColorStop(1, 'rgba(255, 195, 140, 0)');
    sg.fillStyle = gr;
    sg.fillRect(0, 0, 256, 256);
  }
}

const dust = Array.from({ length: 55 }, () => ({
  x: Math.random(), y: Math.random(), z: Math.random(),
  s: Math.random() * 1.4 + 0.4, p: Math.random() * 6.3, v: Math.random() * 0.00025 + 0.00008
}));

function drawDust(cx, t) {
  const { W, H, cam3D } = state;
  const m = cam3D.rot;
  cx.fillStyle = 'rgba(255, 214, 170, 0.22)';
  cx.beginPath();
  for (const d of dust) {
    if (!RM) { d.y -= d.v; if (d.y < 0) d.y = 1; }
    const x = (((d.x * W - m[2] * W * 0.18 * (0.3 + d.z) + cam3D.panX * 0.2 * d.z) % W) + W) % W;
    const y = (((d.y * H - m[5] * H * 0.14 * (0.3 + d.z) + cam3D.panY * 0.2 * d.z) % H) + H) % H;
    const rad = d.s * (0.6 + d.z * 0.7) * (0.8 + 0.2 * Math.sin(t * 0.002 + d.p));
    cx.moveTo(x + rad, y);
    cx.arc(x, y, rad, 0, Math.PI * 2);
  }
  cx.fill();
}

const _p = { sx: 0, sy: 0, scale: 1, zOrder: 0 };

function drawRings(cx) {
  cx.save();
  cx.lineWidth = 1;
  cx.setLineDash([4, 10]);
  [[0.95, 0.14], [0.55, 0.08]].forEach(([R, a]) => {
    cx.strokeStyle = `rgba(250, 205, 165, ${a})`;
    cx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const ang = (i / 60) * Math.PI * 2;
      project3D(Math.cos(ang) * R, 0, Math.sin(ang) * R, _p);
      if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  });
  cx.restore();
}

export function draw3DBackground(cx, t, focus) {
  const { W, H, cam3D, mx, my } = state;
  const px = clamp(cam3D.panX * 0.04, -W * 0.06, W * 0.06);
  const py = clamp(cam3D.panY * 0.04, -H * 0.06, H * 0.06);
  if (bg) cx.drawImage(bg, -W * 0.08 + px, -H * 0.08 + py, W * 1.16, H * 1.16);

  if (mx > 0 && spotSprite) {
    cx.drawImage(spotSprite, mx - 260, my - 260, 520, 520);
  }

  drawDust(cx, t);
  drawRings(cx);

  cx.save();
  cx.globalAlpha = 0.78 * (1 - 0.65 * focus);
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
    cx.strokeStyle = 'rgba(11, 7, 6, 0.82)';
    cx.strokeText(L.text, _p.sx, _p.sy);
    cx.fillStyle = L.color;
    cx.fillText(L.text, _p.sx, _p.sy);
  }
  cx.restore();
}

/* ============================================================
   Illustrazioni naturalistiche pre-renderizzate in cache (0 lag)
   Stile incisione scientifica su tavola scura
   ============================================================ */
const artSprites = { arch: null, robin: null, cricket: null };

function createSprite(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  drawFn(g, w, h);
  return c;
}

function ensureArtSprites() {
  if (artSprites.arch) return;

  // 1. ARCHAEOPTERYX LITHOGRAPHICA
  artSprites.arch = createSprite(480, 260, (g) => {
    g.translate(185, 130);
    const stroke = 'rgba(246, 178, 122, 0.62)';
    const fine = 'rgba(246, 178, 122, 0.34)';
    const fill = 'rgba(246, 178, 122, 0.08)';

    g.strokeStyle = stroke;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(36, 4);
    g.bezierCurveTo(105, 8, 175, 16, 255, 18);
    g.stroke();

    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(52, 4);
    g.bezierCurveTo(120, -10, 195, -4, 262, 12);
    g.lineTo(266, 20);
    g.lineTo(256, 28);
    g.bezierCurveTo(185, 34, 115, 24, 52, 10);
    g.closePath();
    g.fill();
    g.strokeStyle = fine;
    g.lineWidth = 1.1;
    g.stroke();

    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const vx = 55 + t * 195;
      const vy = 5 + t * 13;
      const len = 14 + Math.sin(t * Math.PI) * 9;
      g.moveTo(vx, vy);
      g.lineTo(vx + 16, vy - len * 0.85);
      g.moveTo(vx, vy);
      g.lineTo(vx + 18, vy + len * 0.95);
    }
    g.stroke();

    g.fillStyle = 'rgba(255, 205, 145, 0.07)';
    g.strokeStyle = stroke;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-12, -10);
    g.quadraticCurveTo(-52, -55, -108, -72);
    g.bezierCurveTo(-122, -45, -106, -12, -78, 10);
    g.quadraticCurveTo(-40, 14, -10, 2);
    g.closePath();
    g.fill();
    g.stroke();

    g.strokeStyle = fine;
    g.lineWidth = 1.15;
    g.beginPath();
    for (let k = 0; k < 12; k++) {
      const f = k / 11;
      const bx = -18 - f * 32;
      const by = -12 - f * 16;
      const tx = -75 - Math.sin(f * 2.4) * 44;
      const ty = 12 - f * 82;
      g.moveTo(bx, by);
      g.quadraticCurveTo((bx + tx) * 0.5 - 6, (by + ty) * 0.5 - 8, tx, ty);
    }
    g.stroke();

    g.strokeStyle = stroke;
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(-64, -44); g.lineTo(-76, -54); g.lineTo(-82, -51);
    g.moveTo(-72, -48); g.lineTo(-85, -57); g.lineTo(-90, -53);
    g.stroke();

    g.fillStyle = fill;
    g.strokeStyle = stroke;
    g.lineWidth = 1.7;
    g.beginPath();
    g.moveTo(40, 4);
    g.bezierCurveTo(22, -18, -16, -22, -44, -16);
    g.bezierCurveTo(-68, -24, -84, -42, -98, -52);
    g.quadraticCurveTo(-110, -58, -120, -52);
    g.lineTo(-144, -43);
    g.lineTo(-120, -39);
    g.bezierCurveTo(-98, -32, -82, -10, -58, 6);
    g.bezierCurveTo(-28, 22, 14, 20, 40, 8);
    g.closePath();
    g.fill();
    g.stroke();

    g.fillStyle = 'rgba(255, 220, 175, 0.82)';
    g.beginPath(); g.arc(-111, -47, 2.3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = fine;
    g.lineWidth = 1;
    g.beginPath(); g.ellipse(-123, -45, 3.2, 1.8, -0.2, 0, Math.PI * 2); g.stroke();

    g.beginPath();
    for (let i = 0; i < 6; i++) {
      g.moveTo(-28 + i * 10, -13);
      g.lineTo(-22 + i * 10, -5);
    }
    g.stroke();

    g.strokeStyle = stroke;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(4, 15);
    g.lineTo(-6, 42);
    g.lineTo(6, 66);
    g.lineTo(-12, 74);
    g.moveTo(6, 66); g.lineTo(-4, 79);
    g.moveTo(6, 66); g.lineTo(8, 78);
    g.stroke();
  });

  // 2. ERITHACUS RUBECULA
  artSprites.robin = createSprite(280, 240, (g) => {
    g.translate(135, 115);
    const stroke = 'rgba(250, 206, 162, 0.62)';
    const fine = 'rgba(250, 206, 162, 0.32)';

    g.strokeStyle = 'rgba(215, 172, 130, 0.45)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(-68, 62);
    g.quadraticCurveTo(0, 52, 74, 58);
    g.moveTo(38, 55); g.lineTo(54, 44);
    g.stroke();

    g.fillStyle = 'rgba(250, 206, 162, 0.07)';
    g.strokeStyle = stroke;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-26, 12);
    g.lineTo(-76, 36);
    g.lineTo(-71, 44);
    g.lineTo(-20, 22);
    g.closePath();
    g.fill();
    g.stroke();

    g.beginPath();
    g.moveTo(22, -34);
    g.bezierCurveTo(36, -34, 42, -22, 39, -10);
    g.bezierCurveTo(44, 4, 38, 24, 16, 28);
    g.bezierCurveTo(-6, 32, -26, 20, -30, 2);
    g.bezierCurveTo(-32, -16, -12, -26, 6, -28);
    g.quadraticCurveTo(13, -34, 22, -34);
    g.closePath();
    g.fill();
    g.stroke();

    g.fillStyle = 'rgba(255, 107, 74, 0.28)';
    g.strokeStyle = 'rgba(255, 120, 82, 0.72)';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(24, -25);
    g.bezierCurveTo(38, -22, 41, -4, 33, 12);
    g.bezierCurveTo(24, 22, 10, 18, 8, 4);
    g.bezierCurveTo(7, -10, 14, -22, 24, -25);
    g.fill();
    g.stroke();

    g.strokeStyle = stroke;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-4, -14);
    g.bezierCurveTo(-22, -6, -34, 10, -44, 24);
    g.quadraticCurveTo(-20, 22, -2, 8);
    g.stroke();

    g.strokeStyle = fine;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-12, -4); g.lineTo(-32, 14);
    g.moveTo(-8, 1); g.lineTo(-26, 16);
    g.stroke();

    g.fillStyle = 'rgba(255, 232, 206, 0.9)';
    g.beginPath(); g.arc(26, -22, 2.7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0b0706';
    g.beginPath(); g.arc(26.5, -22, 1.3, 0, Math.PI * 2); g.fill();

    g.strokeStyle = stroke;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(39, -21);
    g.lineTo(52, -18.5);
    g.lineTo(39, -16.5);
    g.stroke();

    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(4, 27); g.lineTo(1, 54);
    g.moveTo(-4, 54); g.lineTo(7, 54);
    g.moveTo(14, 26); g.lineTo(12, 54);
    g.moveTo(8, 54); g.lineTo(18, 54);
    g.stroke();
  });

  // 3. TELEOGRYLLUS OCEANICUS
  artSprites.cricket = createSprite(340, 220, (g) => {
    g.translate(145, 118);
    const stroke = 'rgba(112, 200, 86, 0.64)';
    const fine = 'rgba(112, 200, 86, 0.32)';
    const fill = 'rgba(112, 200, 86, 0.09)';

    g.strokeStyle = fine;
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(30, 8); g.lineTo(42, 30); g.lineTo(34, 42); g.lineTo(40, 44);
    g.moveTo(12, 10); g.lineTo(18, 33); g.lineTo(10, 44); g.lineTo(16, 46);
    g.stroke();

    g.fillStyle = fill;
    g.strokeStyle = stroke;
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(-8, 4, 38, 12, -0.05, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    g.strokeStyle = fine;
    g.lineWidth = 1;
    g.beginPath();
    for (let i = -30; i <= 12; i += 8) {
      g.moveTo(i, -6);
      g.quadraticCurveTo(i - 2, 4, i, 14);
    }
    g.stroke();

    g.strokeStyle = stroke;
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(-45, 2); g.quadraticCurveTo(-64, -4, -76, -10);
    g.moveTo(-45, 6); g.quadraticCurveTo(-64, 10, -78, 14);
    g.stroke();

    g.fillStyle = 'rgba(140, 222, 104, 0.12)';
    g.strokeStyle = stroke;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(26, -8);
    g.quadraticCurveTo(-6, -22, -40, -6);
    g.quadraticCurveTo(-12, 2, 26, -3);
    g.closePath();
    g.fill();
    g.stroke();

    g.strokeStyle = fine;
    g.lineWidth = 0.95;
    g.beginPath();
    g.moveTo(20, -6); g.quadraticCurveTo(-8, -14, -34, -6);
    g.moveTo(16, -5); g.quadraticCurveTo(-8, -9, -30, -5);
    g.stroke();

    g.fillStyle = fill;
    g.strokeStyle = stroke;
    g.lineWidth = 1.6;
    g.beginPath();
    g.roundRect(24, -12, 22, 20, 6);
    g.fill();
    g.stroke();

    g.beginPath();
    g.arc(54, -2, 10.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    g.fillStyle = 'rgba(195, 248, 170, 0.82)';
    g.beginPath(); g.ellipse(57, -5, 3, 4.2, -0.2, 0, Math.PI * 2); g.fill();

    g.strokeStyle = stroke;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(61, -9); g.bezierCurveTo(92, -38, 128, -46, 168, -62);
    g.moveTo(63, -6); g.bezierCurveTo(98, -24, 134, -26, 174, -34);
    g.stroke();

    g.fillStyle = 'rgba(112, 200, 86, 0.14)';
    g.strokeStyle = stroke;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(-4, 6);
    g.quadraticCurveTo(-24, -18, -44, -18);
    g.quadraticCurveTo(-26, -4, -6, 11);
    g.closePath();
    g.fill();
    g.stroke();

    g.beginPath();
    g.moveTo(-44, -18);
    g.lineTo(-68, 28);
    g.lineTo(-78, 36);
    g.lineTo(-72, 39);
    g.stroke();
  });
}

function drawBackgroundArt(cx, t) {
  ensureArtSprites();
  const { W, H, cam3D } = state;
  const s = clamp(Math.min(W, H) / 620, 0.62, 1.35);
  const rm = RM ? 0 : 1;
  const px = cam3D.panX * 0.06;
  const py = cam3D.panY * 0.04;
  const F = 'Fraunces,Georgia,serif';

  const cap = (a, b, x, y, rgb) => {
    const m = Math.min(310, W * 0.8);
    x = clamp(x, m / 2 + 12, W - m / 2 - 12);
    cx.textAlign = 'center';
    cx.fillStyle = rgb + '.62)';
    cx.font = 'italic 600 ' + Math.max(13.5, 17 * s) + 'px ' + F;
    cx.fillText(a, x, y, m);
    cx.fillStyle = rgb + '.40)';
    cx.font = 'italic 400 ' + Math.max(11, 13 * s) + 'px ' + F;
    cx.fillText(b, x, y + Math.max(15, 18 * s), m);
  };

  // 1. ARCHAEOPTERYX
  const ax = W * 0.56 + px;
  const ay = H * 0.21 + py + Math.sin(t * 0.0005) * 6 * rm;
  const aw = 480 * s * 0.92, ah = 260 * s * 0.92;
  cx.drawImage(artSprites.arch, ax - aw * 0.42, ay - ah * 0.5, aw, ah);
  cap('Archaeopteryx lithographica', 'Giurassico, circa 150 milioni di anni fa', ax + 30 * s, ay + 96 * s, 'rgba(246,178,122,');

  // 2. PETTIROSSO
  const rx = W * 0.21 - px * 0.85;
  const ry = H * 0.77 + py + Math.sin(t * 0.0006 + 1.2) * 4 * rm;
  const rw = 280 * s * 0.92, rh = 240 * s * 0.92;
  cx.drawImage(artSprites.robin, rx - rw * 0.48, ry - rh * 0.48, rw, rh);
  cap('Erithacus rubecula', 'il Pettirosso: erede vivente dei teropodi aviani', rx, ry + 78 * s, 'rgba(255,152,102,');

  // 3. GRILLO DI KAUAI + onde sonore silenti
  const gx = W * 0.78 + px * 1.1;
  const gy = H * 0.74 + py + Math.cos(t * 0.0006) * 4 * rm;
  const gw = 340 * s * 0.92, gh = 220 * s * 0.92;
  cx.drawImage(artSprites.cricket, gx - gw * 0.43, gy - gh * 0.54, gw, gh);

  cx.save();
  cx.setLineDash([2, 7]);
  cx.lineWidth = 1.3;
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.00045 + i / 3) % 1;
    cx.strokeStyle = 'rgba(140,222,104,' + (Math.pow(1 - q, 3) * 0.52) + ')';
    cx.beginPath();
    cx.arc(gx - 8 * s, gy - 16 * s, (12 + q * 68) * s, -1.45, -0.25);
    cx.stroke();
  }
  cx.restore();

  cap('Kauai: i grilli che hanno perso il canto', 'l’ala piatta li rende muti e li salva dalla mosca parassita', gx - 12 * s, gy + 72 * s, 'rgba(132,214,100,');
}
