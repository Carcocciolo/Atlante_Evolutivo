import { state, esc, msg, markDirty, invalidateVisCache, vis, getDisplayNotes, applyBitmapToItem, feat, prep, tsne3D, parseCSV, CONFIG, CAT_COLORS, PAL } from './data.js';
import { assignGeoHub, geoToScreen } from './geo.js';
import { project3DWithCam } from './view3d.js';

const $ = s => document.querySelector(s);

export function updateVisibleBadge() {
  const count = state.items.filter(vis).length;
  const el = $('#vis-count');
  if (el) el.textContent = count;
}

export function focusCameraOnNode(it) {
  const { W, H, viewMode } = state;
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

    state.targetCam3D = {
      yaw: targetYaw,
      pitch: targetPitch,
      zoom: targetZoom,
      panX: desiredScreenX - probe.sx,
      panY: desiredScreenY - probe.sy
    };
  } else {
    const targetK = 2.6;
    const probe = geoToScreen(it.lon, it.lat, { x: 0, y: 0, k: targetK });
    state.targetCamGeo = {
      x: desiredScreenX - probe.sx,
      y: desiredScreenY - probe.sy,
      k: targetK
    };
  }
  markDirty();
}

export function closeSelection() {
  state.sel = -1;
  $('#detail-drawer').classList.remove('is-open');
  $('#detail-drawer').setAttribute('aria-hidden', 'true');
  $('.brand-badge').classList.remove('is-hidden');
  state.targetCam3D = null;
  state.targetCamGeo = null;
  markDirty();
}

export function boom(it, c) {
  state.fx.push({
    it,
    c,
    t0: performance.now(),
    sp: Array.from({ length: 14 }, (_, k) => ({
      a: k / 14 * 6.283 + Math.random() * 0.3,
      v: 55 + Math.random() * 75
    }))
  });
  markDirty();
}

