/* ============================================================
   geo.js — hub geografici, proiezione Natural Earth (d3-geo),
   mappa pre-rasterizzata a cache e disposizione cluster
   ============================================================ */
import { state, CONFIG, clamp, markDirty, msg } from './data.js';

export const GEO_HUBS = [
  { id: 'kauai',     label: 'Kauai, Hawaii',             lon: -159.52, lat: 22.09 },
  { id: 'solnhofen', label: 'Solnhofen (Baviera)',       lon: 10.99,   lat: 48.89 },
  { id: 'berlino',   label: 'Berlino (Naturkunde)',      lon: 13.38,   lat: 52.53 },
  { id: 'sassonia',  label: 'Bassa Sassonia',            lon: 9.73,    lat: 52.37 },
  { id: 'simbruini', label: 'Monti Simbruini (Italia)',  lon: 13.28,   lat: 41.91 },
  { id: 'oulu',      label: 'Oulu (Finlandia)',          lon: 25.47,   lat: 65.01 },
  { id: 'italia',    label: 'Italia (areale pettirosso)', lon: 12.50,   lat: 42.50 },
  { id: 'fujian',    label: 'Fujian (Cina)',             lon: 118.10,  lat: 26.00 },
  { id: 'broome',    label: 'Broome (Australia)',        lon: 122.23,  lat: -17.96 }
];
const HUB_BY_ID = new Map(GEO_HUBS.map(h => [h.id, h]));
const GOLDEN = 2.39996;

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
  hubCacheKey = '';
}

export function geoOffset(it, size, out) {
  const r = Math.sqrt(it.hubRank) * size * 0.72;
  const a = it.hubRank * GOLDEN;
  out.dx = Math.cos(a) * r;
  out.dy = Math.sin(a) * r * 0.84;
  return out;
}

export const geoThumbSize = k => clamp(36 * Math.sqrt(k), 26, 98);

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
    landDirty = true;
    markDirty();
  } catch (_) {
    msg('Non riesco a caricare i contorni dei continenti: la mappa mostra solo i luoghi.');
  }
}

/* ---------- mappa rasterizzata ---------- */
const MARGIN = 0.2;
let layer = null, layerCam = null, layerKey = '', landDirty = false, lastRaster = 0;
const prevCam = { x: NaN, y: NaN, k: NaN };
let camMovedAt = 0;
let geoBg = null, geoBgKey = '';

function rasterize(cam, now) {
  const { W, H, dpr } = state;
  const ls = Math.min(dpr, 1.5);
  const mx = W * MARGIN, my = H * MARGIN;
  const cw = Math.round((W + 2 * mx) * ls), ch = Math.round((H + 2 * my) * ls);
  if (!layer) layer = document.createElement('canvas');
  if (layer.width !== cw || layer.height !== ch) { layer.width = cw; layer.height = ch; }
  const g = layer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cw, ch);
  g.setTransform(ls, 0, 0, ls, mx * ls, my * ls);

  const p = projection(cam);
  if (p) {
    const d3 = window.d3;
    const path = d3.geoPath(p, g);
    g.beginPath(); path({ type: 'Sphere' });
    g.fillStyle = 'rgba(255, 190, 140, 0.04)'; g.fill();
    g.strokeStyle = 'rgba(255, 214, 170, 0.22)'; g.lineWidth = 1; g.stroke();

    if (!graticule) graticule = d3.geoGraticule10();
    g.beginPath(); path(graticule);
    g.strokeStyle = 'rgba(255, 224, 188, 0.08)'; g.stroke();

    if (land) {
      g.beginPath(); path(land);
      g.fillStyle = 'rgba(246, 176, 120, 0.22)'; g.fill();
      g.strokeStyle = 'rgba(255, 216, 174, 0.52)'; g.lineWidth = 0.9; g.stroke();
    }
  }
  layerCam = { x: cam.x, y: cam.y, k: cam.k };
  layerKey = `${W}|${H}|${ls}`;
  lastRaster = now;
}

function drawGeoBg(cx) {
  const { W, H } = state;
  const key = `${W}|${H}`;
  if (geoBgKey !== key) {
    geoBgKey = key;
    const w = Math.max(1, Math.ceil(W / 2)), h = Math.max(1, Math.ceil(H / 2));
    geoBg = document.createElement('canvas');
    geoBg.width = w; geoBg.height = h;
    const g = geoBg.getContext('2d');
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8);
    r.addColorStop(0, '#2c1409');
    r.addColorStop(0.6, '#150804');
    r.addColorStop(1, '#080201');
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
  }
  cx.drawImage(geoBg, 0, 0, W, H);
}

