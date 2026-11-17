/* ============================================================
   ui.js — pannelli, scheda della tavola, filtri, dock,
   menu impostazioni e scorciatoie da tastiera
   ============================================================ */
import { state, esc, msg, markDirty, refreshVis, getNotes, CAT_COLORS, PAL } from './data.js';
import { assignGeoHub, assignHubRanks } from './geo.js';
import { focusOn, releaseFocus, zoomBy, resetView } from './camera.js';
import { playClick, playSelect, playSwitch, syncMusic, unlockAudio } from './audio.js';

const $ = (s, root = document) => root.querySelector(s);
const body = document.body;

const PREFS_KEY = 'atlante:prefs:v11';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (typeof p.soundEnabled === 'boolean') state.soundEnabled = p.soundEnabled;
    if (typeof p.musicEnabled === 'boolean') state.musicEnabled = p.musicEnabled;
    if (typeof p.ecoMode === 'boolean') state.ecoMode = p.ecoMode;
  } catch (_) {}
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      soundEnabled: state.soundEnabled,
      musicEnabled: state.musicEnabled,
      ecoMode: state.ecoMode
    }));
  } catch (_) {}
}

export function applyEcoMode(on, notify = false) {
  state.ecoMode = !!on;
  body.classList.toggle('is-eco', state.ecoMode);
  const el = $('#opt-eco');
  if (el) el.checked = state.ecoMode;
  if (state.ecoMode && state.autoRotate) {
    setAutoRotate(false, false);
  } else if (!state.ecoMode && state.autoRotatePref && state.sel < 0 && state.viewMode === '3d') {
    setAutoRotate(true, false);
  }
  savePrefs();
  markDirty();
  if (notify) {
    msg(state.ecoMode ? 'Risparmio energetico attivato' : 'Risparmio energetico disattivato', 1800);
  }
}

export function syncSettingsUI() {
  const sEl = $('#opt-sound');
  const mEl = $('#opt-music');
  const eEl = $('#opt-eco');
  if (sEl) sEl.checked = state.soundEnabled;
  if (mEl) mEl.checked = state.musicEnabled;
  if (eEl) eEl.checked = state.ecoMode;
}

/* ---------- caricamento / pannello dati / contatti / impostazioni ---------- */
export function setLoader(done, total, label = 'Carico le tavole') {
  const el = $('#loader');
  if (done == null) { el.classList.remove('is-on'); return; }
  el.classList.add('is-on');
  const pct = total ? done / total * 100 : 0;
  $('#ld-text').textContent = total === 100 ? `${label}… ${Math.round(pct)}%` : `${label}… ${done} di ${total}`;
  $('#ld-bar').style.width = pct + '%';
}

export function openWelcome(on) {
  $('#welcome').hidden = !on;
  if (on) $('#fi').focus({ preventScroll: true });
}

export function openContacts(on) {
  $('#contacts').hidden = !on;
  if (on) $('#close-contacts').focus({ preventScroll: true });
}

export function openSettings(on) {
  $('#settings').hidden = !on;
  if (on) {
    syncSettingsUI();
    $('#close-settings').focus({ preventScroll: true });
  }
}

/* ---------- filtri ---------- */
export function updateCount() {
  $('#vis-count').textContent = state.items.reduce((n, it) => n + (it.vis ? 1 : 0), 0);
}

export function buildChips() {
  const box = $('#chips');
  box.innerHTML = '';
  const counts = {};
  for (const it of state.items) counts[it.cat] = (counts[it.cat] || 0) + 1;
  for (const cat of Object.keys(state.col)) {
    if (!counts[cat]) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.style.setProperty('--c', state.col[cat]);
    b.setAttribute('aria-pressed', state.on.has(cat));
    b.innerHTML = `<i></i>${esc(cat)}<small>${counts[cat]}</small>`;
    b.onclick = () => {
      playClick(460);
      state.on.has(cat) ? state.on.delete(cat) : state.on.add(cat);
      b.setAttribute('aria-pressed', state.on.has(cat));
      refreshVis();
      updateCount();
    };
    box.appendChild(b);
  }
}

