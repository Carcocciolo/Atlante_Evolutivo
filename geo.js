/* ============================================================
   geo.js — hub geografici, proiezione Natural Earth (d3-geo),
   mappa del mondo e disposizione a spirale delle tavole per hub
   ============================================================ */
import { state, CONFIG, clamp, markDirty, msg } from './data.js';

export const GEO_HUBS = [
  { id: 'kauai',     label: 'Kauai, Hawaii',            lon: -159.52, lat: 22.09 },
  { id: 'solnhofen', label: 'Solnhofen (Baviera)',      lon: 10.99,   lat: 48.89 },
  { id: 'berlino',   label: 'Berlino (Naturkunde)',     lon: 13.38,   lat: 52.53 },
  { id: 'sassonia',  label: 'Bassa Sassonia',           lon: 9.73,    lat: 52.37 },
  { id: 'simbruini', label: 'Monti Simbruini (Italia)', lon: 13.28,   lat: 41.91 },
  { id: 'oulu',      label: 'Oulu (Finlandia)',         lon: 25.47,   lat: 65.01 },
  { id: 'italia',    label: 'Italia (areale pettirosso)', lon: 12.50, lat: 42.50 },
  { id: 'fujian',    label: 'Fujian (Cina)',            lon: 118.10,  lat: 26.00 },
  { id: 'broome',    label: 'Broome (Australia)',       lon: 122.23,  lat: -17.96 }
];
const HUB_BY_ID = new Map(GEO_HUBS.map(h => [h.id, h]));
const GOLDEN = 2.39996;

/** Associa una riga del CSV a un hub; `geoStatus` dice se la località è esatta o dedotta. */
export function assignGeoHub(r) {
  const cat = (r.category || '').toLowerCase();
  const blob = `${r.subject || ''} ${r.notes || ''} ${r.source || ''} ${r.category || ''}`.toLowerCase();
  const has = (...k) => k.some(x => blob.includes(x));
  let hubId, geoStatus = 'esatto';

  if (cat.includes('grilli') || has('grillo', 'teleogryllus', 'gryllus')) {
    hubId = 'kauai'; geoStatus = 'inferito';
  } else if (cat.includes('pettirossi') || has('pettirosso', 'erithacus')) {
    if (has('oulu')) hubId = 'oulu';
    else if (has('simbruini', 'parchilazio')) hubId = 'simbruini';
    else { hubId = 'italia'; geoStatus = 'inferito'; }
  } else if (has('fujianvenator', 'fujian')) hubId = 'fujian';
  else if (has('dinosaurcoast', 'broome')) hubId = 'broome';
  else if (has('bassa sassonia')) hubId = 'sassonia';
  else if (has('berlino', 'berlin')) hubId = 'berlino';
  else if (has('solnhofen', 'bavarica')) hubId = 'solnhofen';
  else { hubId = 'solnhofen'; geoStatus = 'inferito'; }

  const hub = HUB_BY_ID.get(hubId);
  return { hubId, siteName: hub.label, lon: hub.lon, lat: hub.lat, geoStatus };
}

/** Numera le tavole dentro ogni hub (raggruppate per categoria) per la spirale. */
export function assignHubRanks(items) {
  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.hubId)) groups.set(it.hubId, []);
    groups.get(it.hubId).push(it);
  }
  for (const g of groups.values()) {
    g.sort((a, b) => (a.cat < b.cat ? -1 : a.cat > b.cat ? 1 : 0));
    g.forEach((it, r) => { it.hubRank = r; it.hubSize = g.length; });
  }
}

/** Spostamento in pixel (spirale di Fibonacci) rispetto al centro dell'hub. */
export function geoOffset(it, size, out) {
  const r = Math.sqrt(it.hubRank) * size * 0.8;
  const a = it.hubRank * GOLDEN;
  out.dx = Math.cos(a) * r;
  out.dy = Math.sin(a) * r * 0.82;
  return out;
}

