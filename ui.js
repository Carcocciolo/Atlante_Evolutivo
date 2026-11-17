/* ============================================================
   ui.js — barra di ricerca, filtri tassonomici, scheda tavola,
   dossier archetipi evolutivi (orbita & callout), temi e scorciatoie
   ============================================================ */
import { state, CAT_COLORS, PAL, RM, clamp, esc, markDirty, msg, refreshVis, getNotes } from './data.js';
import { assignGeoHub, geoToScreen } from './geo.js';
import { zoomBy, resetView, releaseFocus, focusOn, focusOnSpecimen, focusOnCallout } from './camera.js';
import { SPECIMENS } from './specimens.js';
import {
  PALETTES, PALETTE_MAP, initThemeSystem, applyPalette, applyThemeMode,
  getResolvedTheme, syncCanvasTheme
} from './theme.js';
import { playClick, playSelect, playSwitch, playThemeSwitch, syncMusic, unlockAudio } from './audio.js';

const $ = s => document.querySelector(s);
const catOf = r => (r.category || '').trim() || 'Senza categoria';
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

/* ---------- avvio scheletro schede dal CSV ---------- */
export function initItemsSkeleton(rows) {
  const cats = [...new Set(rows.map(catOf))];
  state.col = Object.fromEntries(cats.map((c, i) => [c, CAT_COLORS[c] || PAL[i % PAL.length]]));
  state.on = new Set(cats);
  state.items = rows.map(r => {
    const cat = catOf(r);
    const geo = assignGeoHub(r);
    return {
      r, cat, ...geo,
      hay: [r.id, r.subject, r.category, r.notes, r.source, geo.siteName].filter(Boolean).join(' ').toLowerCase(),
      vis: true, ready: false,
      th: null, cards: null, cardIdx: 0, src: null,
      tx: 0, ty: 0, tz: 0, x: 0, y: 0, z: 0,
      sx: 0, sy: 0, sc: 1, vf: 1, hs: 0, a: 0, b: 0,
      baseRot: (Math.random() - 0.5) * 0.14,
      rot: 0,
      vrot: 0,
      tiltY: 0,
      vtiltY: 0,
      nn: []
    };
  });
  syncCanvasTheme();
}

/* ---------- filtri & matrice tassonomica ---------- */
export function buildChips() {
  const host = $('#chips');
  host.innerHTML = '';
  const total = state.items.length || 1;
  for (const c of Object.keys(state.col)) {
    const n = state.items.filter(i => i.cat === c).length;
    const pct = Math.max(12, Math.round((n / total) * 100));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.cat = c;
    b.setAttribute('aria-pressed', 'true');
    b.style.setProperty('--c', state.col[c]);
    b.style.setProperty('--pct', `${pct}%`);
    b.innerHTML = `<i></i><span>${esc(c)}</span><small>${n}</small>`;
    b.onclick = () => {
      unlockAudio();
      const wasOn = state.on.has(c);
      if (wasOn) state.on.delete(c); else state.on.add(c);
      b.setAttribute('aria-pressed', String(!wasOn));
      playClick(!wasOn ? 640 : 420);
      refreshVis();
      updateCount();
      if (state.sel >= 0 && !state.items[state.sel].vis) closeSelection();
    };
    host.appendChild(b);
  }
}

export function refreshChipColors() {
  document.querySelectorAll('#chips .chip').forEach(b => {
    const c = state.col[b.dataset.cat];
    if (c) b.style.setProperty('--c', c);
  });
}

export function updateCount() {
  $('#vis-count').textContent = state.items.filter(i => i.vis).length;
}

/* ---------- percentuale di affinità morfologica ---------- */
export function similarityPercent(i, j) {
  const { Dm, items } = state;
  const n = items.length;
  if (!Dm || i < 0 || j < 0 || i >= n || j >= n || i === j) return null;
  const d = Dm[i * n + j];
  const nn = items[i].nn || [];
  const dMin = nn.length ? Dm[i * n + nn[0]] : d;
  const dMax = nn.length ? Dm[i * n + nn[nn.length - 1]] : d * 2;
  const span = Math.max(1e-6, dMax - dMin);
  const rel = clamp(1 - (d - dMin) / (span * 1.45), 0, 1);
  return Math.round(62 + rel * 36);
}

