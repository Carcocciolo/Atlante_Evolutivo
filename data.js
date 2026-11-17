/* ============================================================
   data.js — configurazione, stato condiviso, parsing, feature
   visive e layout t-SNE 3D con texture GPU (ImageBitmap)
   ============================================================ */

export const CONFIG = {
  csv: '02_database/database_immagini.csv',
  images: '01_immagini/',
  concurrency: 6,
  thumb: 144,
  landUrl: 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json'
};

export const CAT_COLORS = {
  'Archaeopteryx': '#f2a65a',
  'Pettirossi': '#ff6b57',
  'Grilli': '#8cd96b',
  'da classificare': '#a799b7'
};

export const PAL = ['#f2a65a', '#ff6b57', '#8cd96b', '#56d1c9', '#f6c85f', '#e07a9a', '#81a4ff', '#b594f2'];

/** Proporzioni della cornice "polaroid" rispetto al lato della foto. */
export const CARD = { pad: 0.08, bottom: 0.24 };

export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const HOME_3D = Object.freeze({
  yaw: 0.35, pitch: 0.18, zoom: 1, panX: 0, panY: 0,
  rot: [
    Math.cos(0.175), 0, Math.sin(0.175), 0,
    0, 1, 0, 0,
    -Math.sin(0.175), 0, Math.cos(0.175), 0,
    0, 0, 0, 1
  ]
});
export const HOME_GEO = Object.freeze({ x: 0, y: 0, k: 1 });

export const state = {
  items: [],
  col: {},
  on: new Set(),
  q: '',
  sel: -1,
  hov: -1,
  mode: 'thumb',          // 'thumb' | 'dot'
  viewMode: '3d',         // '3d' | 'geo'
  W: 0, H: 0, dpr: 1,
  cam3D: {
    yaw: 0.35, pitch: 0.18, zoom: 1, panX: 0, panY: 0,
    rot: new Float64Array(16)
  },
  goal3D: {
    yaw: 0.35, pitch: 0.18, zoom: 1, panX: 0, panY: 0,
    rot: new Float64Array(16)
  },
  camGeo: { ...HOME_GEO },
  goalGeo: { ...HOME_GEO },
  spin: { yaw: 0, pitch: 0 },
  autoRotate: !RM,
  autoRotatePref: !RM,
  soundEnabled: true,
  musicEnabled: false,
  ecoMode: RM,
  drag: null,
  mx: -999, my: -999,
  focus: 0,
  switchT: -1e9,
  fx: [],
  proj: [],
  Dm: null,
  busy: false,
  dirty: true
};

/* ---------- utilità ---------- */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const ease = a => {
  a = clamp(a, 0, 1);
  return 1 + 2.70158 * Math.pow(a - 1, 3) + 1.70158 * Math.pow(a - 1, 2);
};
export const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
export const markDirty = () => { state.dirty = true; };

let toastTimer = 0;
export function msg(text, ms = 3200) {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(toastTimer);
  if (!text) return el.classList.remove('is-on');
  el.textContent = text;
  el.classList.add('is-on');
  if (ms) toastTimer = setTimeout(() => el.classList.remove('is-on'), ms);
}

export function refreshVis() {
  const q = state.q;
  for (const it of state.items) {
    it.vis = state.on.has(it.cat) && (!q || it.hay.includes(q));
  }
  markDirty();
}

export function getNotes(r) {
  const out = [];
  if (r.notes && r.notes !== 'nan') out.push(r.notes);
  if (r.id === 'IMG_0015' || r.id === 'IMG_0016') {
    out.push('Nota scheda: soggetto indicato come Teropode nella categoria Archaeopteryx.');
  }
  if (r.id === 'IMG_0051') {
    out.push('Nota scheda: URL riferito a Gryllus rubens all’interno della categoria Grilli.');
  }
  return out;
}

/* ---------- CSV ---------- */
export function parseCSV(t) {
  t = t.replace(/^\uFEFF/, '');
  const first = t.split(/\r?\n/)[0] || '';
  const d = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === d) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const head = rows.shift().map(s => s.trim().toLowerCase());
  return rows
    .filter(x => x.some(v => v.trim()))
    .map(x => Object.fromEntries(head.map((k, i) => [k, (x[i] || '').trim()])));
}

/* ---------- miniature e cornici (convertite in ImageBitmap GPU) ---------- */
export function makeThumb(bm, S = CONFIG.thumb) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const s = Math.max(S / bm.width, S / bm.height);
  g.drawImage(bm, (S - bm.width * s) / 2, (S - bm.height * s) / 2, bm.width * s, bm.height * s);
  return c;
}

