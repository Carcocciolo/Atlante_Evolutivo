/* geo.js — Mappa cartografica con d3-geo, hub Hawaii e assegnazioni corrette */
export const GEO_HUBS = [
  { id: 'hawaii',    label: 'Isole Hawaii (Pacifico)', lon: -155.5, lat: 19.6, inferred: true },
  { id: 'solnhofen', label: 'Solnhofen (Baviera)',     lon: 10.98,  lat: 48.89, inferred: false },
  { id: 'berlin',    label: 'Berlino',                 lon: 13.40,  lat: 52.52, inferred: false },
  { id: 'simbruini', label: 'Monti Simbruini',         lon: 13.22,  lat: 41.88, inferred: false },
  { id: 'oulu',      label: 'Oulu (Finlandia)',        lon: 25.47,  lat: 65.01, inferred: false },
  { id: 'fujian',    label: 'Fujian (Cina)',           lon: 117.8,  lat: 26.0,  inferred: false },
  { id: 'broome',    label: 'Broome (Australia)',      lon: 122.23, lat: -17.96, inferred: false },
  { id: 'europa',    label: 'Europa (area inferita)',  lon: 10.5,   lat: 47.5,  inferred: true }
];

export function assignGeoHub(r, idx) {
  const cat = (r.category || '').trim();
  const blob = `${r.subject || ''} ${r.notes || ''} ${r.source || ''} ${cat}`.toLowerCase();

  // Bug corretto: tutti i Grilli confluiscono sulle Hawaii
  if (cat === 'Grilli' || blob.includes('grillo') || blob.includes('grilli') || blob.includes('cricket') || blob.includes('hawaii')) {
    const hub = GEO_HUBS[0];
    return offsetAroundHub(hub, idx, true);
  }

  let hubId = 'solnhofen';
  if (blob.includes('berlino') || blob.includes('berlin')) hubId = 'berlin';
  else if (blob.includes('solnhofen') || blob.includes('bavarica') || blob.includes('baviera')) hubId = 'solnhofen';
  else if (blob.includes('simbruini') || blob.includes('parchilazio')) hubId = 'simbruini';
  else if (blob.includes('oulu')) hubId = 'oulu';
  else if (blob.includes('fujianvenator') || blob.includes('fujian')) hubId = 'fujian';
  else if (blob.includes('dinosaurcoast') || blob.includes('broome')) hubId = 'broome';
  else if (cat === 'Pettirossi' || blob.includes('pettirosso') || blob.includes('erithacus')) hubId = 'europa';

  const hub = GEO_HUBS.find(h => h.id === hubId) || GEO_HUBS[1];
  return offsetAroundHub(hub, idx, hub.inferred);
}

function offsetAroundHub(hub, idx, inferred) {
  const ring = Math.floor(idx / 6) + 1;
  const angle = idx * 2.39996;
  const spread = 0.45 * Math.sqrt(ring);
  return {
    siteName: hub.label,
    inferredPlace: inferred,
    lon: hub.lon + Math.cos(angle) * spread,
    lat: hub.lat + Math.sin(angle) * spread * 0.75
  };
}

let cachedProjection = null;
let cachedKey = '';

export function getGeoProjection(W, H) {
  const key = `${W}x${H}`;
  if (cachedProjection && cachedKey === key) return cachedProjection;
  const d3g = window.d3;
  if (d3g && typeof d3g.geoNaturalEarth1 === 'function') {
    cachedProjection = d3g.geoNaturalEarth1()
      .scale(Math.min(W, H) * 0.25)
      .translate([W / 2, H / 2]);
  } else {
    // Fallback minimale se CDN d3-geo non raggiungibile
    cachedProjection = ([lon, lat]) => [
      W / 2 + (lon / 180) * (W * 0.42),
      H / 2 - (lat / 90) * (H * 0.42)
    ];
  }
  cachedKey = key;
  return cachedProjection;
}

export function drawGeoGridAndHubs(cx, W, H) {
  const proj = getGeoProjection(W, H);
  const d3g = window.d3;

  cx.strokeStyle = 'rgba(246, 196, 150, 0.14)';
  cx.lineWidth = 1;

  if (d3g && typeof d3g.geoGraticule === 'function' && typeof d3g.geoPath === 'function') {
    const path = d3g.geoPath(proj, cx);
    cx.beginPath();
    path(d3g.geoGraticule().step([30, 30])());
    cx.stroke();

    cx.strokeStyle = 'rgba(246, 196, 150, 0.28)';
    cx.beginPath();
    path({ type: 'Sphere' });
    cx.stroke();
  }

  cx.font = '12px Figtree, sans-serif';
  cx.textAlign = 'left';
  GEO_HUBS.forEach(hub => {
    const pt = proj([hub.lon, hub.lat]);
    if (!pt) return;
    cx.fillStyle = hub.inferred ? '#8fd39e' : '#ee9a5b';
    cx.beginPath();
    cx.arc(pt[0], pt[1], 3.5, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = 'rgba(251, 238, 224, 0.8)';
    cx.fillText(hub.label, pt[0] + 7, pt[1] + 4);
  });
}
