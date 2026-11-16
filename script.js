/* ===== CONFIGURAZIONE ===== */
const CONFIG = {
  csv: '02_database/database_immagini.csv',
  images: '01_immagini/',
  concurrency: 6
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

// Camera 3D (rotazione yaw/pitch + zoom + pan)
let cam3D = { yaw: 0.35, pitch: 0.18, zoom: 1.0, panX: 0, panY: 0 };
let targetCam3D = null;
let autoRotate = true;
let drag = null;

// Effetti e Tour
let mx = -999, my = -999, fx = [], NC = {}, NM = [], tour = 0, seen = new Set();
let projected2D = []; // Cache delle coordinate proiettate 2D per pick()

// Mappa Geografica Leaflet
let leafletMap = null;
let geoLayerGroup = null;
let geoMarkers = [];

const dust = Array.from({ length: 90 }, () => ({
  x: Math.random(), y: Math.random(),
  s: Math.random() * 1.6 + 0.4, p: Math.random() * 6.3, v: Math.random() * 0.0004 + 0.0001
}));
const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
const ease = a => { a = Math.min(1, Math.max(0, a)); return 1 + 2.70158 * Math.pow(a - 1, 3) + 1.70158 * Math.pow(a - 1, 2); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const msg = t => { $('#st').textContent = t; };

/* ===== TOGGLE PANNELLO LATERALE ===== */
$('#toggle-panel').onclick = () => {
  const sb = $('#sidebar');
  const collapsed = sb.classList.toggle('is-collapsed');
  $('#toggle-panel').setAttribute('aria-expanded', !collapsed);
  $('#toggle-panel').textContent = collapsed ? '☰ Apri Controlli' : '✕ Chiudi Pannello';
  if (leafletMap && viewMode === 'geo') {
    setTimeout(() => leafletMap.invalidateSize(), 340);
  }
};

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

/* ===== COORDINATE GEOGRAFICHE REALI (LAT, LNG) DAL DATABASE ===== */
const REAL_SITES = [
  { id: 'solnhofen', name: 'Solnhofen (Baviera)', sub: 'Calcari giurassici · ~150 Ma', lat: 48.8936, lng: 10.9917 },
  { id: 'berlin',    name: 'Berlino (Museum für Naturkunde)', sub: 'Esemplare di Berlino', lat: 52.5306, lng: 13.3794 },
  { id: 'vienna',    name: 'Vienna (Naturhistorisches Museum)', sub: 'Esemplare di Solnhofen', lat: 48.2052, lng: 16.3598 },
  { id: 'paris',     name: 'Parigi', sub: 'Esemplare di Parigi', lat: 48.8566, lng: 2.3522 },
  { id: 'simbruini', name: 'Parco Monti Simbruini (Lazio)', sub: 'Erithacus rubecula', lat: 41.9167, lng: 13.2167 },
  { id: 'italia',    name: 'Italia (Avifauna Europea)', sub: 'Pettirosso moderno', lat: 43.7696, lng: 11.2558 },
  { id: 'oulu',      name: 'Oulu (Finlandia)', sub: 'Erithacus rubecula boreale', lat: 65.0121, lng: 25.4651 },
  { id: 'fujian',    name: 'Fujian (Cina)', sub: 'Fujianvenator · Teropodi aviani', lat: 26.0745, lng: 119.2965 },
  { id: 'broome',    name: 'Broome (Australia Occidentale)', sub: 'Orme di Teropodi', lat: -17.9614, lng: 122.2359 },
  { id: 'europa',    name: 'Europa Centrale (Archivio)', sub: 'Studi su Archaeopteryx', lat: 49.4521, lng: 11.0767 }
];

function assignRealGeo(r, idx) {
  const blob = `${r.subject || ''} ${r.notes || ''} ${r.source || ''} ${r.category || ''}`.toLowerCase();
  let siteId = 'europa';

  if (blob.includes('solnhofen') || blob.includes('bavarica') || blob.includes('baviera')) siteId = 'solnhofen';
  else if (blob.includes('berlino') || blob.includes('berlin')) siteId = 'berlin';
  else if (blob.includes('vienna')) siteId = 'vienna';
  else if (blob.includes('paris')) siteId = 'paris';
  else if (blob.includes('oulu')) siteId = 'oulu';
  else if (blob.includes('simbruini') || blob.includes('parchilazio')) siteId = 'simbruini';
  else if (blob.includes('pettirosso') || blob.includes('erithacus')) siteId = 'italia';
  else if (blob.includes('fujianvenator')) siteId = 'fujian';
  else if (blob.includes('dinosaurcoast') || blob.includes('teropode')) siteId = 'broome';
  else if (blob.includes('archaeopteryx')) siteId = 'solnhofen';

  const site = REAL_SITES.find(s => s.id === siteId) || REAL_SITES[9];
  // Distribuzione ad anelli concentrici attorno al punto geografico per evitare sovrapposizioni
  const ring = Math.floor(idx / 8) + 1;
  const angle = (idx * 2.39996); // angolo aureo
  const offsetDeg = 0.28 * Math.sqrt(ring);
  return {
    siteName: site.name,
    lat: site.lat + Math.sin(angle) * offsetDeg,
    lng: site.lng + Math.cos(angle) * offsetDeg * 1.35
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

// Calcolo t-SNE direttamente in 3 dimensioni (X, Y, Z)
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
  const T = 450; let it = 0;

  function step() {
    const ex = it < 110 ? 8 : 1, mo = it < 110 ? 0.5 : 0.8;
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
      for (let r = 0; r < 6 && it < T; r++) mx = step();
      for (let i = 0; i < n; i++) {
        items[i].x = Y[3 * i] / mx;
        items[i].y = Y[3 * i + 1] / mx;
        items[i].z = Y[3 * i + 2] / mx;
      }
      msg(it < T ? 'Calcolo spazio 3D… ' + Math.round(it / T * 100) + '%' : n + ' tavole caricate');
      if (it < T) requestAnimationFrame(fr); else res();
    })();
  });
}