export function makeCardCanvas(th, color, idx) {
  const S = th.width;
  const pad = Math.round(S * CARD.pad);
  const bottom = Math.round(S * CARD.bottom);
  const c = document.createElement('canvas');
  c.width = S + pad * 2;
  c.height = S + pad + bottom;
  const g = c.getContext('2d');

  // Passepartout caldo pergamena/avorio da gabinetto naturalistico
  const paper = g.createLinearGradient(0, 0, c.width, c.height);
  paper.addColorStop(0, '#fbf6ed');
  paper.addColorStop(0.6, '#f5ede0');
  paper.addColorStop(1, '#ebe0cf');
  g.fillStyle = paper;
  g.fillRect(0, 0, c.width, c.height);

  // Riflesso superiore caldo
  g.fillStyle = 'rgba(255, 255, 255, 0.7)';
  g.fillRect(0, 0, c.width, 1.5);
  g.fillRect(0, 0, 1.5, c.height);

  // Foto specimen
  g.drawImage(th, pad, pad);

  // Filetto interno incassato
  g.strokeStyle = 'rgba(42, 18, 6, 0.22)';
  g.lineWidth = 1;
  g.strokeRect(pad + 0.5, pad + 0.5, S - 1, S - 1);

  // Bordo esterno caldo
  g.strokeStyle = 'rgba(242, 166, 90, 0.35)';
  g.strokeRect(0.5, 0.5, c.width - 1, c.height - 1);

  // Tacca di categoria
  const barY = pad + S + Math.round(pad * 0.72);
  const barW = S * 0.42;
  const barH = Math.max(2.5, Math.round(pad * 0.42));
  const col = color || '#f2a65a';
  const barGrad = g.createLinearGradient(pad, barY, pad + barW, barY);
  barGrad.addColorStop(0, col);
  barGrad.addColorStop(1, rgba(col, 0.45));
  g.fillStyle = barGrad;
  g.fillRect(pad, barY, barW, barH);

  // Codice catalogo
  if (idx != null) {
    g.fillStyle = 'rgba(62, 32, 14, 0.72)';
    g.font = `600 ${Math.round(S * 0.072)}px "JetBrains Mono", monospace`;
    g.textAlign = 'right';
    g.fillText(`FIG.${String(idx + 1).padStart(2, '0')}`, c.width - pad, pad + S + Math.round(pad * 1.52));
  }
  return c;
}

function halve(src) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width / 2));
  c.height = Math.max(1, Math.round(src.height / 2));
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
const toGPU = c => (typeof createImageBitmap === 'function' ? createImageBitmap(c) : c);

export async function setItemImage(it, bm, idx) {
  it.th = makeThumb(bm);
  const full = makeCardCanvas(it.th, state.col[it.cat], idx);
  if (typeof bm.close === 'function') bm.close();
  const half = halve(full);
  it.cards = await Promise.all([halve(half), half, full].map(toGPU));
  it.ready = true;
  it.b = performance.now();
  markDirty();
}

/* ---------- feature visive (colore, istogramma, bordi) ---------- */
export function feat(th) {
  const s = 24;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(th, 0, 0, s, s);
  const p = g.getImageData(0, 0, s, s).data;
  const gray = [], grid = new Float64Array(27), hist = new Float64Array(64), eo = new Float64Array(32);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const i = (y * s + x) * 4, r = p[i], gg = p[i + 1], b = p[i + 2];
    const cell = ((y / 8 | 0) * 3 + (x / 8 | 0)) * 3;
    grid[cell] += r / 64 / 255; grid[cell + 1] += gg / 64 / 255; grid[cell + 2] += b / 64 / 255;
    hist[(r >> 6) * 16 + (gg >> 6) * 4 + (b >> 6)] += 1 / 576;
    gray[y * s + x] = 0.3 * r + 0.59 * gg + 0.11 * b;
  }
  for (let y = 1; y < s - 1; y++) for (let x = 1; x < s - 1; x++) {
    const gx = gray[y * s + x + 1] - gray[y * s + x - 1];
    const gy = gray[(y + 1) * s + x] - gray[(y - 1) * s + x];
    let a = Math.atan2(gy, gx); if (a < 0) a += Math.PI;
    eo[((y >= 12 ? 2 : 0) + (x >= 12 ? 1 : 0)) * 8 + Math.min(7, a / Math.PI * 8 | 0)] += Math.hypot(gx, gy);
  }
  const es = eo.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < 32; i++) eo[i] /= es;
  return [...grid, ...hist, ...eo];
}

export function prep(F) {
  const n = F.length, d = F[0].length;
  for (let j = 0; j < d; j++) {
    const w = 1 / Math.sqrt(j < 27 ? 27 : j < 91 ? 64 : 32);
    let m = 0, v = 0;
    for (const f of F) m += f[j] / n;
    for (const f of F) v += (f[j] - m) ** 2 / n;
    const sd = Math.sqrt(v) || 1;
    for (const f of F) f[j] = (f[j] - m) / sd * w;
  }
  return F;
}

