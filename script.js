const CSV_PATH = '02_database/database_immagini.csv';
const IMG_FOLDER = '01_immagini/';

let dataset = [];
let filteredIds = new Set();
let currentModalIndex = 0;

// Stato trasformazione Mappa (Pan & Zoom)
let scale = 0.55;
let panX = 40;
let panY = 20;
let isDragging = false;
let startX = 0;
let startY = 0;

// Riferimenti DOM
const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const nodesContainer = document.getElementById('nodes-container');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const taxonSelect = document.getElementById('taxon-select');
const categoryPills = document.querySelectorAll('#category-filters .pill');
const modal = document.getElementById('detail-modal');

// --- 1. PARSER CSV ROBUSTO (supporta sia virgola che punto e virgola e virgolette) ---
function parseCSV(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r') i++;
      row.push(current.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell !== '')) rows.push(row);
  }

  const headers = rows[0].map(h => h.toLowerCase().trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? r[idx] : '';
    });
    return normalizeRecord(obj);
  });
}

// Normalizza i campi mancanti (molte righe nel tuo database hanno subject/category vuoti)
function normalizeRecord(raw) {
  const rawCat = (raw.category || '').trim();
  let normCategory = 'Non classificato';

  if (/fossile/i.test(rawCat)) normCategory = 'Fossile';
  else if (/illustrazione/i.test(rawCat)) normCategory = 'Illustrazione';
  else if (/animale vivente/i.test(rawCat)) normCategory = 'Animale vivente';

  const subject = (raw.subject || '').trim() || 'Tavola da catalogare';
  const author = (raw.author || '').trim() || 'non noto';
  const notes = (raw.notes || '').trim() || 'Nessuna nota aggiuntiva.';

  return {
    id: raw.id || 'N/D',
    filename: raw.filename || '',
    subject,
    rawCategory: rawCat || 'da classificare',
    normCategory,
    source: raw.source || '',
    author,
    notes
  };
}

// --- 2. POSIZIONAMENTO SULLA MAPPA EVOLUTIVA ---
function computeMapCoordinates(items) {
  // Suddivide i record nelle 3 macro-zone dell'atlante:
  // Zona 1 (x: 110..810): Fossili & Teropodi
  // Zona 2 (x: 950..1650): Illustrazioni & Paleoarte
  // Zona 3 (x: 1790..2490): Animali viventi (Pettirosso) & Tavole da classificare
  const zones = {
    'Fossile': { baseX: 115, cols: 4, items: [] },
    'Illustrazione': { baseX: 955, cols: 4, items: [] },
    'ModernAndUnclassified': { baseX: 1795, cols: 4, items: [] }
  };

  items.forEach(item => {
    if (item.normCategory === 'Fossile' || /teropode/i.test(item.subject)) {
      zones['Fossile'].items.push(item);
    } else if (item.normCategory === 'Illustrazione') {
      zones['Illustrazione'].items.push(item);
    } else {
      zones['ModernAndUnclassified'].items.push(item);
    }
  });

  Object.values(zones).forEach(zone => {
    zone.items.forEach((item, idx) => {
      const col = idx % zone.cols;
      const row = Math.floor(idx / zone.cols);
      // Leggero offset organico per un effetto atlante naturalistico
      const jitterX = ((idx * 17) % 14) - 7;
      const jitterY = ((idx * 23) % 12) - 6;

      item.x = zone.baseX + col * 178 + jitterX;
      item.y = 235 + row * 195 + jitterY;
    });
  });
}

function getCategoryColor(normCategory) {
  switch (normCategory) {
    case 'Fossile': return 'var(--col-fossile)';
    case 'Illustrazione': return 'var(--col-illustrazione)';
    case 'Animale vivente': return 'var(--col-vivente)';
    default: return 'var(--col-altro)';
  }
}