/* ---------- scheda & visualizzatore ---------- */
const drawer = $('#detail-drawer');
const plateView = $('#plate-view');
const specimenView = $('#specimen-view');
const orbitHud = $('#orbit-hud');
const big = $('#big');
const mediaStage = $('#media-stage');
const lightbox = $('#lightbox');
const lightboxStage = $('#lightbox-stage');
const lbImg = lightbox.querySelector('img');
const lbCaption = $('#lb-caption');
let opener = null;
let loadToken = 0;

function setDrawerMode(mode) {
  const isSpec = mode === 'specimen';
  if (plateView) plateView.hidden = isSpec;
  if (specimenView) specimenView.hidden = !isSpec;
  const gridBtn = $('#toggle-grid');
  if (gridBtn) gridBtn.hidden = isSpec;
}

export function syncOrbitHUD() {
  const idx = state.specimenSel;
  const active = idx >= 0 && state.viewMode === '3d';
  document.body.classList.toggle('has-orbit', active);
  if (!orbitHud) return;
  orbitHud.hidden = !active;
  if (!active) return;

  const spec = SPECIMENS[idx];
  const plane = spec.orbitalPlane;
  const deg = Math.round(((state.orbitPhase * 180 / Math.PI) % 360 + 360) % 360);
  const incStr = `${plane.inclinationDeg >= 0 ? '+' : ''}${plane.inclinationDeg}°`;

  $('#orbit-plane-name').textContent = plane.name;
  $('#orbit-metrics').textContent = `INCL. ${incStr} · NODO ${plane.nodeDeg}° · FASE ${String(deg).padStart(3, '0')}°`;

  const sw = $('#orbit-switcher');
  if (sw) {
    if (!sw.children.length) {
      SPECIMENS.forEach((sp, sIdx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'orbit-pill';
        btn.dataset.specIdx = String(sIdx);
        btn.innerHTML = `<i></i><span>${esc(sp.name)}</span>`;
        btn.onclick = () => {
          unlockAudio();
          showSpecimen(sIdx);
        };
        sw.appendChild(btn);
      });
    }
    sw.querySelectorAll('.orbit-pill').forEach((btn, sIdx) => {
      const col = state.col[SPECIMENS[sIdx].catKey] || '#e5c58e';
      btn.style.setProperty('--c', col);
      btn.classList.toggle('is-active', sIdx === idx);
      btn.setAttribute('aria-pressed', String(sIdx === idx));
    });
  }
}

function renderSpecimenCalloutCards(spec) {
  const host = $('#spec-callouts');
  if (!host) return;
  host.innerHTML = '';
  spec.callouts.forEach((c, idx) => {
    const isSel = state.calloutSel === idx;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `callout-card${isSel ? ' is-active' : ''}`;
    btn.setAttribute('aria-pressed', String(isSel));
    btn.innerHTML = `
      <div class="callout-card-top">
        <span class="callout-num">${esc(c.code)}</span>
        <span class="callout-name">${esc(c.label)}</span>
      </div>
      <span class="callout-short">${esc(c.short)}</span>
      ${isSel ? `<div class="callout-detail">${esc(c.detail)}</div>` : ''}
    `;
    btn.onmouseenter = () => {
      state.calloutHov = idx;
      markDirty();
    };
    btn.onmouseleave = () => {
      if (state.calloutHov === idx) state.calloutHov = -1;
      markDirty();
    };
    btn.onclick = () => {
      unlockAudio();
      selectCallout(idx);
    };
    host.appendChild(btn);
  });
}

export function selectCallout(calloutIdx) {
  const spec = SPECIMENS[state.specimenSel];
  if (!spec) return;
  const next = state.calloutSel === calloutIdx ? -1 : calloutIdx;
  state.calloutSel = next;
  playClick(next >= 0 ? 680 : 440);
  renderSpecimenCalloutCards(spec);
  if (next >= 0) {
    focusOnCallout(spec, next);
  }
  syncOrbitHUD();
  markDirty();
}

