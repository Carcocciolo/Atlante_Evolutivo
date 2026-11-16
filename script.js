/* ===== CONFIGURAZIONE ===== */
const CONFIG = {
  csv: '02_database/database_immagini.csv',
  images: '01_immagini/',
  concurrency: 12
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
let mode = 'thumb';     // 'thumb' | 'dot'
let viewMode = '3d';    // '3d' | 'geo'
let W = 0, H = 0, dpr = 1, Dm = null, q = '', busy = false;
let focusBlurAmt = 0;

// Camera 3D
let cam3D = { yaw: 0.35, pitch: 0.18, zoom: 1.0, panX: 0, panY: 0 };
let targetCam3D = null;
let autoRotate = true;

// Camera Mappa Geografica Stilizzata 2D
let camGeo = { x: 0, y: 0, k: 1 };
let targetCamGeo = null;

let drag = null;
let mx = -999, my = -999, fx = [], NC = {}, NM = [], tour = 0, seen = new Set();
let projected2D = [];

const dust = Array.from({ length: 85 }, () => ({
  x: Math.random(), y: Math.random(),
  s: Math.random() * 1.6 + 0.4, p: Math.random() * 6.3, v: Math.random() * 0.0004 + 0.0001
}));
const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
const ease = a => { a = Math.min(1, Math.max(0, a)); return 1 + 2.70158 * Math.pow(a - 1, 3) + 1.70158 * Math.pow(a - 1, 2); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const msg = t => { $('#st').textContent = t; };

/* ===== GESTIONE MENU & DRAWER ===== */
$('#btn-settings').onclick = () => {
  const pop = $('#view-settings-popover');
  const isHidden = pop.hidden;
  pop.hidden = !isHidden;
  $('#btn-settings').setAttribute('aria-expanded', isHidden);
};

$('#close-det').onclick = () => closeSelection();

function closeSelection() {
  sel = -1;
  $('#detail-drawer').classList.remove('is-open');
  $('#detail-drawer').setAttribute('aria-hidden', 'true');
  $('.brand-badge').classList.remove('is-hidden');
  targetCam3D = null;
  targetCamGeo = null;
}

/* ===== PARSER CSV ===== */
function parseCSV(t) {
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

/* ===== MAPPA STILIZZATA CHIARA (100% OFFLINE & NESSUNA API ESTERNA) ===== */
const WORLD_REGIONS = [
  {
    name: 'Nord America',
    pts: [[-0.86,-0.52],[-0.72,-0.56],[-0.56,-0.52],[-0.45,-0.44],[-0.48,-0.30],[-0.56,-0.20],[-0.62,-0.12],[-0.66,-0.10],[-0.72,-0.18],[-0.78,-0.32],[-0.85,-0.42]]
  },
  {
    name: 'Sud America',
    pts: [[-0.58,-0.04],[-0.46,-0.02],[-0.38,0.10],[-0.42,0.28],[-0.48,0.46],[-0.53,0.48],[-0.56,0.32],[-0.60,0.12]]
  },
  {
    name: 'Europa',
    pts: [[-0.08,-0.26],[0.02,-0.34],[0.12,-0.46],[0.24,-0.46],[0.30,-0.34],[0.26,-0.22],[0.16,-0.19],[0.08,-0.17],[0.02,-0.19],[-0.07,-0.20]]
  },
  {
    name: 'Africa',
    pts: [[-0.12,-0.14],[0.04,-0.14],[0.20,-0.08],[0.26,0.04],[0.22,0.24],[0.14,0.38],[0.06,0.38],[0.02,0.20],[-0.06,0.08],[-0.15,0.00]]
  },
  {
    name: 'Asia',
    pts: [[0.28,-0.46],[0.52,-0.52],[0.78,-0.48],[0.88,-0.34],[0.82,-0.16],[0.70,-0.04],[0.58,-0.02],[0.46,-0.10],[0.34,-0.16],[0.28,-0.26]]
  },
  {
    name: 'Oceania',
    pts: [[0.64,0.14],[0.82,0.14],[0.88,0.28],[0.80,0.38],[0.64,0.34],[0.60,0.22]]
  }
];

const GEO_HUBS = [
  { id: 'solnhofen', label: 'Solnhofen (Baviera)',     gx: 0.085, gy: -0.275 },
  { id: 'berlin',    label: 'Berlino (Naturkunde)',    gx: 0.115, gy: -0.325 },
  { id: 'vienna',    label: 'Vienna (NHM)',            gx: 0.145, gy: -0.265 },
  { id: 'paris',     label: 'Parigi',                  gx: 0.015, gy: -0.260 },
  { id: 'simbruini', label: 'Monti Simbruini (Lazio)', gx: 0.095, gy: -0.205 },
  { id: 'italia',    label: 'Italia (Avifauna)',       gx: 0.075, gy: -0.220 },
  { id: 'oulu',      label: 'Oulu (Finlandia)',        gx: 0.195, gy: -0.435 },
  { id: 'fujian',    label: 'Fujian (Cina)',           gx: 0.695, gy: -0.115 },
  { id: 'broome',    label: 'Broome (Australia)',      gx: 0.715, gy: 0.235 },
  { id: 'europa',    label: 'Europa Centrale',         gx: 0.060, gy: -0.295 }
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

/* ===== ESTRAZIONE FEATURE & t-SNE 3D ===== */
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
        items[i].x = Y[3 * i] / mx;
        items[i].y = Y[3 * i + 1] / mx;
        items[i].z = Y[3 * i + 2] / mx;
      }
      msg(it < T ? 'Organizzo le tavole… ' + Math.round(it / T * 100) + '%' : n + ' tavole pronte');
      if (it < T) requestAnimationFrame(fr); else res();
    })();
  });
}

