/* ============================================================
   loader.js — caricamento di CSV e immagini (automatico, da file
   o dati di esempio), vicini visivi e layout finale
   ============================================================ */
import { CONFIG, state, msg, parseCSV, setItemImage, feat, prep, tsne3D, refreshVis, markDirty } from './data.js';
import { assignHubRanks } from './geo.js';
import {
  initItemsSkeleton, buildChips, updateCount, setLoader, openWelcome, closeSelection
} from './ui.js';

const $ = s => document.querySelector(s);
const K = 5;

/** Le K tavole visivamente più simili a ciascuna (distanze nello spazio delle feature). */
function computeNeighbors() {
  const { items, Dm } = state, n = items.length;
  for (let i = 0; i < n; i++) {
    const best = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const d = Dm[i * n + j];
      if (best.length < K || d < best[best.length - 1][1]) {
        best.push([j, d]);
        best.sort((a, b) => a[1] - b[1]);
        if (best.length > K) best.pop();
      }
    }
    items[i].nn = best.map(b => b[0]);
  }
}

async function finalizeLayout() {
  state.items = state.items.filter(it => it.ready);
  const n = state.items.length;
  if (!n) {
    msg('Nessuna immagine trovata: controlla i nomi dei file nel CSV.', 0);
    return openWelcome(true);
  }
  assignHubRanks(state.items);
  buildChips();
  refreshVis();
  updateCount();
  if (n < 2) {
    Object.assign(state.items[0], { tx: 0, ty: 0, tz: 0 });
    return;
  }
  const F = prep(state.items.map(i => feat(i.th)));
  await tsne3D(F, p => setLoader(p * 100, 100, 'Dispongo le tavole'));
  computeNeighbors();
  markDirty();
}

/** `resolver(riga, indice)` deve restituire `{ bitmap, src }` oppure null. */
async function loadRows(rows, resolver) {
  if (state.busy) return;
  state.busy = true;
  closeSelection();
  initItemsSkeleton(rows);
  openWelcome(false);

  const total = rows.length;
  const queue = rows.map((_, i) => i);
  let done = 0, miss = 0;
  setLoader(0, total);

  const worker = async () => {
    while (queue.length) {
      const i = queue.shift();
      try {
        const res = await resolver(rows[i], i);
        if (!res) throw new Error('missing');
        setItemImage(state.items[i], res.bitmap, i);
        state.items[i].src = res.src || null;
      } catch (_) { miss++; }
      setLoader(++done, total);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONFIG.concurrency, total) }, worker));
  await finalizeLayout();
  setLoader(null);
  const ok = state.items.length;
  msg(miss ? `${ok} tavole pronte, ${miss} senza immagine corrispondente.` : `${ok} tavole pronte.`);
  state.busy = false;
}

/* ---------- caricamento automatico dal progetto ---------- */
export async function autoload() {
  try {
    const res = await fetch(CONFIG.csv);
    if (!res.ok) throw new Error('csv');
    const rows = parseCSV(await res.text());
    if (!rows.length) throw new Error('vuoto');
    await loadRows(rows, async row => {
      const f = (row.filename || '').trim();
      if (!f) return null;
      const src = CONFIG.images + f.split('/').map(encodeURIComponent).join('/');
      const rs = await fetch(src);
      if (!rs.ok) return null;
      return { bitmap: await createImageBitmap(await rs.blob()), src };
    });
  } catch (_) {
    state.busy = false;
    setLoader(null);
    openWelcome(true);
    msg('Database non trovato: apri il progetto da un server oppure scegli i file.', 5000);
  }
}

/* ---------- dati di esempio ---------- */
function samplePlate(k) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const hue = [32, 12, 98][k] + Math.random() * 14;
  const bg = g.createLinearGradient(0, 0, 128, 128);
  bg.addColorStop(0, `hsl(${hue} 42% ${24 + Math.random() * 14}%)`);
  bg.addColorStop(1, `hsl(${hue + 14} 50% ${44 + Math.random() * 18}%)`);
  g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = g.fillStyle = `hsl(${hue + 20} 70% 78%)`;
  g.lineWidth = 2;
  if (k === 0) {
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(30, 96); g.lineTo(30 + Math.cos(-1.2 + i * 0.18) * 80, 96 + Math.sin(-1.2 + i * 0.18) * 80); g.stroke(); }
  } else if (k === 1) {
    g.beginPath(); g.ellipse(64, 70, 34, 26, -0.3, 0, 7); g.fill();
    g.fillStyle = '#ff6b4a'; g.beginPath(); g.arc(76, 62, 16, 0, 7); g.fill();
  } else {
    g.beginPath(); g.ellipse(60, 76, 36, 11, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(94, 70); g.quadraticCurveTo(110, 40, 124, 30); g.stroke();
  }
  return createImageBitmap(c);
}

async function loadExample() {
  const cats = ['Archaeopteryx', 'Pettirossi', 'Grilli'];
  const subj = ['Archaeopteryx lithographica', 'Pettirosso (Erithacus rubecula)', 'Grillo delle Hawaii (Teleogryllus oceanicus)'];
  const rows = Array.from({ length: 36 }, (_, i) => {
    const id = 'IMG_' + String(i + 1).padStart(4, '0');
    return { id, filename: id + '.jpg', subject: subj[i % 3], category: cats[i % 3] };
  });
  await loadRows(rows, async (_, i) => ({ bitmap: await samplePlate(i % 3), src: null }));
}

/* ---------- caricamento da file scelti dall'utente ---------- */
async function loadFromFiles() {
  const imgs = [...$('#fi').files];
  const csv = $('#fc').files[0];
  $('#wn').textContent = '';
  if (!imgs.length) { $('#wn').textContent = 'Seleziona prima le immagini.'; return; }
  const map = new Map(imgs.map(f => [f.name.toLowerCase(), f]));
  const rows = csv
    ? parseCSV(await csv.text())
    : imgs.map(f => ({ id: f.name.replace(/\.[^.]+$/, ''), filename: f.name }));
  await loadRows(rows, async row => {
    const f = map.get((row.filename || '').toLowerCase());
    return f ? { bitmap: await createImageBitmap(f), src: URL.createObjectURL(f) } : null;
  });
}

export function bindLoaderUI() {
  $('#go').onclick = loadFromFiles;
  $('#ex').onclick = loadExample;
}