function thumb(bm) {
  const c = document.createElement('canvas'); c.width = c.height = 72;
  const g = c.getContext('2d'), w = bm.width, h = bm.height, s = Math.max(72 / w, 72 / h);
  g.drawImage(bm, (72 - w * s) / 2, (72 - h * s) / 2, w * s, h * s);
  return c;
}

/* ===== PROIEZIONE PROSPETTICA 3D -> 2D ===== */
function project3D(x, y, z) {
  // Rotazione attorno all'asse Y (yaw)
  const cy = Math.cos(cam3D.yaw), sy = Math.sin(cam3D.yaw);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;

  // Rotazione attorno all'asse X (pitch)
  const cp = Math.cos(cam3D.pitch), sp = Math.sin(cam3D.pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;

  // Prospettiva
  const fov = 2.6;
  const depth = fov / Math.max(0.45, fov + z2);
  const baseScale = Math.min(W - (W > 760 ? 340 : 0), H) * 0.44 * cam3D.zoom;
  const centerX = W / 2 + (W > 760 && !$('#sidebar').classList.contains('is-collapsed') ? 165 : 0) + cam3D.panX;
  const centerY = H / 2 + cam3D.panY;

  return {
    sx: centerX + x1 * baseScale * depth,
    sy: centerY + y2 * baseScale * depth,
    scale: depth,
    zOrder: z2
  };
}

/* ===== INIZIALIZZAZIONE DATASET ===== */
async function start(rows, bms) {
  if (busy) return;
  busy = true; sel = -1; hov = -1;
  $('#det-acc').hidden = true;

  items = rows.map((r, i) => {
    const cat = (r.category && r.category.trim()) ? r.category.trim() : 'da classificare';
    const geo = assignRealGeo(r, i);
    const th = thumb(bms[i]);
    return {
      r, bm: bms[i], th, dataUrl: th.toDataURL('image/jpeg', 0.85),
      cat, x: 0, y: 0, z: 0,
      lat: geo.lat, lng: geo.lng, siteName: geo.siteName
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
      if (viewMode === 'geo') refreshGeoMarkers();
    };
    $('#chips').appendChild(b);
  });

  msg('Estraggo le caratteristiche visive…');
  await new Promise(r => setTimeout(r, 30));
  const F = prep(items.map(i => feat(i.bm)));
  await tsne3D(F);

  NC = {};
  NM = items.map((a, i) => items.map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2])
    .filter(o => o[0] !== i).sort((p, r) => p[1] - r[1]).slice(0, 2).map(o => o[0]));

  const t0 = performance.now();
  items.forEach((it, i) => { it.b = t0 + i * 18 + Math.random() * 120; });

  if (leafletMap) refreshGeoMarkers();
  busy = false;
}

