/* ===== CONFIGURAZIONE ===== */
const CONFIG = {
  csv: '02_database/database_immagini.csv',
  images: '01_immagini/',
  concurrency: 8
};

const $ = s => document.querySelector(s);
const cv = $('#cv'), cx = cv.getContext('2d'), wrap = $('#wrap');

const CAT_COLORS = {
  'Fossile': '#f6b27a',
  'Illustrazione': '#e9873f',
  'Animale vivente': '#ff6b4a',
  'da classificare': '#c9a68a'
};
const PAL = ['#f8d9b4', '#f0a35e', '#d9703b', '#b5492a', '#f4c08a', '#e58a4c', '#c85c33', '#fbe6cc'];

let items = [], col = {}, on = new Set();
let sel = -1, hov = -1;
let mode = 'thumb';      // 'thumb' | 'dot'
let viewMode = '3d';     // '3d' | 'geo' (attivo solo quando nessuna immagine è aperta in 2D)
let is2DInspect = false; // true SOLO quando una tavola è aperta per visualizzare l'immagine
let W = 0, H = 0, dpr = 1, Dm = null, q = '', busy = false;

// Spazio 3D completo (rotazione yaw/pitch, zoom, auto-rotazione, profondità prospettica)
let cam3D = { yaw: 0.35, pitch: 0.18, dist: 1150, autoRotate: true };
let drag = null;
let NC = {}, NM = [], tour = 0, seen = new Set();
let projected = [];
let stars = [];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const msg = t => { $('#st').textContent = t; };

/* Genera un campo stellare/particellare 3D leggero una sola volta */
(function initStars() {
  stars = Array.from({ length: 90 }, (_, i) => {
    const u = ((i * 73) % 100) / 100 * Math.PI * 2;
    const v = Math.acos(2 * (((i * 37) % 100) / 100) - 1);
    const r = 700 + ((i * 53) % 450);
    return {
      x: r * Math.sin(v) * Math.cos(u),
      y: r * Math.cos(v),
      z: r * Math.sin(v) * Math.sin(u),
      s: 0.8 + (i % 3) * 0.55,
      a: 0.18 + (i % 5) * 0.06
    };
  });
})();

/* ===== UI & PANNELLI ===== */
$('#btn-settings').onclick = () => {
  const pop = $('#view-settings-popover');
  const isHidden = pop.hidden;
  pop.hidden = !isHidden;
  $('#btn-settings').setAttribute('aria-expanded', isHidden);
};

$('#rot-auto').onclick = () => {
  cam3D.autoRotate = !cam3D.autoRotate;
  $('#rot-auto').setAttribute('aria-pressed', cam3D.autoRotate);
  $('#rot-auto').textContent = cam3D.autoRotate ? '↻ Rotazione 3D: ON' : '⏸ Rotazione 3D: OFF';
};

$('#close-det').onclick = () => exit2DInspect();

function exit2DInspect() {
  is2DInspect = false;
  sel = -1;
  $('#detail-drawer').classList.remove('is-open');
  $('#detail-drawer').setAttribute('aria-hidden', 'true');
  $('.brand-badge').classList.remove('is-hidden');
  cv.style.cursor = 'grab';
}

/* ===== PARSER CSV ===== */
function parseCSV(t) {
  t = t.replace(/^﻿/, '');
  const l = t.split(/
?
/)[0] || '';
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
    else if (c === '
' || c === '
') {
      if (c === '
' && t[i + 1] === '
') i++;
      r.push(f); f = ''; R.push(r); r = [];
    } else f += c;
  }
  if (f !== '' || r.length) { r.push(f); R.push(r); }
  if (!R.length) return [];
  const h = R.shift().map(s => s.trim().toLowerCase());
  return R.filter(x => x.some(v => v.trim())).map(x => Object.fromEntries(h.map((k, i) => [k, (x[i] || '').trim()])));
}

