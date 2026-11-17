/* ============================================================
   ui.js — pannello scheda, griglia ottica di misurazione,
   filtri tassonomici con barre di frequenza, selettore tema,
   esportazione CSV, scorciatoie
   ============================================================ */
import { state, esc, msg, markDirty, refreshVis, getNotes, PAL } from './data.js';
import {
  PALETTES, PALETTE_MAP, initTheme, setThemeMode, setPalette, cyclePalette, cycleThemeMode,
  getResolvedTheme, getThemeTokens, registerThemeHook
} from './theme.js';
import { assignGeoHub, assignHubRanks } from './geo.js';
import { focusOn, releaseFocus, zoomBy, resetView } from './camera.js';
import { playClick, playSelect, playSwitch, playThemeSwitch, syncMusic, unlockAudio } from './audio.js';

const $ = s => document.querySelector(s);

const FIELDS = [
  ['id', 'Codice'],
  ['category', 'Categoria'],
  ['subject', 'Soggetto'],
  ['site', 'Provenienza'],
  ['type', 'Tipologia'],
  ['author', 'Autore'],
  ['license', 'Licenza'],
  ['source', 'Fonte']
];

const THEME_STATUS_LABELS = {
  auto: () => `Automatico · ora ${getResolvedTheme() === 'light' ? 'chiaro' : 'scuro'}`,
  light: () => 'Chiaro · pergamena museale',
  dark: () => 'Scuro · osservatorio notturno'
};

const THEME_ICONS = {
  auto: '#i-auto',
  light: '#i-sun',
  dark: '#i-moon'
};

export function similarityPercent(i, j) {
  const { items, Dm } = state;
  const n = items.length;
  if (!Dm || n < 2 || i < 0 || j < 0 || i >= n || j >= n) return null;
  const d = Dm[i * n + j];
  if (!Number.isFinite(d)) return null;
  const sim = Math.round(100 / (1 + Math.sqrt(Math.max(0, d)) * 0.42));
  return Math.max(12, Math.min(99, sim));
}

/* ---------- inizializzazione delle tavole ---------- */
export function initItemsSkeleton(rows) {
  state.items = rows.map(r => {
    const geo = assignGeoHub(r);
    const baseRot = (Math.random() - 0.5) * 0.085;
    return {
      r,
      cat: (r.category || 'da classificare').trim() || 'da classificare',
      hay: `${r.id} ${r.subject} ${r.category} ${r.notes} ${geo.siteName}`.toLowerCase(),
      ...geo,
      tx: (Math.random() - 0.5) * 1.4,
      ty: (Math.random() - 0.5) * 1.4,
      tz: (Math.random() - 0.5) * 1.4,
      x: 0, y: 0, z: 0,
      b: -1e9,
      a: 0, vf: 0, hs: 0,
      sx: 0, sy: 0, sc: 1,
      baseRot,
      rot: baseRot,
      vrot: 0,
      tiltY: 0,
      vtiltY: 0,
      ready: false,
      th: null,
      cards: null,
      src: null,
      vis: true,
      nn: []
    };
  });

  const cats = [...new Set(state.items.map(i => i.cat))];
  const catTokens = getThemeTokens().cats;
  state.col = Object.fromEntries(cats.map((c, i) => [c, catTokens[c] || PAL[i % PAL.length]]));
  state.on = new Set(cats);
  assignHubRanks(state.items);
  buildChips();
  updateCount();
}

export function buildChips() {
  const counts = {};
  for (const it of state.items) counts[it.cat] = (counts[it.cat] || 0) + 1;
  const total = Math.max(1, state.items.length);
  const el = $('#chips');
  el.innerHTML = '';
  for (const [c, n] of Object.entries(counts)) {
    const pct = Math.max(14, Math.round((n / total) * 100));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.style.setProperty('--c', state.col[c]);
    b.style.setProperty('--pct', `${pct}%`);
    b.setAttribute('aria-pressed', state.on.has(c) ? 'true' : 'false');
    b.innerHTML = `<i></i><span>${esc(c)}</span><small>${n}</small>`;
    b.onclick = () => {
      playClick(460);
      if (state.on.has(c)) state.on.delete(c); else state.on.add(c);
      b.setAttribute('aria-pressed', state.on.has(c));
      refreshVis();
      updateCount();
    };
    el.appendChild(b);
  }
}

export function updateCount() {
  $('#vis-count').textContent = state.items.filter(i => i.vis).length;
}