export function showSpecimen(idx) {
  const spec = SPECIMENS[idx];
  if (!spec) return;
  unlockAudio();
  if (state.viewMode !== '3d') setViewMode('3d');

  opener = opener || document.activeElement;
  state.sel = -1;
  state.specimenSel = idx;
  state.calloutSel = -1;
  state.calloutHov = -1;
  state.orbitPhase = spec.orbitalPlane.initialPhase;
  state.orbitElev = spec.orbitalPlane.initialElev;

  const col = state.col[spec.catKey] || '#e5c58e';
  playSelect(Object.keys(state.col).indexOf(spec.catKey));

  setDrawerMode('specimen');
  $('#det-code').textContent = `${spec.code} · VISTA ORBITALE`;
  $('#spec-title').textContent = spec.name;
  $('#spec-sci').textContent = `${spec.scientificName} (${spec.authorTaxon})`;

  const tags = $('#spec-tags');
  tags.innerHTML = '';
  const tCat = document.createElement('span');
  tCat.className = 'tag';
  tCat.style.setProperty('--c', col);
  tCat.innerHTML = `<i></i>${esc(spec.era)}`;
  tags.appendChild(tCat);

  const tLoc = document.createElement('span');
  tLoc.className = 'tag';
  tLoc.textContent = spec.locality;
  tags.appendChild(tLoc);

  $('#spec-summary').textContent = spec.summary;

  const plane = spec.orbitalPlane;
  const incStr = `${plane.inclinationDeg >= 0 ? '+' : ''}${plane.inclinationDeg}°`;
  $('#spec-orbit-title').textContent = plane.name;
  const odl = $('#spec-orbit-dl');
  odl.innerHTML = '';
  for (const [k, v] of [
    ['Inclinazione', incStr],
    ['Nodo ascendente', `${plane.nodeDeg}°`],
    ['Raggio orbitale', `${plane.radius.toFixed(2)} UA-ottiche`],
    ['Controllo', 'Trascina per orbitare · Clicca callout']
  ]) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    odl.append(dt, dd);
  }

  renderSpecimenCalloutCards(spec);

  const hist = $('#spec-history');
  hist.innerHTML = '';
  for (const pText of spec.history) {
    const p = document.createElement('p');
    p.textContent = pText;
    hist.appendChild(p);
  }

  // Vetrini correlati dell'Atlante nella stessa categoria
  const related = state.items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.cat === spec.catKey && it.ready)
    .slice(0, 6);
  const platesWrap = $('#spec-plates-wrap');
  const platesBox = $('#spec-plates');
  platesBox.innerHTML = '';
  if (related.length) {
    platesWrap.hidden = false;
    for (const { it, i } of related) {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = `${it.r.subject || it.r.id} (${it.r.id})`;
      const c = document.createElement('canvas');
      c.width = c.height = 56;
      c.getContext('2d').drawImage(it.th, 0, 0, 56, 56);
      b.appendChild(c);
      b.onclick = () => show(i);
      platesBox.appendChild(b);
    }
  } else {
    platesWrap.hidden = true;
  }

  drawer.removeAttribute('inert');
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('has-sel');
  syncOrbitHUD();
  history.replaceState(null, '', '#archetipo-' + encodeURIComponent(spec.id));

  if (!state.ecoMode) {
    state.fx.push({
      it: {
        get sx() { return state.W > 760 ? 408 + (state.W - 408) / 2 : state.W / 2; },
        get sy() { return state.W > 760 ? state.H / 2 : state.H * 0.25; },
        sc: 1.4
      },
      c: col,
      t0: performance.now(),
      sp: Array.from({ length: 18 }, (_, k) => ({
        a: k * Math.PI * 2 / 18 + Math.random() * 0.25,
        v: 60 + Math.random() * 90
      }))
    });
  }

  focusOnSpecimen(spec);
  markDirty();
}

export function stepSpecimen(delta) {
  if (state.specimenSel < 0) return;
  const n = SPECIMENS.length;
  const next = (state.specimenSel + delta + n) % n;
  showSpecimen(next);
}

