/* data.js — Parsing CSV, caricamento unificato, pre-rendering polaroid offscreen e t-SNE 3D */
export const CONFIG = {
  csv: '02_database/database_immagini.csv',
  images: '01_immagini/',
  concurrency: 8
};

export const CAT_COLORS = {
  'Archaeopteryx': '#f6b27a',
  'Pettirossi': '#ff784f',
  'Grilli': '#8fd39e'
};
const PAL = ['#f6b27a', '#ff784f', '#8fd39e', '#ee9a5b', '#d9703b'];

export const state = {
  items: [],
  col: {},
  on: new Set(),
  Dm: null,
  NM: [],
  NC: {},
  visCache: new Map(),
  query: ''
};

export function parseCSV(t) {
  t = t.replace(/^\uFEFF/, '');
  const l = t.split(/\r?\n/)[0] || '';
  const d = (l.match(/;/g) || []).length > (l.match(/,/g) || []).length ? ';' : ',';
  const R = [];
  let r = [], f = '', iq = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (iq) {
      if (c === '"') {
        if (t[i + 1] === '"') { f += '"'; i++; }
        else iq = false;
      } else f += c;
    } else if (c === '"') iq = true;
    else if (c === d) { r.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      r.push(f); f = ''; R.push(r); r = [];
    } else f += c;
  }
  if (f !== '' || r.length) { r.push(f); R.push(r); }
  if (!R.length) return [];
  const h = R.shift().map(s => s.trim().toLowerCase());
  return R.filter(x => x.some(v => v.trim())).map(x => Object.fromEntries(h.map((k, i) => [k, (x[i] || '').trim()])));
}

/* Pre-renderizza una volta sola la polaroid offscreen (cornice + miniatura + banda categoria) */
export function buildOffscreenPolaroid(bm, catColor) {
  const size = 96;
  const pad = 6;
  const bandH = 5;
  const totalW = size + pad * 2;
  const totalH = size + pad * 2 + bandH;

  const c = document.createElement('canvas');
  c.width = totalW;
  c.height = totalH;
  const g = c.getContext('2d');

  // Cornice polaroid
  g.fillStyle = '#f4efe3';
  g.fillRect(0, 0, totalW, totalH);

  // Miniatura centrata
  const w = bm.width, h = bm.height;
  const s = Math.max(size / w, size / h);
  g.drawImage(bm, pad + (size - w * s) / 2, pad + (size - h * s) / 2, w * s, h * s);

  // Banda colore categoria
  g.fillStyle = catColor;
  g.fillRect(pad, pad + size + 2, size * 0.45, bandH - 2);

  return c;
}

function feat(bm) {
  const s = 24, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bm, 0, 0, s, s);
  const p = g.getImageData(0, 0, s, s).data, gr = [], grid = new Float64Array(27), hist = new Float64Array(64), eo = new Float64Array(32);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const i = (y * s + x) * 4, r = p[i], gg = p[i + 1], b = p[i + 2], cell = ((y / 8 | 0) * 3 + (x / 8 | 0)) * 3;
    grid[cell] += r / 64 / 255; grid[cell + 1] += gg / 64 / 255; grid[cell + 2] += b / 64 / 255;
    hist[(r >> 6) * 16 + (gg >> 6) * 4 + (b >> 6)] += 1 / 576;
    gr[y * s + x] = 0.3 * r + 0.59 * gg + 0.11 * b;
  }
  for (let y = 1; y < s - 1; y++) for (let x = 1; x < s - 1; x++) {
    const gx = gr[y * s + x + 1] - gr[y * s + x - 1], gy = gr[(y + 1) * s + x] - gr[(y - 1) * s + x], m = Math.hypot(gx, gy);
    let a = Math.atan2(gy, gx); if (a < 0) a += Math.PI;
    eo[((y >= 12 ? 2 : 0) + (x >= 12 ? 1 : 0)) * 8 + Math.min(7, a / Math.PI * 8 | 0)] += m;
  }
  const es = eo.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < 32; i++) eo[i] /= es;
  return [...grid, ...hist, ...eo];
}