/** Crea le tavole "scheletro" prima che le immagini siano pronte. */
export function initItemsSkeleton(rows) {
  const n = Math.max(1, rows.length);
  state.sel = state.hov = -1;
  state.Dm = null;
  state.proj.length = 0;
  state.items = rows.map((r, i) => {
    const cat = (r.category || '').trim() || 'da classificare';
    const geo = assignGeoHub(r);
    const phi = Math.acos(1 - 2 * (i + 0.5) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const x = Math.cos(theta) * Math.sin(phi) * 0.78;
    const y = Math.cos(phi) * 0.78;
    const z = Math.sin(theta) * Math.sin(phi) * 0.78;
    return {
      r, cat, th: null, cards: null, src: null, ready: false, vis: true,
      baseRot: ((i * 37 % 13) - 6) * 0.014,
      rot: ((i * 37 % 13) - 6) * 0.014,
      vrot: 0,
      tiltY: 0,
      vtiltY: 0,
      x, y, z, tx: x, ty: y, tz: z,
      lon: geo.lon, lat: geo.lat, hubId: geo.hubId, siteName: geo.siteName, geoStatus: geo.geoStatus,
      hubRank: 0, hubSize: 1, nn: [],
      hay: `${r.id} ${r.subject || ''} ${r.author || ''} ${r.notes || ''} ${geo.siteName}`.toLowerCase(),
      vf: 1, hs: 0, a: 0, b: performance.now() + i * 10, sx: 0, sy: 0, sc: 1
    };
  });
  const cats = [...new Set(state.items.map(i => i.cat))];
  state.col = {};
  cats.forEach((c, i) => { state.col[c] = CAT_COLORS[c] || PAL[i % PAL.length]; });
  state.on = new Set(cats);
  assignHubRanks(state.items);
  refreshVis();
  buildChips();
  updateCount();
}

/* ---------- scheda della tavola ---------- */
let loadToken = 0;
const HIDDEN_KEYS = new Set(['subject', 'notes', 'filename', 'category']);

function thumbURL(it) {
  return it.thumbURL || (it.thumbURL = it.th.toDataURL('image/jpeg', 0.85));
}

function fillDrawer(it) {
  const img = $('#big');
  const token = ++loadToken;
  img.src = thumbURL(it);
  img.classList.toggle('is-soft', !!it.src);
  img.alt = it.r.subject || it.r.id;
  img.classList.toggle('can-zoom', !!it.src);
  if (it.src) {
    const full = new Image();
    full.onload = full.onerror = () => {
      if (token !== loadToken) return;
      if (full.naturalWidth) img.src = it.src;
      img.classList.remove('is-soft');
    };
    full.src = it.src;
  }

  $('#det-title').textContent = it.r.subject || it.r.id;
  const c = state.col[it.cat];
  $('#det-tags').innerHTML =
    `<span class="tag" style="--c:${c}"><i></i>${esc(it.cat)}</span>` +
    `<span class="tag tag-geo${it.geoStatus === 'inferito' ? ' is-guess' : ''}" ` +
    `title="${it.geoStatus === 'inferito' ? 'Località dedotta dal soggetto' : 'Località indicata nella scheda'}">${esc(it.siteName)}</span>`;

  const notes = getNotes(it.r);
  const nEl = $('#det-notes');
  nEl.hidden = !notes.length;
  nEl.innerHTML = notes.map(n => `<p>${esc(n)}</p>`).join('');

  $('#dl').innerHTML = Object.entries(it.r)
    .filter(([k, v]) => v && !HIDDEN_KEYS.has(k))
    .map(([k, v]) => {
      const label = esc(k.replace(/_/g, ' '));
      if (k === 'source' && /^https?:/.test(v)) {
        let host = v;
        try { host = new URL(v).hostname.replace(/^www\./, ''); } catch (_) {}
        return `<dt>${label}</dt><dd><a href="${esc(v)}" target="_blank" rel="noopener">${esc(host)}</a></dd>`;
      }
      return `<dt>${label}</dt><dd>${esc(v)}</dd>`;
    }).join('');

  const nb = $('#nb');
  nb.innerHTML = '';
  for (const j of it.nn) {
    const o = state.items[j];
    if (!o || !o.ready) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.title = o.r.id + (o.r.subject ? ' — ' + o.r.subject : '');
    const k = document.createElement('canvas');
    k.width = k.height = 72;
    k.getContext('2d').drawImage(o.th, 0, 0, 72, 72);
    b.appendChild(k);
    b.onclick = () => show(j);
    nb.appendChild(b);
  }
  $('.drawer-scroll').scrollTop = 0;
}

export function setAutoRotate(on, userAction = false) {
  state.autoRotate = on;
  if (userAction) state.autoRotatePref = on;
  const btn = $('#rot-auto');
  if (btn) btn.setAttribute('aria-pressed', on);
  markDirty();
}

export function toggleAutoRotate() {
  const next = !state.autoRotate;
  playClick(next ? 520 : 380);
  setAutoRotate(next, true);
  msg(next ? 'Rotazione automatica attivata' : 'Rotazione automatica disattivata', 1600);
}

export function boom(it, color) {
  if (state.ecoMode) return;
  state.fx.push({
    it, c: color, t0: performance.now(),
    sp: Array.from({ length: 16 }, (_, k) => ({ a: k / 16 * 6.283 + Math.random() * 0.3, v: 55 + Math.random() * 80 }))
  });
  markDirty();
}

/* ---------- accessibilità ---------- */
const mobileMQ = matchMedia('(max-width: 760px)');
let lastFocus = null;
function syncInert() {
  const open = body.classList.contains('has-sel');
  $('#detail-drawer').inert = !open;
  $('.dock').inert = mobileMQ.matches && open;
}
mobileMQ.addEventListener('change', syncInert);

/* ---------- link condivisibili ---------- */
function writeHash() {
  const p = new URLSearchParams();
  const it = state.items[state.sel];
  if (it) p.set('id', it.r.id);
  if (state.viewMode === 'geo') p.set('view', 'geo');
  const h = p.toString();
  try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (_) {}
}

export function applyHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('view') === 'geo') setViewMode('geo');
  const id = p.get('id');
  if (id) {
    const i = state.items.findIndex(it => it.r.id === id);
    if (i >= 0) show(i);
  }
}