export const geoThumbSize = k => clamp(40 * Math.sqrt(k), 30, 110);

/* ---------- proiezione (con cache) ---------- */
let base = { W: -1, H: -1, scale: 1 };
let cache = { W: -1, H: -1, x: 0, y: 0, k: 0, p: null };

function baseScale() {
  const { W, H } = state;
  if (base.W !== W || base.H !== H) {
    const p = window.d3.geoNaturalEarth1()
      .fitExtent([[W * 0.06, H * 0.12], [W * 0.94, H * 0.88]], { type: 'Sphere' });
    base = { W, H, scale: p.scale() };
  }
  return base.scale;
}

function projection(c) {
  const d3 = window.d3;
  if (!d3 || typeof d3.geoNaturalEarth1 !== 'function') return null;
  const { W, H } = state;
  if (cache.p && cache.W === W && cache.H === H && cache.x === c.x && cache.y === c.y && cache.k === c.k) {
    return cache.p;
  }
  const p = d3.geoNaturalEarth1().scale(baseScale() * c.k).translate([W / 2 + c.x, H / 2 + c.y]);
  cache = { W, H, x: c.x, y: c.y, k: c.k, p };
  return p;
}

export function geoToScreen(lon, lat, c = state.camGeo, out = {}) {
  const p = projection(c);
  const pt = p && p([lon, lat]);
  if (pt && Number.isFinite(pt[0])) {
    out.sx = pt[0]; out.sy = pt[1];
  } else {
    // Senza d3-geo: proiezione equirettangolare di ripiego.
    const { W, H } = state;
    const mw = Math.min(W * 0.92, H * 1.65);
    out.sx = W / 2 + c.x + (lon / 180) * (mw / 2) * c.k;
    out.sy = H / 2 + c.y - (lat / 90) * (mw * 0.27) * c.k;
  }
  out.scale = 1;
  out.zOrder = 0;
  return out;
}

/* ---------- terre emerse ---------- */
let land = null;
let graticule = null;

export async function loadLand() {
  try {
    const topo = await (await fetch(CONFIG.landUrl)).json();
    land = window.topojson.feature(topo, topo.objects.land);
    markDirty();
  } catch (_) {
    msg('Non riesco a caricare i contorni dei continenti: la mappa mostra solo i luoghi.');
  }
}

/* ---------- disegno ---------- */
export function drawGeoBase(cx) {
  const { W, H, camGeo } = state;
  const bg = cx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
  bg.addColorStop(0, '#4a2412');
  bg.addColorStop(0.6, '#2a1209');
  bg.addColorStop(1, '#140805');
  cx.fillStyle = bg;
  cx.fillRect(0, 0, W, H);

  const p = projection(camGeo);
  if (!p) return;
  const d3 = window.d3;
  const path = d3.geoPath(p, cx);

  cx.beginPath(); path({ type: 'Sphere' });
  cx.fillStyle = 'rgba(255, 190, 140, 0.04)'; cx.fill();
  cx.strokeStyle = 'rgba(255, 214, 170, 0.22)'; cx.lineWidth = 1; cx.stroke();

  if (!graticule) graticule = d3.geoGraticule10();
  cx.beginPath(); path(graticule);
  cx.strokeStyle = 'rgba(255, 224, 188, 0.09)'; cx.stroke();

  if (land) {
    cx.beginPath(); path(land);
    cx.fillStyle = 'rgba(246, 176, 120, 0.2)'; cx.fill();
    cx.strokeStyle = 'rgba(255, 216, 174, 0.5)'; cx.lineWidth = 0.9; cx.stroke();
  }
}

/* ---------- declutter: i gruppi vicini si respingono, un filo ricorda il luogo reale ---------- */
const hubLayout = new Map();

/**
 * Calcola il centro schermo di ogni gruppo di tavole. Se due gruppi si sovrapporrebbero
 * (es. Solnhofen e Berlino a mappa intera) vengono allontanati; allo zoom giusto
 * tornano esattamente sul loro luogo. Il risultato dipende solo dalla camera: nessun sfarfallio.
 */