// --- 3. RENDERING DEI NODI ---
function renderNodes() {
  nodesContainer.innerHTML = '';

  dataset.forEach((item, index) => {
    const node = document.createElement('article');
    node.className = 'map-node';
    node.dataset.id = item.id;
    node.style.left = `${item.x}px`;
    node.style.top = `${item.y}px`;

    const color = getCategoryColor(item.normCategory);
    const imgPath = `${IMG_FOLDER}${item.filename}`;

    node.innerHTML = `
      <div class="node-thumb-wrap">
        <span class="node-id-tag">${item.id}</span>
        <img src="${imgPath}" alt="${item.subject}" loading="lazy"
             onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22140%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23dcd5c7%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2212%22 fill=%22%235c584f%22>${item.filename}</text></svg>'" />
        <div class="node-cat-stripe" style="background:${color}"></div>
      </div>
      <div class="node-meta">
        <div class="node-title" title="${item.subject}">${item.subject}</div>
        <div class="node-cat-label">${item.normCategory}</div>
      </div>
    `;

    node.addEventListener('click', () => openModal(index));
    nodesContainer.appendChild(node);
  });
}

// --- 4. FILTRI E RICERCA ---
let activeCategory = 'ALL';

function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const taxon = taxonSelect.value;
  clearSearchBtn.style.display = query ? 'block' : 'none';

  let visible = 0;
  filteredIds.clear();

  dataset.forEach(item => {
    const matchCat = activeCategory === 'ALL' || item.normCategory === activeCategory;

    let matchTaxon = true;
    if (taxon === 'Archaeopteryx') {
      matchTaxon = /archaeopteryx/i.test(item.subject);
    } else if (taxon === 'Pettirosso') {
      matchTaxon = /pettirosso|erithacus/i.test(item.subject);
    } else if (taxon === 'Teropode') {
      matchTaxon = /teropode/i.test(item.subject);
    } else if (taxon === 'NON_SPECIFICATO') {
      matchTaxon = item.subject === 'Tavola da catalogare';
    }

    const haystack = `${item.id} ${item.filename} ${item.subject} ${item.author} ${item.notes} ${item.rawCategory}`.toLowerCase();
    const matchSearch = !query || haystack.includes(query);

    const isMatch = matchCat && matchTaxon && matchSearch;
    const nodeEl = nodesContainer.querySelector(`[data-id="${item.id}"]`);

    if (isMatch) {
      visible++;
      filteredIds.add(item.id);
      if (nodeEl) nodeEl.classList.remove('is-filtered-out');
    } else {
      if (nodeEl) nodeEl.classList.add('is-filtered-out');
    }
  });

  document.getElementById('visible-count').textContent = visible;
}

categoryPills.forEach(pill => {
  pill.addEventListener('click', () => {
    categoryPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeCategory = pill.dataset.category;
    applyFilters();
  });
});

searchInput.addEventListener('input', applyFilters);
clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  applyFilters();
});
taxonSelect.addEventListener('change', applyFilters);