function thumb(bm) {
  const c = document.createElement('canvas'); c.width = c.height = 110;
  const g = c.getContext('2d'), w = bm.width, h = bm.height, s = Math.max(110 / w, 110 / h);
  g.drawImage(bm, (110 - w * s) / 2, (110 - h * s) / 2, w * s, h * s);
  return c;
}

/* ===== PROIEZIONE PROSPETTICA 3D & MAPPA 2D ===== */
function project3DWithCam(x, y, z, cObj) {
  const cy = Math.cos(cObj.yaw), sy = Math.sin(cObj.yaw);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;

  const cp = Math.cos(cObj.pitch), sp = Math.sin(cObj.pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;

  const fov = 2.6;
  const depth = fov / Math.max(0.35, fov + z2);
  const baseScale = Math.min(W, H) * 0.44 * cObj.zoom;

  return {
    sx: W / 2 + cObj.panX + x1 * baseScale * depth,
    sy: H / 2 + cObj.panY + y2 * baseScale * depth,
    scale: depth,
    zOrder: z2
  };
}

function project3D(x, y, z) {
  return project3DWithCam(x, y, z, cam3D);
}

function geoToScreen(gx, gy, cObj = camGeo) {
  const mapW = Math.min(W * 0.92, H * 1.65);
  const mapH = mapW * 0.54;
  return {
    sx: W / 2 + cObj.x + gx * (mapW / 2) * cObj.k,
    sy: H / 2 + cObj.y + gy * (mapH / 2) * cObj.k,
    scale: Math.sqrt(cObj.k),
    zOrder: 0
  };
}

/* ===== FOCUS CAMERA SU NODO SELEZIONATO (SIA 3D CHE MAPPA) ===== */
function focusCameraOnNode(it) {
  const desiredScreenX = W > 760 ? Math.min(W * 0.62, 360 + (W - 360) * 0.45) : W * 0.5;
  const desiredScreenY = W > 760 ? H * 0.5 : H * 0.74;

  if (viewMode === '3d') {
    const targetYaw = Math.atan2(it.x, -it.z);
    const horiz = Math.hypot(it.x, it.z);
    const targetPitch = Math.max(-1.1, Math.min(1.1, Math.atan2(it.y, horiz)));
    const targetZoom = 2.35;

    const probe = project3DWithCam(it.x, it.y, it.z, {
      yaw: targetYaw, pitch: targetPitch, zoom: targetZoom, panX: 0, panY: 0
    });

    targetCam3D = {
      yaw: targetYaw,
      pitch: targetPitch,
      zoom: targetZoom,
      panX: desiredScreenX - probe.sx,
      panY: desiredScreenY - probe.sy
    };
  } else {
    const targetK = 2.6;
    const probe = geoToScreen(it.gx, it.gy, { x: 0, y: 0, k: targetK });
    targetCamGeo = {
      x: desiredScreenX - probe.sx,
      y: desiredScreenY - probe.sy,
      k: targetK
    };
  }
}

/* ===== INIZIALIZZAZIONE & POPOLAMENTO PROGRESSIVO ISTANTANEO ===== */
function initItemsSkeleton(rows) {
  items = rows.map((r, i) => {
    const cat = (r.category && r.category.trim()) ? r.category.trim() : 'da classificare';
    const geo = assignGeoHub(r, i);
    // Posizione iniziale armoniosa su sfera (prima ancora che t-SNE finisca!)
    const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(1, rows.length));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    return {
      r,
      bm: null,
      th: null,
      ready: false,
      cat,
      x: Math.cos(theta) * Math.sin(phi) * 0.78,
      y: Math.cos(phi) * 0.78,
      z: Math.sin(theta) * Math.sin(phi) * 0.78,
      gx: geo.gx,
      gy: geo.gy,
      siteName: geo.siteName,
      b: performance.now() + i * 10
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

  // Rimuove eventuali righe senza immagine
  items = loadedIndices.map(idx => items[idx]);
  updateVisibleBadge();

  const F = prep(items.map(i => feat(i.bm)));
  await tsne3D(F);

  NC = {};
  NM = items.map((a, i) => items.map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2])
    .filter(o => o[0] !== i).sort((p, r) => p[1] - r[1]).slice(0, 2).map(o => o[0]));
}

function updateVisibleBadge() {
  const count = items.filter(vis).length;
  $('#vis-count').textContent = count;
}

/* ===== SWITCH TRA SPAZIO 3D E MAPPA STILIZZATA ===== */
function setViewMode(nextMode) {
  viewMode = nextMode;
  const is3D = nextMode === '3d';
  $('#vw-3d').classList.toggle('is-active', is3D);
  $('#vw-3d').setAttribute('aria-pressed', is3D);
  $('#vw-geo').classList.toggle('is-active', !is3D);
  $('#vw-geo').setAttribute('aria-pressed', !is3D);

  $('#rot-auto').hidden = !is3D;
  if (sel >= 0 && items[sel]) {
    focusCameraOnNode(items[sel]);
  }
}

$('#vw-3d').onclick = () => setViewMode('3d');
$('#vw-geo').onclick = () => setViewMode('geo');

/* ===== FILTRI & SELEZIONE CON ZOOM E FOCUS ===== */
function vis(it) {
  if (!on.has(it.cat)) return false;
  if (!q) return true;
  const hay = `${it.r.id} ${it.r.subject || ''} ${it.r.author || ''} ${it.r.notes || ''} ${it.siteName}`.toLowerCase();
  return hay.includes(q);
}

function show(i) {
  const it = items[i];
  if (!it || !it.ready) return;
  sel = i;

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
      b.onclick = () => show(j);
      nb.appendChild(b);
    });
  }

  $('#detail-drawer').classList.add('is-open');
  $('#detail-drawer').setAttribute('aria-hidden', 'false');
  $('.brand-badge').classList.add('is-hidden');

  if (viewMode === '3d') {
    autoRotate = false;
    $('#rot-auto').setAttribute('aria-pressed', 'false');
    $('#rot-auto').textContent = '↻ Rotazione 3D: OFF';
  }
  focusCameraOnNode(it);
  boom(it, col[it.cat]);
}