function prep(F) {
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

export function tsne3D(F, onProgress) {
  const n = F.length, D = new Float64Array(n * n);
  let sum = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let s = 0;
    for (let k = 0; k < F[i].length; k++) { const d = F[i][k] - F[j][k]; s += d * d; }
    D[i * n + j] = D[j * n + i] = s; sum += 2 * s;
  }
  state.Dm = D;
  const mean = sum / (n * (n - 1)) || 1, P = new Float64Array(n * n), H0 = Math.log(Math.min(30, Math.max(2, (n - 1) / 3)));
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
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) S[i * n + j] = Math.max((P[i * n + j] + P[j * n + i]) / (2 * n), 1e-12);

  const Y = new Float64Array(3 * n).map(() => (Math.random() - 0.5) * 0.02);
  const U = new Float64Array(3 * n), G = new Float64Array(3 * n).fill(1), N = new Float64Array(n * n), g = new Float64Array(3 * n);
  const T = 280; let it = 0;

  function step() {
    const ex = it < 70 ? 8 : 1, mo = it < 70 ? 0.5 : 0.8;
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
    let mx_ = 0, my_ = 0, mz_ = 0;
    for (let i = 0; i < n; i++) { mx_ += Y[3 * i] / n; my_ += Y[3 * i + 1] / n; mz_ += Y[3 * i + 2] / n; }
    let mx = 1e-9;
    for (let i = 0; i < n; i++) {
      Y[3 * i] -= mx_; Y[3 * i + 1] -= my_; Y[3 * i + 2] -= mz_;
      mx = Math.max(mx, Math.abs(Y[3 * i]), Math.abs(Y[3 * i + 1]), Math.abs(Y[3 * i + 2]));
    }
    it++; return mx;
  }

  return new Promise(res => {
    let mx = 1;
    (function fr() {
      for (let r = 0; r < 16 && it < T; r++) mx = step();
      for (let i = 0; i < n; i++) {
        state.items[i].x = Y[3 * i] / mx;
        state.items[i].y = Y[3 * i + 1] / mx;
        state.items[i].z = Y[3 * i + 2] / mx;
      }
      if (onProgress) onProgress(it, T, mx);
      if (it < T) requestAnimationFrame(fr); else res();
    })();
  });
}

export function invalidateVisCache() {
  state.visCache.clear();
}

export function isVisible(idx) {
  if (state.visCache.has(idx)) return state.visCache.get(idx);
  const it = state.items[idx];
  if (!it || !state.on.has(it.cat)) {
    state.visCache.set(idx, false);
    return false;
  }
  if (!state.query) {
    state.visCache.set(idx, true);
    return true;
  }
  const ok = it.searchBlob.includes(state.query);
  state.visCache.set(idx, ok);
  return ok;
}

export function initSkeleton(rows, geoAssigner) {
  state.items = rows.map((r, i) => {
    const cat = (r.category && r.category.trim()) ? r.category.trim() : 'Archaeopteryx';
    const geo = geoAssigner(r, i);
    const phi = Math.acos(1 - 2 * ((i + 0.5) / Math.max(1, rows.length)));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const rad = 0.45 + 0.35 * ((i * 7) % 10) / 10;
    const searchBlob = `${r.id || ''} ${r.subject || ''} ${r.author || ''} ${r.notes || ''} ${geo.siteName} ${cat}`.toLowerCase();
    return {
      r,
      polaroid: null,
      ready: false,
      cat,
      searchBlob,
      x: rad * Math.sin(phi) * Math.cos(theta),
      y: rad * Math.cos(phi),
      z: rad * Math.sin(phi) * Math.sin(theta),
      ...geo
    };
  });

  const cats = [...new Set(state.items.map(i => i.cat))];
  state.col = {};
  cats.forEach((c, i) => { state.col[c] = CAT_COLORS[c] || PAL[i % PAL.length]; });
  state.on = new Set(cats);
  invalidateVisCache();
}

/* Funzione unica di caricamento bitmap -> polaroid offscreen -> feature -> t-SNE */
export async function processLoadedBitmaps(bitmapsByIndex, onStatus) {
  const feats = [];
  const validItems = [];

  for (let i = 0; i < state.items.length; i++) {
    const bm = bitmapsByIndex.get(i);
    if (!bm) continue;
    const it = state.items[i];
    it.polaroid = buildOffscreenPolaroid(bm, state.col[it.cat]);
    it.ready = true;
    feats.push(feat(bm));
    bm.close(); // Rilascia subito l'ImageBitmap originale dalla RAM
    validItems.push(it);
  }

  state.items = validItems;
  invalidateVisCache();

  if (state.items.length < 2) return;
  const F = prep(feats);
  await tsne3D(F, onStatus);

  state.NC = {};
  const n = state.items.length;
  state.NM = state.items.map((a, i) =>
    state.items
      .map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2])
      .filter(o => o[0] !== i)
      .sort((p, r) => p[1] - r[1])
      .slice(0, 2)
      .map(o => o[0])
  );
  state.Dm = state.Dm && state.Dm.length === n * n ? state.Dm : null;
}

export function nearestIndices(i, k) {
  const n = state.items.length;
  if (!state.Dm || state.Dm.length !== n * n) {
    return [...Array(n).keys()].filter(j => j !== i).slice(0, k);
  }
  return [...Array(n).keys()]
    .filter(j => j !== i)
    .sort((a, b) => state.Dm[i * n + a] - state.Dm[i * n + b])
    .slice(0, k);
}