/* ===== SWITCH TRA LE 2 VISTE (3D vs LEAFLET GEOGRAFICA) ===== */
function setViewMode(nextMode) {
  viewMode = nextMode;
  const is3D = nextMode === '3d';
  $('#vw-3d').classList.toggle('p', is3D);
  $('#vw-3d').setAttribute('aria-pressed', is3D);
  $('#vw-geo').classList.toggle('p', !is3D);
  $('#vw-geo').setAttribute('aria-pressed', !is3D);

  $('#cv').hidden = !is3D;
  $('#geo-map').hidden = is3D;
  $('#rot-auto').hidden = !is3D;
  $('#md').hidden = !is3D;

  $('#hud-hint').textContent = is3D
    ? 'Trascina per ruotare in 3D · Shift+Trascina per spostare · Rotella per zoom'
    : 'Trascina la mappa · Rotella per zoomare · Clicca un’immagine per i dettagli';

  if (!is3D) {
    initLeafletMap();
    setTimeout(() => {
      leafletMap.invalidateSize();
      refreshGeoMarkers();
    }, 50);
  }
}

$('#vw-3d').onclick = () => setViewMode('3d');
$('#vw-geo').onclick = () => setViewMode('geo');

/* ===== MAPPA GEOGRAFICA REALE (LEAFLET) ===== */
function initLeafletMap() {
  if (leafletMap) return;
  leafletMap = L.map('geo-map', {
    center: [49.5, 12.0],
    zoom: 4,
    zoomControl: false
  });

  // Base cartografica moderna scura e pulita
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 18
  }).addTo(leafletMap);

  geoLayerGroup = L.layerGroup().addTo(leafletMap);

  // Aggiungi etichette fisse dei siti paleontologici/ornitologici
  REAL_SITES.forEach(st => {
    const labelIcon = L.divIcon({
      className: '',
      html: `<div class="geo-site-label">⌖ ${esc(st.name)}</div>`,
      iconSize: [0, 0]
    });
    L.marker([st.lat, st.lng], { icon: labelIcon, interactive: false }).addTo(leafletMap);
  });
}

function refreshGeoMarkers() {
  if (!leafletMap || !geoLayerGroup) return;
  geoLayerGroup.clearLayers();
  geoMarkers = [];

  items.forEach((it, idx) => {
    if (!vis(it)) return;
    const color = col[it.cat] || '#ee9a5b';
    const isSel = idx === sel;

    const icon = L.divIcon({
      className: '',
      html: `<div class="geo-pin ${isSel ? 'is-selected' : ''}" style="--pin-color:${color}" title="${esc(it.r.id)} — ${esc(it.siteName)}">
               <img src="${it.dataUrl}" alt="${esc(it.r.id)}">
             </div>`,
      iconSize: [52, 52],
      iconAnchor: [26, 26]
    });

    const marker = L.marker([it.lat, it.lng], { icon });
    const popupHtml = `
      <div class="geo-popup-card">
        <img src="${it.dataUrl}" alt="${esc(it.r.id)}">
        <h3>${esc(it.r.id)} · ${esc(it.r.subject || 'Tavola')}</h3>
        <p><strong>Luogo:</strong> ${esc(it.siteName)}<br><strong>Categoria:</strong> ${esc(it.cat)}</p>
      </div>
    `;
    marker.bindPopup(popupHtml);
    marker.on('click', () => {
      show(idx, false);
    });
    marker.addTo(geoLayerGroup);
    geoMarkers[idx] = marker;
  });
}

/* ===== FILTRI & SELEZIONE ===== */
function vis(it) {
  if (!on.has(it.cat)) return false;
  if (!q) return true;
  const hay = `${it.r.id} ${it.r.subject || ''} ${it.r.author || ''} ${it.r.notes || ''} ${it.siteName}`.toLowerCase();
  return hay.includes(q);
}