/* ===== INTERAZIONE MOUSE / TOUCH ===== */
function pickNode(px, py) {
  const sorted = projected2D
    .map((p, idx) => ({ p, idx }))
    .filter(o => o.p && vis(items[o.idx]))
    .sort((a, b) => a.p.zOrder - b.p.zOrder);

  for (const { p, idx } of sorted) {
    const half = (mode === 'thumb' ? p.size / 2 : 11);
    if (Math.abs(px - p.sx) <= half && Math.abs(py - p.sy) <= half) return idx;
  }
  return -1;
}

function tip(h, px, py) {
  const t = $('#tip');
  if (h < 0) { t.style.display = 'none'; return; }
  const it = items[h];
  t.textContent = it.r.id + (it.r.subject ? '\n' + it.r.subject : '') + '\n' + it.siteName + ' · ' + it.cat;
  t.style.display = 'block';
  t.style.left = Math.min(px + 14, W - 250) + 'px';
  t.style.top = (py + 14) + 'px';
}

cv.addEventListener('pointerdown', e => {
  targetCam3D = null;
  targetCamGeo = null;
  stopTour();
  cv.setPointerCapture(e.pointerId);
  drag = {
    x: e.clientX, y: e.clientY,
    yaw: cam3D.yaw, pitch: cam3D.pitch,
    panX: cam3D.panX, panY: cam3D.panY,
    geoX: camGeo.x, geoY: camGeo.y,
    shift: e.shiftKey || e.button === 2,
    moved: false
  };
});

cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  mx = px; my = py;
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) {
      if (viewMode === 'geo') {
        camGeo.x = drag.geoX + dx;
        camGeo.y = drag.geoY + dy;
      } else if (drag.shift) {
        cam3D.panX = drag.panX + dx;
        cam3D.panY = drag.panY + dy;
      } else {
        autoRotate = false;
        $('#rot-auto').setAttribute('aria-pressed', 'false');
        $('#rot-auto').textContent = '↻ Rotazione 3D: OFF';
        cam3D.yaw = drag.yaw + dx * 0.0065;
        cam3D.pitch = Math.max(-1.35, Math.min(1.35, drag.pitch + dy * 0.0065));
      }
      return;
    }
  }
  const h = pickNode(px, py);
  hov = h; tip(h, px, py);
  cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
});

cv.addEventListener('pointerup', e => {
  const was = drag; drag = null;
  if (was && !was.moved) {
    const r = cv.getBoundingClientRect(), h = pickNode(e.clientX - r.left, e.clientY - r.top);
    if (h >= 0) show(h);
    else if (sel >= 0) closeSelection();
  }
});
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerleave', () => { hov = -1; mx = -999; tip(-1); });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  targetCam3D = null;
  targetCamGeo = null;
  const f = e.deltaY < 0 ? 1.12 : 0.89;
  if (viewMode === '3d') {
    cam3D.zoom = Math.min(4.8, Math.max(0.45, cam3D.zoom * f));
  } else {
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const nk = Math.min(5.5, Math.max(0.6, camGeo.k * f));
    const ratio = nk / camGeo.k;
    camGeo.x = px - W / 2 - (px - W / 2 - camGeo.x) * ratio;
    camGeo.y = py - H / 2 - (py - H / 2 - camGeo.y) * ratio;
    camGeo.k = nk;
  }
}, { passive: false });

/* ===== PULSANTI ZOOM & OPZIONI ===== */
$('#zi').onclick = () => {
  if (viewMode === '3d') { targetCam3D = null; cam3D.zoom = Math.min(4.8, cam3D.zoom * 1.25); }
  else { targetCamGeo = null; camGeo.k = Math.min(5.5, camGeo.k * 1.25); }
};
$('#zo').onclick = () => {
  if (viewMode === '3d') { targetCam3D = null; cam3D.zoom = Math.max(0.45, cam3D.zoom * 0.8); }
  else { targetCamGeo = null; camGeo.k = Math.max(0.6, camGeo.k * 0.8); }
};
$('#zr').onclick = () => {
  closeSelection();
  if (viewMode === '3d') {
    targetCam3D = { yaw: 0.35, pitch: 0.18, zoom: 1.0, panX: 0, panY: 0 };
  } else {
    targetCamGeo = { x: 0, y: 0, k: 1.0 };
  }
};