/** Disegna la mappa. Restituisce true se un ridisegno nitido è ancora in attesa (serve un altro frame). */
export function drawGeoBase(cx, now = performance.now()) {
  const { W, H, dpr, camGeo: c } = state;
  drawGeoBg(cx);

  const moved = c.x !== prevCam.x || c.y !== prevCam.y || c.k !== prevCam.k;
  if (moved) { camMovedAt = now; prevCam.x = c.x; prevCam.y = c.y; prevCam.k = c.k; }

  const ls = Math.min(dpr, 1.5);
  if (!layerCam || landDirty || layerKey !== `${W}|${H}|${ls}`) {
    rasterize(c, now);
    landDirty = false;
  }

  const geometry = () => {
    const r = c.k / layerCam.k;
    return {
      r,
      x0: (W / 2 + c.x) + (-W * MARGIN - (W / 2 + layerCam.x)) * r,
      y0: (H / 2 + c.y) + (-H * MARGIN - (H / 2 + layerCam.y)) * r
    };
  };
  let q = geometry();
  const w = W * (1 + 2 * MARGIN), h = H * (1 + 2 * MARGIN);
  const exposed = q.x0 > 0 || q.y0 > 0 || q.x0 + w * q.r < W || q.y0 + h * q.r < H;
  const badScale = q.r < 0.6 || q.r > 1.7;
  const differs = c.x !== layerCam.x || c.y !== layerCam.y || c.k !== layerCam.k;
  const settled = differs && !moved && now - camMovedAt > 120;

  if (settled || ((exposed || badScale) && now - lastRaster > 90)) {
    rasterize(c, now);
    q = geometry();
  }
  cx.drawImage(layer, q.x0, q.y0, w * q.r, h * q.r);
  return c.x !== layerCam.x || c.y !== layerCam.y || c.k !== layerCam.k;
}

/* ---------- declutter con cache ---------- */
const hubLayout = new Map();
let hubCacheKey = '';

export function layoutHubs(size, cam = state.camGeo, out = hubLayout) {
  const isGlobal = out === hubLayout;
  const key = `${state.W}|${state.H}|${cam.x.toFixed(2)}|${cam.y.toFixed(2)}|${cam.k.toFixed(4)}|${size.toFixed(2)}`;
  if (isGlobal && key === hubCacheKey && hubLayout.size > 0) {
    return hubLayout;
  }

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
      R: Math.sqrt(it.hubSize) * size * 0.72 + size * 0.58
    });
  }

  const anchorPull = clamp(0.04 + (cam.k - 1) * 0.035, 0.04, 0.35);
  const iters = cam.k > 4 ? 10 : 22;

  for (let iter = 0; iter < iters; iter++) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = (a.R + b.R) * 0.92;
        if (d < min) {
          const push = (min - d) * 0.5;
          dx /= d; dy /= d;
          a.x -= dx * push; a.y -= dy * push;
          b.x += dx * push; b.y += dy * push;
        }
      }
    }
    for (const a of list) {
      a.x += (a.tx - a.x) * anchorPull;
      a.y += (a.ty - a.y) * anchorPull;
    }
  }

  for (const a of list) out.set(a.id, a);
  if (isGlobal) hubCacheKey = key;
  return out;
}

/* conteggi per hub (tavole visibili): calcolati una volta per frame e riusati dalle etichette */
const hubVis = new Map();
let haloSprite = null;

export function drawGeoHalos(cx) {
  hubVis.clear();
  for (const it of state.items) if (it.vis) hubVis.set(it.hubId, (hubVis.get(it.hubId) || 0) + 1);

  if (!haloSprite) {
    haloSprite = document.createElement('canvas');
    haloSprite.width = haloSprite.height = 128;
    const g = haloSprite.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255, 170, 90, 0.26)');
    r.addColorStop(1, 'rgba(255, 170, 90, 0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  }

  for (const h of hubLayout.values()) {
    if (!hubVis.has(h.id)) continue;
    cx.drawImage(haloSprite, h.x - h.R, h.y - h.R, h.R * 2, h.R * 2);

    if (Math.hypot(h.x - h.tx, h.y - h.ty) > 6) {
      cx.strokeStyle = 'rgba(255, 200, 140, 0.45)';
      cx.lineWidth = 1;
      cx.setLineDash([3, 4]);
      cx.beginPath(); cx.moveTo(h.tx, h.ty); cx.lineTo(h.x, h.y); cx.stroke();
      cx.setLineDash([]);
    }

    cx.fillStyle = 'rgba(255, 190, 125, 0.24)';
    cx.beginPath(); cx.arc(h.tx, h.ty, 9, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#ffbe7d';
    cx.beginPath(); cx.arc(h.tx, h.ty, 3.4, 0, Math.PI * 2); cx.fill();
  }
}

export function drawGeoLabels(cx) {
  cx.save();
  cx.textAlign = 'center';
  cx.lineJoin = 'round';
  cx.lineWidth = 3.5;
  cx.strokeStyle = 'rgba(20, 8, 4, 0.85)';
  for (const [id, n] of hubVis) {
    const h = hubLayout.get(id);
    if (!h) continue;
    const y = h.y + h.R * 0.85 + 15;
    cx.font = 'italic 600 13px Fraunces, Georgia, serif';
    cx.strokeText(h.hub.label, h.x, y);
    cx.fillStyle = 'rgba(255, 238, 218, 0.96)';
    cx.fillText(h.hub.label, h.x, y);
    cx.font = '500 11px Figtree, sans-serif';
    const sub = `${n} ${n === 1 ? 'tavola' : 'tavole'}`;
    cx.strokeText(sub, h.x, y + 15);
    cx.fillStyle = 'rgba(246, 190, 140, 0.9)';
    cx.fillText(sub, h.x, y + 15);
  }
  cx.restore();
}
