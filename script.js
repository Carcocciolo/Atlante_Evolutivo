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
let V = { k: 1, x: 0, y: 0 }, sel = -1, hov = -1;
let mode = 'thumb';     // 'thumb' | 'dot'
let viewMode = 'tsne';  // 'tsne'  | 'geo'
let dirty = true, W = 0, H = 0, dpr = 1, Dm = null, q = '', drag = null, busy = false;
let cam = null, mx = -999, my = -999, fx = [], NC = {}, NM = [], tour = 0, seen = new Set();

const dust = Array.from({ length: 90 }, () => ({
  x: Math.random(), y: Math.random(),
  s: Math.random() * 1.6 + 0.4, p: Math.random() * 6.3, v: Math.random() * 0.0004 + 0.0001
}));
const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
const ease = a => { a = Math.min(1, Math.max(0, a)); return 1 + 2.70158 * Math.pow(a - 1, 3) + 1.70158 * Math.pow(a - 1, 2); };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const msg = t => { $('#st').textContent = t; };

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

/* ===== GEOLOCALIZZAZIONE DEI RECORD ===== */
const GEO_SITES = [
  { id: 'solnhofen', name: 'Solnhofen (Baviera)', sub: 'Calcari giurassici · ~150 Ma', gx: 0.08, gy: 0.08 },
  { id: 'berlin',    name: 'Berlino',             sub: 'Museum für Naturkunde',       gx: 0.14, gy: -0.14 },
  { id: 'vienna',    name: 'Vienna',              sub: 'Naturhistorisches Museum',    gx: 0.22, gy: 0.12 },
  { id: 'paris',     name: 'Parigi',              sub: 'Esemplare di Parigi',         gx: -0.18, gy: 0.05 },
  { id: 'italia',    name: 'Italia Centrale',     sub: 'Parco Monti Simbruini',       gx: 0.12, gy: 0.42 },
  { id: 'oulu',      name: 'Oulu (Finlandia)',    sub: 'Areale boreale Erithacus',    gx: 0.38, gy: -0.62 },
  { id: 'europa',    name: 'Europa Paleontologica', sub: 'Archivio storico & studi',  gx: -0.05, gy: -0.04 },
  { id: 'asia_aus',  name: 'Fujian / Broome',     sub: 'Teropodi extraeuropei',       gx: 0.68, gy: 0.52 }
];

function assignGeoCoords(r, idx) {
  const blob = `${r.subject || ''} ${r.notes || ''} ${r.source || ''} ${r.category || ''}`.toLowerCase();
  let siteId = 'europa';

  if (blob.includes('solnhofen') || blob.includes('bavarica') || blob.includes('baviera')) siteId = 'solnhofen';
  else if (blob.includes('berlino') || blob.includes('berlin')) siteId = 'berlin';
  else if (blob.includes('vienna')) siteId = 'vienna';
  else if (blob.includes('paris')) siteId = 'paris';
  else if (blob.includes('oulu')) siteId = 'oulu';
  else if (blob.includes('simbruini') || blob.includes('parchilazio') || blob.includes('pettirosso') || blob.includes('erithacus')) siteId = 'italia';
  else if (blob.includes('dinosaurcoast') || blob.includes('fujianvenator') || blob.includes('teropode')) siteId = 'asia_aus';
  else if (blob.includes('archaeopteryx')) siteId = 'solnhofen';

  const site = GEO_SITES.find(s => s.id === siteId) || GEO_SITES[6];
  const angle = idx * 2.39996;
  const radius = 0.035 + ((idx % 11) * 0.014);
  return {
    siteName: site.name,
    gx: site.gx + Math.cos(angle) * radius,
    gy: site.gy + Math.sin(angle) * radius
  };
}

/* ===== ESTRAZIONE FEATURE & t-SNE ===== */
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

