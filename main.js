import {
  CONFIG, state, RM, ease, msg,
  markDirty, vis, parseCSV, applyBitmapToItem
} from './data.js';
import { geoToScreen, drawGeoMap } from './geo.js';
import { project3D, draw3DBackground } from './view3d.js';
import {
  focusCameraOnNode, closeSelection,
  show, initItemsSkeleton, finalizeLayoutFromLoaded, bindUI
} from './ui.js';

const $ = s => document.querySelector(s);
const cv = $('#cv');
const cx = cv.getContext('2d');
const wrap = $('#wrap');

const nearest = (i, k) => {
  const n = state.items.length;
  if (!state.Dm || state.Dm.length !== n * n) {
    return [...Array(n).keys()].filter(j => j !== i).slice(0, k);
  }
  return [...Array(n).keys()]
    .filter(j => j !== i)
    .sort((a, b) => state.Dm[i * n + a] - state.Dm[i * n + b])
    .slice(0, k);
};

const links = i => state.NC[i] || (state.NC[i] = nearest(i, 5));

function stopTour() {
  if (state.tour) {
    clearInterval(state.tour);
    state.tour = 0;
    $('#tr').textContent = '▶ Passeggiata guidata';
  }
}

function hop() {
  const n = state.items.length;
  if (!n) return;
  const cur = state.sel >= 0 ? state.sel : 0;
  state.seen.add(cur);
  let nx = state.sel < 0
    ? cur
    : nearest(cur, n - 1).find(j => !state.seen.has(j) && vis(state.items[j]) && state.items[j].ready);
  if (nx == null) {
    state.seen.clear();
    nx = nearest(cur, 1)[0];
  }
  show(nx);
}

function setViewMode(nextMode) {
  state.viewMode = nextMode;
  const is3D = nextMode === '3d';
  $('#vw-3d').classList.toggle('is-active', is3D);
  $('#vw-3d').setAttribute('aria-pressed', is3D);
  $('#vw-geo').classList.toggle('is-active', !is3D);
  $('#vw-geo').setAttribute('aria-pressed', !is3D);
  $('#rot-auto').hidden = !is3D;

  if (state.sel >= 0 && state.items[state.sel]) {
    focusCameraOnNode(state.items[state.sel]);
  }
  markDirty();
}

function pickNode(px, py) {
  const { projected2D, items, mode } = state;
  let bestIdx = -1;
  let bestZ = -Infinity;

  for (let idx = 0; idx < projected2D.length; idx++) {
    const p = projected2D[idx];
    if (!p || !vis(items[idx])) continue;
    const half = mode === 'thumb' ? p.size / 2 : 11;
    if (Math.abs(px - p.sx) <= half && Math.abs(py - p.sy) <= half) {
      if (p.zOrder >= bestZ) {
        bestZ = p.zOrder;
        bestIdx = idx;
      }
    }
  }
  return bestIdx;
}

function tip(h, px, py) {
  const t = $('#tip');
  if (h < 0) {
    t.style.display = 'none';
    return;
  }
  const it = state.items[h];
  t.textContent = `${it.r.id}${it.r.subject ? '\n' + it.r.subject : ''}\n${it.siteName} · ${it.cat}`;
  t.style.display = 'block';
  t.style.left = Math.min(px + 14, state.W - 250) + 'px';
  t.style.top = (py + 14) + 'px';
}