function show(i, moveCamera = true) {
  sel = i;
  const it = items[i], c = $('#big'), g = c.getContext('2d'), bm = it.bm;
  const s = Math.min(c.width / bm.width, c.height / bm.height);
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(bm, (c.width - bm.width * s) / 2, (c.height - bm.height * s) / 2, bm.width * s, bm.height * s);

  const entries = Object.entries(it.r).filter(([k, v]) => v);
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
  [...Array(n).keys()].filter(j => j !== i).sort((a, b) => Dm[i * n + a] - Dm[i * n + b]).slice(0, 5).forEach(j => {
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

  $('#det-acc').hidden = false;
  $('#det-acc').open = true;

  if (viewMode === '3d') {
    autoRotate = false;
    $('#rot-auto').setAttribute('aria-pressed', 'false');
    $('#rot-auto').textContent = 'Rotazione 3D: OFF';
    if (moveCamera) {
      // Orienta la camera 3D per portare il nodo selezionato in primo piano
      const targetYaw = Math.atan2(it.x, it.z);
      targetCam3D = { yaw: targetYaw, pitch: 0.1, zoom: Math.max(cam3D.zoom, 1.45), panX: 0, panY: 0 };
    }
    boom(it.x, it.y, it.z, col[it.cat]);
  } else if (leafletMap) {
    refreshGeoMarkers();
    if (moveCamera) {
      leafletMap.flyTo([it.lat, it.lng], 7, { duration: 0.9 });
      setTimeout(() => {
        if (geoMarkers[i]) geoMarkers[i].openPopup();
      }, 950);
    }
  }
}

/* ===== INTERAZIONE MOUSE / TOUCH 3D ===== */
function pick3D(px, py) {
  // Controlla dal nodo più vicino alla camera (zOrder più basso/vicino) al più lontano
  const sorted = projected2D
    .map((p, idx) => ({ p, idx }))
    .filter(o => o.p && vis(items[o.idx]))
    .sort((a, b) => a.p.zOrder - b.p.zOrder);

  for (const { p, idx } of sorted) {
    const half = (mode === 'thumb' ? p.size / 2 : 10);
    if (Math.abs(px - p.sx) <= half && Math.abs(py - p.sy) <= half) return idx;
  }
  return -1;
}

function tip(h, px, py) {
  const t = $('#tip');
  if (h < 0 || viewMode !== '3d') { t.style.display = 'none'; return; }
  const it = items[h];
  t.textContent = it.r.id + (it.r.subject ? '\n' + it.r.subject : '') + '\n' + it.cat;
  t.style.display = 'block';
  t.style.left = Math.min(px + 14, W - 250) + 'px';
  t.style.top = (py + 14) + 'px';
}

cv.addEventListener('pointerdown', e => {
  targetCam3D = null;
  stopTour();
  cv.setPointerCapture(e.pointerId);
  drag = {
    x: e.clientX, y: e.clientY,
    yaw: cam3D.yaw, pitch: cam3D.pitch,
    panX: cam3D.panX, panY: cam3D.panY,
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
      if (drag.shift) {
        cam3D.panX = drag.panX + dx;
        cam3D.panY = drag.panY + dy;
      } else {
        autoRotate = false;
        $('#rot-auto').setAttribute('aria-pressed', 'false');
        $('#rot-auto').textContent = 'Rotazione 3D: OFF';
        cam3D.yaw = drag.yaw + dx * 0.0065;
        cam3D.pitch = Math.max(-1.35, Math.min(1.35, drag.pitch + dy * 0.0065));
      }
      return;
    }
  }
  const h = pick3D(px, py);
  hov = h; tip(h, px, py);
  cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
});

cv.addEventListener('pointerup', e => {
  const was = drag; drag = null;
  if (was && !was.moved) {
    const r = cv.getBoundingClientRect(), h = pick3D(e.clientX - r.left, e.clientY - r.top);
    if (h >= 0) show(h);
  }
});
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerleave', () => { hov = -1; mx = -999; tip(-1); });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  targetCam3D = null;
  const f = e.deltaY < 0 ? 1.12 : 0.89;
  cam3D.zoom = Math.min(4.5, Math.max(0.45, cam3D.zoom * f));
}, { passive: false });

/* ===== PULSANTI ZOOM UNIFICATI (3D + GEO) ===== */
$('#zi').onclick = () => {
  if (viewMode === '3d') { targetCam3D = null; cam3D.zoom = Math.min(4.5, cam3D.zoom * 1.25); }
  else if (leafletMap) leafletMap.zoomIn();
};
$('#zo').onclick = () => {
  if (viewMode === '3d') { targetCam3D = null; cam3D.zoom = Math.max(0.45, cam3D.zoom * 0.8); }
  else if (leafletMap) leafletMap.zoomOut();
};
$('#zr').onclick = () => {
  if (viewMode === '3d') {
    targetCam3D = { yaw: 0.35, pitch: 0.18, zoom: 1.0, panX: 0, panY: 0 };
  } else if (leafletMap) {
    leafletMap.flyTo([49.5, 12.0], 4);
  }
};

$('#rot-auto').onclick = e => {
  autoRotate = !autoRotate;
  e.target.setAttribute('aria-pressed', autoRotate);
  e.target.textContent = autoRotate ? 'Rotazione 3D: ON' : 'Rotazione 3D: OFF';
};