function tsne(F) {
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
  const Y = new Float64Array(2 * n).map(() => (Math.random() - 0.5) * 0.02);
  const U = new Float64Array(2 * n), G = new Float64Array(2 * n).fill(1), N = new Float64Array(n * n), g = new Float64Array(2 * n);
  const T = 500; let it = 0;

  function step() {
    const ex = it < 120 ? 8 : 1, mo = it < 120 ? 0.5 : 0.8;
    let Z = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = Y[2 * i] - Y[2 * j], dy = Y[2 * i + 1] - Y[2 * j + 1], v = 1 / (1 + dx * dx + dy * dy);
      N[i * n + j] = N[j * n + i] = v; Z += 2 * v;
    }
    g.fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) {
      const v = N[i * n + j], m = (ex * S[i * n + j] - v / Z) * v;
      g[2 * i] += 4 * m * (Y[2 * i] - Y[2 * j]);
      g[2 * i + 1] += 4 * m * (Y[2 * i + 1] - Y[2 * j + 1]);
    }
    for (let k = 0; k < 2 * n; k++) {
      G[k] = Math.sign(g[k]) !== Math.sign(U[k]) ? G[k] + 0.2 : G[k] * 0.8;
      if (G[k] < 0.01) G[k] = 0.01;
      U[k] = mo * U[k] - 120 * G[k] * g[k];
      Y[k] += U[k];
    }
    let mx_ = 0, my_ = 0;
    for (let i = 0; i < n; i++) { mx_ += Y[2 * i] / n; my_ += Y[2 * i + 1] / n; }
    let mx = 1e-9;
    for (let i = 0; i < n; i++) {
      Y[2 * i] -= mx_; Y[2 * i + 1] -= my_;
      mx = Math.max(mx, Math.abs(Y[2 * i]), Math.abs(Y[2 * i + 1]));
    }
    it++; return mx;
  }

  return new Promise(res => {
    let mx = 1;
    (function fr() {
      for (let r = 0; r < 6 && it < T; r++) mx = step();
      for (let i = 0; i < n; i++) {
        items[i].tx = Y[2 * i] / mx;
        items[i].ty = Y[2 * i + 1] / mx;
        if (viewMode === 'tsne') { items[i].x = items[i].tx; items[i].y = items[i].ty; }
      }
      dirty = true;
      msg(it < T ? 'Calcolo rete dei nodi… ' + Math.round(it / T * 100) + '%' : n + ' tavole nell’atlante');
      if (it < T) requestAnimationFrame(fr); else res();
    })();
  });
}

function thumb(bm) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), w = bm.width, h = bm.height, s = Math.max(64 / w, 64 / h);
  g.drawImage(bm, (64 - w * s) / 2, (64 - h * s) / 2, w * s, h * s);
  return c;
}

async function start(rows, bms) {
  if (busy) return;
  busy = true; sel = -1; hov = -1;
  $('#det').hidden = true; $('#empty').style.display = 'none';

  items = rows.map((r, i) => {
    const cat = (r.category && r.category.trim()) ? r.category.trim() : 'da classificare';
    const geo = assignGeoCoords(r, i);
    return {
      r, bm: bms[i], th: thumb(bms[i]), cat,
      tx: 0, ty: 0,
      gx: geo.gx, gy: geo.gy, siteName: geo.siteName,
      x: 0, y: 0
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
      dirty = true;
    };
    $('#chips').appendChild(b);
  });

  V = { k: 1, x: W > 760 ? 170 : 0, y: 0 };
  msg('Estraggo le caratteristiche visive…');
  await new Promise(r => setTimeout(r, 30));
  const F = prep(items.map(i => feat(i.bm)));
  await tsne(F);

  NC = {};
  NM = items.map((a, i) => items.map((b, j) => [j, (a.tx - b.tx) ** 2 + (a.ty - b.ty) ** 2])
    .filter(o => o[0] !== i).sort((p, r) => p[1] - r[1]).slice(0, 2).map(o => o[0]));

  const t0 = performance.now();
  items.forEach((it, i) => {
    it.b = t0 + i * 20 + Math.random() * 140;
    it.x = viewMode === 'geo' ? it.gx : it.tx;
    it.y = viewMode === 'geo' ? it.gy : it.ty;
  });
  busy = false;
}

