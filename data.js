export const CONFIG = {
  csv: 'database_immagini.csv',
  images: '01_immagini/',
  concurrency: 12
};

export const CAT_COLORS = {
  'Archaeopteryx': '#f6b27a',
  'Pettirossi': '#ff6b4a',
  'Grilli': '#70c856',
  'da classificare': '#c9a68a'
};

export const PAL = ['#f8d9b4', '#f0a35e', '#d9703b', '#b5492a', '#f4c08a', '#e58a4c', '#c85c33', '#fbe6cc'];

export const state = {
  items: [],
  col: {},
  on: new Set(),
  sel: -1,
  hov: -1,
  mode: 'thumb',      // 'thumb' | 'dot'
  viewMode: '3d',     // '3d' | 'geo'
  W: 0,
  H: 0,
  dpr: 1,
  Dm: null,
  q: '',
  busy: false,
  cam3D: { yaw: 0.35, pitch: 0.18, zoom: 1.0, panX: 0, panY: 0 },
  targetCam3D: null,
  autoRotate: true,
  camGeo: { x: 0, y: 0, k: 1 },
  targetCamGeo: null,
  drag: null,
  mx: -999,
  my: -999,
  fx: [],
  NC: {},
  NM: [],
  tour: 0,
  seen: new Set(),
  projected2D: [],
  visCache: null,
  dirty: true
};

export const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
export const ease = a => {
  a = Math.min(1, Math.max(0, a));
  return 1 + 2.70158 * Math.pow(a - 1, 3) + 1.70158 * Math.pow(a - 1, 2);
};
export const esc = s => String(s).replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));
export const msg = t => {
  const el = document.querySelector('#st');
  if (el) el.textContent = t;
};

export function markDirty() {
  state.dirty = true;
}

export function invalidateVisCache() {
  state.visCache = null;
  markDirty();
}

export function vis(it) {
  if (!it) return false;
  if (!state.visCache) {
    state.visCache = new WeakMap();
  }
  if (state.visCache.has(it)) {
    return state.visCache.get(it);
  }
  let ok = state.on.has(it.cat);
  if (ok && state.q) {
    const hay = `${it.r.id} ${it.r.subject || ''} ${it.r.author || ''} ${it.r.notes || ''} ${it.siteName || ''}`.toLowerCase();
    ok = hay.includes(state.q);
  }
  state.visCache.set(it, ok);
  return ok;
}

export function getDisplayNotes(r, siteName, geoStatus) {
  const parts = [];
  if (r.notes && r.notes !== 'nan') parts.push(r.notes);
  if (r.id === 'IMG_0015' || r.id === 'IMG_0016') {
    parts.push('Nota scheda: soggetto indicato come Teropode nella categoria Archaeopteryx.');
  }
  if (r.id === 'IMG_0051') {
    parts.push('Nota scheda: URL riferito a Gryllus rubens all’interno della categoria Grilli.');
  }
  if (geoStatus === 'inferito') {
    parts.push(`Località inferita: ${siteName}`);
  }
  return parts.join(' · ');
}

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

export function thumb(bm) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const w = bm.width, h = bm.height, s = Math.max(128 / w, 128 / h);
  g.drawImage(bm, (128 - w * s) / 2, (128 - h * s) / 2, w * s, h * s);
  return c;
}

export function makePolaroidCanvas(th, catColor, idx) {
  const base = 128;
  const pad = Math.round(base * 0.08);
  const bottom = Math.round(base * 0.24);
  const c = document.createElement('canvas');
  c.width = base + pad * 2;
  c.height = base + pad + bottom;
  const g = c.getContext('2d');

  // Sfondo carta polaroid
  g.fillStyle = '#f4efe3';
  g.fillRect(0, 0, c.width, c.height);

  // Bordo sottile
  g.strokeStyle = 'rgba(28, 12, 6, 0.22)';
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, c.width - 1, c.height - 1);

  // Miniatura
  g.drawImage(th, pad, pad, base, base);

  // Fascia categoria in basso
  g.fillStyle = catColor || '#ee9a5b';
  g.fillRect(pad, pad + base + Math.round(pad * 0.6), base * 0.45, Math.max(3, Math.round(pad * 0.55)));

  // Piccolo ID discreto
  if (idx != null) {
    g.fillStyle = 'rgba(40, 18, 8, 0.55)';
    g.font = '600 9px Figtree, sans-serif';
    g.textAlign = 'right';
    g.fillText(`#${String(idx + 1).padStart(2, '0')}`, c.width - pad, pad + base + Math.round(pad * 1.35));
  }
  return c;
}

export function feat(thCanvas) {
  const s = 24, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(thCanvas, 0, 0, s, s);
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

export function tsne3D(F) {
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
  const T = 360; let it = 0;

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
      for (let r = 0; r < 10 && it < T; r++) mx = step();
      for (let i = 0; i < n; i++) {
        state.items[i].x = Y[3 * i] / mx;
        state.items[i].y = Y[3 * i + 1] / mx;
        state.items[i].z = Y[3 * i + 2] / mx;
      }
      markDirty();
      msg(it < T ? 'Organizzo le tavole… ' + Math.round(it / T * 100) + '%' : n + ' tavole pronte');
      if (it < T) requestAnimationFrame(fr); else res();
    })();
  });
}

export async function applyBitmapToItem(it, bm, idx) {
  const th = thumb(bm);
  const polaroid = makePolaroidCanvas(th, state.col[it.cat], idx);
  if (typeof bm.close === 'function') bm.close();
  it.th = th;
  it.polaroid = polaroid;
  it.ready = true;
  it.b = performance.now();
  markDirty();
}