export function show(i) {
  const it = state.items[i];
  if (!it || !it.ready) return;
  state.sel = i;

  const c = $('#big');
  const g = c.getContext('2d');
  const th = it.th;
  const s = Math.min(c.width / th.width, c.height / th.height);
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(th, (c.width - th.width * s) / 2, (c.height - th.height * s) / 2, th.width * s, th.height * s);

  $('#det-title').textContent = it.r.subject || it.r.id;

  const entries = Object.entries(it.r).filter(([k, v]) => v && k !== 'subject' && k !== 'notes');
  entries.push(['località', it.siteName]);
  entries.push(['stato geo', it.geoStatus]);
  const notesText = getDisplayNotes(it.r, it.siteName, it.geoStatus);
  if (notesText) entries.push(['note', notesText]);

  $('#dl').innerHTML = entries.map(([k, v]) => {
    if (k === 'source' && String(v).startsWith('http')) {
      let host = v;
      try { host = new URL(v).hostname + ' ↗'; } catch (_) {}
      return `<dt>${esc(k)}</dt><dd><a href="${esc(v)}" target="_blank" rel="noopener">${esc(host)}</a></dd>`;
    }
    return `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
  }).join('');

  const n = state.items.length;
  const nb = $('#nb');
  nb.innerHTML = '';
  if (state.Dm && state.Dm.length === n * n) {
    [...Array(n).keys()]
      .filter(j => j !== i && state.items[j].ready)
      .sort((a, b) => state.Dm[i * n + a] - state.Dm[i * n + b])
      .slice(0, 5)
      .forEach(j => {
        const b = document.createElement('button');
        b.type = 'button';
        const k = document.createElement('canvas');
        k.width = k.height = 64;
        k.getContext('2d').drawImage(state.items[j].th, 0, 0, 64, 64);
        b.appendChild(k);
        b.title = state.items[j].r.id + (state.items[j].r.subject ? ' — ' + state.items[j].r.subject : '');
        b.onclick = () => show(j);
        nb.appendChild(b);
      });
  }

  $('#detail-drawer').classList.add('is-open');
  $('#detail-drawer').setAttribute('aria-hidden', 'false');
  $('.brand-badge').classList.add('is-hidden');

  if (state.viewMode === '3d') {
    state.autoRotate = false;
    $('#rot-auto').setAttribute('aria-pressed', 'false');
    $('#rot-auto').textContent = '↻ Rotazione 3D: OFF';
  }
  focusCameraOnNode(it);
  boom(it, state.col[it.cat]);
}

export function initItemsSkeleton(rows) {
  state.items = rows.map((r, i) => {
    const cat = (r.category && r.category.trim()) ? r.category.trim() : 'da classificare';
    const geo = assignGeoHub(r, i);
    const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(1, rows.length));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    return {
      r,
      th: null,
      polaroid: null,
      ready: false,
      cat,
      x: Math.cos(theta) * Math.sin(phi) * 0.78,
      y: Math.cos(phi) * 0.78,
      z: Math.sin(theta) * Math.sin(phi) * 0.78,
      lon: geo.lon,
      lat: geo.lat,
      hubId: geo.hubId,
      siteName: geo.siteName,
      geoStatus: geo.geoStatus,
      b: performance.now() + i * 10
    };
  });

  const cats = [...new Set(state.items.map(i => i.cat))];
  state.col = {};
  cats.forEach((c, i) => {
    state.col[c] = CAT_COLORS[c] || PAL[i % PAL.length];
  });
  state.on = new Set(cats);
  invalidateVisCache();

  $('#chips').innerHTML = '';
  cats.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    const k = state.items.filter(i => i.cat === c).length;
    b.textContent = c + ' (' + k + ')';
    b.style.setProperty('--c', state.col[c]);
    b.setAttribute('aria-pressed', 'true');
    b.onclick = () => {
      state.on.has(c) ? state.on.delete(c) : state.on.add(c);
      b.setAttribute('aria-pressed', state.on.has(c));
      invalidateVisCache();
      updateVisibleBadge();
    };
    $('#chips').appendChild(b);
  });
  updateVisibleBadge();
}

export async function finalizeLayoutFromLoaded() {
  const loadedIndices = state.items.map((it, idx) => it.ready ? idx : -1).filter(idx => idx >= 0);
  if (loadedIndices.length < 2) return;

  state.items = loadedIndices.map(idx => state.items[idx]);
  invalidateVisCache();
  updateVisibleBadge();

  const F = prep(state.items.map(i => feat(i.th)));
  await tsne3D(F);

  const n = state.items.length;
  state.NC = {};
  state.NM = state.items.map((a, i) =>
    state.items
      .map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2])
      .filter(o => o[0] !== i)
      .sort((p, r) => p[1] - r[1])
      .slice(0, 2)
      .map(o => o[0])
  );
  if (state.Dm && state.Dm.length === n * n) {
    state.NC = {};
  }
  markDirty();
}

export function bindUI(handlers) {
  $('#btn-settings').onclick = () => {
    const pop = $('#view-settings-popover');
    const isHidden = pop.hidden;
    pop.hidden = !isHidden;
    $('#btn-settings').setAttribute('aria-expanded', isHidden);
  };

  $('#close-det').onclick = () => closeSelection();

  $('#vw-3d').onclick = () => handlers.setViewMode('3d');
  $('#vw-geo').onclick = () => handlers.setViewMode('geo');

  $('#zi').onclick = () => {
    if (state.viewMode === '3d') {
      state.targetCam3D = null;
      state.cam3D.zoom = Math.min(4.8, state.cam3D.zoom * 1.25);
    } else {
      state.targetCamGeo = null;
      state.camGeo.k = Math.min(5.5, state.camGeo.k * 1.25);
    }
    markDirty();
  };

  $('#zo').onclick = () => {
    if (state.viewMode === '3d') {
      state.targetCam3D = null;
      state.cam3D.zoom = Math.max(0.45, state.cam3D.zoom * 0.8);
    } else {
      state.targetCamGeo = null;
      state.camGeo.k = Math.max(0.6, state.camGeo.k * 0.8);
    }
    markDirty();
  };

  $('#zr').onclick = () => {
    closeSelection();
    if (state.viewMode === '3d') {
      state.targetCam3D = { yaw: 0.35, pitch: 0.18, zoom: 1.0, panX: 0, panY: 0 };
    } else {
      state.targetCamGeo = { x: 0, y: 0, k: 1.0 };
    }
    markDirty();
  };

  $('#rot-auto').onclick = e => {
    state.autoRotate = !state.autoRotate;
    e.target.setAttribute('aria-pressed', state.autoRotate);
    e.target.textContent = state.autoRotate ? '↻ Rotazione 3D: ON' : '↻ Rotazione 3D: OFF';
    markDirty();
  };

  $('#q').oninput = e => {
    state.q = e.target.value.trim().toLowerCase();
    invalidateVisCache();
    updateVisibleBadge();
  };

  $('#md').onclick = e => {
    state.mode = state.mode === 'thumb' ? 'dot' : 'thumb';
    e.target.textContent = state.mode === 'thumb' ? '✦ Solo punti luminosi' : '🖼 Mostra miniature';
    markDirty();
  };

  $('#cp').onclick = () => {
    if (!state.items.length) return msg('Carica prima i dati.');
    const t = 'id,filename,category,site,geo_status,lon,lat,x3d,y3d,z3d
' + state.items.map(i => [
      i.r.id, i.r.filename || '', i.cat, i.siteName, i.geoStatus,
      i.lon.toFixed(4), i.lat.toFixed(4),
      i.x.toFixed(4), i.y.toFixed(4), i.z.toFixed(4)
    ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('
');
    const o = $('#out');
    o.value = t;
    const ok = () => msg('Coordinate copiate.');
    const fb = () => { o.hidden = false; o.select(); msg('Copia il testo qui sotto.'); };
    try { navigator.clipboard.writeText(t).then(ok, fb); } catch (_) { fb(); }
  };

  $('#tr').onclick = () => {
    if (state.tour) return handlers.stopTour();
    if (!state.items.length) return msg('Carica prima i dati.');
    state.seen = new Set();
    $('#tr').textContent = '⏹ Ferma passeggiata';
    handlers.hop();
    state.tour = setInterval(handlers.hop, 3200);
  };
}