/* ===== SWITCH TRA LE 2 VISUALIZZAZIONI ===== */
function setViewMode(nextMode) {
  viewMode = nextMode;
  const isTsne = nextMode === 'tsne';
  $('#vw-tsne').classList.toggle('p', isTsne);
  $('#vw-tsne').setAttribute('aria-pressed', isTsne);
  $('#vw-geo').classList.toggle('p', !isTsne);
  $('#vw-geo').setAttribute('aria-pressed', !isTsne);

  $('#view-desc').textContent = isTsne
    ? 'Rete t-SNE: le immagini simili per forma, piumaggio e palette si attraggono nello spazio.'
    : 'Atlante Geografico: localizzazione dei fossili (Solnhofen, Berlino, Vienna) e degli avvistamenti europei.';

  cam = { k: 1, x: W > 760 ? 170 : 0, y: 0 };
  dirty = true;
}

$('#vw-tsne').onclick = () => setViewMode('tsne');
$('#vw-geo').onclick = () => setViewMode('geo');

/* ===== INTERAZIONE, RICERCA & DETTAGLI ===== */
function vis(it) {
  if (!on.has(it.cat)) return false;
  if (!q) return true;
  const hay = `${it.r.id} ${it.r.subject || ''} ${it.r.author || ''} ${it.r.notes || ''} ${it.siteName}`.toLowerCase();
  return hay.includes(q);
}

const SC = () => Math.min(W - (W > 760 ? 340 : 0), H) / 2.25;
const sz = () => Math.min(120, Math.max(18, 34 * Math.sqrt(V.k)));
const pos = (it, S) => [W / 2 + V.x + it.x * S * V.k, H / 2 + V.y + it.y * S * V.k];

function pick(px, py) {
  const S = SC(), z = sz();
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (!vis(it)) continue;
    const [x, y] = pos(it, S);
    if (mode === 'thumb' ? (Math.abs(px - x) < z / 2 && Math.abs(py - y) < z / 2) : Math.hypot(px - x, py - y) < 10) return i;
  }
  return -1;
}

function tip(h, px, py) {
  const t = $('#tip');
  if (h < 0) { t.style.display = 'none'; return; }
  const it = items[h];
  const loc = viewMode === 'geo' ? `\n⌖ ${it.siteName}` : '';
  t.textContent = it.r.id + (it.r.subject ? '\n' + it.r.subject : '') + '\n' + it.cat + loc;
  t.style.display = 'block';
  t.style.left = Math.min(px + 14, W - 250) + 'px';
  t.style.top = (py + 14) + 'px';
}

function show(i) {
  sel = i;
  const it = items[i], c = $('#big'), g = c.getContext('2d'), bm = it.bm;
  const s = Math.min(c.width / bm.width, c.height / bm.height);
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(bm, (c.width - bm.width * s) / 2, (c.height - bm.height * s) / 2, bm.width * s, bm.height * s);

  const entries = Object.entries(it.r).filter(([k, v]) => v);
  if (viewMode === 'geo') entries.push(['località', it.siteName]);

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

  $('#det').hidden = false;
  dirty = true;
  const kk = Math.max(V.k, 2.2);
  cam = { k: kk, x: (W > 760 ? 170 : 0) - it.x * SC() * kk, y: -it.y * SC() * kk };
  boom(it.x, it.y, col[it.cat]);
}

function zoomAt(px, py, f) {
  cam = null;
  const k = Math.min(12, Math.max(0.4, V.k * f)), r = k / V.k;
  V.x = (px - W / 2) - (px - W / 2 - V.x) * r;
  V.y = (py - H / 2) - (py - H / 2 - V.y) * r;
  V.k = k;
  dirty = true;
}

cv.addEventListener('pointerdown', e => { cam = null; stopTour(); cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, vx: V.x, vy: V.y, m: false }; });
cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  mx = px; my = py;
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.m = true;
    if (drag.m) { V.x = drag.vx + dx; V.y = drag.vy + dy; dirty = true; return; }
  }
  const h = pick(px, py);
  hov = h; tip(h, px, py);
  cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
});
cv.addEventListener('pointerup', e => {
  const was = drag; drag = null;
  if (was && !was.m) {
    const r = cv.getBoundingClientRect(), h = pick(e.clientX - r.left, e.clientY - r.top);
    if (h >= 0) show(h);
    else {
      const S = SC();
      boom((e.clientX - r.left - W / 2 - V.x) / (S * V.k), (e.clientY - r.top - H / 2 - V.y) / (S * V.k), '#ffd9b0');
    }
  }
});
cv.addEventListener('pointerleave', () => { hov = -1; mx = -999; tip(-1); });
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });

