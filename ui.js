/* ui.js — Interfaccia, scheda 2D su selezione, controlli e loop on-demand */
import {
  CONFIG, state, parseCSV, initSkeleton, processLoadedBitmaps,
  invalidateVisCache, isVisible, nearestIndices
} from './data.js';
import { assignGeoHub } from './geo.js';
import { cam3D, viewState, setCanvasMetrics, renderScene, pickNode } from './view3d.js';

const $ = s => document.querySelector(s);
const cv = $('#cv'), cx = cv.getContext('2d'), wrap = $('#wrap');

let drag = null, tour = 0, seen = new Set(), busy = false;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const msg = t => { $('#st').textContent = t; };

function updateVisibleBadge() {
  let count = 0;
  for (let i = 0; i < state.items.length; i++) if (isVisible(i)) count++;
  $('#vis-count').textContent = count;
}

function buildCategoryChips() {
  const chips = $('#chips');
  chips.innerHTML = '';
  const cats = Object.keys(state.col);
  cats.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    const k = state.items.filter(i => i.cat === c).length;
    b.textContent = `${c} (${k})`;
    b.style.setProperty('--c', state.col[c]);
    b.setAttribute('aria-pressed', 'true');
    b.onclick = () => {
      state.on.has(c) ? state.on.delete(c) : state.on.add(c);
      b.setAttribute('aria-pressed', state.on.has(c));
      invalidateVisCache();
      updateVisibleBadge();
      viewState.needsDraw = true;
    };
    chips.appendChild(b);
  });
  updateVisibleBadge();
}