/* ---------- UI tema & palette ---------- */
function buildPaletteGrid() {
  const grid = $('#palette-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const pal of PALETTES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pal-card';
    btn.dataset.paletteId = pal.id;
    btn.setAttribute('aria-pressed', state.palette === pal.id ? 'true' : 'false');
    const dots = pal.swatches.map(hex => `<i style="background:${hex}"></i>`).join('');
    btn.innerHTML = `
      <span class="pal-swatch" aria-hidden="true">${dots}</span>
      <span class="pal-meta">
        <strong>${esc(pal.name)}</strong>
        <small>${esc(pal.subtitle)}</small>
      </span>
      <span class="pal-check" aria-hidden="true">✓</span>`;
    btn.onclick = () => {
      unlockAudio();
      setPalette(pal.id);
      playThemeSwitch(getResolvedTheme() === 'light');
      msg(`Stile attivo: ${pal.name}`);
    };
    grid.appendChild(btn);
  }
}

function syncThemeUI() {
  const seg = $('#theme-seg');
  if (seg) {
    seg.dataset.mode = state.themeMode;
    seg.querySelectorAll('button[data-theme-mode]').forEach(btn => {
      btn.setAttribute('aria-pressed', btn.dataset.themeMode === state.themeMode ? 'true' : 'false');
    });
  }
  const st = $('#theme-status');
  if (st && THEME_STATUS_LABELS[state.themeMode]) {
    st.textContent = THEME_STATUS_LABELS[state.themeMode]();
  }
  const qtUse = $('#quick-theme-ic use');
  if (qtUse) {
    qtUse.setAttribute('href', THEME_ICONS[state.themeMode] || '#i-auto');
  }
  const grid = $('#palette-grid');
  if (grid) {
    grid.querySelectorAll('.pal-card').forEach(card => {
      const active = card.dataset.paletteId === state.palette;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  buildChips();
  if (state.sel >= 0 && state.items[state.sel]) {
    const it = state.items[state.sel];
    const catTag = $('#det-tags .tag');
    if (catTag) catTag.style.setProperty('--c', state.col[it.cat]);
  }
}

registerThemeHook(syncThemeUI);

/* ---------- vista (3D <-> planisfero) ---------- */
export function setViewMode(mode, silent = false) {
  if (state.viewMode === mode) return;
  if (!silent) playSwitch(mode === 'geo');
  state.viewMode = mode;
  state.switchT = performance.now();
  document.body.dataset.view = mode;
  $('#seg').dataset.view = mode;
  $('#vw-3d').setAttribute('aria-pressed', mode === '3d');
  $('#vw-geo').setAttribute('aria-pressed', mode === 'geo');
  if (state.sel >= 0 && state.items[state.sel]) focusOn(state.items[state.sel]);
  markDirty();
}

export function setAutoRotate(v, remember = true) {
  state.autoRotate = v;
  if (remember) state.autoRotatePref = v;
  $('#rot-auto').setAttribute('aria-pressed', v);
  markDirty();
}

/* ---------- scheda e visualizzatore a schermo intero ---------- */
let showToken = 0;

function openLightbox(src, alt) {
  const lb = $('#lightbox');
  const img = lb.querySelector('img');
  img.src = src;
  img.alt = alt || '';
  lb.hidden = false;
  playClick(520);
}

function closeLightbox() {
  const lb = $('#lightbox');
  if (lb.hidden) return;
  lb.hidden = true;
  lb.querySelector('img').removeAttribute('src');
  playClick(340);
}

export function show(i) {
  const it = state.items[i];
  if (!it) return;
  const tok = ++showToken;
  state.sel = i;
  playSelect(it.cat);

  if (state.W <= 760) {
    const qInput = $('#q');
    if (qInput && document.activeElement === qInput) qInput.blur();
  }

  document.body.classList.add('has-sel');
  const drawer = $('#detail-drawer');
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  drawer.removeAttribute('inert');

  const codeEl = $('#det-code');
  if (codeEl) {
    codeEl.textContent = `SPECIMEN // ${String((it.cardIdx ?? i) + 1).padStart(2, '0')} · ${it.r.id}`;
  }

  const big = $('#big');
  const zoomHint = $('#zoom-hint');
  big.classList.remove('can-zoom');
  big.onclick = null;
  if (zoomHint) zoomHint.hidden = true;

  if (it.th) { big.src = it.th.toDataURL(); big.classList.add('is-soft'); }
  else { big.removeAttribute('src'); big.classList.remove('is-soft'); }
  big.alt = it.r.subject || it.r.id;

  const enableZoom = fullSrc => {
    big.classList.add('can-zoom');
    big.onclick = () => openLightbox(fullSrc, big.alt);
    if (zoomHint) zoomHint.hidden = false;
  };

  if (it.src) {
    const full = new Image();
    full.onload = () => {
      if (tok === showToken) {
        big.src = it.src;
        big.classList.remove('is-soft');
        enableZoom(it.src);
      }
    };
    full.src = it.src;
  } else if (it.th) {
    big.classList.remove('is-soft');
    enableZoom(big.src);
  }

  $('#det-title').textContent = it.r.subject || it.r.id;

  const geoTag = it.geoStatus === 'esatto'
    ? `<span class="tag tag-geo" title="Località indicata nei metadati della tavola">${esc(it.siteName)}</span>`
    : `<span class="tag tag-geo is-guess" title="Località inferita dalla specie (non dichiarata nei metadati)">${esc(it.siteName)} · areale</span>`;
  $('#det-tags').innerHTML =
    `<span class="tag" style="--c:${state.col[it.cat]}"><i></i>${esc(it.cat)}</span>` + geoTag;

  const notes = getNotes(it.r);
  const notesEl = $('#det-notes');
  notesEl.hidden = !notes.length;
  notesEl.innerHTML = notes.map(n => `<p>${esc(n)}</p>`).join('');

  const data = { ...it.r, site: it.siteName };
  $('#dl').innerHTML = FIELDS
    .filter(([k]) => data[k])
    .map(([k, label]) => {
      const v = data[k];
      const dd = /^https?:\/\//i.test(v)
        ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>`
        : esc(v);
      return `<dt>${label}</dt><dd>${dd}</dd>`;
    })
    .join('');

  const nb = $('#nb');
  nb.innerHTML = '';
  for (const j of it.nn) {
    const o = state.items[j];
    if (!o) continue;
    const b = document.createElement('button');
    b.type = 'button';
    const sim = similarityPercent(i, j);
    b.title = `${o.r.subject || o.r.id}${sim ? ` · affinità ${sim}%` : ''}`;
    if (o.th) {
      const c = document.createElement('canvas');
      c.width = c.height = 56;
      c.getContext('2d').drawImage(o.th, 0, 0, 56, 56);
      b.appendChild(c);
    }
    if (sim) {
      const badge = document.createElement('span');
      badge.className = 'nb-sim';
      badge.textContent = `${sim}%`;
      b.appendChild(badge);
    }
    b.onclick = () => show(j);
    nb.appendChild(b);
  }

  state.fx.push({
    it, t0: performance.now(), c: state.col[it.cat],
    sp: Array.from({ length: 14 }, (_, k) => ({ a: k * 0.4488, v: 64 + (k % 3) * 26 }))
  });
  focusOn(it);
  location.hash = encodeURIComponent(it.r.id);
}

export function closeSelection() {
  if (state.sel < 0) return;
  playClick(340);
  state.sel = -1;
  document.body.classList.remove('has-sel');
  const drawer = $('#detail-drawer');
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('inert', '');
  releaseFocus();
  history.replaceState(null, '', location.pathname + location.search);
}

/* ---------- caricamento e finestre ---------- */
export function setLoader(done, total, label = 'Carico le tavole') {
  const el = $('#loader');
  if (done == null) { el.classList.remove('is-on'); return; }
  el.classList.add('is-on');
  $('#ld-text').textContent = `${label} · ${Math.round(done)}/${total}`;
  $('#ld-bar').style.width = `${total ? (done / total) * 100 : 0}%`;
}

export function openWelcome(v) {
  const el = $('#welcome');
  el.hidden = !v;
  if (v) el.querySelector('input, button')?.focus();
}

export function openSettings(v) {
  const el = $('#settings');
  el.hidden = !v;
  if (v) {
    syncThemeUI();
    el.querySelector('button')?.focus();
  }
}

export function openContacts(v) {
  const el = $('#contacts');
  el.hidden = !v;
  if (v) el.querySelector('button')?.focus();
}

/* ---------- esportazione CSV ---------- */
function exportCSV() {
  const sep = ';';
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['id', 'subject', 'category', 'site', 'lon', 'lat', 'x', 'y', 'z'].join(sep)];
  for (const it of state.items) {
    rows.push([
      it.r.id, it.r.subject, it.cat, it.siteName,
      it.lon.toFixed(4), it.lat.toFixed(4),
      it.x.toFixed(4), it.y.toFixed(4), it.z.toFixed(4)
    ].map(cell).join(sep));
  }
  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'atlante_evolutivo_coordinate.csv'
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  msg('Coordinate esportate.');
}

/* ---------- binding ---------- */
export function bindUI() {
  initTheme();
  buildPaletteGrid();
  syncThemeUI();

  $('#vw-3d').onclick = () => setViewMode('3d');
  $('#vw-geo').onclick = () => setViewMode('geo');
  $('#rot-auto').onclick = () => {
    playClick(480);
    setAutoRotate(!state.autoRotate);
  };
  $('#md').onclick = () => {
    playClick(440);
    state.mode = state.mode === 'thumb' ? 'dot' : 'thumb';
    $('#md').setAttribute('aria-pressed', state.mode === 'thumb');
    markDirty();
  };
  $('#zi').onclick = () => { playClick(520); zoomBy(1.3); };
  $('#zo').onclick = () => { playClick(380); zoomBy(1 / 1.3); };
  $('#zr').onclick = () => { playClick(460); resetView(); };
  $('#cp').onclick = () => { playClick(500); exportCSV(); };

  // Controlli rapidi sulla dock per palette e tema
  const quickPalBtn = $('#quick-pal');
  if (quickPalBtn) {
    quickPalBtn.onclick = () => {
      unlockAudio();
      const next = cyclePalette();
      playThemeSwitch(getResolvedTheme() === 'light');
      msg(`Stile: ${next.name}`);
    };
  }
  const quickThemeBtn = $('#quick-theme');
  if (quickThemeBtn) {
    quickThemeBtn.onclick = () => {
      unlockAudio();
      const next = cycleThemeMode();
      playThemeSwitch(getResolvedTheme() === 'light');
      const label = next === 'auto' ? 'Automatico' : next === 'light' ? 'Chiaro' : 'Scuro';
      msg(`Tema: ${label}`);
    };
  }

  // Toggle reticolo ottico nella scheda specimen
  const toggleGridBtn = $('#toggle-grid');
  const mediaStage = $('#media-stage');
  if (toggleGridBtn && mediaStage) {
    toggleGridBtn.onclick = () => {
      playClick(540);
      const active = mediaStage.classList.toggle('has-grid');
      toggleGridBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    };
  }

  $('#open-data').onclick = () => { playClick(460); openWelcome(true); };
  $('#close-welcome').onclick = () => { playClick(360); openWelcome(false); };
  $('#welcome').onclick = e => { if (e.target === e.currentTarget) openWelcome(false); };

  $('#open-settings').onclick = () => { playClick(460); openSettings(true); };
  $('#close-settings').onclick = () => { playClick(360); openSettings(false); };
  $('#settings').onclick = e => { if (e.target === e.currentTarget) openSettings(false); };

  const themeSeg = $('#theme-seg');
  if (themeSeg) {
    themeSeg.querySelectorAll('button[data-theme-mode]').forEach(btn => {
      btn.onclick = () => {
        unlockAudio();
        setThemeMode(btn.dataset.themeMode);
        playThemeSwitch(getResolvedTheme() === 'light');
      };
    });
  }

  $('#open-contacts').onclick = () => { playClick(460); openContacts(true); };
  $('#close-contacts').onclick = () => { playClick(360); openContacts(false); };
  $('#contacts').onclick = e => { if (e.target === e.currentTarget) openContacts(false); };

  $('#close-det').onclick = closeSelection;
  $('#lightbox').onclick = closeLightbox;

  $('#opt-sound').onchange = e => {
    state.soundEnabled = e.target.checked;
    if (state.soundEnabled) playClick(540);
  };
  $('#opt-music').onchange = e => {
    state.musicEnabled = e.target.checked;
    unlockAudio();
    syncMusic();
  };
  $('#opt-eco').onchange = e => {
    state.ecoMode = e.target.checked;
    document.body.classList.toggle('is-eco', state.ecoMode);
    if (state.ecoMode) {
      setAutoRotate(false, false);
    } else {
      setAutoRotate(state.autoRotatePref, false);
    }
    markDirty();
  };

  if (state.ecoMode) {
    document.body.classList.add('is-eco');
    $('#opt-eco').checked = true;
  }

  $('#q').oninput = e => {
    state.q = e.target.value.trim().toLowerCase();
    refreshVis();
    updateCount();
  };

  addEventListener('keydown', e => {
    const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (e.key === 'Escape') {
      if (!$('#lightbox').hidden) return closeLightbox();
      if (!$('#settings').hidden) return openSettings(false);
      if (!$('#contacts').hidden) return openContacts(false);
      if (!$('#welcome').hidden) return openWelcome(false);
      return closeSelection();
    }
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); $('#q').focus(); }
    else if (e.key === ' ') { e.preventDefault(); setAutoRotate(!state.autoRotate); }
    else if (e.key === 'g' || e.key === 'G') setViewMode(state.viewMode === '3d' ? 'geo' : '3d');
    else if (e.key === 'p' || e.key === 'P') {
      unlockAudio();
      const next = cyclePalette();
      playThemeSwitch(getResolvedTheme() === 'light');
      msg(`Stile: ${next.name}`);
    }
    else if (e.key === 't' || e.key === 'T') {
      unlockAudio();
      const next = cycleThemeMode();
      playThemeSwitch(getResolvedTheme() === 'light');
      const label = next === 'auto' ? 'Automatico' : next === 'light' ? 'Chiaro' : 'Scuro';
      msg(`Tema: ${label}`);
    }
    else if (e.key === '+' || e.key === '=') zoomBy(1.25);
    else if (e.key === '-') zoomBy(1 / 1.25);
    else if (e.key === '0') resetView();
  });
}

export function applyHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const i = state.items.findIndex(x => x.r.id === id);
  if (i >= 0) show(i);
}
