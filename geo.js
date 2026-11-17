import { state, markDirty } from './data.js';

// GeoJSON semplificato dei continenti (lat/lon reali) per d3-geo (funziona anche offline)
export const WORLD_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Nord America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-165, 65], [-140, 69], [-110, 70], [-82, 68], [-62, 58], [-54, 47],
          [-68, 42], [-76, 35], [-81, 25], [-90, 29], [-97, 25], [-88, 16],
          [-78, 9], [-85, 11], [-96, 17], [-105, 20], [-116, 32], [-124, 48],
          [-135, 58], [-152, 60], [-165, 65]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Sud America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80, 10], [-62, 10], [-50, 0], [-35, -6], [-39, -18], [-48, -28],
          [-55, -35], [-66, -46], [-72, -54], [-75, -45], [-71, -30], [-70, -18],
          [-81, -5], [-80, 10]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Europa' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-10, 36], [0, 43], [-5, 48], [2, 51], [8, 55], [12, 57],
          [10, 60], [18, 66], [28, 70], [40, 66], [42, 55], [32, 46],
          [24, 38], [16, 38], [13, 45], [8, 44], [3, 37], [-10, 36]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Africa' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-17, 15], [-16, 28], [-6, 36], [10, 37], [11, 32], [25, 32],
          [34, 31], [43, 12], [51, 11], [41, -10], [35, -24], [26, -34],
          [18, -34], [14, -22], [9, 2], [4, 6], [-8, 5], [-17, 15]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Asia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [40, 55], [55, 68], [85, 72], [120, 72], [145, 62], [140, 50],
          [130, 42], [122, 31], [118, 24], [108, 16], [100, 13], [92, 22],
          [80, 10], [74, 18], [68, 24], [58, 25], [48, 30], [38, 37],
          [32, 46], [40, 55]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Oceania' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [114, -22], [122, -18], [136, -12], [146, -15], [153, -27],
          [147, -38], [138, -35], [130, -32], [115, -34], [114, -22]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Hawaii (Kauai)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-160.2, 22.3], [-159.2, 22.3], [-159.2, 21.8], [-160.2, 21.8], [-160.2, 22.3]
        ]]
      }
    }
  ]
};

export const GEO_HUBS = [
  { id: 'kauai',     label: 'Kauai, Hawaii',             lon: -159.52, lat: 22.09,  defaultStatus: 'inferito' },
  { id: 'solnhofen', label: 'Solnhofen (Baviera)',        lon: 10.99,  lat: 48.89,  defaultStatus: 'esatto' },
  { id: 'berlino',   label: 'Berlino (Naturkunde)',       lon: 13.38,  lat: 52.53,  defaultStatus: 'esatto' },
  { id: 'sassonia',  label: 'Bassa Sassonia',             lon: 9.73,   lat: 52.37,  defaultStatus: 'esatto' },
  { id: 'simbruini', label: 'Monti Simbruini (Italia)',   lon: 13.28,  lat: 41.91,  defaultStatus: 'esatto' },
  { id: 'oulu',      label: 'Oulu (Finlandia)',           lon: 25.47,  lat: 65.01,  defaultStatus: 'esatto' },
  { id: 'italia',    label: 'Italia (areale pettirosso)', lon: 12.50,  lat: 42.50,  defaultStatus: 'inferito' },
  { id: 'fujian',    label: 'Fujian (Cina)',              lon: 118.10, lat: 26.00,  defaultStatus: 'esatto' },
  { id: 'broome',    label: 'Broome (Australia)',         lon: 122.23, lat: -17.96, defaultStatus: 'esatto' }
];