/* Passaggio a vista 2D SOLO quando viene visualizzata un'immagine */
function openImage2D(i) {
  const it = state.items[i];
  if (!it || !it.ready) return;
  viewState.selected = i;
  viewState.is2DInspect = true;
  stopTour();
  hideTip();

  const c = $('#big'), g = c.getContext('2d');
  const pol = it.polaroid;
  const s = Math.min(c.width / pol.width, c.height / pol.height);
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(pol, (c.width - pol.width * s) / 2, (c.height - pol.height * s) / 2, pol.width * s, pol.height * s);

  $('#det-title').textContent = it.r.subject || it.r.id;
  const entries = Object.entries(it.r).filter(([k, v]) => v && k !== 'subject');
  entries.push(['località', it.inferredPlace ? `${it.siteName} (inferito)` : it.siteName]);

  $('#dl').innerHTML = entries.map(([k, v]) => {
    if (k === 'source' && v.startsWith('http')) {
      let host = v;
      try { host = new URL(v).hostname + ' ↗'; } catch (e) {}
      return `<dt>${esc(k)}</dt><dd><a href="${esc(v)}" target="_blank" rel="noopener">${esc(host)}</a></dd>`;
    }
    return `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
  }).join('');

  const n = state.items.length, nb = $('#nb');
  nb.innerHTML = '';
  nearestIndices(i, 5).forEach(j => {
    const b = document.createElement('button');
    b.type = 'button';
    const k = document.createElement('canvas');
    k.width = k.height = 64;
    k.getContext('2d').drawImage(state.items[j].polaroid, 0, 0, 64, 64);
    b.appendChild(k);
    b.title = state.items[j].r.id + (state.items[j].r.subject ? ' — ' + state.items[j].r.subject : '');
    b.onclick = () => openImage2D(j);
    nb.appendChild(b);
  });

  $('#detail-drawer').classList.add('is-open');
  $('#detail-drawer').setAttribute('aria-hidden', 'false');
  $('.brand-badge').classList.add('is-hidden');
}

function exit2DInspect() {
  viewState.is2DInspect = false;
  viewState.selected = -1;
  $('#detail-drawer').classList.remove('is-open');
  $('#detail-drawer').setAttribute('aria-hidden', 'true');
  $('.brand-badge').classList.remove('is-hidden');
  cv.style.cursor = 'grab';
  viewState.needsDraw = true;
}

function hideTip() {
  $('#tip').style.display = 'none';
}

function showTip(h, px, py) {
  const t = $('#tip');
  if (h < 0 || viewState.is2DInspect) { hideTip(); return; }
  const it = state.items[h];
  t.textContent = `${it.r.id}${it.r.subject ? '\n' + it.r.subject : ''}\n${it.siteName} · ${it.cat}`;
  t.style.display = 'block';
  t.style.left = Math.min(px + 14, wrap.clientWidth - 250) + 'px';
  t.style.top = (py + 14) + 'px';
}

/* Eventi UI */
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
  viewState.needsDraw = true;
};

$('#close-det').onclick = () => exit2DInspect();

$('#vw-3d').onclick = () => {
  if (viewState.is2DInspect) exit2DInspect();
  viewState.viewMode = '3d';
  $('#vw-3d').classList.add('is-active');
  $('#vw-3d').setAttribute('aria-pressed', 'true');
  $('#vw-geo').classList.remove('is-active');
  $('#vw-geo').setAttribute('aria-pressed', 'false');
  cam3D.yaw = 0.35;
  cam3D.pitch = 0.18;
  viewState.needsDraw = true;
};

$('#vw-geo').onclick = () => {
  if (viewState.is2DInspect) exit2DInspect();
  viewState.viewMode = 'geo';
  $('#vw-geo').classList.add('is-active');
  $('#vw-geo').setAttribute('aria-pressed', 'true');
  $('#vw-3d').classList.remove('is-active');
  $('#vw-3d').setAttribute('aria-pressed', 'false');
  cam3D.yaw = 0;
  cam3D.pitch = 0;
  viewState.needsDraw = true;
};

cv.addEventListener('pointerdown', e => {
  if (viewState.is2DInspect) return;
  stopTour();
  cv.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, yaw: cam3D.yaw, pitch: cam3D.pitch, moved: false };
});

cv.addEventListener('pointermove', e => {
  if (viewState.is2DInspect) return;
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) {
      cam3D.yaw = drag.yaw + dx * 0.0065;
      cam3D.pitch = Math.max(-1.25, Math.min(1.25, drag.pitch + dy * 0.0065));
      viewState.needsDraw = true;
      return;
    }
  }
  const h = pickNode(px, py);
  if (h !== viewState.hovered) {
    viewState.hovered = h;
    viewState.needsDraw = true;
  }
  showTip(h, px, py);
  cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
});

cv.addEventListener('pointerup', e => {
  if (viewState.is2DInspect) return;
  const was = drag; drag = null;
  if (was && !was.moved) {
    const r = cv.getBoundingClientRect();
    const h = pickNode(e.clientX - r.left, e.clientY - r.top);
    if (h >= 0) openImage2D(h);
  }
});
cv.addEventListener('pointerleave', () => {
  if (viewState.hovered !== -1) {
    viewState.hovered = -1;
    viewState.needsDraw = true;
  }
  hideTip();
});
cv.addEventListener('wheel', e => {
  if (viewState.is2DInspect) return;
  e.preventDefault();
  const f = e.deltaY < 0 ? 0.88 : 1.14;
  cam3D.dist = Math.min(2400, Math.max(480, cam3D.dist * f));
  viewState.needsDraw = true;
}, { passive: false });

$('#zi').onclick = () => { cam3D.dist = Math.max(480, cam3D.dist * 0.82); viewState.needsDraw = true; };
$('#zo').onclick = () => { cam3D.dist = Math.min(2400, cam3D.dist * 1.22); viewState.needsDraw = true; };
$('#zr').onclick = () => {
  if (viewState.is2DInspect) exit2DInspect();
  cam3D.yaw = viewState.viewMode === '3d' ? 0.35 : 0;
  cam3D.pitch = viewState.viewMode === '3d' ? 0.18 : 0;
  cam3D.dist = 1150;
  viewState.needsDraw = true;
};

$('#q').oninput = e => {
  state.query = e.target.value.trim().toLowerCase();
  invalidateVisCache();
  updateVisibleBadge();
  viewState.needsDraw = true;
};

$('#md').onclick = e => {
  viewState.mode = viewState.mode === 'thumb' ? 'dot' : 'thumb';
  e.target.textContent = viewState.mode === 'thumb' ? '✦ Solo punti luminosi' : '🖼 Mostra miniature';
  viewState.needsDraw = true;
};

$('#cp').onclick = () => {
  if (!state.items.length) return msg('Carica prima i dati.');
  const t = 'id,filename,category,site,lon,lat,x,y,z\n' + state.items.map(i => [
    i.r.id, i.r.filename || '', i.cat, i.siteName, i.lon.toFixed(3), i.lat.toFixed(3),
    i.x.toFixed(4), i.y.toFixed(4), i.z.toFixed(4)
  ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  const o = $('#out'); o.value = t;
  const ok = () => msg('Coordinate copiate.'), fb = () => { o.hidden = false; o.select(); msg('Copia il testo qui sotto.'); };
  try { navigator.clipboard.writeText(t).then(ok, fb); } catch (e) { fb(); }
};

function stopTour() {
  if (tour) { clearInterval(tour); tour = 0; $('#tr').textContent = '▶ Passeggiata guidata'; }
}
function hop() {
  const n = state.items.length; if (!n) return;
  const cur = viewState.selected >= 0 ? viewState.selected : 0;
  seen.add(cur);
  let nx = viewState.selected < 0
    ? cur
    : nearestIndices(cur, n - 1).find(j => !seen.has(j) && isVisible(j) && state.items[j].ready);
  if (nx == null) { seen.clear(); nx = nearestIndices(cur, 1)[0]; }
  openImage2D(nx);
}
$('#tr').onclick = () => {
  if (tour) return stopTour();
  if (!state.items.length) return msg('Carica prima i dati.');
  seen = new Set(); $('#tr').textContent = '⏹ Ferma passeggiata'; hop(); tour = setInterval(hop, 3200);
};

/* Loop principale: gira in 3D solo quando non è aperta la vista 2D */
function tick() {
  if (!viewState.is2DInspect) {
    if (cam3D.autoRotate && !drag && viewState.hovered < 0 && viewState.viewMode === '3d') {
      cam3D.yaw += 0.003;
      viewState.needsDraw = true;
    }
    if (viewState.needsDraw) {
      viewState.needsDraw = false;
      renderScene(cx);
    }
  }
  requestAnimationFrame(tick);
}

new ResizeObserver(() => {
  setCanvasMetrics(cv, wrap);
}).observe(wrap);

requestAnimationFrame(tick);

/* Caricamento dati */
async function autoload() {
  try {
    msg('Carico indice…');
    const res = await fetch(CONFIG.csv, { cache: 'default' });
    if (!res.ok) throw new Error('csv');
    const rows = parseCSV(await res.text());
    if (!rows.length) throw new Error('vuoto');

    initSkeleton(rows, assignGeoHub);
    buildCategoryChips();
    $('#dati-acc').open = false;

    const bitmaps = new Map();
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
          bitmaps.set(i, await createImageBitmap(await rs.blob()));
        } catch (e) {
          miss++;
        }
        done++;
        msg(done < rows.length ? `Caricamento… ${done}/${rows.length}` : `${rows.length - miss} tavole pronte`);
      }
    }

    await Promise.all(Array.from({ length: CONFIG.concurrency }, work));
    if (miss) $('#wn').textContent = miss + ' righe senza immagine corrispondente.';
    await processLoadedBitmaps(bitmaps, (it, T) => {
      msg(it < T ? `Organizzo lo spazio 3D… ${Math.round(it / T * 100)}%` : `${state.items.length} tavole in 3D`);
    });
    buildCategoryChips();
    viewState.needsDraw = true;
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

  initSkeleton(rows, assignGeoHub);
  buildCategoryChips();
  const bitmaps = new Map();
  let miss = 0;
  await Promise.all(rows.map(async (r, i) => {
    const f = map.get((r.filename || '').toLowerCase());
    if (!f) { miss++; return; }
    try { bitmaps.set(i, await createImageBitmap(f)); } catch (e) { miss++; }
  }));
  if (miss) $('#wn').textContent = miss + ' righe senza file corrispondente.';
  await processLoadedBitmaps(bitmaps, () => {});
  buildCategoryChips();
  viewState.needsDraw = true;
  busy = false;
};

$('#ex').onclick = async () => {
  if (busy) return;
  busy = true;
  const rows = [], C = ['Archaeopteryx', 'Pettirossi', 'Grilli'];
  for (let i = 0; i < 36; i++) {
    const k = i % 3;
    const id = 'IMG_' + String(i + 1).padStart(4, '0');
    rows.push({
      id,
      filename: id + '.jpg',
      subject: k === 0 ? 'Archaeopteryx lithographica' : k === 1 ? 'Pettirosso (Erithacus rubecula)' : 'Grillo delle Hawaii (Teleogryllus oceanicus)',
      category: C[k]
    });
  }
  initSkeleton(rows, assignGeoHub);
  buildCategoryChips();
  const bitmaps = new Map();
  for (let i = 0; i < 36; i++) {
    const k = i % 3, c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d'), h = [28, 12, 130][k] + Math.random() * 14;
    g.fillStyle = `hsl(${h} 45% ${32 + Math.random() * 25}%)`; g.fillRect(0, 0, 96, 96);
    g.fillStyle = `hsl(${h + 25} 65% 75%)`;
    g.beginPath(); g.arc(48, 48, 16 + Math.random() * 14, 0, 7); g.fill();
    bitmaps.set(i, await createImageBitmap(c));
  }
  await processLoadedBitmaps(bitmaps, () => {});
  buildCategoryChips();
  viewState.needsDraw = true;
  busy = false;
};

autoload();

/* Navigazione da tastiera: Esc chiude la scheda 2D, Frecce scorrono le tavole affini */
window.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (!viewState.is2DInspect) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    exit2DInspect();
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    const cur = viewState.selected;
    if (cur >= 0) {
      const affini = nearestIndices(cur, state.items.length - 1).filter(j => isVisible(j) && state.items[j].ready);
      if (affini.length) openImage2D(affini[0]);
    }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    const cur = viewState.selected;
    if (cur >= 0) {
      const affini = nearestIndices(cur, state.items.length - 1).filter(j => isVisible(j) && state.items[j].ready);
      if (affini.length) openImage2D(affini[affini.length - 1]);
    }
  }
});