function render(t) {
  const { W, H, dpr, cam3D, camGeo, items, sel, hov, mode, viewMode, col } = state;

  if (state.autoRotate && !state.drag && !RM && sel < 0 && viewMode === '3d') {
    cam3D.yaw += 0.0022;
    markDirty();
  }
  if (state.targetCam3D) {
    cam3D.yaw += (state.targetCam3D.yaw - cam3D.yaw) * 0.12;
    cam3D.pitch += (state.targetCam3D.pitch - cam3D.pitch) * 0.12;
    cam3D.zoom += (state.targetCam3D.zoom - cam3D.zoom) * 0.12;
    cam3D.panX += (state.targetCam3D.panX - cam3D.panX) * 0.12;
    cam3D.panY += (state.targetCam3D.panY - cam3D.panY) * 0.12;
    if (
      Math.abs(state.targetCam3D.yaw - cam3D.yaw) < 0.0005 &&
      Math.abs(state.targetCam3D.zoom - cam3D.zoom) < 0.0005
    ) {
      state.targetCam3D = null;
    } else {
      markDirty();
    }
  }
  if (state.targetCamGeo) {
    camGeo.x += (state.targetCamGeo.x - camGeo.x) * 0.12;
    camGeo.y += (state.targetCamGeo.y - camGeo.y) * 0.12;
    camGeo.k += (state.targetCamGeo.k - camGeo.k) * 0.12;
    if (Math.abs(state.targetCamGeo.k - camGeo.k) < 0.0005) {
      state.targetCamGeo = null;
    } else {
      markDirty();
    }
  }

  cx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (viewMode === '3d') {
    draw3DBackground(cx, t);
  } else {
    drawGeoMap(cx);
  }

  if (sel >= 0) {
    cx.fillStyle = 'rgba(12, 4, 2, 0.34)';
    cx.fillRect(0, 0, W, H);
  }

  if (items.length) {
    const rm = RM ? 0 : 1;
    const baseThumb = viewMode === '3d'
      ? Math.min(104, Math.max(24, 38 * Math.sqrt(cam3D.zoom)))
      : Math.min(92, Math.max(32, 42 * Math.sqrt(camGeo.k)));

    state.projected2D = items.map((it, i) => {
      const animProgress = it.b == null ? 1 : (t - it.b) / 600;
      const a = animProgress >= 1 ? 1 : ease(animProgress);
      if (animProgress < 1) markDirty();

      const targetHs = (i === hov || i === sel) ? 1 : 0;
      const prevHs = it.hs || 0;
      it.hs = prevHs + (targetHs - prevHs) * 0.2;
      if (Math.abs(targetHs - it.hs) > 0.01) markDirty();

      let p;
      if (viewMode === '3d') {
        const fx_ = it.x + Math.cos(t * 0.0011 + i * 1.7) * 0.005 * rm;
        const fy_ = it.y + Math.sin(t * 0.0015 + i) * 0.006 * rm;
        p = project3D(fx_, fy_, it.z);
      } else {
        p = geoToScreen(it.lon, it.lat);
      }

      const focusBoost = i === sel ? 1.95 : 1.0;
      const size = baseThumb * p.scale * focusBoost * (1 + 0.32 * it.hs) * (0.55 + 0.45 * Math.min(1, a));
      return { ...p, a, size, idx: i };
    });

    cx.lineWidth = 1;
    cx.globalAlpha = sel >= 0 ? 0.08 : 0.2;
    items.forEach((a, i) => {
      if (!vis(a)) return;
      (state.NM[i] || []).forEach(j => {
        if (!items[j] || !vis(items[j])) return;
        cx.beginPath();
        cx.moveTo(state.projected2D[i].sx, state.projected2D[i].sy);
        cx.lineTo(state.projected2D[j].sx, state.projected2D[j].sy);
        cx.strokeStyle = col[a.cat];
        cx.stroke();
      });
    });
    cx.globalAlpha = 1;

    cx.lineWidth = 2;
    cx.setLineDash([6, 8]);
    cx.lineDashOffset = -t * 0.04;
    cx.strokeStyle = '#ffe2bd';
    [hov, sel].forEach(k => {
      if (k < 0 || !state.Dm) return;
      cx.globalAlpha = k === sel ? 0.85 : 0.6;
      links(k).forEach(j => {
        cx.beginPath();
        cx.moveTo(state.projected2D[k].sx, state.projected2D[k].sy);
        cx.lineTo(state.projected2D[j].sx, state.projected2D[j].sy);
        cx.stroke();
      });
    });
    cx.setLineDash([]);
    cx.globalAlpha = 1;

    const drawOrder = [...state.projected2D].sort((a, b) => b.zOrder - a.zOrder);

    const drawNode = (o, big) => {
      const i = o.idx;
      const it = items[i];
      const c = col[it.cat];
      const focusFade = (sel >= 0 && !big) ? 0.34 : 1.0;
      const depthAlpha = (viewMode === '3d' ? Math.max(0.35, Math.min(1, o.scale * 0.92)) : 1.0) * focusFade;

      if (!vis(it)) {
        cx.globalAlpha = 0.2 * depthAlpha;
        cx.beginPath();
        cx.arc(o.sx, o.sy, 3 * o.scale, 0, Math.PI * 2);
        cx.fillStyle = c;
        cx.fill();
        cx.globalAlpha = 1;
        return;
      }

      if (!it.ready || mode !== 'thumb') {
        cx.save();
        cx.globalAlpha = depthAlpha;
        cx.beginPath();
        cx.arc(o.sx, o.sy, (big ? 11 : 6.5) * o.scale * (1 + 0.4 * it.hs), 0, Math.PI * 2);
        cx.fillStyle = c;
        cx.fill();
        if (big) {
          cx.lineWidth = 2.5;
          cx.strokeStyle = '#f4efe3';
          cx.stroke();
        }
        cx.restore();
        return;
      }

      const s = o.size;
      const p = s * 0.07;
      cx.save();
      cx.globalAlpha = Math.min(1, o.a * 1.4) * depthAlpha;
      cx.translate(o.sx, o.sy);
      cx.rotate(big ? 0 : (((i * 37 % 11) - 5) * 0.012 + Math.sin(t * 0.0009 + i) * 0.015 * rm));

      cx.drawImage(it.polaroid, -s / 2 - p, -s / 2 - p, s + 2 * p, s + p * 3.4);

      if (big || hov === i) {
        cx.lineWidth = big ? 3 : 2;
        cx.strokeStyle = big ? '#ee9a5b' : c;
        cx.strokeRect(-s / 2 - p, -s / 2 - p, s + 2 * p, s + p * 3.4);
      }
      cx.restore();
    };

    drawOrder.forEach(o => {
      if (o.idx !== sel && o.idx !== hov) drawNode(o, false);
    });
    if (hov >= 0 && hov !== sel && state.projected2D[hov]) drawNode(state.projected2D[hov], false);
    if (sel >= 0 && state.projected2D[sel]) drawNode(state.projected2D[sel], true);
  }

  state.fx = state.fx.filter(f => t - f.t0 < 1100);
  if (state.fx.length) markDirty();
  state.fx.forEach(f => {
    const p = (t - f.t0) / 1100;
    const pr = viewMode === '3d' ? project3D(f.it.x, f.it.y, f.it.z) : geoToScreen(f.it.lon, f.it.lat);
    cx.globalAlpha = 1 - p;
    cx.strokeStyle = f.c;
    cx.fillStyle = f.c;
    cx.lineWidth = 2;
    cx.beginPath();
    cx.arc(pr.sx, pr.sy, 10 + p * 130 * pr.scale, 0, Math.PI * 2);
    cx.stroke();
    f.sp.forEach(sp => {
      const d = sp.v * p * (2 - p) * pr.scale;
      cx.beginPath();
      cx.arc(pr.sx + Math.cos(sp.a) * d, pr.sy + Math.sin(sp.a) * d, 2.5 * (1 - p) + 0.5, 0, Math.PI * 2);
      cx.fill();
    });
  });
  cx.globalAlpha = 1;
}