$('#rot-auto').onclick = e => {
  autoRotate = !autoRotate;
  e.target.setAttribute('aria-pressed', autoRotate);
  e.target.textContent = autoRotate ? '↻ Rotazione 3D: ON' : '↻ Rotazione 3D: OFF';
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
  const t = 'id,filename,category,site,x3d,y3d,z3d\n' + items.map(i => [
    i.r.id, i.r.filename || '', i.cat, i.siteName,
    i.x.toFixed(4), i.y.toFixed(4), i.z.toFixed(4)
  ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  const o = $('#out'); o.value = t;
  const ok = () => msg('Coordinate copiate.'), fb = () => { o.hidden = false; o.select(); msg('Copia il testo qui sotto.'); };
  try { navigator.clipboard.writeText(t).then(ok, fb); } catch (e) { fb(); }
};

/* ===== TOUR AUTOMATICO ===== */
const nearest = (i, k) => {
  const n = items.length;
  if (!Dm || Dm.length !== n * n) return [...Array(n).keys()].filter(j => j !== i).slice(0, k);
  return [...Array(n).keys()].filter(j => j !== i).sort((a, b) => Dm[i * n + a] - Dm[i * n + b]).slice(0, k);
};
const links = i => NC[i] || (NC[i] = nearest(i, 5));
const boom = (it, c) => fx.push({ it, c, t0: performance.now(), sp: Array.from({ length: 16 }, (_, k) => ({ a: k / 16 * 6.283 + Math.random() * 0.3, v: 55 + Math.random() * 80 })) });

function stopTour() { if (tour) { clearInterval(tour); tour = 0; $('#tr').textContent = '▶ Passeggiata guidata'; } }
function hop() {
  const n = items.length; if (!n) return;
  const cur = sel >= 0 ? sel : 0; seen.add(cur);
  let nx = sel < 0 ? cur : nearest(cur, n - 1).find(j => !seen.has(j) && vis(items[j]) && items[j].ready);
  if (nx == null) { seen.clear(); nx = nearest(cur, 1)[0]; }
  show(nx);
}
$('#tr').onclick = () => {
  if (tour) return stopTour();
  if (!items.length) return msg('Carica prima i dati.');
  seen = new Set(); $('#tr').textContent = '⏹ Ferma passeggiata'; hop(); tour = setInterval(hop, 3200);
};

/* ===== DISEGNO MAPPA STILIZZATA CHIARA (100% VECTOR / ZERO API) ===== */
function drawStylizedGeoMap() {
  // Sfondo pergamena-ambra luminosa
  const gMap = cx.createRadialGradient(W / 2 + camGeo.x, H / 2 + camGeo.y, 10, W / 2 + camGeo.x, H / 2 + camGeo.y, Math.max(W, H) * 0.9);
  gMap.addColorStop(0, '#5c2c16');
  gMap.addColorStop(0.55, '#3b1a0c');
  gMap.addColorStop(1, '#1d0b05');
  cx.fillStyle = gMap;
  cx.fillRect(0, 0, W, H);

  // Reticolo cartografico (meridiani e paralleli chiari)
  cx.save();
  cx.strokeStyle = 'rgba(255, 224, 188, 0.14)';
  cx.lineWidth = 1;
  for (let gx = -1; gx <= 1; gx += 0.25) {
    const p1 = geoToScreen(gx, -0.65);
    const p2 = geoToScreen(gx, 0.65);
    cx.beginPath(); cx.moveTo(p1.sx, p1.sy); cx.lineTo(p2.sx, p2.sy); cx.stroke();
  }
  for (let gy = -0.6; gy <= 0.6; gy += 0.2) {
    const p1 = geoToScreen(-1.05, gy);
    const p2 = geoToScreen(1.05, gy);
    cx.beginPath();
    if (Math.abs(gy) < 0.01) {
      cx.strokeStyle = 'rgba(255, 214, 165, 0.34)';
      cx.setLineDash([6, 6]);
    } else {
      cx.strokeStyle = 'rgba(255, 224, 188, 0.12)';
      cx.setLineDash([]);
    }
    cx.moveTo(p1.sx, p1.sy); cx.lineTo(p2.sx, p2.sy); cx.stroke();
  }
  cx.setLineDash([]);
  cx.restore();

  // Continenti stilizzati ben leggibili e luminosi
  cx.save();
  WORLD_REGIONS.forEach(reg => {
    cx.beginPath();
    reg.pts.forEach((pt, idx) => {
      const p = geoToScreen(pt[0], pt[1]);
      if (idx === 0) cx.moveTo(p.sx, p.sy);
      else cx.lineTo(p.sx, p.sy);
    });
    cx.closePath();
    cx.fillStyle = 'rgba(246, 186, 130, 0.17)';
    cx.strokeStyle = 'rgba(255, 216, 174, 0.48)';
    cx.lineWidth = 1.6;
    cx.fill();
    cx.stroke();
  });
  cx.restore();

  // Rotte evolutive tratteggiate che collegano i siti principali
  cx.save();
  cx.strokeStyle = 'rgba(255, 200, 140, 0.28)';
  cx.lineWidth = 1.4;
  cx.setLineDash([4, 6]);
  const routes = [
    ['solnhofen', 'berlin'],
    ['solnhofen', 'vienna'],
    ['solnhofen', 'paris'],
    ['solnhofen', 'italia'],
    ['italia', 'simbruini'],
    ['berlin', 'oulu'],
    ['solnhofen', 'fujian'],
    ['fujian', 'broome']
  ];
  routes.forEach(([aId, bId]) => {
    const a = GEO_HUBS.find(h => h.id === aId);
    const b = GEO_HUBS.find(h => h.id === bId);
    if (!a || !b) return;
    const pa = geoToScreen(a.gx, a.gy), pb = geoToScreen(b.gx, b.gy);
    cx.beginPath();
    cx.moveTo(pa.sx, pa.sy);
    cx.quadraticCurveTo((pa.sx + pb.sx) / 2, (pa.sy + pb.sy) / 2 - 22, pb.sx, pb.sy);
    cx.stroke();
  });
  cx.setLineDash([]);
  cx.restore();

  // Etichette dei siti geografici chiare e nitide
  cx.save();
  cx.font = 'italic 600 12.5px Fraunces, Georgia, serif';
  cx.textAlign = 'left';
  GEO_HUBS.forEach(hub => {
    const p = geoToScreen(hub.gx, hub.gy);
    cx.fillStyle = '#ffbe7d';
    cx.beginPath(); cx.arc(p.sx, p.sy, 3.5, 0, 7); cx.fill();
    cx.fillStyle = 'rgba(255, 238, 218, 0.88)';
    cx.fillText(hub.label, p.sx + 7, p.sy + 4);
  });
  cx.restore();
}

/* ===== ILLUSTRAZIONI VETTORIALI SULLO SFONDO: ARCHAEOPTERYX, PETTIROSSO E GRILLO ===== */
function drawBackgroundArt(t) {
  const s = Math.min(W, H) / 560, rm = RM ? 0 : 1, px = cam3D.panX * 0.08, py = cam3D.panY * 0.05, F = 'Fraunces,Georgia,serif';
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
  cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.translate(W * 0.56 + px, H * 0.21 + py + Math.sin(t * 0.0005) * 8 * rm);
  cx.rotate(-0.1 + Math.sin(t * 0.0004) * 0.02 * rm);
  cx.scale(s * 0.95, s * 0.95);
  cx.strokeStyle = 'rgba(255,138,36,.68)'; cx.fillStyle = 'rgba(255,196,48,.12)';
  cx.shadowColor = 'rgba(255,140,40,.6)'; cx.shadowBlur = 14; cx.lineWidth = 1.8;
  cx.beginPath(); cx.ellipse(0, 0, 46, 19, -0.25, 0, 7); cx.fill(); cx.stroke();
  cx.beginPath(); cx.moveTo(-38, -12); cx.quadraticCurveTo(-56, -28, -64, -34);
  cx.moveTo(-60, -38); cx.arc(-70, -38, 10, 0, 7);
  cx.moveTo(-79, -38); cx.lineTo(-96, -33); cx.lineTo(-80, -31); cx.stroke();
  cx.fillRect(-74, -42, 2.5, 2.5);
  cx.strokeStyle = 'rgba(255,176,40,.65)';
  cx.beginPath();
  for (let i = 0; i < 16; i++) {
    const x = 44 + i * 11, y = 8 + i * 1.1 + Math.sin(t * 0.0012 + i * 0.4) * 2.5 * rm;
    cx.moveTo(x, y); cx.lineTo(x + 16, y + 14);
    cx.moveTo(x, y); cx.lineTo(x + 16, y - 4);
  }
  cx.moveTo(42, 6); cx.bezierCurveTo(110, 10, 170, 22, 230, 22);
  cx.moveTo(42, 12); cx.bezierCurveTo(110, 26, 170, 38, 230, 32); cx.stroke();
  const fl = Math.sin(t * 0.0014) * 0.12 * rm;
  cx.strokeStyle = 'rgba(255,214,70,.75)';
  cx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -2.6 + k * 0.2 + fl, L = 60 + k * 7, ex = -4 + Math.cos(a) * L, ey = -14 + Math.sin(a) * L;
    cx.moveTo(-4, -14); cx.quadraticCurveTo((-4 + ex) / 2 + 8, (-14 + ey) / 2 - 10, ex, ey);
  }
  cx.stroke();
  cx.strokeStyle = 'rgba(255,138,36,.68)';
  cx.beginPath(); cx.moveTo(-2, 16); cx.lineTo(-10, 40); cx.lineTo(-24, 56); cx.lineTo(-34, 60);
  cx.moveTo(-24, 56); cx.lineTo(-30, 64); cx.moveTo(-24, 56); cx.lineTo(-18, 64); cx.stroke();
  cx.restore();
  cap('archaeopteryx', 'Giurassico, circa 150 milioni di anni fa', W * 0.56 + px + 35 * s, H * 0.21 + py + 108 * s, 'rgba(255,172,52,');

  // 2. PETTIROSSO — Erithacus rubecula
  cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.translate(W * 0.22 - px * 0.9, H * 0.77 + py + Math.sin(t * 0.0006 + 1.2) * 6 * rm);
  cx.scale(s * 0.95, s * 0.95);
  cx.strokeStyle = 'rgba(250,206,162,.62)'; cx.fillStyle = 'rgba(250,206,162,.08)';
  cx.shadowColor = 'rgba(255,180,120,.45)'; cx.shadowBlur = 12; cx.lineWidth = 1.7;
  cx.beginPath(); cx.ellipse(0, 0, 36, 26, -0.35, 0, 7); cx.fill(); cx.stroke();
  cx.fillStyle = 'rgba(255,108,58,.28)';
  cx.strokeStyle = 'rgba(255,118,68,.75)';
  cx.beginPath(); cx.arc(16, -8, 17, -1.6, 1.4); cx.fill(); cx.stroke();
  cx.strokeStyle = 'rgba(250,206,162,.68)';
  cx.beginPath(); cx.arc(22, -22, 15, 0, 7); cx.stroke();
  cx.fillStyle = 'rgba(255,228,196,.85)';
  cx.beginPath(); cx.arc(26, -24, 2.3, 0, 7); cx.fill();
  cx.beginPath(); cx.moveTo(36, -23); cx.lineTo(49, -20); cx.lineTo(36, -18); cx.stroke();
  cx.beginPath();
  cx.moveTo(-8, -10); cx.quadraticCurveTo(-28, 2, -46, 18);
  cx.moveTo(-30, 14); cx.lineTo(-68, 34); cx.lineTo(-64, 41); cx.lineTo(-26, 20);
  cx.moveTo(-2, 23); cx.lineTo(-6, 48); cx.moveTo(-14, 48); cx.lineTo(4, 48);
  cx.moveTo(8, 21); cx.lineTo(6, 46); cx.moveTo(-2, 46); cx.lineTo(14, 46);
  cx.stroke();
  cx.restore();
  cap('Erithacus rubecula', 'il Pettirosso: erede vivente dei teropodi aviani', W * 0.22 - px * 0.9, H * 0.77 + py + 76 * s, 'rgba(255,152,102,');

  // 3. GRILLO DI KAUAI
  cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.translate(W * 0.78 + px * 1.2, H * 0.74 + py + Math.cos(t * 0.0006) * 5 * rm);
  cx.scale(s * 0.95, s * 0.95);
  cx.strokeStyle = 'rgba(112,200,86,.68)'; cx.fillStyle = 'rgba(112,200,86,.12)';
  cx.shadowColor = 'rgba(120,210,90,.55)'; cx.shadowBlur = 12; cx.lineWidth = 1.8;
  cx.beginPath(); cx.ellipse(0, 0, 42, 13, 0, 0, 7); cx.fill(); cx.stroke();
  cx.beginPath(); cx.arc(52, -3, 11, 0, 7); cx.stroke();
  cx.beginPath();
  [-1, 1].forEach(d => {
    cx.moveTo(60, -10);
    cx.bezierCurveTo(90, -40 + Math.sin(t * 0.003 + d) * 6 * rm, 120, -30 + d * 10, 150, -60 + d * 14 + Math.sin(t * 0.0025) * 8 * rm);
  });
  cx.moveTo(-30, -10); cx.quadraticCurveTo(0, -30, 34, -8); cx.quadraticCurveTo(0, -12, -30, -10);
  cx.moveTo(-10, 8); cx.lineTo(-40, -14); cx.lineTo(-66, 26); cx.lineTo(-76, 34);
  cx.moveTo(28, 10); cx.lineTo(38, 32); cx.lineTo(30, 42);
  cx.moveTo(10, 11); cx.lineTo(16, 34); cx.lineTo(8, 44);
  cx.moveTo(-42, 0); cx.lineTo(-62, -6); cx.moveTo(-42, 3); cx.lineTo(-64, 6); cx.stroke();
  cx.setLineDash([2, 7]);
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.0005 + i / 3) % 1;
    cx.strokeStyle = 'rgba(140,222,104,' + (Math.pow(1 - q, 3) * 0.7) + ')';
    cx.beginPath(); cx.arc(0, -20, 14 + q * 80, -1.4, -0.2); cx.stroke();
  }
  cx.setLineDash([]);
  cx.restore();
  cap('Kauai: i grilli che hanno perso il canto', 'l’ala piatta li rende muti e li salva dalla mosca parassita', W * 0.78 + px * 1.2 - 20 * s, H * 0.74 + py + 72 * s, 'rgba(132,214,100,');
}