// --- 5. CONTROLLI PAN & ZOOM DELLA MAPPA ---
function updateTransform() {
  canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function fitMapToScreen() {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const scaleX = vw / 2600;
  const scaleY = vh / 1600;
  scale = Math.min(scaleX, scaleY) * 0.94;
  panX = (vw - 2600 * scale) / 2;
  panY = (vh - 1600 * scale) / 2;
  updateTransform();
}

viewport.addEventListener('mousedown', e => {
  if (!viewport.classList.contains('mode-map')) return;
  if (e.target.closest('.map-node') || e.target.closest('.map-hud')) return;
  isDragging = true;
  startX = e.clientX - panX;
  startY = e.clientY - panY;
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  panX = e.clientX - startX;
  panY = e.clientY - startY;
  updateTransform();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

viewport.addEventListener('wheel', e => {
  if (!viewport.classList.contains('mode-map')) return;
  e.preventDefault();

  const rect = viewport.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
  const newScale = Math.min(Math.max(scale * zoomFactor, 0.25), 2.5);

  panX = mouseX - (mouseX - panX) * (newScale / scale);
  panY = mouseY - (mouseY - panY) * (newScale / scale);
  scale = newScale;

  updateTransform();
}, { passive: false });

document.getElementById('zoom-in').addEventListener('click', () => {
  scale = Math.min(scale * 1.2, 2.5);
  updateTransform();
});

document.getElementById('zoom-out').addEventListener('click', () => {
  scale = Math.max(scale * 0.8, 0.25);
  updateTransform();
});

document.getElementById('zoom-reset').addEventListener('click', fitMapToScreen);

// Cambio vista Mappa <-> Griglia
const btnViewMap = document.getElementById('btn-view-map');
const btnViewGrid = document.getElementById('btn-view-grid');

btnViewMap.addEventListener('click', () => {
  viewport.classList.remove('mode-grid');
  viewport.classList.add('mode-map');
  btnViewMap.classList.add('active');
  btnViewGrid.classList.remove('active');
  fitMapToScreen();
});

btnViewGrid.addEventListener('click', () => {
  viewport.classList.remove('mode-map');
  viewport.classList.add('mode-grid');
  btnViewGrid.classList.add('active');
  btnViewMap.classList.remove('active');
});

// --- 6. MODALE / LIGHTBOX DETTAGLI ---
function openModal(index) {
  currentModalIndex = index;
  const item = dataset[index];
  if (!item) return;

  document.getElementById('modal-img').src = `${IMG_FOLDER}${item.filename}`;
  document.getElementById('modal-id').textContent = item.id;
  document.getElementById('modal-filename').textContent = item.filename;
  document.getElementById('modal-subject').textContent = item.subject;
  document.getElementById('modal-author').textContent = item.author;
  document.getElementById('modal-notes').textContent = item.notes;

  const badge = document.getElementById('modal-category-badge');
  badge.textContent = item.normCategory;
  badge.style.background = getCategoryColor(item.normCategory);

  const sourceLink = document.getElementById('modal-source');
  if (item.source && item.source.startsWith('http')) {
    sourceLink.href = item.source;
    sourceLink.textContent = new URL(item.source).hostname + ' ↗';
    sourceLink.style.pointerEvents = 'auto';
  } else {
    sourceLink.href = '#';
    sourceLink.textContent = item.source || 'Fonte non disponibile';
    sourceLink.style.pointerEvents = 'none';
  }

  if (!modal.open) modal.showModal();
}

document.getElementById('close-modal').addEventListener('click', () => modal.close());
modal.addEventListener('click', e => {
  if (e.target === modal) modal.close();
});

document.getElementById('prev-item').addEventListener('click', () => {
  const prevIdx = (currentModalIndex - 1 + dataset.length) % dataset.length;
  openModal(prevIdx);
});

document.getElementById('next-item').addEventListener('click', () => {
  const nextIdx = (currentModalIndex + 1) % dataset.length;
  openModal(nextIdx);
});

window.addEventListener('keydown', e => {
  if (!modal.open) return;
  if (e.key === 'ArrowLeft') document.getElementById('prev-item').click();
  if (e.key === 'ArrowRight') document.getElementById('next-item').click();
});

// --- 7. AVVIO ---
async function init() {
  try {
    const response = await fetch(CSV_PATH);
    if (!response.ok) throw new Error(`Impossibile caricare ${CSV_PATH}`);
    const csvText = await response.text();

    dataset = parseCSV(csvText);
    document.getElementById('total-count').textContent = dataset.length;
    document.getElementById('count-all').textContent = dataset.length;

    computeMapCoordinates(dataset);
    renderNodes();
    applyFilters();
    fitMapToScreen();
  } catch (err) {
    console.error(err);
    nodesContainer.innerHTML = `
      <div style="padding:2rem; font-family:sans-serif; color:#9a6b2f;">
        <h3>Errore nel caricamento del database</h3>
        <p>Assicurati che il file <code>${CSV_PATH}</code> sia presente e che la pagina sia aperta tramite server web (es. GitHub Pages o Live Server, non doppio clic diretto su index.html).</p>
      </div>
    `;
  }
}

init();