/* ===== RIFERIMENTI GEOGRAFICI ===== */
const GEO_HUBS = [
  { id: 'solnhofen', label: 'Solnhofen (Baviera)', gx: 0.09, gy: -0.27 },
  { id: 'berlin',    label: 'Berlino',             gx: 0.12, gy: -0.32 },
  { id: 'vienna',    label: 'Vienna',              gx: 0.15, gy: -0.26 },
  { id: 'paris',     label: 'Parigi',              gx: 0.02, gy: -0.26 },
  { id: 'simbruini', label: 'Monti Simbruini',     gx: 0.09, gy: -0.20 },
  { id: 'italia',    label: 'Italia',              gx: 0.08, gy: -0.22 },
  { id: 'oulu',      label: 'Oulu (Finlandia)',    gx: 0.19, gy: -0.43 },
  { id: 'fujian',    label: 'Fujian (Cina)',       gx: 0.69, gy: -0.12 },
  { id: 'broome',    label: 'Broome (Australia)',  gx: 0.71, gy:  0.23 },
  { id: 'europa',    label: 'Europa Centrale',     gx: 0.06, gy: -0.29 }
];

function assignGeoHub(r, idx) {
  const blob = `${r.subject || ''} ${r.notes || ''} ${r.source || ''} ${r.category || ''}`.toLowerCase();
  let hubId = 'europa';
  if (blob.includes('solnhofen') || blob.includes('bavarica') || blob.includes('baviera')) hubId = 'solnhofen';
  else if (blob.includes('berlino') || blob.includes('berlin')) hubId = 'berlin';
  else if (blob.includes('vienna')) hubId = 'vienna';
  else if (blob.includes('paris')) hubId = 'paris';
  else if (blob.includes('oulu')) hubId = 'oulu';
  else if (blob.includes('simbruini') || blob.includes('parchilazio')) hubId = 'simbruini';
  else if (blob.includes('pettirosso') || blob.includes('erithacus')) hubId = 'italia';
  else if (blob.includes('fujianvenator')) hubId = 'fujian';
  else if (blob.includes('dinosaurcoast') || blob.includes('teropode')) hubId = 'broome';
  else if (blob.includes('archaeopteryx')) hubId = 'solnhofen';

  const hub = GEO_HUBS.find(h => h.id === hubId) || GEO_HUBS[9];
  const ring = Math.floor(idx / 7) + 1;
  const angle = idx * 2.39996;
  const radius = 0.022 * Math.sqrt(ring);
  return {
    siteName: hub.label,
    gx: hub.gx + Math.cos(angle) * radius,
    gy: hub.gy + Math.sin(angle) * radius * 0.85
  };
}

/* ===== FEATURE & t-SNE 3D ===== */
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

function tsne3D(F) {
  const n = F.length, D = new Float64Array(n * n);
  let sum = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let s = 0;
    for (let k = 0; k < F[i].length; k++) { const d = F[i][k] - F[j][k]; s += d * d; }
    D[i * n + j] = D[j * n + i] = s; sum += 2 * s;
  }
  Dm = D;
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
  const T = 320; let it = 0;

  function step() {
    const ex = it < 80 ? 8 : 1, mo = it < 80 ? 0.5 : 0.8;
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
        items[i].x = Y[3 * i] / mx;
        items[i].y = Y[3 * i + 1] / mx;
        items[i].z = Y[3 * i + 2] / mx;
      }
      msg(it < T ? 'Organizzo lo spazio 3D… ' + Math.round(it / T * 100) + '%' : n + ' tavole in 3D');
      if (it < T) requestAnimationFrame(fr); else res();
    })();
  });
}

function thumb(bm) {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d'), w = bm.width, h = bm.height, s = Math.max(96 / w, 96 / h);
  g.drawImage(bm, (96 - w * s) / 2, (96 - h * s) / 2, w * s, h * s);
  return c;
}

/* ===== PROIEZIONE 3D ===== */
function project3D(wx, wy, wz) {
  const cosY = Math.cos(cam3D.yaw), sinY = Math.sin(cam3D.yaw);
  const cosP = Math.cos(cam3D.pitch), sinP = Math.sin(cam3D.pitch);

  // Rotazione asse Y
  const x1 = wx * cosY - wz * sinY;
  const z1 = wx * sinY + wz * cosY;
  // Rotazione asse X
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
  if (viewMode === '3d') {
    const r = Math.min(W, H) * 0.46;
    return { wx: it.x * r, wy: it.y * r, wz: it.z * r };
  }
  const mapW = Math.min(W * 0.9, H * 1.6);
  const mapH = mapW * 0.52;
  return { wx: it.gx * (mapW * 0.55), wy: it.gy * (mapH * 0.55), wz: 0 };
}