export function assignGeoHub(r, idx) {
  const cat = (r.category || '').toLowerCase();
  const blob = `${r.subject || ''} ${r.notes || ''} ${r.source || ''} ${r.category || ''}`.toLowerCase();
  let hubId = 'solnhofen';
  let geoStatus = 'inferito';

  if (cat.includes('grilli') || blob.includes('grillo') || blob.includes('teleogryllus') || blob.includes('gryllus')) {
    hubId = 'kauai';
    geoStatus = 'inferito';
  } else if (cat.includes('pettirossi') || blob.includes('pettirosso') || blob.includes('erithacus')) {
    if (blob.includes('oulu')) {
      hubId = 'oulu';
      geoStatus = 'esatto';
    } else if (blob.includes('simbruini') || blob.includes('parchilazio')) {
      hubId = 'simbruini';
      geoStatus = 'esatto';
    } else {
      hubId = 'italia';
      geoStatus = 'inferito';
    }
  } else {
    if (blob.includes('fujianvenator') || blob.includes('fujian')) {
      hubId = 'fujian';
      geoStatus = 'esatto';
    } else if (blob.includes('dinosaurcoast') || blob.includes('broome')) {
      hubId = 'broome';
      geoStatus = 'esatto';
    } else if (blob.includes('bassa sassonia')) {
      hubId = 'sassonia';
      geoStatus = 'esatto';
    } else if (blob.includes('berlino') || blob.includes('berlin')) {
      hubId = 'berlino';
      geoStatus = 'esatto';
    } else if (blob.includes('solnhofen') || blob.includes('bavarica')) {
      hubId = 'solnhofen';
      geoStatus = 'esatto';
    } else {
      hubId = 'solnhofen';
      geoStatus = 'inferito';
    }
  }

  const hub = GEO_HUBS.find(h => h.id === hubId) || GEO_HUBS[1];
  const ring = Math.floor(idx / 6) + 1;
  const angle = idx * 2.39996;
  const spread = 0.45 * Math.sqrt(ring);

  return {
    hubId: hub.id,
    siteName: hub.label,
    lon: hub.lon + Math.cos(angle) * spread,
    lat: hub.lat + Math.sin(angle) * spread * 0.7,
    geoStatus
  };
}

function getD3Projection(cObj = state.camGeo) {
  const { W, H } = state;
  if (typeof window.d3 !== 'undefined' && typeof window.d3.geoNaturalEarth1 === 'function') {
    const baseScale = Math.min(W, H) * 0.24;
    return window.d3.geoNaturalEarth1()
      .scale(baseScale * cObj.k)
      .translate([W / 2 + cObj.x, H / 2 + cObj.y]);
  }
  return null;
}

export function geoToScreen(lon, lat, cObj = state.camGeo) {
  const proj = getD3Projection(cObj);
  if (proj) {
    const pt = proj([lon, lat]);
    if (pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
      return {
        sx: pt[0],
        sy: pt[1],
        scale: Math.sqrt(cObj.k),
        zOrder: 0
      };
    }
  }
  // Fallback lineare se d3-geo non è ancora caricato
  const { W, H } = state;
  const mapW = Math.min(W * 0.92, H * 1.65);
  const mapH = mapW * 0.54;
  return {
    sx: W / 2 + cObj.x + (lon / 180) * (mapW / 2) * cObj.k,
    sy: H / 2 + cObj.y - (lat / 90) * (mapH / 2) * cObj.k,
    scale: Math.sqrt(cObj.k),
    zOrder: 0
  };
}

export function drawGeoMap(cx) {
  const { W, H, camGeo, items } = state;

  const gMap = cx.createRadialGradient(W / 2 + camGeo.x, H / 2 + camGeo.y, 10, W / 2 + camGeo.x, H / 2 + camGeo.y, Math.max(W, H) * 0.9);
  gMap.addColorStop(0, '#5c2c16');
  gMap.addColorStop(0.55, '#3b1a0c');
  gMap.addColorStop(1, '#1d0b05');
  cx.fillStyle = gMap;
  cx.fillRect(0, 0, W, H);

  const proj = getD3Projection(camGeo);
  if (proj && typeof window.d3 !== 'undefined') {
    const path = window.d3.geoPath(proj, cx);

    // Graticole lat/lon reali
    cx.save();
    cx.strokeStyle = 'rgba(255, 224, 188, 0.14)';
    cx.lineWidth = 1;
    cx.beginPath();
    path(window.d3.geoGraticule10());
    cx.stroke();
    cx.restore();

    // Continenti reali in lat/lon
    cx.save();
    cx.beginPath();
    path(WORLD_GEOJSON);
    cx.fillStyle = 'rgba(246, 186, 130, 0.18)';
    cx.strokeStyle = 'rgba(255, 216, 174, 0.52)';
    cx.lineWidth = 1.5;
    cx.fill();
    cx.stroke();
    cx.restore();
  }

  // Solo hub attivi (che hanno almeno una tavola associata)
  const activeHubIds = new Set(items.map(it => it.hubId));
  const activeHubs = GEO_HUBS.filter(h => activeHubIds.has(h.id));

  cx.save();
  cx.font = 'italic 600 12.5px Fraunces, Georgia, serif';
  cx.textAlign = 'left';
  activeHubs.forEach(hub => {
    const p = geoToScreen(hub.lon, hub.lat);
    cx.fillStyle = '#ffbe7d';
    cx.beginPath();
    cx.arc(p.sx, p.sy, 3.5, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = 'rgba(255, 238, 218, 0.9)';
    cx.fillText(hub.label, p.sx + 7, p.sy + 4);
  });
  cx.restore();
  markDirty();
}