export function layoutHubs(size, cam = state.camGeo, out = hubLayout) {
  out.clear();
  const list = [];
  const seen = new Set();
  for (const it of state.items) {
    if (seen.has(it.hubId)) continue;
    seen.add(it.hubId);
    const hub = HUB_BY_ID.get(it.hubId);
    const p = geoToScreen(hub.lon, hub.lat, cam, {});
    list.push({
      id: it.hubId, hub, tx: p.sx, ty: p.sy, x: p.sx, y: p.sy,
      R: Math.sqrt(it.hubSize) * size * 0.8 + size * 0.7
    });
  }
  for (let iter = 0; iter < 30; iter++) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01, min = (a.R + b.R) * 0.95;
      if (d < min) {
        const push = (min - d) / 2;
        dx /= d; dy /= d;
        a.x -= dx * push; a.y -= dy * push;
        b.x += dx * push; b.y += dy * push;
      }
    }
    for (const a of list) { a.x += (a.tx - a.x) * 0.03; a.y += (a.ty - a.y) * 0.03; }
  }
  for (const a of list) out.set(a.id, a);
  return out;
}

/** Aloni sotto le tavole, filo verso il luogo reale e anello pulsante sul luogo. */
export function drawGeoHalos(cx, t) {
  for (const h of hubLayout.values()) {
    if (!state.items.some(it => it.hubId === h.id && it.vis)) continue;
    const g = cx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.R);
    g.addColorStop(0, 'rgba(255, 170, 90, 0.26)');
    g.addColorStop(1, 'rgba(255, 170, 90, 0)');
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(h.x, h.y, h.R, 0, Math.PI * 2); cx.fill();

    if (Math.hypot(h.x - h.tx, h.y - h.ty) > 6) {
      cx.strokeStyle = 'rgba(255, 200, 140, 0.45)';
      cx.lineWidth = 1;
      cx.setLineDash([3, 4]);
      cx.beginPath(); cx.moveTo(h.tx, h.ty); cx.lineTo(h.x, h.y); cx.stroke();
      cx.setLineDash([]);
    }
    const q = (t * 0.0004 + h.hub.lon * 0.01) % 1;
    cx.fillStyle = '#ffbe7d';
    cx.beginPath(); cx.arc(h.tx, h.ty, 3.2, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = `rgba(255, 190, 125, ${0.4 * (1 - q)})`;
    cx.lineWidth = 1.2;
    cx.beginPath(); cx.arc(h.tx, h.ty, 4 + q * 20, 0, Math.PI * 2); cx.stroke();
  }
}

/** Etichette dei luoghi sotto ogni gruppo di tavole. */
export function drawGeoLabels(cx) {
  const counts = new Map();
  for (const it of state.items) if (it.vis) counts.set(it.hubId, (counts.get(it.hubId) || 0) + 1);
  cx.save();
  cx.textAlign = 'center';
  cx.lineJoin = 'round';
  cx.lineWidth = 3.5;
  cx.strokeStyle = 'rgba(20, 8, 4, 0.8)';
  for (const [id, n] of counts) {
    const h = hubLayout.get(id);
    if (!h) continue;
    const y = h.y + h.R * 0.82 + 16;
    cx.font = 'italic 600 13px Fraunces, Georgia, serif';
    cx.strokeText(h.hub.label, h.x, y);
    cx.fillStyle = 'rgba(255, 238, 218, 0.95)';
    cx.fillText(h.hub.label, h.x, y);
    cx.font = '500 11px Figtree, sans-serif';
    const sub = `${n} ${n === 1 ? 'tavola' : 'tavole'}`;
    cx.strokeText(sub, h.x, y + 15);
    cx.fillStyle = 'rgba(246, 190, 140, 0.9)';
    cx.fillText(sub, h.x, y + 15);
  }
  cx.restore();
}