/* ===== INIZIALIZZAZIONE ===== */
function initItemsSkeleton(rows) {
  items = rows.map((r, i) => {
    const cat = (r.category && r.category.trim()) ? r.category.trim() : 'da classificare';
    const geo = assignGeoHub(r, i);
    const phi = Math.acos(1 - 2 * ((i + 0.5) / Math.max(1, rows.length)));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const rad = 0.45 + 0.35 * ((i * 7) % 10) / 10;
    return {
      r, bm: null, th: null, ready: false, cat,
      x: rad * Math.sin(phi) * Math.cos(theta),
      y: rad * Math.cos(phi),
      z: rad * Math.sin(phi) * Math.sin(theta),
      gx: geo.gx,
      gy: geo.gy,
      siteName: geo.siteName
    };
  });

  const cats = [...new Set(items.map(i => i.cat))];
  col = {};
  cats.forEach((c, i) => col[c] = CAT_COLORS[c] || PAL[i % PAL.length]);
  on = new Set(cats);

  $('#chips').innerHTML = '';
  cats.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    const k = items.filter(i => i.cat === c).length;
    b.textContent = c + ' (' + k + ')';
    b.style.setProperty('--c', col[c]);
    b.setAttribute('aria-pressed', 'true');
    b.onclick = () => {
      on.has(c) ? on.delete(c) : on.add(c);
      b.setAttribute('aria-pressed', on.has(c));
      updateVisibleBadge();
    };
    $('#chips').appendChild(b);
  });
  updateVisibleBadge();
}

async function finalizeLayoutFromLoaded() {
  const loadedIndices = items.map((it, idx) => it.ready ? idx : -1).filter(idx => idx >= 0);
  if (loadedIndices.length < 2) return;
  items = loadedIndices.map(idx => items[idx]);
  updateVisibleBadge();

  const F = prep(items.map(i => feat(i.bm)));
  await tsne3D(F);

  NC = {};
  NM = items.map((a, i) => items.map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2])
    .filter(o => o[0] !== i).sort((p, r) => p[1] - r[1]).slice(0, 2).map(o => o[0]));
}

function updateVisibleBadge() {
  $('#vis-count').textContent = items.filter(vis).length;
}

function setViewMode(nextMode) {
  if (is2DInspect) exit2DInspect();
  viewMode = nextMode;
  const is3D = nextMode === '3d';
  $('#vw-3d').classList.toggle('is-active', is3D);
  $('#vw-3d').setAttribute('aria-pressed', is3D);
  $('#vw-geo').classList.toggle('is-active', !is3D);
  $('#vw-geo').setAttribute('aria-pressed', !is3D);
  cam3D.yaw = is3D ? 0.35 : 0;
  cam3D.pitch = is3D ? 0.18 : 0;
  cam3D.dist = 1150;
}

$('#vw-3d').onclick = () => setViewMode('3d');
$('#vw-geo').onclick = () => setViewMode('geo');

/* ===== FILTRI & PASSAGGIO AL 2D SOLO PER VISUALIZZAZIONE IMMAGINE ===== */
function vis(it) {
  if (!on.has(it.cat)) return false;
  if (!q) return true;
  const hay = `${it.r.id} ${it.r.subject || ''} ${it.r.author || ''} ${it.r.notes || ''} ${it.siteName}`.toLowerCase();
  return hay.includes(q);
}