/* ===== RENDER LOOP UNICO (3D + MAPPA STILIZZATA + BLUR DI FOCUS) ===== */
function render(t) {
  if (autoRotate && !drag && !RM && sel < 0 && viewMode === '3d') {
    cam3D.yaw += 0.0022;
  }
  if (targetCam3D) {
    cam3D.yaw += (targetCam3D.yaw - cam3D.yaw) * 0.1;
    cam3D.pitch += (targetCam3D.pitch - cam3D.pitch) * 0.1;
    cam3D.zoom += (targetCam3D.zoom - cam3D.zoom) * 0.1;
    cam3D.panX += (targetCam3D.panX - cam3D.panX) * 0.1;
    cam3D.panY += (targetCam3D.panY - cam3D.panY) * 0.1;
  }
  if (targetCamGeo) {
    camGeo.x += (targetCamGeo.x - camGeo.x) * 0.1;
    camGeo.y += (targetCamGeo.y - camGeo.y) * 0.1;
    camGeo.k += (targetCamGeo.k - camGeo.k) * 0.1;
  }

  // Transizione fluida della sfocatura di sfondo quando un'immagine è in focus
  const targetBlur = sel >= 0 ? 3.5 : 0;
  focusBlurAmt += (targetBlur - focusBlurAmt) * 0.14;

  cx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 1. Disegna lo sfondo (con eventuale blur leggero se sel >= 0)
  cx.save();
  if (focusBlurAmt > 0.15) {
    cx.filter = `blur(${focusBlurAmt.toFixed(1)}px) brightness(0.82)`;
  }

  if (viewMode === '3d') {
    const cX = W / 2 + cam3D.panX, cY = H / 2 + cam3D.panY;
    const g0 = cx.createRadialGradient(cX, cY, 0, cX, cY, Math.max(W, H) * 0.85);
    g0.addColorStop(0, '#7a3216');
    g0.addColorStop(0.5, '#3b170b');
    g0.addColorStop(1, '#150704');
    cx.fillStyle = g0;
    cx.fillRect(0, 0, W, H);

    if (mx > 0) {
      const sg = cx.createRadialGradient(mx, my, 0, mx, my, 280);
      sg.addColorStop(0, 'rgba(255,205,150,.18)');
      sg.addColorStop(1, 'rgba(255,205,150,0)');
      cx.fillStyle = sg;
      cx.fillRect(0, 0, W, H);
    }

    dust.forEach(d => {
      d.y -= d.v; if (d.y < 0) d.y = 1;
      const x = (((d.x * W + cam3D.panX * 0.2 * d.s) % W) + W) % W;
      cx.fillStyle = 'rgba(255,214,170,' + (0.28 + 0.28 * Math.sin(t * 0.002 + d.p)) + ')';
      cx.beginPath(); cx.arc(x, d.y * H, d.s, 0, 7); cx.fill();
    });

    cx.strokeStyle = 'rgba(250, 205, 165, 0.14)';
    cx.lineWidth = 1;
    cx.setLineDash([4, 10]);
    cx.beginPath();
    for (let a = 0; a <= 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const p = project3D(Math.cos(ang) * 0.95, 0, Math.sin(ang) * 0.95);
      if (a === 0) cx.moveTo(p.sx, p.sy); else cx.lineTo(p.sx, p.sy);
    }
    cx.stroke();
    cx.setLineDash([]);

    drawBackgroundArt(t);
  } else {
    drawStylizedGeoMap();
  }
  cx.restore();

  // 2. Proietta e disegna le tavole
  if (items.length) {
    const rm = RM ? 0 : 1;
    const baseThumb = viewMode === '3d'
      ? Math.min(104, Math.max(24, 38 * Math.sqrt(cam3D.zoom)))
      : Math.min(92, Math.max(32, 42 * Math.sqrt(camGeo.k)));

    projected2D = items.map((it, i) => {
      const a = it.b == null ? 1 : ease((t - it.b) / 600);
      it.hs = (it.hs || 0) + (((i === hov || i === sel) ? 1 : 0) - (it.hs || 0)) * 0.18;

      let p;
      if (viewMode === '3d') {
        const fx_ = it.x + Math.cos(t * 0.0011 + i * 1.7) * 0.006 * rm;
        const fy_ = it.y + Math.sin(t * 0.0015 + i) * 0.008 * rm;
        p = project3D(fx_, fy_, it.z);
      } else {
        p = geoToScreen(it.gx, it.gy);
      }

      const focusBoost = (i === sel) ? 1.95 : 1.0;
      const size = baseThumb * p.scale * focusBoost * (1 + 0.32 * it.hs) * (0.55 + 0.45 * Math.min(1, a));
      return { ...p, a, size, idx: i };
    });

    // Connessioni tra nodi
    cx.lineWidth = 1; cx.globalAlpha = sel >= 0 ? 0.08 : 0.22;
    items.forEach((a, i) => {
      if (!vis(a)) return;
      (NM[i] || []).forEach(j => {
        if (!items[j] || !vis(items[j])) return;
        cx.beginPath(); cx.moveTo(projected2D[i].sx, projected2D[i].sy); cx.lineTo(projected2D[j].sx, projected2D[j].sy);
        cx.strokeStyle = col[a.cat]; cx.stroke();
      });
    });
    cx.globalAlpha = 1;

    // Raggi verso i 5 più simili
    cx.lineWidth = 2; cx.setLineDash([6, 8]); cx.lineDashOffset = -t * 0.04; cx.strokeStyle = '#ffe2bd';
    [hov, sel].forEach(k => {
      if (k < 0 || !Dm) return;
      cx.globalAlpha = k === sel ? 0.85 : 0.6;
      links(k).forEach(j => {
        cx.beginPath(); cx.moveTo(projected2D[k].sx, projected2D[k].sy); cx.lineTo(projected2D[j].sx, projected2D[j].sy); cx.stroke();
      });
    });
    cx.setLineDash([]); cx.globalAlpha = 1;

    const drawOrder = [...projected2D].sort((a, b) => b.zOrder - a.zOrder);

    const drawNode = (o, big) => {
      const i = o.idx, it = items[i], c = col[it.cat];
      const focusFade = (sel >= 0 && !big) ? 0.34 : 1.0;
      const depthAlpha = (viewMode === '3d' ? Math.max(0.35, Math.min(1, o.scale * 0.92)) : 1.0) * focusFade;

      if (!vis(it)) {
        cx.globalAlpha = 0.2 * depthAlpha;
        cx.beginPath(); cx.arc(o.sx, o.sy, 3 * o.scale, 0, 7);
        cx.fillStyle = c; cx.fill(); cx.globalAlpha = 1;
        return;
      }

      // Segnaposto luminoso immediato mentre la singola immagine scarica o se in modalità "Solo punti"
      if (!it.ready || mode !== 'thumb') {
        cx.save();
        cx.globalAlpha = depthAlpha;
        cx.shadowColor = c; cx.shadowBlur = 16;
        cx.beginPath(); cx.arc(o.sx, o.sy, (big ? 11 : 6.5) * o.scale * (1 + 0.4 * it.hs), 0, 7);
        cx.fillStyle = c; cx.fill();
        if (big) { cx.lineWidth = 2.5; cx.strokeStyle = '#f4efe3'; cx.stroke(); }
        cx.restore();
        return;
      }

      const s = o.size, p = s * 0.07;
      cx.save();
      cx.globalAlpha = Math.min(1, o.a * 1.4) * depthAlpha;
      cx.translate(o.sx, o.sy);
      cx.rotate(big ? 0 : (((i * 37 % 11) - 5) * 0.012 + Math.sin(t * 0.0009 + i) * 0.018 * rm));
      cx.shadowColor = big ? 'rgba(0,0,0,.88)' : (it.hs > 0.05 ? c : 'rgba(0,0,0,.6)');
      cx.shadowBlur = big ? 40 : (10 + 24 * it.hs);
      cx.shadowOffsetY = big ? 12 : 4;
      cx.fillStyle = big ? '#fff' : '#f4efe3';
      cx.fillRect(-s / 2 - p, -s / 2 - p, s + 2 * p, s + p * 3.4);
      cx.shadowColor = 'transparent';
      cx.drawImage(it.th, -s / 2, -s / 2, s, s);
      cx.fillStyle = c;
      cx.fillRect(-s / 2, s / 2 + p * 1.1, s * 0.4, Math.max(2, p * 0.8));
      if (big) {
        cx.lineWidth = 3;
        cx.strokeStyle = '#ee9a5b';
        cx.strokeRect(-s / 2 - p, -s / 2 - p, s + 2 * p, s + p * 3.4);
      }
      cx.restore();
    };

    drawOrder.forEach(o => { if (o.idx !== sel && o.idx !== hov) drawNode(o, false); });
    if (hov >= 0 && hov !== sel) drawNode(projected2D[hov], false);
    if (sel >= 0) drawNode(projected2D[sel], true);
  }

  fx = fx.filter(f => t - f.t0 < 1100);
  fx.forEach(f => {
    const p = (t - f.t0) / 1100;
    const pr = viewMode === '3d' ? project3D(f.it.x, f.it.y, f.it.z) : geoToScreen(f.it.gx, f.it.gy);
    cx.globalAlpha = 1 - p; cx.strokeStyle = f.c; cx.fillStyle = f.c; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(pr.sx, pr.sy, 10 + p * 130 * pr.scale, 0, 7); cx.stroke();
    f.sp.forEach(s => {
      const d = s.v * p * (2 - p) * pr.scale;
      cx.beginPath(); cx.arc(pr.sx + Math.cos(s.a) * d, pr.sy + Math.sin(s.a) * d, 2.5 * (1 - p) + 0.5, 0, 7); cx.fill();
    });
  });
  cx.globalAlpha = 1;
}

new ResizeObserver(() => {
  dpr = window.devicePixelRatio || 1;
  W = wrap.clientWidth; H = wrap.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
}).observe(wrap);

(function L(t) { render(t || 0); requestAnimationFrame(L); })();

/* ===== CARICAMENTO STREAMING PROGRESSIVO ULTRA-VELOCE ===== */
async function autoload() {
  try {
    msg('Carico indice…');
    const res = await fetch(CONFIG.csv, { cache: 'default' });
    if (!res.ok) throw new Error('csv');
    const rows = parseCSV(await res.text());
    if (!rows.length) throw new Error('vuoto');

    // Mostra SUBITO i nodi nello spazio 3D ancor prima di scaricare i file!
    initItemsSkeleton(rows);
    $('#dati-acc').hidden = true;

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
          items[i].b = performance.now();
        } catch (e) {
          miss++;
        }
        done++;
        msg(done < rows.length ? `Caricamento rapido… ${done}/${rows.length}` : `${rows.length - miss} tavole pronte`);
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
      items[i].b = performance.now();
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
    items[i].b = performance.now();
  }
  await finalizeLayoutFromLoaded();
  busy = false;
};

autoload();