$('#q').oninput = e => {
  q = e.target.value.trim().toLowerCase();
  if (viewMode === 'geo') refreshGeoMarkers();
};

$('#md').onclick = e => {
  mode = mode === 'thumb' ? 'dot' : 'thumb';
  e.target.textContent = mode === 'thumb' ? 'Solo punti luminosi' : 'Mostra miniature';
};

$('#cp').onclick = () => {
  if (!items.length) return msg('Carica prima i dati.');
  const t = 'id,filename,category,x3d,y3d,z3d,lat,lng\n' + items.map(i => [
    i.r.id, i.r.filename || '', i.cat,
    i.x.toFixed(4), i.y.toFixed(4), i.z.toFixed(4),
    i.lat.toFixed(4), i.lng.toFixed(4)
  ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  const o = $('#out'); o.value = t;
  const ok = () => msg('Coordinate 3D e GPS copiate.'), fb = () => { o.hidden = false; o.select(); msg('Copia il testo qui sotto.'); };
  try { navigator.clipboard.writeText(t).then(ok, fb); } catch (e) { fb(); }
};

/* ===== TOUR AUTOMATICO ===== */
const nearest = (i, k) => { const n = items.length; return [...Array(n).keys()].filter(j => j !== i).sort((a, b) => Dm[i * n + a] - Dm[i * n + b]).slice(0, k); };
const links = i => NC[i] || (NC[i] = nearest(i, 5));
const boom = (x, y, z, c) => fx.push({ x, y, z, c, t0: performance.now(), sp: Array.from({ length: 16 }, (_, k) => ({ a: k / 16 * 6.283 + Math.random() * 0.3, v: 55 + Math.random() * 80 })) });

function stopTour() { if (tour) { clearInterval(tour); tour = 0; $('#tr').textContent = 'Passeggiata guidata'; } }
function hop() {
  const n = items.length; if (!n) return;
  const cur = sel >= 0 ? sel : 0; seen.add(cur);
  let nx = sel < 0 ? cur : nearest(cur, n - 1).find(j => !seen.has(j) && vis(items[j]));
  if (nx == null) { seen.clear(); nx = nearest(cur, 1)[0]; }
  show(nx);
}
$('#tr').onclick = () => {
  if (tour) return stopTour();
  if (!items.length) return msg('Carica prima i dati.');
  seen = new Set(); $('#tr').textContent = 'Ferma passeggiata'; hop(); tour = setInterval(hop, 2800);
};

/* ===== ILLUSTRAZIONI VETTORIALI SULLO SFONDO (ARCHAEOPTERYX + GRILLO DI KAUAI) ===== */
function drawBackgroundArt(t) {
  const s = Math.min(W, H) / 560, rm = RM ? 0 : 1, px = cam3D.panX * 0.1, py = cam3D.panY * 0.05, F = 'Fraunces,Georgia,serif';
  const cap = (a, b, x, y, rgb) => {
    const sg = rgb || 'rgba(250,214,176,';
    const m = Math.min(320, W * 0.8);
    x = Math.min(W - m / 2 - 8, Math.max(m / 2 + 8, x));
    cx.textAlign = 'center';
    cx.fillStyle = sg + '.62)';
    cx.font = 'italic 600 ' + Math.max(15, 19 * s) + 'px ' + F;
    cx.fillText(a, x, y, m);
    cx.fillStyle = sg + '.42)';
    cx.font = 'italic 400 ' + Math.max(12, 14 * s) + 'px ' + F;
    cx.fillText(b, x, y + Math.max(17, 20 * s), m);
  };

  // 1. Archaeopteryx (in alto a destra)
  cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.translate(W * 0.64 + px, H * 0.22 + py + Math.sin(t * 0.0005) * 9 * rm);
  cx.rotate(-0.1 + Math.sin(t * 0.0004) * 0.02 * rm);
  cx.scale(s, s);
  cx.strokeStyle = 'rgba(255,138,36,.72)'; cx.fillStyle = 'rgba(255,196,48,.14)';
  cx.shadowColor = 'rgba(255,140,40,.65)'; cx.shadowBlur = 14; cx.lineWidth = 1.8;
  cx.beginPath(); cx.ellipse(0, 0, 46, 19, -0.25, 0, 7); cx.fill(); cx.stroke();
  cx.beginPath(); cx.moveTo(-38, -12); cx.quadraticCurveTo(-56, -28, -64, -34);
  cx.moveTo(-60, -38); cx.arc(-70, -38, 10, 0, 7);
  cx.moveTo(-79, -38); cx.lineTo(-96, -33); cx.lineTo(-80, -31); cx.stroke();
  cx.fillRect(-74, -42, 2.5, 2.5);
  cx.strokeStyle = 'rgba(255,176,40,.7)';
  cx.beginPath();
  for (let i = 0; i < 16; i++) {
    const x = 44 + i * 11, y = 8 + i * 1.1 + Math.sin(t * 0.0012 + i * 0.4) * 2.5 * rm;
    cx.moveTo(x, y); cx.lineTo(x + 16, y + 14);
    cx.moveTo(x, y); cx.lineTo(x + 16, y - 4);
  }
  cx.moveTo(42, 6); cx.bezierCurveTo(110, 10, 170, 22, 230, 22);
  cx.moveTo(42, 12); cx.bezierCurveTo(110, 26, 170, 38, 230, 32); cx.stroke();
  const fl = Math.sin(t * 0.0014) * 0.12 * rm;
  cx.strokeStyle = 'rgba(255,214,70,.8)';
  cx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -2.6 + k * 0.2 + fl, L = 60 + k * 7, ex = -4 + Math.cos(a) * L, ey = -14 + Math.sin(a) * L;
    cx.moveTo(-4, -14); cx.quadraticCurveTo((-4 + ex) / 2 + 8, (-14 + ey) / 2 - 10, ex, ey);
  }
  cx.stroke();
  cx.strokeStyle = 'rgba(255,138,36,.72)';
  cx.beginPath(); cx.moveTo(-2, 16); cx.lineTo(-10, 40); cx.lineTo(-24, 56); cx.lineTo(-34, 60);
  cx.moveTo(-24, 56); cx.lineTo(-30, 64); cx.moveTo(-24, 56); cx.lineTo(-18, 64); cx.stroke();
  cx.restore();
  cap('archaeopteryx', 'Giurassico, circa 150 milioni di anni fa', W * 0.64 + px + 40 * s, H * 0.22 + py + 115 * s, 'rgba(255,172,52,');

  // 2. Grillo di Kauai originale (in basso a destra)
  cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.translate(W * 0.8 + px * 1.3, H * 0.78 + py + Math.cos(t * 0.0006) * 5 * rm);
  cx.scale(s * 1.1, s * 1.1);
  cx.strokeStyle = 'rgba(112,200,86,.72)'; cx.fillStyle = 'rgba(112,200,86,.14)';
  cx.shadowColor = 'rgba(120,210,90,.6)'; cx.shadowBlur = 12; cx.lineWidth = 1.8;
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
    cx.strokeStyle = 'rgba(140,222,104,' + (Math.pow(1 - q, 3) * 0.75) + ')';
    cx.beginPath(); cx.arc(0, -20, 14 + q * 80, -1.4, -0.2); cx.stroke();
  }
  cx.setLineDash([]);
  cx.restore();
  cap('Kauai: i grilli che hanno perso il canto', 'l’ala piatta li rende muti e li salva dalla mosca parassita', W * 0.8 + px * 1.3 - 30 * s, H * 0.78 + py + 72 * s, 'rgba(132,214,100,');
}