function openImage2D(i) {
  const it = items[i];
  if (!it || !it.ready) return;
  sel = i;
  is2DInspect = true; // Passa alla modalità 2D per la visualizzazione immagine
  stopTour();
  tip(-1);

  const c = $('#big'), g = c.getContext('2d'), bm = it.bm;
  const s = Math.min(c.width / bm.width, c.height / bm.height);
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(bm, (c.width - bm.width * s) / 2, (c.height - bm.height * s) / 2, bm.width * s, bm.height * s);

  $('#det-title').textContent = it.r.subject || it.r.id;
  const entries = Object.entries(it.r).filter(([k, v]) => v && k !== 'subject');
  entries.push(['località', it.siteName]);

  $('#dl').innerHTML = entries.map(([k, v]) => {
    if (k === 'source' && v.startsWith('http')) {
      let host = v;
      try { host = new URL(v).hostname + ' ↗'; } catch (e) {}
      return `<dt>${esc(k)}</dt><dd><a href="${esc(v)}" target="_blank" rel="noopener">${esc(host)}</a></dd>`;
    }
    return `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
  }).join('');

  const n = items.length, nb = $('#nb');
  nb.innerHTML = '';
  if (Dm && Dm.length === n * n) {
    [...Array(n).keys()].filter(j => j !== i && items[j].ready).sort((a, b) => Dm[i * n + a] - Dm[i * n + b]).slice(0, 5).forEach(j => {
      const b = document.createElement('button');
      b.type = 'button';
      const k = document.createElement('canvas');
      k.width = k.height = 64;
      k.getContext('2d').drawImage(items[j].th, 0, 0);
      b.appendChild(k);
      b.title = items[j].r.id + (items[j].r.subject ? ' — ' + items[j].r.subject : '');
      b.onclick = () => openImage2D(j);
      nb.appendChild(b);
    });
  }

  $('#detail-drawer').classList.add('is-open');
  $('#detail-drawer').setAttribute('aria-hidden', 'false');
  $('.brand-badge').classList.add('is-hidden');
}

/* ===== INTERAZIONE MOUSE / TOUCH ===== */
function pickNode(px, py) {
  for (let idx = projected.length - 1; idx >= 0; idx--) {
    const p = projected[idx];
    if (!p || !vis(items[idx])) continue;
    const half = (mode === 'thumb' ? p.size / 2 : 11);
    if (Math.abs(px - p.sx) <= half && Math.abs(py - p.sy) <= half) return idx;
  }
  return -1;
}

function tip(h, px, py) {
  const t = $('#tip');
  if (h < 0 || is2DInspect) { t.style.display = 'none'; return; }
  const it = items[h];
  t.textContent = it.r.id + (it.r.subject ? '
' + it.subject : '') + '
' + it.siteName + ' · ' + it.cat;
  t.textContent = it.r.id + (it.r.subject ? '
' + it.r.subject : '') + '
' + it.siteName + ' · ' + it.cat;
  t.style.display = 'block';
  t.style.left = Math.min(px + 14, W - 250) + 'px';
  t.style.top = (py + 14) + 'px';
}

cv.addEventListener('pointerdown', e => {
  if (is2DInspect) return;
  stopTour();
  cv.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, yaw: cam3D.yaw, pitch: cam3D.pitch, moved: false };
});

cv.addEventListener('pointermove', e => {
  if (is2DInspect) return;
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) {
      cam3D.yaw = drag.yaw + dx * 0.0065;
      cam3D.pitch = Math.max(-1.25, Math.min(1.25, drag.pitch + dy * 0.0065));
      return;
    }
  }
  hov = pickNode(px, py);
  tip(hov, px, py);
  cv.style.cursor = hov >= 0 ? 'pointer' : 'grab';
});

cv.addEventListener('pointerup', e => {
  if (is2DInspect) return;
  const was = drag; drag = null;
  if (was && !was.moved) {
    const r = cv.getBoundingClientRect(), h = pickNode(e.clientX - r.left, e.clientY - r.top);
    if (h >= 0) openImage2D(h);
  }
});
cv.addEventListener('pointerleave', () => { hov = -1; tip(-1); });

cv.addEventListener('wheel', e => {
  if (is2DInspect) return;
  e.preventDefault();
  const f = e.deltaY < 0 ? 0.88 : 1.14;
  cam3D.dist = Math.min(2400, Math.max(480, cam3D.dist * f));
}, { passive: false });

$('#zi').onclick = () => { cam3D.dist = Math.max(480, cam3D.dist * 0.82); };
$('#zo').onclick = () => { cam3D.dist = Math.min(2400, cam3D.dist * 1.22); };
$('#zr').onclick = () => {
  if (is2DInspect) exit2DInspect();
  cam3D.yaw = viewMode === '3d' ? 0.35 : 0;
  cam3D.pitch = viewMode === '3d' ? 0.18 : 0;
  cam3D.dist = 1150;
};

$('#q').oninput = e => {
  q = e.target.value.trim().toLowerCase();
  updateVisibleBadge();
};

$('#md').onclick = e => {
  mode = mode === 'thumb' ? 'dot' : 'thumb';
  e.target.textContent = mode === 'thumb' ? '✦ Solo punti luminosi' : '🖼 Mostra miniature';
};

$('#cp').onclick = () => {
  if (!items.length) return msg('Carica prima i dati.');
  const t = 'id,filename,category,site,x,y,z
' + items.map(i => [
    i.r.id, i.r.filename || '', i.cat, i.siteName, i.x.toFixed(4), i.y.toFixed(4), i.z.toFixed(4)
  ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('
');
  const o = $('#out'); o.value = t;
  const ok = () => msg('Coordinate copiate.'), fb = () => { o.hidden = false; o.select(); msg('Copia il testo qui sotto.'); };
  try { navigator.clipboard.writeText(t).then(ok, fb); } catch (e) { fb(); }
};

const nearest = (i, k) => {
  const n = items.length;
  if (!Dm || Dm.length !== n * n) return [...Array(n).keys()].filter(j => j !== i).slice(0, k);
  return [...Array(n).keys()].filter(j => j !== i).sort((a, b) => Dm[i * n + a] - Dm[i * n + b]).slice(0, k);
};
const links = i => NC[i] || (NC[i] = nearest(i, 5));

function stopTour() { if (tour) { clearInterval(tour); tour = 0; $('#tr').textContent = '▶ Passeggiata guidata'; } }
function hop() {
  const n = items.length; if (!n) return;
  const cur = sel >= 0 ? sel : 0; seen.add(cur);
  let nx = sel < 0 ? cur : nearest(cur, n - 1).find(j => !seen.has(j) && vis(items[j]) && items[j].ready);
  if (nx == null) { seen.clear(); nx = nearest(cur, 1)[0]; }
  openImage2D(nx);
}
$('#tr').onclick = () => {
  if (tour) return stopTour();
  if (!items.length) return msg('Carica prima i dati.');
  seen = new Set(); $('#tr').textContent = '⏹ Ferma passeggiata'; hop(); tour = setInterval(hop, 3200);
};

/* ===== RENDER 3D (ATTIVO QUANDO NON SI STA GUARDANDO LA SCHEDA 2D) ===== */
function draw3DBackground() {
  cx.fillStyle = '#1c0c06';
  cx.fillRect(0, 0, W, H);

  // Particelle 3D di profondità
  for (let i = 0; i < stars.length; i++) {
    const st = stars[i];
    const p = project3D(st.x, st.y, st.z);
    if (p.sx < -20 || p.sx > W + 20 || p.sy < -20 || p.sy > H + 20) continue;
    cx.fillStyle = `rgba(246, 196, 150, ${st.a})`;
    cx.beginPath();
    cx.arc(p.sx, p.sy, st.s * p.scale * 180, 0, Math.PI * 2);
    cx.fill();
  }

  if (viewMode === 'geo') {
    cx.strokeStyle = 'rgba(246, 196, 150, 0.14)';
    cx.lineWidth = 1;
    const mapW = Math.min(W * 0.9, H * 1.6);
    const mapH = mapW * 0.52;
    for (let gx = -1; gx <= 1; gx += 0.25) {
      const p1 = project3D(gx * mapW * 0.55, -0.65 * mapH * 0.55, 0);
      const p2 = project3D(gx * mapW * 0.55,  0.65 * mapH * 0.55, 0);
      cx.beginPath(); cx.moveTo(p1.sx, p1.sy); cx.lineTo(p2.sx, p2.sy); cx.stroke();
    }
    for (let gy = -0.6; gy <= 0.6; gy += 0.2) {
      const p1 = project3D(-mapW * 0.55, gy * mapH * 0.55, 0);
      const p2 = project3D( mapW * 0.55, gy * mapH * 0.55, 0);
      cx.beginPath(); cx.moveTo(p1.sx, p1.sy); cx.lineTo(p2.sx, p2.sy); cx.stroke();
    }
    cx.font = '12px Figtree, sans-serif';
    cx.textAlign = 'left';
    GEO_HUBS.forEach(hub => {
      const p = project3D(hub.gx * mapW * 0.55, hub.gy * mapH * 0.55, 0);
      cx.fillStyle = '#ee9a5b';
      cx.beginPath(); cx.arc(p.sx, p.sy, 3, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = 'rgba(251, 238, 224, 0.75)';
      cx.fillText(hub.label, p.sx + 7, p.sy + 4);
    });
  }
}

function render3D() {
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw3DBackground();

  if (!items.length) return;

  projected = items.map((it, i) => {
    const wc = nodeWorldCoords(it);
    const p = project3D(wc.wx, wc.wy, wc.wz);
    const size = Math.min(115, Math.max(22, 64 * p.scale * 190));
    return { sx: p.sx, sy: p.sy, size, depth: p.depth, idx: i };
  });

  // Connessioni 3D tra tavole affini
  cx.lineWidth = 1;
  cx.globalAlpha = 0.22;
  items.forEach((a, i) => {
    if (!vis(a)) return;
    (NM[i] || []).forEach(j => {
      if (!items[j] || !vis(items[j])) return;
      cx.beginPath();
      cx.moveTo(projected[i].sx, projected[i].sy);
      cx.lineTo(projected[j].sx, projected[j].sy);
      cx.strokeStyle = col[a.cat];
      cx.stroke();
    });
  });
  cx.globalAlpha = 1;

  // Raggi verso i 5 più affini al passaggio del mouse
  if (hov >= 0 && Dm && projected[hov]) {
    cx.strokeStyle = '#ffe2bd';
    cx.lineWidth = 1.5;
    cx.setLineDash([5, 6]);
    cx.globalAlpha = 0.65;
    links(hov).forEach(j => {
      if (!projected[j]) return;
      cx.beginPath();
      cx.moveTo(projected[hov].sx, projected[hov].sy);
      cx.lineTo(projected[j].sx, projected[j].sy);
      cx.stroke();
    });
    cx.setLineDash([]);
    cx.globalAlpha = 1;
  }

  // Ordina per profondità (painter's algorithm) dal più lontano al più vicino
  const ordered = [...projected].sort((a, b) => b.depth - a.depth);

  ordered.forEach(o => {
    const i = o.idx, it = items[i], c = col[it.cat];
    const isHov = i === hov;
    const depthFade = Math.max(0.32, Math.min(1, 1 - (o.depth + 500) / 1400));

    if (!vis(it)) {
      cx.globalAlpha = 0.16 * depthFade;
      cx.beginPath(); cx.arc(o.sx, o.sy, 3, 0, Math.PI * 2);
      cx.fillStyle = c; cx.fill();
      cx.globalAlpha = 1;
      return;
    }

    if (!it.ready || mode !== 'thumb') {
      cx.globalAlpha = depthFade;
      cx.beginPath(); cx.arc(o.sx, o.sy, isHov ? 9 : 6, 0, Math.PI * 2);
      cx.fillStyle = c; cx.fill();
      if (isHov) { cx.lineWidth = 2; cx.strokeStyle = '#fff'; cx.stroke(); }
      cx.globalAlpha = 1;
      return;
    }

    const s = o.size * (isHov ? 1.2 : 1), pad = s * 0.06;
    cx.save();
    cx.globalAlpha = depthFade;
    cx.translate(o.sx, o.sy);
    cx.fillStyle = isHov ? '#fff' : '#f4efe3';
    cx.fillRect(-s / 2 - pad, -s / 2 - pad, s + pad * 2, s + pad * 3);
    cx.drawImage(it.th, -s / 2, -s / 2, s, s);
    cx.fillStyle = c;
    cx.fillRect(-s / 2, s / 2 + pad * 0.8, s * 0.4, Math.max(2, pad * 0.7));
    if (isHov) {
      cx.lineWidth = 2.5;
      cx.strokeStyle = '#ee9a5b';
      cx.strokeRect(-s / 2 - pad, -s / 2 - pad, s + pad * 2, s + pad * 3);
    }
    cx.restore();
  });
}

function tick() {
  // Il loop 3D gira solo quando non è aperta una scheda immagine in 2D
  if (!is2DInspect) {
    if (cam3D.autoRotate && !drag && hov < 0 && viewMode === '3d') {
      cam3D.yaw += 0.0032;
    }
    render3D();
  }
  requestAnimationFrame(tick);
}

new ResizeObserver(() => {
  dpr = window.devicePixelRatio || 1;
  W = wrap.clientWidth; H = wrap.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  if (!is2DInspect) render3D();
}).observe(wrap);

requestAnimationFrame(tick);

/* ===== CARICAMENTO DATI ===== */
async function autoload() {
  try {
    msg('Carico indice…');
    const res = await fetch(CONFIG.csv, { cache: 'default' });
    if (!res.ok) throw new Error('csv');
    const rows = parseCSV(await res.text());
    if (!rows.length) throw new Error('vuoto');

    initItemsSkeleton(rows);
    $('#dati-acc').open = false;

    const queue = rows.map((_, i) => i);
    let miss = 0, done = 0;

    async function work() {
      while (queue.length) {
        const i = queue.shift();
        const f = (rows[i].filename || '').trim();
        try {
          if (!f) throw 0;
          const url = CONFIG.images + f.split('/').map(encodeURIComponent).join('/');
          const rs = await fetch(url, { cache: 'force-cache' });
          if (!rs.ok) throw 0;
          const bm = await createImageBitmap(await rs.blob());
          items[i].bm = bm;
          items[i].th = thumb(bm);
          items[i].ready = true;
        } catch (e) {
          miss++;
        }
        done++;
        msg(done < rows.length ? `Caricamento… ${done}/${rows.length}` : `${rows.length - miss} tavole pronte`);
      }
    }

    await Promise.all(Array.from({ length: CONFIG.concurrency }, work));
    if (miss) $('#wn').textContent = miss + ' righe senza immagine corrispondente.';
    await finalizeLayoutFromLoaded();
  } catch (e) {
    $('#dati-acc').open = true;
    msg('Apri su GitHub Pages / Live Server oppure carica i file qui sotto.');
  }
}

$('#go').onclick = async () => {
  if (busy) return;
  busy = true;
  const imgs = [...$('#fi').files], csv = $('#fc').files[0];
  $('#wn').textContent = '';
  if (!imgs.length) { busy = false; return msg('Seleziona prima le immagini.'); }
  const map = new Map(imgs.map(f => [f.name.toLowerCase(), f]));
  const rows = csv ? parseCSV(await csv.text()) : imgs.map(f => ({ id: f.name.replace(/\.[^.]+$/, ''), filename: f.name }));

  initItemsSkeleton(rows);
  let miss = 0;
  await Promise.all(rows.map(async (r, i) => {
    const f = map.get((r.filename || '').toLowerCase());
    if (!f) { miss++; return; }
    try {
      const bm = await createImageBitmap(f);
      items[i].bm = bm;
      items[i].th = thumb(bm);
      items[i].ready = true;
    } catch (e) { miss++; }
  }));

  if (miss) $('#wn').textContent = miss + ' righe senza file corrispondente.';
  await finalizeLayoutFromLoaded();
  busy = false;
};

$('#ex').onclick = async () => {
  if (busy) return;
  busy = true;
  const rows = [], C = ['Fossile', 'Illustrazione', 'Animale vivente'];
  for (let i = 0; i < 36; i++) {
    const k = i % 3;
    const id = 'IMG_' + String(i + 1).padStart(4, '0');
    rows.push({ id, filename: id + '.jpg', subject: k === 2 ? 'Pettirosso (Erithacus rubecula)' : 'Archaeopteryx lithographica', category: C[k] });
  }
  initItemsSkeleton(rows);
  for (let i = 0; i < 36; i++) {
    const k = i % 3, c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d'), h = [28, 22, 12][k] + Math.random() * 18;
    g.fillStyle = 'hsl(' + h + ' 45% ' + (32 + Math.random() * 25) + '%)'; g.fillRect(0, 0, 96, 96);
    g.fillStyle = 'hsl(' + (h + 25) + ' 65% 75%)';
    g.beginPath(); g.arc(48, 48, 16 + Math.random() * 14, 0, 7); g.fill();
    const bm = await createImageBitmap(c);
    items[i].bm = bm;
    items[i].th = thumb(bm);
    items[i].ready = true;
  }
  await finalizeLayoutFromLoaded();
  busy = false;
};

autoload();