export function syncOpticalGrid() {
  const on = state.gridEnabled;
  if (mediaStage) mediaStage.classList.toggle('has-grid', on);
  if (lightboxStage) lightboxStage.classList.toggle('has-grid', on);
  const b1 = $('#toggle-grid');
  const b2 = $('#lb-grid');
  if (b1) b1.setAttribute('aria-pressed', String(on));
  if (b2) b2.setAttribute('aria-pressed', String(on));
}

export function toggleOpticalGrid() {
  state.gridEnabled = !state.gridEnabled;
  playClick(state.gridEnabled ? 660 : 460);
  syncOpticalGrid();
}

export function show(i) {
  const it = state.items[i];
  if (!it) return;
  opener = opener || document.activeElement;
  state.specimenSel = -1;
  state.calloutSel = -1;
  state.calloutHov = -1;
  syncOrbitHUD();
  setDrawerMode('plate');

  state.sel = i;
  const r = it.r;
  const catIdx = Object.keys(state.col).indexOf(it.cat);
  playSelect(catIdx);

  const specNo = String((it.cardIdx ?? i) + 1).padStart(2, '0');
  $('#det-code').textContent = `SPECIMEN // ${specNo} · ${r.id}`;
  $('#det-title').textContent = r.subject || r.id;

  const tags = $('#det-tags');
  tags.innerHTML = '';
  const tCat = document.createElement('span');
  tCat.className = 'tag';
  tCat.style.setProperty('--c', state.col[it.cat]);
  tCat.innerHTML = `<i></i>${esc(it.cat)}`;
  tags.appendChild(tCat);

  const tGeo = document.createElement('span');
  tGeo.className = 'tag tag-geo' + (it.geoStatus === 'inferito' ? ' is-guess' : '');
  tGeo.textContent = it.siteName + (it.geoStatus === 'inferito' ? ' (areale)' : '');
  tags.appendChild(tGeo);

  const notes = getNotes(r);
  const nBox = $('#det-notes');
  nBox.innerHTML = '';
  nBox.hidden = !notes.length;
  for (const line of notes) {
    const p = document.createElement('p');
    p.textContent = line;
    nBox.appendChild(p);
  }

  const dl = $('#dl');
  dl.innerHTML = '';
  const fields = [
    ['ID', r.id],
    ['Luogo', `${it.siteName} (${it.lat.toFixed(2)}°, ${it.lon.toFixed(2)}°)`],
    ['File', r.filename],
    ['Licenza', r.license],
    ['Fonte', r.source]
  ];
  for (const [k, v] of fields) {
    if (!v || v === 'nan') continue;
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd');
    if (/^https?:\/\//i.test(v)) {
      const a = document.createElement('a');
      a.href = v; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = v.replace(/^https?:\/\//, '').slice(0, 44) + (v.length > 52 ? '…' : '');
      dd.appendChild(a);
    } else dd.textContent = v;
    dl.append(dt, dd);
  }

  const nb = $('#nb');
  nb.innerHTML = '';
  for (const j of it.nn) {
    const o = state.items[j];
    if (!o || !o.ready) continue;
    const sim = similarityPercent(i, j);
    const b = document.createElement('button');
    b.type = 'button';
    b.title = `${o.r.subject || o.r.id}${sim ? ` · Affinità ${sim}%` : ''}`;
    const c = document.createElement('canvas');
    c.width = c.height = 56;
    c.getContext('2d').drawImage(o.th, 0, 0, 56, 56);
    b.appendChild(c);
    if (sim) {
      const badge = document.createElement('span');
      badge.className = 'nb-sim';
      badge.textContent = `${sim}%`;
      b.appendChild(badge);
    }
    b.onclick = () => show(j);
    nb.appendChild(b);
  }

  const tok = ++loadToken;
  big.classList.remove('can-zoom');
  big.onclick = null;
  if (it.th) {
    big.src = it.th.toDataURL('image/jpeg', 0.9);
    big.alt = r.subject || r.id;
    big.classList.add('is-soft');
  }
  if (it.src) {
    const full = new Image();
    full.onload = () => {
      if (tok !== loadToken) return;
      big.src = it.src;
      big.classList.remove('is-soft');
      big.classList.add('can-zoom');
      big.onclick = openLightbox;
      if (!lightbox.hidden) {
        lbImg.src = it.src;
        lbImg.alt = r.subject || r.id;
        lbCaption.textContent = `SPECIMEN // ${specNo} · ${r.id} — ${r.subject || r.id}`;
      }
    };
    full.src = it.src;
  } else {
    big.classList.remove('is-soft');
  }

  drawer.removeAttribute('inert');
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('has-sel');
  history.replaceState(null, '', '#' + encodeURIComponent(r.id));

  if (!state.ecoMode) {
    state.fx.push({
      it, c: state.col[it.cat], t0: performance.now(),
      sp: Array.from({ length: 14 }, (_, k) => ({
        a: k * Math.PI * 2 / 14 + Math.random() * 0.3,
        v: 50 + Math.random() * 75
      }))
    });
  }
  focusOn(it);
  markDirty();
}

export function stepSelection(delta) {
  if (state.specimenSel >= 0) {
    stepSpecimen(delta);
    return;
  }
  if (state.sel < 0) return;
  const visIndices = [];
  for (let i = 0; i < state.items.length; i++) {
    if (state.items[i].vis && state.items[i].ready) visIndices.push(i);
  }
  if (visIndices.length < 2) return;
  const pos = visIndices.indexOf(state.sel);
  const nextPos = pos < 0 ? 0 : (pos + delta + visIndices.length) % visIndices.length;
  show(visIndices[nextPos]);
}

function openLightbox() {
  const it = state.items[state.sel];
  if (!it || !it.src) return;
  playClick(680);
  const specNo = String((it.cardIdx ?? state.sel) + 1).padStart(2, '0');
  lbImg.src = it.src;
  lbImg.alt = it.r.subject || it.r.id;
  lbCaption.textContent = `SPECIMEN // ${specNo} · ${it.r.id} — ${it.r.subject || it.r.id}`;
  syncOpticalGrid();
  lightbox.hidden = false;
  $('#lb-close').focus();
}

export function closeLightbox() {
  if (lightbox.hidden) return;
  playClick(420);
  lightbox.hidden = true;
  lbImg.removeAttribute('src');
  if (big.classList.contains('can-zoom')) big.focus();
}

export function closeSelection() {
  if (state.sel < 0 && state.specimenSel < 0) return;
  playClick(400);
  state.sel = -1;
  state.specimenSel = -1;
  state.calloutSel = -1;
  state.calloutHov = -1;
  syncOrbitHUD();
  closeLightbox();
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('inert', '');
  document.body.classList.remove('has-sel');
  history.replaceState(null, '', location.pathname + location.search);
  releaseFocus();
  if (opener && opener.focus) opener.focus();
  opener = null;
}

export function applyHash() {
  const raw = decodeURIComponent(location.hash.slice(1));
  if (!raw) return;
  if (raw.startsWith('archetipo-')) {
    const id = raw.slice('archetipo-'.length);
    const sIdx = SPECIMENS.findIndex(s => s.id === id);
    if (sIdx >= 0) showSpecimen(sIdx);
    return;
  }
  const i = state.items.findIndex(x => x.r.id === raw);
  if (i >= 0) show(i);
}

/* ---------- impostazioni: tema, palette e controlli ---------- */
const THEME_STATUS_TEXT = {
  auto: 'Automatico · segue il sistema',
  light: 'Chiaro · pergamena museale',
  dark: 'Scuro · osservatorio notturno'
};

function syncQuickThemeIcon() {
  const ic = $('#quick-theme-ic use');
  if (!ic) return;
  const map = { auto: '#i-auto', light: '#i-sun', dark: '#i-moon' };
  ic.setAttribute('href', map[state.themeMode] || '#i-auto');
}

function buildPaletteGrid() {
  const grid = $('#palette-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const resolved = getResolvedTheme();
  for (const pal of PALETTES) {
    const isAct = state.palette === pal.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pal-card${isAct ? ' is-active' : ''}`;
    btn.dataset.paletteId = pal.id;
    btn.setAttribute('aria-pressed', String(isAct));

    const themeSet = pal[resolved] || pal.dark;
    const sw = [themeSet.css['--bg'], themeSet.css['--acc'], themeSet.css['--ink']];
    btn.innerHTML = `
      <span class="pal-swatch" aria-hidden="true">
        <i style="background:${sw[0]}"></i>
        <i style="background:${sw[1]}"></i>
        <i style="background:${sw[2]}"></i>
      </span>
      <span class="pal-meta">
        <strong>${esc(pal.name)}</strong>
        <small>${esc(pal.subtitle)}</small>
      </span>
      <span class="pal-check" aria-hidden="true">✓</span>
    `;
    btn.onclick = () => selectPalette(pal.id, true);
    grid.appendChild(btn);
  }
}

export function syncThemeUI() {
  const seg = $('#theme-seg');
  if (seg) {
    seg.dataset.mode = state.themeMode;
    seg.querySelectorAll('button').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.themeMode === state.themeMode));
    });
  }
  const st = $('#theme-status');
  if (st) st.textContent = THEME_STATUS_TEXT[state.themeMode] || '';
  syncQuickThemeIcon();
  buildPaletteGrid();
  refreshChipColors();
  syncOrbitHUD();
}

export function selectPalette(id, announce = true) {
  if (!PALETTE_MAP.has(id)) return;
  unlockAudio();
  applyPalette(id);
  syncThemeUI();
  playThemeSwitch();
  if (announce) {
    const pal = PALETTE_MAP.get(id);
    msg(`Stile attivo: ${pal.name}`);
  }
}

export function cyclePalette() {
  const idx = PALETTES.findIndex(p => p.id === state.palette);
  const next = PALETTES[(idx + 1) % PALETTES.length];
  selectPalette(next.id, true);
}

export function selectThemeMode(mode, announce = true) {
  unlockAudio();
  applyThemeMode(mode);
  syncThemeUI();
  playThemeSwitch();
  if (announce) {
    const label = mode === 'auto' ? 'Automatico (sistema)' : mode === 'light' ? 'Chiaro' : 'Scuro';
    msg(`Tema: ${label}`);
  }
}

export function cycleThemeMode() {
  const order = ['auto', 'light', 'dark'];
  const next = order[(order.indexOf(state.themeMode) + 1) % order.length];
  selectThemeMode(next, true);
}

/* ---------- vista, rotazione, modalità, pannelli ---------- */
export function setViewMode(mode) {
  if (state.viewMode === mode) return;
  playSwitch(mode);

  // Se era attiva la vista orbitale 3D di un archetipo e si passa alla mappa,
  // centra il planisfero sul suo hub geografico
  let jumpHub = null;
  if (mode === 'geo' && state.specimenSel >= 0) {
    const spec = SPECIMENS[state.specimenSel];
    jumpHub = spec ? spec.hubId : null;
    state.specimenSel = -1;
    state.calloutSel = -1;
    state.calloutHov = -1;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    document.body.classList.remove('has-sel');
    releaseFocus();
  }

  state.viewMode = mode;
  document.body.dataset.view = mode;
  $('#seg').dataset.view = mode;
  $('#vw-3d').setAttribute('aria-pressed', String(mode === '3d'));
  $('#vw-geo').setAttribute('aria-pressed', String(mode === 'geo'));
  $('#rot-auto').hidden = mode !== '3d';
  state.switchT = performance.now();
  syncOrbitHUD();

  if (jumpHub) {
    const ref = state.items.find(it => it.hubId === jumpHub);
    if (ref) {
      const k = state.W <= 760 ? 2.4 : 2.8;
      const pt = geoToScreen(ref.lon, ref.lat, { x: 0, y: 0, k }, {});
      Object.assign(state.goalGeo, {
        k,
        x: state.W / 2 - pt.sx,
        y: state.H / 2 - pt.sy
      });
    }
  } else if (state.sel >= 0 && state.items[state.sel]) {
    focusOn(state.items[state.sel]);
  }
  markDirty();
}

export function setAutoRotate(on, user = true) {
  state.autoRotate = on;
  if (user) {
    state.autoRotatePref = on;
    playClick(on ? 600 : 430);
  }
  $('#rot-auto').setAttribute('aria-pressed', String(on));
  markDirty();
}

function setDisplayMode(m) {
  state.mode = m;
  playClick(m === 'thumb' ? 620 : 480);
  $('#md').setAttribute('aria-pressed', String(m === 'thumb'));
  markDirty();
}

function exportCSV() {
  playClick(720);
  const head = ['id', 'category', 'subject', 'site_name', 'lat', 'lon', 'x3d', 'y3d', 'z3d'];
  const escCSV = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.join(',')];
  for (const it of state.items) {
    if (!it.vis) continue;
    lines.push([
      it.r.id, it.cat, it.r.subject, it.siteName,
      it.lat.toFixed(4), it.lon.toFixed(4),
      it.tx.toFixed(4), it.ty.toFixed(4), it.tz.toFixed(4)
    ].map(escCSV).join(','));
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = `atlante-${state.viewMode}-${slug(state.palette)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  msg(`${lines.length - 1} coordinate esportate.`);
}

export const openWelcome = on => { $('#welcome').hidden = !on; };

let settingsOpener = null;
export function openSettings(on) {
  const el = $('#settings');
  if (on) {
    unlockAudio();
    playClick(580);
    settingsOpener = document.activeElement;
    syncThemeUI();
    el.hidden = false;
    $('#close-settings').focus();
  } else {
    if (el.hidden) return;
    playClick(420);
    el.hidden = true;
    if (settingsOpener && settingsOpener.focus) settingsOpener.focus();
    settingsOpener = null;
  }
}

let contactsOpener = null;
export function openContacts(on) {
  const el = $('#contacts');
  if (on) {
    unlockAudio();
    playClick(580);
    contactsOpener = document.activeElement;
    el.hidden = false;
    $('#close-contacts').focus();
  } else {
    if (el.hidden) return;
    playClick(420);
    el.hidden = true;
    if (contactsOpener && contactsOpener.focus) contactsOpener.focus();
    contactsOpener = null;
  }
}

export function setLoader(done, total, label = 'Carico le tavole') {
  const el = $('#loader');
  if (done == null) return el.classList.remove('is-on');
  el.classList.add('is-on');
  $('#ld-text').textContent = `${label} · ${Math.round(done)}/${total}`;
  $('#ld-bar').style.width = `${total ? (done / total) * 100 : 0}%`;
}

function setEcoMode(on) {
  state.ecoMode = on;
  document.body.classList.toggle('is-eco', on);
  if (on) {
    state.fx.length = 0;
    setAutoRotate(false, false);
  } else if (state.autoRotatePref) {
    setAutoRotate(true, false);
  }
  markDirty();
}

/* ---------- collegamenti eventi ---------- */
export function bindUI() {
  initThemeSystem();
  if (RM) document.body.classList.add('is-eco');

  const q = $('#q');
  q.oninput = () => {
    state.q = q.value.trim().toLowerCase();
    refreshVis();
    updateCount();
  };

  $('#vw-3d').onclick = () => { unlockAudio(); setViewMode('3d'); };
  $('#vw-geo').onclick = () => { unlockAudio(); setViewMode('geo'); };
  $('#rot-auto').onclick = () => { unlockAudio(); setAutoRotate(!state.autoRotate); };
  $('#md').onclick = () => { unlockAudio(); setDisplayMode(state.mode === 'thumb' ? 'dot' : 'thumb'); };
  $('#zi').onclick = () => { unlockAudio(); playClick(640); zoomBy(1.3); };
  $('#zo').onclick = () => { unlockAudio(); playClick(460); zoomBy(1 / 1.3); };
  $('#zr').onclick = () => { unlockAudio(); playClick(520); resetView(); };
  $('#quick-pal').onclick = cyclePalette;
  $('#quick-theme').onclick = cycleThemeMode;
  $('#cp').onclick = () => { unlockAudio(); exportCSV(); };
  $('#open-data').onclick = () => { unlockAudio(); playClick(560); openWelcome(true); };
  $('#close-welcome').onclick = () => { playClick(420); openWelcome(false); };
  $('#open-settings').onclick = () => openSettings(true);
  $('#close-settings').onclick = () => openSettings(false);
  $('#open-contacts').onclick = () => openContacts(true);
  $('#close-contacts').onclick = () => openContacts(false);
  $('#close-det').onclick = closeSelection;
  $('#exit-orbit').onclick = closeSelection;
  $('#prev-item').onclick = () => { unlockAudio(); stepSelection(-1); };
  $('#next-item').onclick = () => { unlockAudio(); stepSelection(1); };
  $('#toggle-grid').onclick = () => { unlockAudio(); toggleOpticalGrid(); };
  $('#lb-grid').onclick = () => { unlockAudio(); toggleOpticalGrid(); };
  $('#lb-prev').onclick = e => { e.stopPropagation(); unlockAudio(); stepSelection(-1); };
  $('#lb-next').onclick = e => { e.stopPropagation(); unlockAudio(); stepSelection(1); };
  $('#lb-close').onclick = closeLightbox;

  // Pulsanti tema nella modale Impostazioni
  document.querySelectorAll('#theme-seg button').forEach(b => {
    b.onclick = () => selectThemeMode(b.dataset.themeMode, true);
  });

  // Opzioni audio & prestazioni
  const optSound = $('#opt-sound');
  const optMusic = $('#opt-music');
  const optEco = $('#opt-eco');
  optSound.checked = state.soundEnabled;
  optMusic.checked = state.musicEnabled;
  optEco.checked = state.ecoMode;

  optSound.onchange = () => {
    state.soundEnabled = optSound.checked;
    if (state.soundEnabled) { unlockAudio(); playClick(640); }
  };
  optMusic.onchange = () => {
    state.musicEnabled = optMusic.checked;
    unlockAudio();
    syncMusic();
    playClick(state.musicEnabled ? 660 : 420);
  };
  optEco.onchange = () => {
    setEcoMode(optEco.checked);
    playClick(state.ecoMode ? 420 : 620);
    msg(state.ecoMode ? 'Risparmio energetico attivo (30 fps)' : 'Resa visiva completa ripristinata');
  };

  lightbox.onclick = e => {
    if (e.target === lightbox || e.target === lbImg) closeLightbox();
  };
  for (const [id, fn] of [
    ['#welcome', () => openWelcome(false)],
    ['#settings', () => openSettings(false)],
    ['#contacts', () => openContacts(false)]
  ]) {
    const el = $(id);
    el.onclick = e => { if (e.target === el) fn(); };
  }

  window.addEventListener('hashchange', applyHash);
  window.addEventListener('atlante:themechange', () => {
    if (!$('#settings').hidden) syncThemeUI();
    else syncQuickThemeIcon();
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!lightbox.hidden) return closeLightbox();
      if (!$('#settings').hidden) return openSettings(false);
      if (!$('#contacts').hidden) return openContacts(false);
      if (!$('#welcome').hidden) return openWelcome(false);
      return closeSelection();
    }
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepSelection(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stepSelection(1); }
    else if (e.key === '/') { e.preventDefault(); q.focus(); }
    else if (e.key === '+' || e.key === '=') zoomBy(1.25);
    else if (e.key === '-') zoomBy(1 / 1.25);
    else if (e.key === '0') resetView();
    else if (e.key === ' ' && state.viewMode === '3d') { e.preventDefault(); setAutoRotate(!state.autoRotate); }
    else if (e.key === 'g' || e.key === 'G') setViewMode(state.viewMode === '3d' ? 'geo' : '3d');
    else if (e.key === 'p' || e.key === 'P') cyclePalette();
    else if (e.key === 't' || e.key === 'T') cycleThemeMode();
    else if ((e.key === 'r' || e.key === 'R') && (state.sel >= 0 || !lightbox.hidden)) toggleOpticalGrid();
  });
}