/* ---------- t-SNE 3D ---------- */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function tsne3D(F, onProgress) {
  const n = F.length, items = state.items;
  const D = new Float64Array(n * n);
  let sum = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let s = 0;
    for (let k = 0; k < F[i].length; k++) { const d = F[i][k] - F[j][k]; s += d * d; }
    D[i * n + j] = D[j * n + i] = s; sum += 2 * s;
  }
  state.Dm = D;

  const mean = sum / (n * (n - 1)) || 1;
  const P = new Float64Array(n * n);
  const H0 = Math.log(Math.min(30, Math.max(2, (n - 1) / 3)));
  for (let i = 0; i < n; i++) {
    let b = 1, lo = 0, hi = Infinity;
    for (let t = 0; t < 60; t++) {
      let sp = 0, sd = 0;
      for (let j = 0; j < n; j++) if (j !== i) {
        const d = D[i * n + j] / mean, e = Math.exp(-d * b);
        P[i * n + j] = e; sp += e; sd += d * e;
      }
      sp = sp || 1e-300;
      const h = Math.log(sp) + b * sd / sp;
      if (Math.abs(h - H0) < 1e-5) break;
      if (h > H0) { lo = b; b = hi === Infinity ? b * 2 : (b + hi) / 2; }
      else { hi = b; b = (b + lo) / 2; }
    }
    let sp = 0;
    for (let j = 0; j < n; j++) sp += P[i * n + j];
    for (let j = 0; j < n; j++) P[i * n + j] /= sp || 1;
  }
  const S = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    S[i * n + j] = Math.max((P[i * n + j] + P[j * n + i]) / (2 * n), 1e-12);
  }

  const rnd = mulberry32(1337);
  const Y = new Float64Array(3 * n).map(() => (rnd() - 0.5) * 0.02);
  const U = new Float64Array(3 * n), G = new Float64Array(3 * n).fill(1);
  const N = new Float64Array(n * n), g = new Float64Array(3 * n);
  const T = 360;
  let it = 0, extent = 1;

  function step() {
    const ex = it < 90 ? 8 : 1, mo = it < 90 ? 0.5 : 0.8;
    let Z = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = Y[3 * i] - Y[3 * j], dy = Y[3 * i + 1] - Y[3 * j + 1], dz = Y[3 * i + 2] - Y[3 * j + 2];
      const v = 1 / (1 + dx * dx + dy * dy + dz * dz);
      N[i * n + j] = N[j * n + i] = v; Z += 2 * v;
    }
    g.fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) {
      const v = N[i * n + j], m = (ex * S[i * n + j] - v / Z) * v;
      g[3 * i] += 4 * m * (Y[3 * i] - Y[3 * j]);
      g[3 * i + 1] += 4 * m * (Y[3 * i + 1] - Y[3 * j + 1]);
      g[3 * i + 2] += 4 * m * (Y[3 * i + 2] - Y[3 * j + 2]);
    }
    for (let k = 0; k < 3 * n; k++) {
      G[k] = Math.sign(g[k]) !== Math.sign(U[k]) ? G[k] + 0.2 : G[k] * 0.8;
      if (G[k] < 0.01) G[k] = 0.01;
      U[k] = mo * U[k] - 110 * G[k] * g[k];
      Y[k] += U[k];
    }
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += Y[3 * i] / n; cy += Y[3 * i + 1] / n; cz += Y[3 * i + 2] / n; }
    let mx = 1e-9;
    for (let i = 0; i < n; i++) {
      Y[3 * i] -= cx; Y[3 * i + 1] -= cy; Y[3 * i + 2] -= cz;
      mx = Math.max(mx, Math.abs(Y[3 * i]), Math.abs(Y[3 * i + 1]), Math.abs(Y[3 * i + 2]));
    }
    it++;
    extent = mx;
  }

  return new Promise(resolve => {
    (function frame() {
      const t0 = performance.now();
      do step(); while (it < T && performance.now() - t0 < 12);
      const reach = Array.from({ length: n }, (_, i) =>
        Math.max(Math.abs(Y[3 * i]), Math.abs(Y[3 * i + 1]), Math.abs(Y[3 * i + 2]))).sort((a, b) => a - b);
      const sc = 0.95 / (reach[Math.floor((n - 1) * 0.9)] || extent);
      for (let i = 0; i < n; i++) {
        items[i].tx = clamp(Y[3 * i] * sc, -1.3, 1.3);
        items[i].ty = clamp(Y[3 * i + 1] * sc, -1.3, 1.3);
        items[i].tz = clamp(Y[3 * i + 2] * sc, -1.3, 1.3);
      }
      markDirty();
      if (onProgress) onProgress(it / T);
      if (it < T) requestAnimationFrame(frame); else resolve();
    })();
  });
}