$('#zi').onclick = () => zoomAt(W / 2, H / 2, 1.3);
$('#zo').onclick = () => zoomAt(W / 2, H / 2, 1 / 1.3);
$('#zr').onclick = () => { cam = { k: 1, x: W > 760 ? 170 : 0, y: 0 }; };
$('#q').oninput = e => { q = e.target.value.trim().toLowerCase(); dirty = true; };
$('#md').onclick = e => { mode = mode === 'thumb' ? 'dot' : 'thumb'; e.target.textContent = mode === 'thumb' ? 'Mostra solo punti' : 'Mostra miniature'; dirty = true; };

$('#cp').onclick = () => {
  if (!items.length) return msg('Crea prima la mappa.');
  const t = 'id,filename,category,view,x,y\n' + items.map(i => [i.r.id, i.r.filename || '', i.cat, viewMode, i.x.toFixed(4), i.y.toFixed(4)].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  const o = $('#out'); o.value = t;
  const ok = () => msg('Coordinate copiate negli appunti.'), fb = () => { o.hidden = false; o.select(); msg('Copia il testo qui sotto.'); };
  try { navigator.clipboard.writeText(t).then(ok, fb); } catch (e) { fb(); }
};

/* ===== TOUR AUTOMATICO ===== */
const nearest = (i, k) => { const n = items.length; return [...Array(n).keys()].filter(j => j !== i).sort((a, b) => Dm[i * n + a] - Dm[i * n + b]).slice(0, k); };
const links = i => NC[i] || (NC[i] = nearest(i, 5));
const boom = (x, y, c) => fx.push({ x, y, c, t0: performance.now(), sp: Array.from({ length: 16 }, (_, k) => ({ a: k / 16 * 6.283 + Math.random() * 0.3, v: 60 + Math.random() * 90 })) });

function stopTour() { if (tour) { clearInterval(tour); tour = 0; $('#tr').textContent = 'Passeggiata'; } }
function hop() {
  const n = items.length; if (!n) return;
  const cur = sel >= 0 ? sel : 0; seen.add(cur);
  let nx = sel < 0 ? cur : nearest(cur, n - 1).find(j => !seen.has(j) && vis(items[j]));
  if (nx == null) { seen.clear(); nx = nearest(cur, 1)[0]; }
  show(nx);
}
$('#tr').onclick = () => {
  if (tour) return stopTour();
  if (!items.length) return msg('Crea prima la mappa.');
  seen = new Set(); $('#tr').textContent = 'Ferma la passeggiata'; hop(); tour = setInterval(hop, 2800);
};

/* ===== SFONDO 1: ILLUSTRAZIONI EVOLUTIVE ===== */
function drawEvolutionArt(t) {
  const s = Math.min(W, H) / 560, rm = RM ? 0 : 1, px = V.x * 0.1, py = V.y * 0.05, F = 'Fraunces,Georgia,serif';
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

  cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.translate(W * 0.64 + px, H * 0.24 + py + Math.sin(t * 0.0005) * 9 * rm);
  cx.rotate(-0.1 + Math.sin(t * 0.0004) * 0.02 * rm);
  cx.scale(s, s);
  cx.strokeStyle = 'rgba(255,138,36,.78)'; cx.fillStyle = 'rgba(255,196,48,.16)';
  cx.shadowColor = 'rgba(255,140,40,.7)'; cx.shadowBlur = 14; cx.lineWidth = 1.8;
  cx.beginPath(); cx.ellipse(0, 0, 46, 19, -0.25, 0, 7); cx.fill(); cx.stroke();
  cx.beginPath(); cx.moveTo(-38, -12); cx.quadraticCurveTo(-56, -28, -64, -34);
  cx.moveTo(-60, -38); cx.arc(-70, -38, 10, 0, 7);
  cx.moveTo(-79, -38); cx.lineTo(-96, -33); cx.lineTo(-80, -31); cx.stroke();
  cx.fillRect(-74, -42, 2.5, 2.5);
  cx.strokeStyle = 'rgba(255,176,40,.75)';
  cx.beginPath();
  for (let i = 0; i < 16; i++) {
    const x = 44 + i * 11, y = 8 + i * 1.1 + Math.sin(t * 0.0012 + i * 0.4) * 2.5 * rm;
    cx.moveTo(x, y); cx.lineTo(x + 16, y + 14);
    cx.moveTo(x, y); cx.lineTo(x + 16, y - 4);
  }
  cx.moveTo(42, 6); cx.bezierCurveTo(110, 10, 170, 22, 230, 22);
  cx.moveTo(42, 12); cx.bezierCurveTo(110, 26, 170, 38, 230, 32); cx.stroke();
  const fl = Math.sin(t * 0.0014) * 0.12 * rm;
  cx.strokeStyle = 'rgba(255,214,70,.85)';
  cx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -2.6 + k * 0.2 + fl, L = 60 + k * 7, ex = -4 + Math.cos(a) * L, ey = -14 + Math.sin(a) * L;
    cx.moveTo(-4, -14); cx.quadraticCurveTo((-4 + ex) / 2 + 8, (-14 + ey) / 2 - 10, ex, ey);
  }
  cx.stroke();
  cx.strokeStyle = 'rgba(255,138,36,.78)';
  cx.beginPath(); cx.moveTo(-2, 16); cx.lineTo(-10, 40); cx.lineTo(-24, 56); cx.lineTo(-34, 60);
  cx.moveTo(-24, 56); cx.lineTo(-30, 64); cx.moveTo(-24, 56); cx.lineTo(-18, 64); cx.stroke();
  cx.restore();
  cap('Archaeopteryx lithographica', 'Giurassico superiore, Solnhofen (~150 Ma)', W * 0.64 + px + 40 * s, H * 0.24 + py + 115 * s, 'rgba(255,172,52,');

  cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.translate(W * 0.8 + px * 1.3, H * 0.77 + py + Math.cos(t * 0.0006) * 5 * rm);
  cx.scale(s * 1.05, s * 1.05);
  cx.strokeStyle = 'rgba(255,112,72,.78)'; cx.fillStyle = 'rgba(255,105,65,.18)';
  cx.shadowColor = 'rgba(255,105,65,.65)'; cx.shadowBlur = 14; cx.lineWidth = 1.8;
  cx.beginPath(); cx.ellipse(0, 4, 34, 24, -0.2, 0, 7); cx.fill(); cx.stroke();
  cx.beginPath(); cx.arc(-28, -18, 16, 0, 7); cx.stroke();
  cx.beginPath(); cx.moveTo(-43, -20); cx.lineTo(-58, -17); cx.lineTo(-43, -14); cx.stroke();
  cx.fillStyle = 'rgba(255,220,180,.9)'; cx.beginPath(); cx.arc(-33, -20, 2.2, 0, 7); cx.fill();
  cx.strokeStyle = 'rgba(255,150,90,.85)';
  cx.beginPath(); cx.arc(-22, -4, 18, 0.8, 2.6); cx.stroke();
  cx.strokeStyle = 'rgba(255,112,72,.78)';
  cx.beginPath(); cx.moveTo(-8, -4); cx.quadraticCurveTo(18, -8, 34, 12);
  cx.moveTo(30, 8); cx.lineTo(62, -4 + Math.sin(t * 0.003) * 3 * rm); cx.lineTo(60, 4); cx.lineTo(32, 14);
  cx.moveTo(-4, 26); cx.lineTo(-8, 48); cx.moveTo(8, 25); cx.lineTo(6, 48);
  cx.moveTo(-36, 52); cx.quadraticCurveTo(0, 46, 42, 50); cx.stroke();
  cx.restore();
  cap('Erithacus rubecula (Pettirosso)', 'Avifauna moderna · discendente dei teropodi maniraptori', W * 0.8 + px * 1.3 - 20 * s, H * 0.77 + py + 76 * s, 'rgba(255,132,96,');
}