cv.addEventListener('pointerdown', e => {
  state.targetCam3D = null;
  state.targetCamGeo = null;
  stopTour();
  cv.setPointerCapture(e.pointerId);
  state.drag = {
    x: e.clientX, y: e.clientY,
    yaw: state.cam3D.yaw, pitch: state.cam3D.pitch,
    panX: state.cam3D.panX, panY: state.cam3D.panY,
    geoX: state.camGeo.x, geoY: state.camGeo.y,
    shift: e.shiftKey || e.button === 2,
    moved: false
  };
  markDirty();
});

cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect();
  const px = e.clientX - r.left;
  const py = e.clientY - r.top;
  state.mx = px;
  state.my = py;

  if (state.drag) {
    const dx = e.clientX - state.drag.x;
    const dy = e.clientY - state.drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) state.drag.moved = true;
    if (state.drag.moved) {
      if (state.viewMode === 'geo') {
        state.camGeo.x = state.drag.geoX + dx;
        state.camGeo.y = state.drag.geoY + dy;
      } else if (state.drag.shift) {
        state.cam3D.panX = state.drag.panX + dx;
        state.cam3D.panY = state.drag.panY + dy;
      } else {
        state.autoRotate = false;
        $('#rot-auto').setAttribute('aria-pressed', 'false');
        $('#rot-auto').textContent = '↻ Rotazione 3D: OFF';
        state.cam3D.yaw = state.drag.yaw + dx * 0.0065;
        state.cam3D.pitch = Math.max(-1.35, Math.min(1.35, state.drag.pitch + dy * 0.0065));
      }
      markDirty();
      return;
    }
  }

  const h = pickNode(px, py);
  if (h !== state.hov) {
    state.hov = h;
    markDirty();
  }
  tip(h, px, py);
  cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
});

cv.addEventListener('pointerup', e => {
  const was = state.drag;
  state.drag = null;
  if (was && !was.moved) {
    const r = cv.getBoundingClientRect();
    const h = pickNode(e.clientX - r.left, e.clientY - r.top);
    if (h >= 0) show(h);
    else if (state.sel >= 0) closeSelection();
  }
  markDirty();
});

cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerleave', () => {
  state.hov = -1;
  state.mx = -999;
  tip(-1);
  markDirty();
});

cv.addEventListener('wheel', e => {
  e.preventDefault();
  state.targetCam3D = null;
  state.targetCamGeo = null;
  const f = e.deltaY < 0 ? 1.12 : 0.89;
  if (state.viewMode === '3d') {
    state.cam3D.zoom = Math.min(4.8, Math.max(0.45, state.cam3D.zoom * f));
  } else {
    const r = cv.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const nk = Math.min(5.5, Math.max(0.6, state.camGeo.k * f));
    const ratio = nk / state.camGeo.k;
    state.camGeo.x = px - state.W / 2 - (px - state.W / 2 - state.camGeo.x) * ratio;
    state.camGeo.y = py - state.H / 2 - (py - state.H / 2 - state.camGeo.y) * ratio;
    state.camGeo.k = nk;
  }
  markDirty();
}, { passive: false });