export function show(i) {
  const it = state.items[i];
  if (!it || !it.ready) return;
  const first = !body.classList.contains('has-sel');
  if (first) lastFocus = document.activeElement;
  state.sel = i;
  playSelect(it.cat);
  fillDrawer(it);
  const d = $('#detail-drawer');
  d.classList.add('is-open');
  d.setAttribute('aria-hidden', 'false');
  body.classList.add('has-sel');
  syncInert();
  if (first) $('#close-det').focus({ preventScroll: true });
  writeHash();
  if (state.viewMode === '3d') setAutoRotate(false, false);
  focusOn(it);
  boom(it, state.col[it.cat]);
}

export function closeSelection() {
  if (state.sel < 0) return;
  playClick(340);
  state.sel = -1;
  const d = $('#detail-drawer');
  d.classList.remove('is-open');
  d.setAttribute('aria-hidden', 'true');
  body.classList.remove('has-sel');
  syncInert();
  if (lastFocus && lastFocus !== document.body && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
  if (state.viewMode === '3d' && state.autoRotatePref && !state.ecoMode) {
    setAutoRotate(true, false);
  }
  releaseFocus();
  writeHash();
  markDirty();
}

function stepSelection(dir) {
  const list = state.items.map((it, i) => (it.ready && it.vis ? i : -1)).filter(i => i >= 0);
  if (!list.length) return;
  const at = list.indexOf(state.sel);
  show(list[(at + dir + list.length) % list.length] ?? list[0]);
}

/* ---------- vista 3D / mappa ---------- */
export function setViewMode(mode) {
  if (state.viewMode === mode) return;
  playSwitch(mode === 'geo');
  state.viewMode = mode;
  state.switchT = performance.now();
  state.hov = -1;
  $('#tip').classList.remove('is-on');
  $('#seg').dataset.view = mode;
  body.dataset.view = mode;
  $('#vw-3d').setAttribute('aria-pressed', mode === '3d');
  $('#vw-geo').setAttribute('aria-pressed', mode === 'geo');
  $('#rot-auto').hidden = mode !== '3d';
  if (state.sel >= 0) focusOn(state.items[state.sel]);
  writeHash();
  markDirty();
}

/* ---------- esportazione ---------- */
function exportCSV() {
  if (!state.items.length) return msg('Carica prima le tavole.');
  playClick(500);
  const head = ['id', 'filename', 'category', 'site', 'geo_status', 'lon', 'lat', 'x3d', 'y3d', 'z3d'];
  const rows = state.items.map(i => [
    i.r.id, i.r.filename || '', i.cat, i.siteName, i.geoStatus,
    i.lon.toFixed(4), i.lat.toFixed(4), i.tx.toFixed(4), i.ty.toFixed(4), i.tz.toFixed(4)
  ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
  const blob = new Blob(['\uFEFF' + head.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'atlante_coordinate.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  msg('Coordinate esportate.');
}

/* ---------- collegamento dei controlli ---------- */
export function bindUI() {
  loadPrefs();
  applyEcoMode(state.ecoMode, false);
  syncSettingsUI();

  $('#close-det').onclick = closeSelection;
  $('#vw-3d').onclick = () => setViewMode('3d');
  $('#vw-geo').onclick = () => setViewMode('geo');
  $('#zi').onclick = () => { playClick(520); zoomBy(1.3); };
  $('#zo').onclick = () => { playClick(360); zoomBy(1 / 1.3); };
  $('#zr').onclick = () => { playClick(440); closeSelection(); resetView(); };
  $('#rot-auto').onclick = toggleAutoRotate;
  $('#rot-auto').setAttribute('aria-pressed', state.autoRotate);
  $('#cp').onclick = exportCSV;
  $('#open-data').onclick = () => { playClick(460); openWelcome($('#welcome').hidden); };
  $('#close-welcome').onclick = () => { playClick(360); openWelcome(false); };

  // Contatti (separato in basso a destra)
  $('#open-contacts').onclick = () => { playClick(460); openContacts($('#contacts').hidden); };
  $('#close-contacts').onclick = () => { playClick(360); openContacts(false); };
  $('#contacts').onclick = e => { if (e.target === e.currentTarget) openContacts(false); };

  // Impostazioni
  $('#open-settings').onclick = () => { playClick(480); openSettings($('#settings').hidden); };
  $('#close-settings').onclick = () => { playClick(360); openSettings(false); };
  $('#settings').onclick = e => { if (e.target === e.currentTarget) openSettings(false); };

  $('#opt-sound').onchange = e => {
    state.soundEnabled = e.target.checked;
    savePrefs();
    if (state.soundEnabled) playClick(540);
    msg(state.soundEnabled ? 'Effetti sonori attivati' : 'Effetti sonori disattivati', 1500);
  };

  $('#opt-music').onchange = e => {
    state.musicEnabled = e.target.checked;
    savePrefs();
    unlockAudio();
    syncMusic();
    msg(state.musicEnabled ? 'Musica ambientale attivata' : 'Musica ambientale disattivata', 1600);
  };

  $('#opt-eco').onchange = e => {
    playClick(420);
    applyEcoMode(e.target.checked, true);
  };

  const lb = $('#lightbox');
  $('#big').onclick = () => {
    const it = state.items[state.sel];
    if (!it || !it.src) return;
    playClick(540);
    $('img', lb).src = it.src;
    lb.hidden = false;
  };
  lb.onclick = () => { lb.hidden = true; };

  $('#md').onclick = e => {
    playClick(460);
    state.mode = state.mode === 'thumb' ? 'dot' : 'thumb';
    e.currentTarget.setAttribute('aria-pressed', state.mode === 'thumb');
    markDirty();
  };

  $('#q').oninput = e => {
    state.q = e.target.value.trim().toLowerCase();
    refreshVis();
    updateCount();
  };

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea')) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    switch (e.key) {
      case 'Escape':
        if (!$('#lightbox').hidden) $('#lightbox').hidden = true;
        else if (!$('#settings').hidden) openSettings(false);
        else if (!$('#contacts').hidden) openContacts(false);
        else if (!$('#welcome').hidden) openWelcome(false);
        else closeSelection();
        break;
      case 'ArrowRight': stepSelection(1); break;
      case 'ArrowLeft': stepSelection(-1); break;
      case '+': case '=': zoomBy(1.2); break;
      case '-': case '_': zoomBy(1 / 1.2); break;
      case '0': closeSelection(); resetView(); break;
      case 'g': case 'G': setViewMode(state.viewMode === '3d' ? 'geo' : '3d'); break;
      case ' ':
        if (state.viewMode === '3d') { e.preventDefault(); toggleAutoRotate(); }
        break;
      case '/': e.preventDefault(); $('#q').focus(); break;
      default: return;
    }
  });
}