/* ===== SFONDO 2: MAPPA GEOGRAFICA ===== */
function drawGeoMap(t, S) {
  const cX = W / 2 + V.x, cY = H / 2 + V.y, scale = S * V.k;
  cx.save();

  cx.strokeStyle = 'rgba(246, 196, 150, 0.12)';
  cx.lineWidth = 1;
  for (let gx = -1.2; gx <= 1.2; gx += 0.2) {
    const x = cX + gx * scale;
    cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke();
  }
  for (let gy = -1.0; gy <= 1.0; gy += 0.2) {
    const y = cY + gy * scale;
    cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke();
  }

  const drawPoly = (pts, close = true) => {
    cx.beginPath();
    pts.forEach(([gx, gy], idx) => {
      const px = cX + gx * scale, py = cY + gy * scale;
      if (idx === 0) cx.moveTo(px, py); else cx.lineTo(px, py);
    });
    if (close) cx.closePath();
    cx.fill();
    cx.stroke();
  };

  cx.fillStyle = 'rgba(233, 135, 63, 0.08)';
  cx.strokeStyle = 'rgba(246, 178, 122, 0.34)';
  cx.lineWidth = 1.6;

  drawPoly([
    [-0.36, 0.22], [-0.32, 0.04], [-0.20, -0.04], [-0.06, -0.18], [0.16, -0.22],
    [0.45, -0.24], [0.58, 0.05], [0.42, 0.38], [0.26, 0.44], [0.18, 0.32],
    [0.16, 0.50], [0.08, 0.48], [0.02, 0.28], [-0.12, 0.24], [-0.26, 0.32]
  ]);
  drawPoly([
    [0.06, -0.34], [0.22, -0.68], [0.44, -0.70], [0.46, -0.42], [0.28, -0.34], [0.14, -0.28]
  ]);
  drawPoly([
    [-0.34, -0.08], [-0.28, -0.26], [-0.20, -0.22], [-0.22, -0.06]
  ]);
  cx.setLineDash([5, 6]);
  drawPoly([[0.52, 0.28], [0.76, 0.38], [0.80, 0.62], [0.58, 0.58]]);
  cx.setLineDash([]);

  const sol = GEO_SITES[0];
  cx.strokeStyle = 'rgba(255, 214, 140, 0.35)';
  cx.lineWidth = 1.5;
  cx.setLineDash([4, 6]);
  cx.lineDashOffset = -t * 0.02;
  GEO_SITES.slice(1).forEach(st => {
    cx.beginPath();
    cx.moveTo(cX + sol.gx * scale, cY + sol.gy * scale);
    cx.quadraticCurveTo(
      cX + (sol.gx + st.gx) * 0.5 * scale,
      cY + ((sol.gy + st.gy) * 0.5 - 0.12) * scale,
      cX + st.gx * scale,
      cY + st.gy * scale
    );
    cx.stroke();
  });
  cx.setLineDash([]);

  GEO_SITES.forEach(st => {
    const sx = cX + st.gx * scale, sy = cY + st.gy * scale;
    cx.fillStyle = 'rgba(255, 196, 110, 0.85)';
    cx.beginPath(); cx.arc(sx, sy, 4, 0, 7); cx.fill();

    cx.strokeStyle = 'rgba(255, 196, 110, 0.45)';
    cx.beginPath(); cx.arc(sx, sy, 10 + Math.sin(t * 0.003) * 2, 0, 7); cx.stroke();

    cx.textAlign = 'center';
    cx.font = 'italic 600 13px Fraunces, Georgia, serif';
    cx.fillStyle = 'rgba(251, 238, 224, 0.88)';
    cx.fillText(st.name, sx, sy - 16);

    cx.font = '400 10.5px Figtree, sans-serif';
    cx.fillStyle = 'rgba(220, 191, 163, 0.65)';
    cx.fillText(st.sub, sx, sy - 3);
  });

  cx.restore();
}