function syncCanvasSize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.W = wrap.clientWidth || window.innerWidth || 800;
  state.H = wrap.clientHeight || window.innerHeight || 600;
  cv.width = Math.max(1, Math.round(state.W * state.dpr));
  cv.height = Math.max(1, Math.round(state.H * state.dpr));
  markDirty();
}
syncCanvasSize();
new ResizeObserver(syncCanvasSize).observe(wrap);

(function loop(t) {
  const now = t || 0;
  if (state.dirty || state.autoRotate || state.targetCam3D || state.targetCamGeo || state.fx.length) {
    state.dirty = false;
    render(now);
  }
  requestAnimationFrame(loop);
})(0);

async function loadRowsWithLoader(rows, resolver) {
  initItemsSkeleton(rows);
  let miss = 0;
  let done = 0;
  const queue = rows.map((_, i) => i);

  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      try {
        const bm = await resolver(rows[i], i);
        if (!bm) throw new Error('missing');
        await applyBitmapToItem(state.items[i], bm, i);
      } catch (_) {
        miss++;
      }
      done++;
      msg(done < rows.length ? `Caricamento… ${done}/${rows.length}` : `${rows.length - miss} tavole pronte`);
    }
  }

  await Promise.all(Array.from({ length: CONFIG.concurrency }, worker));
  if (miss) $('#wn').textContent = miss + ' righe senza immagine corrispondente.';
  await finalizeLayoutFromLoaded();
}

async function autoload() {
  try {
    msg('Carico indice…');
    const res = await fetch(CONFIG.csv, { cache: 'default' });
    if (!res.ok) throw new Error('csv');
    const rows = parseCSV(await res.text());
    if (!rows.length) throw new Error('vuoto');
    $('#dati-acc').hidden = true;

    await loadRowsWithLoader(rows, async row => {
      const f = (row.filename || '').trim();
      if (!f) return null;
      const url = CONFIG.images + f.split('/').map(encodeURIComponent).join('/');
      const rs = await fetch(url, { cache: 'force-cache' });
      if (!rs.ok) return null;
      return createImageBitmap(await rs.blob());
    });
  } catch (_) {
    $('#cat-dropdown').open = true;
    $('#dati-acc').open = true;
    msg('Apri su GitHub Pages / Live Server oppure carica i file / Dati esempio qui sotto.');
  }
}

bindUI({ setViewMode, stopTour, hop });

$('#go').onclick = async () => {
  if (state.busy) return;
  state.busy = true;
  const imgs = [...$('#fi').files];
  const csv = $('#fc').files[0];
  $('#wn').textContent = '';
  if (!imgs.length) {
    state.busy = false;
    return msg('Seleziona prima le immagini.');
  }
  const map = new Map(imgs.map(f => [f.name.toLowerCase(), f]));
  const rows = csv
    ? parseCSV(await csv.text())
    : imgs.map(f => ({ id: f.name.replace(/\.[^.]+$/, ''), filename: f.name }));

  await loadRowsWithLoader(rows, async row => {
    const f = map.get((row.filename || '').toLowerCase());
    return f ? createImageBitmap(f) : null;
  });
  state.busy = false;
};

$('#ex').onclick = async () => {
  if (state.busy) return;
  state.busy = true;
  const rows = [];
  const C = ['Archaeopteryx', 'Pettirossi', 'Grilli'];
  for (let i = 0; i < 36; i++) {
    const k = i % 3;
    const id = 'IMG_' + String(i + 1).padStart(4, '0');
    const subject = k === 0
      ? 'Archaeopteryx lithographica'
      : k === 1
        ? 'Pettirosso (Erithacus rubecula)'
        : 'Grillo delle Hawaii (Teleogryllus oceanicus)';
    rows.push({ id, filename: id + '.jpg', subject, category: C[k] });
  }

  await loadRowsWithLoader(rows, async (_, i) => {
    const k = i % 3;
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    const h = [30, 14, 95][k] + Math.random() * 14;
    g.fillStyle = `hsl(${h} 45% ${32 + Math.random() * 22}%)`;
    g.fillRect(0, 0, 96, 96);
    g.fillStyle = `hsl(${h + 20} 65% 72%)`;
    g.beginPath();
    g.arc(48, 48, 16 + Math.random() * 14, 0, Math.PI * 2);
    g.fill();
    return createImageBitmap(c);
  });
  state.busy = false;
};

autoload();