/* ===== RENDER LOOP 3D ===== */
function render(t) {
  if (viewMode !== '3d') return;

  if (autoRotate && !drag && !RM) {
    cam3D.yaw += 0.0022;
  }
  if (targetCam3D) {
    cam3D.yaw += (targetCam3D.yaw - cam3D.yaw) * 0.08;
    cam3D.pitch += (targetCam3D.pitch - cam3D.pitch) * 0.08;
    cam3D.zoom += (targetCam3D.zoom - cam3D.zoom) * 0.08;
    cam3D.panX += (targetCam3D.panX - cam3D.panX) * 0.08;
    cam3D.panY += (targetCam3D.panY - cam3D.panY) * 0.08;
  }

  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  // Pulviscolo dorato
  dust.forEach(d => {
    d.y -= d.v; if (d.y < 0) d.y = 1;
    const x = (((d.x * W + cam3D.panX * 0.2 * d.s) % W) + W) % W;
    cx.fillStyle = 'rgba(255,214,170,' + (0.28 + 0.28 * Math.sin(t * 0.002 + d.p)) + ')';
    cx.beginPath(); cx.arc(x, d.y * H, d.s, 0, 7); cx.fill();
  });

  // Sfera armillare / equatore 3D sottile per dare percezione della rotazione
  cx.save();
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
  cx.restore();

  // Illustrazioni Archaeopteryx + Grillo di Kauai
  drawBackgroundArt(t);

  if (items.length) {
    const rm = RM ? 0 : 1;
    const born = i => items[i].b != null && t >= items[i].b;
    const baseThumb = Math.min(96, Math.max(24, 38 * Math.sqrt(cam3D.zoom)));

    projected2D = items.map((it, i) => {
      const a = it.b == null ? 1 : ease((t - it.b) / 850);
      it.hs = (it.hs || 0) + (((i === hov || i === sel) ? 1 : 0) - (it.hs || 0)) * 0.18;
      const fx_ = it.x + Math.cos(t * 0.0011 + i * 1.7) * 0.008 * rm;
      const fy_ = it.y + Math.sin(t * 0.0015 + i) * 0.01 * rm;
      const p = project3D(fx_, fy_, it.z);
      const size = baseThumb * p.scale * (1 + 0.45 * it.hs) * (0.55 + 0.45 * Math.min(1, a));
      return { ...p, a, size, idx: i };
    });

    // Connessioni 3D tra nodi vicini
    cx.lineWidth = 1; cx.globalAlpha = 0.22;
    items.forEach((a, i) => {
      if (!vis(a) || !born(i)) return;
      (NM[i] || []).forEach(j => {
        if (!items[j] || !vis(items[j]) || !born(j)) return;
        cx.beginPath(); cx.moveTo(projected2D[i].sx, projected2D[i].sy); cx.lineTo(projected2D[j].sx, projected2D[j].sy);
        cx.strokeStyle = col[a.cat]; cx.stroke();
      });
    });
    cx.globalAlpha = 1;

    // Raggi verso i 5 più simili
    cx.lineWidth = 2; cx.setLineDash([6, 8]); cx.lineDashOffset = -t * 0.04; cx.strokeStyle = '#ffe2bd';
    [hov, sel].forEach(k => {
      if (k < 0 || !Dm || !born(k)) return;
      cx.globalAlpha = k === sel ? 0.85 : 0.6;
      links(k).forEach(j => {
        cx.beginPath(); cx.moveTo(projected2D[k].sx, projected2D[k].sy); cx.lineTo(projected2D[j].sx, projected2D[j].sy); cx.stroke();
      });
    });
    cx.setLineDash([]); cx.globalAlpha = 1;

    // Painter's Algorithm: ordina dal più lontano (zOrder alto) al più vicino (zOrder basso)
    const drawOrder = [...projected2D].sort((a, b) => b.zOrder - a.zOrder);

    const drawNode = (o, big) => {
      const i = o.idx, it = items[i], b = it.b, c = col[it.cat];
      if (b != null && t < b) return;
      const depthAlpha = Math.max(0.32, Math.min(1, o.scale * 0.92));

      if (!vis(it)) {
        cx.globalAlpha = 0.2 * depthAlpha;
        cx.beginPath(); cx.arc(o.sx, o.sy, 3 * o.scale, 0, 7);
        cx.fillStyle = c; cx.fill(); cx.globalAlpha = 1;
        return;
      }

      if (b == null || mode !== 'thumb') {
        cx.save();
        cx.globalAlpha = depthAlpha;
        cx.shadowColor = c; cx.shadowBlur = 16;
        cx.beginPath(); cx.arc(o.sx, o.sy, (big ? 9 : 6) * o.scale * (1 + 0.45 * it.hs), 0, 7);
        cx.fillStyle = c; cx.fill();
        if (big) { cx.lineWidth = 2.5; cx.strokeStyle = '#f4efe3'; cx.stroke(); }
        cx.restore();
        return;
      }

      const s = o.size, p = s * 0.07;
      cx.save();
      cx.globalAlpha = Math.min(1, o.a * 1.4) * depthAlpha;
      cx.translate(o.sx, o.sy);
      cx.rotate(((i * 37 % 11) - 5) * 0.012 + Math.sin(t * 0.0009 + i) * 0.018 * rm);
      cx.shadowColor = it.hs > 0.05 ? c : 'rgba(0,0,0,.6)';
      cx.shadowBlur = 10 + 24 * it.hs; cx.shadowOffsetY = 4;
      cx.fillStyle = big ? '#fff' : '#f4efe3';
      cx.fillRect(-s / 2 - p, -s / 2 - p, s + 2 * p, s + p * 3.4);
      cx.shadowColor = 'transparent';
      cx.drawImage(it.th, -s / 2, -s / 2, s, s);
      cx.fillStyle = c;
      cx.fillRect(-s / 2, s / 2 + p * 1.1, s * 0.4, Math.max(2, p * 0.8));
      if (big) { cx.lineWidth = 2.5; cx.strokeStyle = '#ffe2bd'; cx.strokeRect(-s / 2 - p, -s / 2 - p, s + 2 * p, s + p * 3.4); }
      cx.restore();
    };

    drawOrder.forEach(o => { if (o.idx !== sel && o.idx !== hov) drawNode(o, false); });
    if (hov >= 0 && hov !== sel) drawNode(projected2D[hov], false);
    if (sel >= 0) drawNode(projected2D[sel], true);
  }

  fx = fx.filter(f => t - f.t0 < 1100);
  fx.forEach(f => {
    const p = (t - f.t0) / 1100, pr = project3D(f.x, f.y, f.z);
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

/* ===== CARICAMENTO AUTOMATICO DA REPOSITORY ===== */
async function autoload() {
  try {
    msg('Cerco il database…');
    const res = await fetch(CONFIG.csv, { cache: 'no-cache' });
    if (!res.ok) throw new Error('csv');
    const rows = parseCSV(await res.text());
    if (!rows.length) throw new Error('vuoto');
    const out = new Array(rows.length), queue = rows.map((_, i) => i);
    let miss = 0, done = 0;

    async function work() {
      while (queue.length) {
        const i = queue.shift(), f = (rows[i].filename || '').trim();
        try {
          if (!f) throw 0;
          const rs = await fetch(CONFIG.images + f.split('/').map(encodeURIComponent).join('/'));
          if (!rs.ok) throw 0;
          out[i] = await createImageBitmap(await rs.blob());
        } catch (e) { miss++; }
        done++;
        msg('Carico le tavole… ' + done + '/' + rows.length);
      }
    }

    await Promise.all(Array.from({ length: CONFIG.concurrency }, work));
    const R = [], B = [];
    rows.forEach((r, i) => { if (out[i]) { R.push(r); B.push(out[i]); } });
    if (miss) $('#wn').textContent = miss + ' righe senza immagine corrispondente.';
    if (R.length < 4) { msg('Servono almeno 4 immagini in ' + CONFIG.images); $('#dati-acc').open = true; return; }
    $('#dati-acc').hidden = true;
    start(R, B);
  } catch (e) {
    $('#dati-acc').open = true;
    msg('Apri su GitHub Pages / Live Server oppure carica i file qui sotto.');
  }
}

$('#go').onclick = async () => {
  if (busy) return;
  const imgs = [...$('#fi').files], csv = $('#fc').files[0];
  $('#wn').textContent = '';
  if (!imgs.length) return msg('Seleziona prima le immagini.');
  const map = new Map(imgs.map(f => [f.name.toLowerCase(), f]));
  msg('Leggo i file…');
  const rows = csv ? parseCSV(await csv.text()) : imgs.map(f => ({ id: f.name.replace(/\.[^.]+$/, ''), filename: f.name }));
  const R = [], B = []; let miss = 0;
  for (const r of rows) {
    const f = map.get((r.filename || '').toLowerCase());
    if (!f) { miss++; continue; }
    try { B.push(await createImageBitmap(f)); R.push(r); } catch (e) { miss++; }
  }
  if (miss) $('#wn').textContent = miss + ' righe senza file corrispondente.';
  if (R.length < 4) return msg('Servono almeno 4 immagini valide.');
  start(R, B);
};

$('#ex').onclick = async () => {
  if (busy) return;
  const rows = [], bms = [], C = ['Fossile', 'Illustrazione', 'Animale vivente'];
  for (let i = 0; i < 36; i++) {
    const k = i % 3, c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d'), h = [28, 22, 12][k] + Math.random() * 18;
    g.fillStyle = 'hsl(' + h + ' 45% ' + (32 + Math.random() * 25) + '%)'; g.fillRect(0, 0, 96, 96);
    g.fillStyle = 'hsl(' + (h + 25) + ' 65% 75%)';
    g.beginPath(); g.arc(48, 48, 16 + Math.random() * 14, 0, 7); g.fill();
    const id = 'IMG_' + String(i + 1).padStart(4, '0');
    bms.push(await createImageBitmap(c));
    rows.push({ id, filename: id + '.jpg', subject: k === 2 ? 'Pettirosso (Erithacus rubecula)' : 'Archaeopteryx lithographica', category: C[k] });
  }
  start(rows, bms);
};

autoload();