/* ===== RENDER LOOP ===== */
function render(t) {
  if (cam) {
    V.k += (cam.k - V.k) * 0.09;
    V.x += (cam.x - V.x) * 0.09;
    V.y += (cam.y - V.y) * 0.09;
  }

  items.forEach(it => {
    const targetX = viewMode === 'geo' ? it.gx : it.tx;
    const targetY = viewMode === 'geo' ? it.gy : it.ty;
    it.x += (targetX - it.x) * 0.08;
    it.y += (targetY - it.y) * 0.08;
  });

  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cX = W / 2 + V.x, cY = H / 2 + V.y;
  const g0 = cx.createRadialGradient(cX, cY, 0, cX, cY, Math.max(W, H) * 0.82);
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
    const x = (((d.x * W + V.x * 0.2 * d.s) % W) + W) % W;
    cx.fillStyle = 'rgba(255,214,170,' + (0.28 + 0.28 * Math.sin(t * 0.002 + d.p)) + ')';
    cx.beginPath(); cx.arc(x, d.y * H, d.s, 0, 7); cx.fill();
  });

  const S = SC(), z = sz(), th = mode === 'thumb';

  if (viewMode === 'tsne') {
    cx.lineWidth = 1; cx.setLineDash([3, 12]); cx.lineDashOffset = -t * 0.012;
    for (let r = 1; r <= 7; r++) {
      cx.beginPath();
      cx.arc(cX, cY, r * S * V.k * 0.3 * (1 + 0.012 * Math.sin(t * 0.001 + r)), 0, 7);
      cx.strokeStyle = 'rgba(250,205,165,' + (0.24 - r * 0.028) + ')';
      cx.stroke();
    }
    cx.setLineDash([]);
    drawEvolutionArt(t);
  } else {
    drawGeoMap(t, S);
  }

  if (items.length) {
    const rm = RM ? 0 : 1;
    const born = i => items[i].b != null && t >= items[i].b;
    const A = items.map((it, i) => {
      const [x, y] = pos(it, S);
      const a = it.b == null ? 1 : ease((t - it.b) / 850);
      it.hs = (it.hs || 0) + (((i === hov || i === sel) ? 1 : 0) - (it.hs || 0)) * 0.18;
      return {
        x: x + Math.cos(t * 0.0011 + i * 1.7) * 1.4 * rm,
        y: y + Math.sin(t * 0.0015 + i) * 2.2 * rm + (it.b == null ? 0 : (1 - a) * -H * 0.45),
        a,
        s: z * (1 + 0.5 * it.hs) * (0.55 + 0.45 * Math.min(1, a))
      };
    });

    if (viewMode === 'tsne') {
      cx.lineWidth = 1; cx.globalAlpha = 0.22 + 0.08 * Math.sin(t * 0.002);
      items.forEach((a, i) => {
        if (!vis(a) || !born(i)) return;
        (NM[i] || []).forEach(j => {
          if (!items[j] || !vis(items[j]) || !born(j)) return;
          cx.beginPath(); cx.moveTo(A[i].x, A[i].y); cx.lineTo(A[j].x, A[j].y);
          cx.strokeStyle = col[a.cat]; cx.stroke();
        });
      });
      cx.globalAlpha = 1;
    }

    cx.lineWidth = 2; cx.setLineDash([6, 8]); cx.lineDashOffset = -t * 0.04; cx.strokeStyle = '#ffe2bd';
    [hov, sel].forEach(k => {
      if (k < 0 || !Dm || !born(k)) return;
      cx.globalAlpha = k === sel ? 0.85 : 0.6;
      links(k).forEach(j => {
        cx.beginPath(); cx.moveTo(A[k].x, A[k].y); cx.lineTo(A[j].x, A[j].y); cx.stroke();
      });
    });
    cx.setLineDash([]); cx.globalAlpha = 1;

    const one = (i, big) => {
      const it = items[i], b = it.b, o = A[i], c = col[it.cat];
      if (b != null && t < b) return;
      if (b == null || !th) {
        cx.save(); cx.shadowColor = c; cx.shadowBlur = 18;
        cx.beginPath(); cx.arc(o.x, o.y, (big ? 9 : 6) * (b == null ? 0.7 : 1) * (1 + 0.5 * it.hs), 0, 7);
        cx.fillStyle = c; cx.fill(); cx.restore();
        if (big) { cx.lineWidth = 3; cx.strokeStyle = '#f4efe3'; cx.stroke(); }
        return;
      }
      const s = o.s, p = s * 0.07;
      cx.save();
      cx.globalAlpha = Math.min(1, o.a * 1.4);
      cx.translate(o.x, o.y);
      cx.rotate(((i * 37 % 11) - 5) * 0.014 + (1 - Math.min(1, o.a)) * 0.9 + Math.sin(t * 0.0009 + i) * 0.02 * rm);
      cx.shadowColor = it.hs > 0.05 ? c : 'rgba(0,0,0,.6)';
      cx.shadowBlur = 12 + 26 * it.hs; cx.shadowOffsetY = 4;
      cx.fillStyle = big ? '#fff' : '#f4efe3';
      cx.fillRect(-s / 2 - p, -s / 2 - p, s + 2 * p, s + p * 3.4);
      cx.shadowColor = 'transparent';
      cx.drawImage(it.th, -s / 2, -s / 2, s, s);
      cx.fillStyle = c;
      cx.fillRect(-s / 2, s / 2 + p * 1.1, s * 0.4, Math.max(2, p * 0.8));
      if (big) { cx.lineWidth = 2.5; cx.strokeStyle = '#ffe2bd'; cx.strokeRect(-s / 2 - p, -s / 2 - p, s + 2 * p, s + p * 3.4); }
      cx.restore();

      if (big) {
        const q = (t % 1500) / 1500;
        cx.globalAlpha = 1 - q; cx.lineWidth = 2; cx.strokeStyle = '#ffe2bd';
        cx.beginPath(); cx.arc(o.x, o.y, s * 0.75 + q * s * 0.9, 0, 7); cx.stroke();
        cx.globalAlpha = 1;
      }
    };

    items.forEach((a, i) => {
      if (!vis(a) && a.b != null && t >= a.b) {
        cx.globalAlpha = 0.25; cx.beginPath(); cx.arc(A[i].x, A[i].y, 3, 0, 7);
        cx.fillStyle = col[a.cat]; cx.fill(); cx.globalAlpha = 1;
      }
    });
    items.forEach((a, i) => { if (vis(a) && i !== sel && i !== hov) one(i, false); });
    if (hov >= 0 && hov !== sel && vis(items[hov])) one(hov, false);
    if (sel >= 0) one(sel, true);
  }

  fx = fx.filter(f => t - f.t0 < 1100);
  fx.forEach(f => {
    const p = (t - f.t0) / 1100, [x, y] = pos(f, S);
    cx.globalAlpha = 1 - p; cx.strokeStyle = f.c; cx.fillStyle = f.c; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x, y, 10 + p * 140, 0, 7); cx.stroke();
    f.sp.forEach(s => {
      const d = s.v * p * (2 - p);
      cx.beginPath(); cx.arc(x + Math.cos(s.a) * d, y + Math.sin(s.a) * d, 2.5 * (1 - p) + 0.5, 0, 7); cx.fill();
    });
  });
  cx.globalAlpha = 1;
}

new ResizeObserver(() => {
  dpr = window.devicePixelRatio || 1;
  W = wrap.clientWidth; H = wrap.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  dirty = true;
}).observe(wrap);

(function L(t) { render(t || 0); requestAnimationFrame(L); })();

/* ===== CARICAMENTO AUTOMATICO + FALLBACK MANUALE ===== */
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
    if (miss) $('#wn').textContent = miss + ' righe del CSV senza file corrispondente: controlla la colonna filename.';
    if (R.length < 4) { msg('Servono almeno 4 immagini valide in ' + CONFIG.images); return; }
    $('#dati').classList.add('auto');
    start(R, B);
  } catch (e) {
    msg('Apri tramite GitHub Pages / Live Server oppure carica i file qui sopra.');
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
