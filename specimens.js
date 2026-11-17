/* ============================================================
   specimens.js — archetipi evolutivi 3D ad alta definizione,
   piani orbitali dedicati, callout anatomici 3D e dossier
   ============================================================ */
import { state, RM, clamp, rgba } from './data.js';
import { getThemeTokens } from './theme.js';
import { project3D } from './view3d.js';

function buildOrbitalPlane(name, inclinationDeg, nodeDeg, radius, initialPhase, initialElev) {
  const inc = (inclinationDeg * Math.PI) / 180;
  const node = (nodeDeg * Math.PI) / 180;
  const ci = Math.cos(inc), si = Math.sin(inc);
  const cn = Math.cos(node), sn = Math.sin(node);

  // Base ortonormale (u, v, n) del piano orbitale inclinato nello spazio 3D
  // con n[1] >= 0 per mantenere sempre l'orientamento verticale coerente
  const u = [cn, 0, sn];
  const v = [-ci * sn, si, ci * cn];
  const n = [si * sn, ci, -si * cn];

  return {
    name,
    inclinationDeg,
    nodeDeg,
    radius,
    initialPhase,
    initialElev,
    u,
    v,
    n
  };
}

export const SPECIMENS = [
  {
    id: 'archaeopteryx',
    code: 'ARCHETIPO // 01',
    name: 'Archaeopteryx',
    scientificName: 'Archaeopteryx lithographica',
    authorTaxon: 'von Meyer, 1861',
    era: 'Giurassico Superiore · ~150 Ma',
    locality: 'Calcari di Solnhofen, Baviera',
    hubId: 'solnhofen',
    catKey: 'Archaeopteryx',
    artSlot: 'art1',
    anchor: { x: 0.08, y: -1.44, z: -0.32 },
    modelScale: 0.23,
    orbitalPlane: buildOrbitalPlane(
      'Piano Eclittico di Solnhofen',
      24,
      20,
      0.35,
      0.52,
      0.16
    ),
    summary:
      'Forma di transizione emblematica tra dinosauri teropodi maniraptori e uccelli moderni: conserva denti tecodonti, artigli manuali e una lunga coda ossea, ma possiede penne remiganti asimmetriche idonee al volo.',
    history: [
      'Scoperto nel 1861 nei calcari litografici finissimi della laguna giurassica di Solnhofen (Baviera), appena due anni dopo L’origine delle specie di Charles Darwin, Archaeopteryx lithographica offrì la prima spettacolare prova paleontologica del legame evolutivo tra dinosauri teropodi e uccelli.',
      'Le analisi di microtomografia a raggi X di sincrotrone sui dodici esemplari oggi conosciuti confermano un mosaico anatomico unico: la geometria delle ossa alari e l’asimmetria delle penne primarie attestano la capacità di volo attivo battuto su brevi distanze, pur mantenendo tratti rettiliani ancestrali.'
    ],
    callouts: [
      {
        id: 'remiges',
        code: '01',
        label: 'Remiganti asimmetriche',
        short: 'Vessillo aerodinamico per volo battuto',
        detail: 'Le penne primarie mostrano un vessillo esterno più stretto di quello interno, adattamento aerodinamico indispensabile per generare portanza e resistere alla torsione durante la battuta alare.',
        pos: [-0.14, -0.34, 0.72]
      },
      {
        id: 'claws',
        code: '02',
        label: 'Artigli manuali falciformi',
        short: 'Tre dita libere artigliate sull’ala',
        detail: 'A differenza degli uccelli moderni con carpometacarpo fuso, ogni ala conserva tre dita libere armate di artigli ricurvi utili per arrampicarsi o afferrare prede.',
        pos: [-0.46, -0.32, 0.38]
      },
      {
        id: 'tail',
        code: '03',
        label: 'Coda ossea piumata',
        short: 'Oltre 20 vertebre caudali libere',
        detail: 'Privo di pigostilo, possiede una lunga colonna vertebrale caudale rigida bordata bilateralmente da penne timoniere disposte a fronda.',
        pos: [0.98, 0.14, 0.04]
      },
      {
        id: 'teeth',
        code: '04',
        label: 'Denti tecodonti',
        short: 'Mascelle armate prive di becco corneo',
        detail: 'Il cranio rettiliano allungato ospita piccoli denti conici smaltati infissi in alveoli, eredità diretta degli antenati teropodi carnivori.',
        pos: [-0.94, -0.28, 0.0]
      },
      {
        id: 'furcula',
        code: '05',
        label: 'Furcula clavicolare',
        short: 'Clavicole fuse a V per i muscoli del volo',
        detail: 'La robusta furcula funge da molla elastica e punto di ancoraggio per i muscoli pettorali depressori dell’ala.',
        pos: [-0.34, 0.05, 0.14]
      }
    ]
  },

  {
    id: 'pettirosso',
    code: 'ARCHETIPO // 02',
    name: 'Pettirosso Europeo',
    scientificName: 'Erithacus rubecula',
    authorTaxon: 'Linnaeus, 1758',
    era: 'Olocene · Teropode aviano vivente',
    locality: 'Boschi misti paleartici · Europa / Italia',
    hubId: 'italia',
    catKey: 'Pettirossi',
    artSlot: 'art2',
    anchor: { x: -1.38, y: 0.74, z: 0.34 },
    modelScale: 0.22,
    orbitalPlane: buildOrbitalPlane(
      'Piano Bio-Acustico Boreale',
      29,
      -36,
      0.34,
      -0.42,
      0.17
    ),
    summary:
      'Discendente diretto dei dinosauri teropodi maniraptori: incarna la completa radiazione aviana con scheletro pneumatico leggero, becco corneo edentulo, pigostilo fuso e sofisticata comunicazione visivo-acustica.',
    history: [
      'Dal punto di vista filogenetico, ogni passeriforme vivente è un dinosauro teropode aviano. In 150 milioni di anni di evoluzione, la linea che da forme simili ad Archaeopteryx porta a Erithacus rubecula ha fuso le vertebre caudali nel pigostilo, sostituito i denti con un becco leggero e sviluppato uno sterno carenato ad alta efficienza.',
      'Celebre negli studi etologici di David Lack, il pettirosso impiega lo scudo pettorale arancio-rosso come segnale territoriale innato (difeso da entrambi i sessi tutto l’anno) e utilizza nella retina proteine criptocromo-4 sensibili al campo geomagnetico terrestre per orientarsi nelle migrazioni.'
    ],
    callouts: [
      {
        id: 'breast',
        code: '01',
        label: 'Scudo pettorale arancio',
        short: 'Segnale territoriale ad alta visibilità',
        detail: 'La macchia facciale e pettorale contrasta con il dorso bruno-olivastro, fungendo da stimolo chiave nelle dispute territoriali e nel corteggiamento.',
        pos: [0.46, -0.08, 0.24]
      },
      {
        id: 'syrinx',
        code: '02',
        label: 'Siringe bivocale',
        short: 'Organo fonatorio alla base della trachea',
        detail: 'Dotata di due coppie indipendenti di membrane vibranti, consente al pettirosso di modulare simultaneamente due frequenze sonore anche al crepuscolo.',
        pos: [0.22, -0.26, 0.14]
      },
      {
        id: 'beak',
        code: '03',
        label: 'Becco corneo edentulo',
        short: 'Rostro sottile per dieta insettivora',
        detail: 'La completa perdita dei denti e lo sviluppo della ranfoteca cornea alleggeriscono il cranio, ottimizzando la cattura rapida di insetti e larve.',
        pos: [0.76, -0.36, 0.0]
      },
      {
        id: 'pygostyle',
        code: '04',
        label: 'Pigostilo e timoniere',
        short: 'Vertebre caudali fuse in lamina',
        detail: 'La fusione delle ultime vertebre caudali sostiene a ventaglio le penne timoniere, garantendo virate fulminee nel folto del sottobosco.',
        pos: [-0.86, 0.34, 0.10]
      },
      {
        id: 'tarsus',
        code: '05',
        label: 'Tarso-metatarso slanciato',
        short: 'Articolazione aviana per salto e posa',
        detail: 'La fusione delle ossa tarsali e metatarsali crea una leva elastica leggera che consente sia il salto agile sul terreno sia la presa sicura sui rami.',
        pos: [0.06, 0.72, 0.16]
      }
    ]
  },

  {
    id: 'grillo',
    code: 'ARCHETIPO // 03',
    name: 'Grillo Silente di Kauai',
    scientificName: 'Teleogryllus oceanicus',
    authorTaxon: 'Le Guillou, 1841 · morfotipo flatwing',
    era: 'Antropocene · Evoluzione rapida (< 20 gen.)',
    locality: 'Isola di Kauai, Arcipelago delle Hawaii',
    hubId: 'kauai',
    catKey: 'Grilli',
    artSlot: 'art3',
    anchor: { x: 1.40, y: 0.70, z: -0.28 },
    modelScale: 0.23,
    orbitalPlane: buildOrbitalPlane(
      'Piano Insulare del Pacifico',
      17,
      112,
      0.34,
      2.35,
      0.16
    ),
    summary:
      'Uno dei casi più rapidi di selezione naturale osservati in tempo reale: in meno di venti generazioni, i maschi di Kauai hanno perso la lima stridulatoria alare diventando muti per sfuggire a una mosca parassita.',
    history: [
      'Introdotto nelle Hawaii, il grillo oceanico (Teleogryllus oceanicus) si è trovato esposto alla mosca parassitoide Ormia ochracea, dotata di un apparato uditivo direzionale capace di localizzare con precisione millimetrica il canto nuziale dei maschi per deporvi sopra le proprie larve letali.',
      'Come documentato dalla biologa evoluzionista Marlene Zuk tra il 2001 e il 2003 sull’isola di Kauai, una mutazione sul cromosoma X (detta flatwing) ha cancellato la lima e il plettro dalle tegmine maschili: in meno di 20 generazioni oltre il 90% dei maschi è divenuto silenzioso, sopravvivendo grazie a una strategia “satellite” accanto ai rari maschi ancora canori.'
    ],
    callouts: [
      {
        id: 'flatwing',
        code: '01',
        label: 'Tegmine piatte (flatwing)',
        short: 'Apparato stridulatore silenziato',
        detail: 'Le nervature delle ali anteriori maschili sono appiattite e prive della lima dentellata: sfregando le ali non producono alcun suono, eludendo la mosca parassitoide.',
        pos: [-0.12, -0.22, 0.24]
      },
      {
        id: 'antennae',
        code: '02',
        label: 'Antenne filiformi sensori',
        short: 'Orientamento tattile e chimico notturno',
        detail: 'L’assenza di richiamo acustico rende fondamentali le lunghe antenne multi-articolate per riconoscere i feromoni cuticolari delle femmine a breve distanza.',
        pos: [0.96, -0.46, 0.26]
      },
      {
        id: 'tympanum',
        code: '03',
        label: 'Organo timpanico tibiale',
        short: 'Recettore uditivo sulle zampe anteriori',
        detail: 'Situato sulle tibie protoraciche, consente ai maschi muti di intercettare il canto dei pochi maschi normo-alati e appostarsi silenziosamente nei loro pressi.',
        pos: [0.46, 0.44, 0.24]
      },
      {
        id: 'femur',
        code: '04',
        label: 'Femore posteriore saltatorio',
        short: 'Leva balistica per fuga immediata',
        detail: 'Il femore metatoracico ingrossato ospita fasci muscolari pennati che accumulano energia elastica per scatti fulminei nella vegetazione.',
        pos: [-0.52, -0.14, 0.28]
      },
      {
        id: 'cerci',
        code: '05',
        label: 'Cerci addominali',
        short: 'Sensori di micro-correnti d’aria',
        detail: 'Le due appendici posteriori rilevano le minime variazioni di pressione d’aria generate dall’avvicinamento di predatori o parassiti in volo.',
        pos: [-0.88, 0.08, 0.16]
      }
    ]
  }
];

/* ============================================================
   Runtime cache per hit-testing di organismi e callout 3D
   ============================================================ */
const specimenScreenBoxes = SPECIMENS.map(() => ({ sx: 0, sy: 0, r: 60, scale: 1 }));
let activeCalloutBoxes = [];

const _p = { sx: 0, sy: 0, scale: 1, zOrder: 0 };
const _p2 = { sx: 0, sy: 0, scale: 1, zOrder: 0 };
const _p3 = { sx: 0, sy: 0, scale: 1, zOrder: 0 };

function projLocal(spec, lx, ly, lz, out = _p) {
  const s = spec.modelScale;
  return project3D(
    spec.anchor.x + lx * s,
    spec.anchor.y + ly * s,
    spec.anchor.z + lz * s,
    out
  );
}

function specimenColor(spec) {
  return state.col[spec.catKey] || '#e5c58e';
}

/* ============================================================
   1. ARCHAEOPTERYX LITHOGRAPHICA — Ricostruzione 3D dettagliata
   ============================================================ */
function drawArchaeopteryx3D(cx, spec, t, sa, fa, col, rgb) {
  const rm = RM || state.ecoMode ? 0 : 1;
  const flutter = Math.sin(t * 0.0018) * 0.065 * rm;

  // 1. Gabbia toracica volumetrica (sezioni longitudinali + 7 costole dorsali e gastralia)
  cx.fillStyle = rgb + (fa * 1.15).toFixed(2) + ')';
  cx.strokeStyle = rgb + (0.72 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.4;
  for (const zOff of [-0.15, 0, 0.15]) {
    const ry = zOff === 0 ? 0.19 : 0.12;
    cx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      projLocal(spec, -0.02 + Math.cos(a) * 0.35, Math.sin(a) * ry, zOff, _p);
      if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    if (zOff === 0) cx.fill();
    cx.stroke();
  }

  // Costole dorsali trasversali 3D
  cx.strokeStyle = rgb + (0.42 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.05;
  for (let r = 0; r < 6; r++) {
    const rx = -0.22 + r * 0.075;
    const radY = 0.14 + Math.sin((r / 5) * Math.PI) * 0.05;
    const radZ = 0.12 + Math.sin((r / 5) * Math.PI) * 0.04;
    cx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      projLocal(spec, rx, Math.sin(a) * radY, Math.cos(a) * radZ, _p);
      if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  }

  // Cingolo pelvico (ileo, ischio, pube)
  cx.strokeStyle = rgb + (0.75 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.35;
  for (const side of [-1, 1]) {
    cx.beginPath();
    projLocal(spec, 0.14, -0.05, side * 0.11, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.30, -0.03, side * 0.10, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.22, 0.14, side * 0.09, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.08, 0.16, side * 0.08, _p); cx.lineTo(_p.sx, _p.sy);
    cx.stroke();
  }

  // Furcula clavicolare a V in 3D
  cx.strokeStyle = col;
  cx.lineWidth = 2.0;
  cx.beginPath();
  projLocal(spec, -0.32, -0.06, -0.15, _p); cx.moveTo(_p.sx, _p.sy);
  projLocal(spec, -0.36, 0.09, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, -0.32, -0.06, 0.15, _p); cx.lineTo(_p.sx, _p.sy);
  cx.stroke();

  // 2. Vertebre cervicali a S + cranio teropode con finestra antorbitale, orbita e denti
  const neckPts = [
    [-0.36, -0.04, 0],
    [-0.45, -0.10, 0],
    [-0.54, -0.19, 0],
    [-0.63, -0.28, 0],
    [-0.72, -0.32, 0]
  ];
  cx.strokeStyle = rgb + (0.82 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.7;
  cx.beginPath();
  neckPts.forEach(([x, y, z], idx) => {
    projLocal(spec, x, y, z, _p);
    if (idx === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  });
  cx.stroke();

  // Nodi vertebrali cervicali
  cx.fillStyle = rgb + (0.70 * sa).toFixed(2) + ')';
  for (let i = 1; i < neckPts.length - 1; i++) {
    projLocal(spec, neckPts[i][0], neckPts[i][1], 0, _p);
    cx.beginPath();
    cx.arc(_p.sx, _p.sy, Math.max(1.6, 2.4 * _p.scale), 0, Math.PI * 2);
    cx.fill();
  }

  // Cranio rettiliano 3D (mascella superiore + mandibola articolata)
  cx.fillStyle = rgb + (fa * 1.4).toFixed(2) + ')';
  cx.strokeStyle = rgb + (0.86 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.55;
  cx.beginPath();
  const upperSkull = [
    [-0.70, -0.37, 0],
    [-0.84, -0.37, 0],
    [-1.04, -0.30, 0],
    [-1.02, -0.27, 0],
    [-0.72, -0.28, 0]
  ];
  upperSkull.forEach(([x, y, z], idx) => {
    projLocal(spec, x, y, z, _p);
    if (idx === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  });
  cx.closePath();
  cx.fill();
  cx.stroke();

  // Mandibola inferiore
  cx.beginPath();
  projLocal(spec, -0.71, -0.25, 0, _p); cx.moveTo(_p.sx, _p.sy);
  projLocal(spec, -1.01, -0.25, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, -0.84, -0.22, 0, _p); cx.lineTo(_p.sx, _p.sy);
  cx.closePath();
  cx.stroke();

  // Finestra antorbitale + anello sclerotico orbitale
  cx.strokeStyle = col;
  cx.lineWidth = 1.1;
  projLocal(spec, -0.86, -0.32, 0.03, _p);
  cx.beginPath();
  cx.arc(_p.sx, _p.sy, Math.max(1.8, 2.6 * _p.scale), 0, Math.PI * 2);
  cx.stroke();

  projLocal(spec, -0.77, -0.33, 0.04, _p);
  cx.fillStyle = col;
  cx.beginPath();
  cx.arc(_p.sx, _p.sy, Math.max(2.3, 3.6 * _p.scale), 0, Math.PI * 2);
  cx.fill();

  // Denti tecodonti superiori e inferiori
  cx.strokeStyle = col;
  cx.lineWidth = 1.05;
  cx.beginPath();
  for (let d = 0; d < 6; d++) {
    const tx = -0.84 - d * 0.031;
    const ty = -0.275 - d * 0.004;
    projLocal(spec, tx, ty, 0.02, _p);
    projLocal(spec, tx - 0.006, ty + 0.026, 0.02, _p2);
    cx.moveTo(_p.sx, _p.sy);
    cx.lineTo(_p2.sx, _p2.sy);

    projLocal(spec, tx + 0.012, ty + 0.028, 0.02, _p);
    projLocal(spec, tx + 0.008, ty + 0.008, 0.02, _p2);
    cx.moveTo(_p.sx, _p.sy);
    cx.lineTo(_p2.sx, _p2.sy);
  }
  cx.stroke();

  // 3. Ali bilaterali 3D (Z = ±) con omero, radio/ulna, 3 artigli manuali e remiganti con rachide + vessillo
  for (const side of [-1, 1]) {
    const flapY = Math.sin(t * 0.0016 + side * 0.3) * 0.035 * rm;
    const sh = [-0.24, -0.06, side * 0.14];
    const el = [-0.14, -0.22 + flapY, side * 0.43];
    const wr = [-0.35, -0.31 + flapY * 1.25, side * 0.70];

    // Ossa dell'ala (omero + radio e ulna paralleli)
    cx.strokeStyle = rgb + (0.88 * sa).toFixed(2) + ')';
    cx.lineWidth = 2.0;
    cx.beginPath();
    projLocal(spec, sh[0], sh[1], sh[2], _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, el[0], el[1], el[2], _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, wr[0], wr[1], wr[2], _p); cx.lineTo(_p.sx, _p.sy);
    cx.stroke();

    // Radio sottile parallelo all'ulna
    cx.lineWidth = 1.15;
    cx.beginPath();
    projLocal(spec, el[0] - 0.03, el[1] - 0.02, el[2], _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, wr[0] - 0.02, wr[1] - 0.02, wr[2], _p); cx.lineTo(_p.sx, _p.sy);
    cx.stroke();

    // 3 dita manuali allungate con falangi e artigli ricurvi
    cx.strokeStyle = col;
    cx.lineWidth = 1.45;
    cx.beginPath();
    for (let c = 0; c < 3; c++) {
      const fLen = 0.09 + c * 0.028;
      const bx = wr[0] - c * 0.038;
      const by = wr[1] - c * 0.028;
      const bz = wr[2] - side * c * 0.05;
      const jx = bx - fLen * 0.7;
      const jy = by - fLen * 0.35;
      const jz = bz + side * 0.02;
      const tx = jx - 0.055;
      const ty = jy + 0.028;
      const tz = jz + side * 0.02;
      projLocal(spec, bx, by, bz, _p);
      projLocal(spec, jx, jy, jz, _p2);
      projLocal(spec, tx, ty, tz, _p3);
      cx.moveTo(_p.sx, _p.sy);
      cx.lineTo(_p2.sx, _p2.sy);
      cx.quadraticCurveTo((_p2.sx + _p3.sx) * 0.5, (_p2.sy + _p3.sy) * 0.5 - 3, _p3.sx, _p3.sy);
    }
    cx.stroke();

    // 12 Penne remiganti primarie e secondarie con rachide + contorno del vessillo asimmetrico
    for (let f = 0; f < 12; f++) {
      const u = f / 11;
      const rootX = el[0] - u * 0.21;
      const rootY = el[1] - u * 0.09;
      const rootZ = el[2] + side * (u * 0.27);
      const len = 0.34 + Math.sin(u * Math.PI * 0.85) * 0.28;
      const ang = -0.42 + u * 1.18 + flutter;
      const tipX = rootX + Math.sin(ang) * len;
      const tipY = rootY - Math.cos(ang) * len * 0.40 + flapY * 1.5;
      const tipZ = rootZ + side * (0.16 + Math.cos(ang) * 0.24);

      projLocal(spec, rootX, rootY, rootZ, _p);
      projLocal(spec, tipX, tipY, tipZ, _p2);

      // Rachide centrale
      cx.strokeStyle = rgb + (0.72 * sa).toFixed(2) + ')';
      cx.lineWidth = 1.25;
      cx.beginPath();
      cx.moveTo(_p.sx, _p.sy);
      cx.lineTo(_p2.sx, _p2.sy);
      cx.stroke();

      // Vessillo asimmetrico della penna
      const vx = _p2.sx - _p.sx;
      const vy = _p2.sy - _p.sy;
      const vLen = Math.hypot(vx, vy) || 1;
      const nx = -vy / vLen;
      const ny = vx / vLen;
      const wOuter = Math.min(4.2, vLen * 0.075);
      const wInner = Math.min(7.5, vLen * 0.135);

      cx.fillStyle = rgb + (fa * 0.95).toFixed(2) + ')';
      cx.strokeStyle = rgb + (0.36 * sa).toFixed(2) + ')';
      cx.lineWidth = 0.85;
      cx.beginPath();
      cx.moveTo(_p.sx, _p.sy);
      cx.quadraticCurveTo(
        (_p.sx + _p2.sx) * 0.5 + nx * wOuter,
        (_p.sy + _p2.sy) * 0.5 + ny * wOuter,
        _p2.sx,
        _p2.sy
      );
      cx.quadraticCurveTo(
        (_p.sx + _p2.sx) * 0.5 - nx * wInner,
        (_p.sy + _p2.sy) * 0.5 - ny * wInner,
        _p.sx,
        _p.sy
      );
      cx.fill();
      cx.stroke();
    }
  }

  // 4. Lunga coda ossea a 22 vertebre + fronda di penne timoniere bilaterali
  cx.strokeStyle = rgb + (0.85 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.7;
  cx.beginPath();
  for (let v = 0; v <= 14; v++) {
    const u = v / 14;
    projLocal(spec, 0.28 + u * 0.94, 0.02 + u * 0.14 + Math.sin(u * 2.2) * 0.015, 0, _p);
    if (v === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  }
  cx.stroke();

  // Timoniere caudali a fronda
  for (let i = 1; i <= 12; i++) {
    const u = i / 12;
    const bx = 0.34 + u * 0.86;
    const by = 0.028 + u * 0.13;
    const spanZ = 0.07 + Math.sin(u * Math.PI) * 0.18;
    for (const side of [-1, 1]) {
      projLocal(spec, bx, by, 0, _p);
      projLocal(spec, bx + 0.13, by + 0.022, side * spanZ, _p2);
      cx.strokeStyle = rgb + (0.56 * sa).toFixed(2) + ')';
      cx.lineWidth = 1.15;
      cx.beginPath();
      cx.moveTo(_p.sx, _p.sy);
      cx.lineTo(_p2.sx, _p2.sy);
      cx.stroke();
    }
  }

  // 5. Arti posteriori teropodi (femore, tibiotarso, tarsometatarso + 3 dita e alluce)
  cx.strokeStyle = rgb + (0.78 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.55;
  cx.beginPath();
  for (const side of [-1, 1]) {
    const zLeg = side * 0.10;
    projLocal(spec, 0.12, 0.12, zLeg, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.00, 0.34, zLeg, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.11, 0.54, zLeg, _p); cx.lineTo(_p.sx, _p.sy);
    // Dita anteriori e alluce opponibile
    projLocal(spec, 0.01, 0.62, zLeg - side * 0.02, _p2); cx.lineTo(_p2.sx, _p2.sy);
    projLocal(spec, 0.11, 0.54, zLeg, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.03, 0.63, zLeg + side * 0.03, _p2); cx.lineTo(_p2.sx, _p2.sy);
    projLocal(spec, 0.11, 0.54, zLeg, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.18, 0.59, zLeg, _p2); cx.lineTo(_p2.sx, _p2.sy);
  }
  cx.stroke();
}

/* ============================================================
   2. ERITHACUS RUBECULA — Pettirosso Europeo 3D dettagliato
   ============================================================ */
function drawPettirosso3D(cx, spec, t, sa, fa, col, rgb) {
  const rm = RM || state.ecoMode ? 0 : 1;
  const headBob = Math.sin(t * 0.002) * 0.015 * rm;

  // 1. Ramo posatoio 3D con corteccia, rametto laterale e gemme fogliari
  cx.strokeStyle = rgb + (0.48 * sa).toFixed(2) + ')';
  cx.lineWidth = 2.4;
  cx.beginPath();
  projLocal(spec, -0.52, 0.79, -0.26, _p); cx.moveTo(_p.sx, _p.sy);
  projLocal(spec, 0.08, 0.76, 0.02, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, 0.62, 0.73, 0.28, _p); cx.lineTo(_p.sx, _p.sy);
  cx.stroke();

  // Rametto secondario e gemma
  cx.lineWidth = 1.35;
  cx.beginPath();
  projLocal(spec, 0.34, 0.74, 0.15, _p); cx.moveTo(_p.sx, _p.sy);
  projLocal(spec, 0.52, 0.62, 0.24, _p); cx.lineTo(_p.sx, _p.sy);
  cx.stroke();

  // 2. Profilo anatomico continuo testa-dorso-ventre + sezioni 3D
  const bodySpine = [
    { x: 0.44, y: -0.38 + headBob, rx: 0.16, ry: 0.17, rz: 0.16 },
    { x: 0.30, y: -0.26 + headBob * 0.6, rx: 0.20, ry: 0.22, rz: 0.21 },
    { x: 0.12, y: -0.06, rx: 0.26, ry: 0.30, rz: 0.27 },
    { x: -0.08, y: 0.08, rx: 0.28, ry: 0.33, rz: 0.28 },
    { x: -0.28, y: 0.14, rx: 0.22, ry: 0.24, rz: 0.20 },
    { x: -0.44, y: 0.16, rx: 0.12, ry: 0.13, rz: 0.11 }
  ];

  // Sezioni trasversali 3D del piumaggio
  cx.strokeStyle = rgb + (0.32 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.0;
  for (const s of bodySpine) {
    cx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      projLocal(spec, s.x, s.y + Math.sin(a) * s.ry, Math.cos(a) * s.rz, _p);
      if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  }

  // Silhouette sagittale dorsale e ventrale
  cx.fillStyle = rgb + (fa * 1.15).toFixed(2) + ')';
  cx.strokeStyle = rgb + (0.76 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.65;
  cx.beginPath();
  projLocal(spec, 0.56, -0.37 + headBob, 0, _p); cx.moveTo(_p.sx, _p.sy);
  projLocal(spec, 0.42, -0.54 + headBob, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, 0.22, -0.48 + headBob * 0.5, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, -0.04, -0.26, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, -0.32, -0.04, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, -0.48, 0.12, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, -0.44, 0.24, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, -0.16, 0.39, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, 0.14, 0.38, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, 0.38, 0.22, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, 0.52, -0.08 + headBob * 0.5, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, 0.56, -0.28 + headBob, 0, _p); cx.lineTo(_p.sx, _p.sy);
  cx.closePath();
  cx.fill();
  cx.stroke();

  // 3. Scudo pettorale arancio-rosso 3D con tratteggio piumoso
  cx.strokeStyle = col;
  cx.fillStyle = rgba(col, 0.24 * sa);
  cx.lineWidth = 1.85;
  cx.beginPath();
  const breastContour = [
    [0.52, -0.36 + headBob, 0],
    [0.56, -0.18 + headBob * 0.6, 0.12],
    [0.48, 0.08, 0.20],
    [0.28, 0.29, 0.16],
    [0.10, 0.14, 0.25],
    [0.16, -0.18, 0.21],
    [0.34, -0.38 + headBob, 0.13]
  ];
  breastContour.forEach(([x, y, z], idx) => {
    projLocal(spec, x, y, z, _p);
    if (idx === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  });
  cx.closePath();
  cx.fill();
  cx.stroke();

  // Fine tratteggio direzionale sulle piume del petto
  cx.lineWidth = 0.95;
  cx.beginPath();
  for (let p = 0; p < 7; p++) {
    const py = -0.22 + p * 0.065;
    const px = 0.44 - Math.abs(p - 3) * 0.035;
    projLocal(spec, px, py, 0.18, _p);
    projLocal(spec, px - 0.07, py + 0.05, 0.21, _p2);
    cx.moveTo(_p.sx, _p.sy);
    cx.lineTo(_p2.sx, _p2.sy);
  }
  cx.stroke();

  // 4. Becco corneo insettivoro (mascella + mandibola + commissura) e occhio espressivo
  cx.fillStyle = col;
  cx.strokeStyle = col;
  cx.lineWidth = 1.4;
  cx.beginPath();
  projLocal(spec, 0.55, -0.39 + headBob, 0, _p); cx.moveTo(_p.sx, _p.sy);
  projLocal(spec, 0.82, -0.35 + headBob, 0, _p); cx.lineTo(_p.sx, _p.sy);
  projLocal(spec, 0.55, -0.32 + headBob, 0, _p); cx.lineTo(_p.sx, _p.sy);
  cx.closePath();
  cx.fill();
  cx.stroke();

  // Linea di apertura del becco
  cx.beginPath();
  projLocal(spec, 0.54, -0.35 + headBob, 0, _p); cx.moveTo(_p.sx, _p.sy);
  projLocal(spec, 0.81, -0.35 + headBob, 0, _p); cx.lineTo(_p.sx, _p.sy);
  cx.stroke();

  // Occhio bilaterale con anello perioculare
  for (const side of [-1, 1]) {
    projLocal(spec, 0.43, -0.39 + headBob, side * 0.13, _p);
    cx.fillStyle = col;
    cx.beginPath();
    cx.arc(_p.sx, _p.sy, Math.max(2.4, 3.8 * _p.scale), 0, Math.PI * 2);
    cx.fill();
  }

  // 5. Ali piegate bilaterali con copritrici e remiganti sovrapposte
  for (const side of [-1, 1]) {
    const zW = side * 0.27;
    cx.strokeStyle = rgb + (0.74 * sa).toFixed(2) + ')';
    cx.fillStyle = rgb + (fa * 0.9).toFixed(2) + ')';
    cx.lineWidth = 1.45;
    cx.beginPath();
    projLocal(spec, 0.14, -0.14, zW * 0.9, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, -0.16, -0.12, zW * 1.15, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, -0.58, 0.16, zW * 0.72, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, -0.22, 0.22, zW * 1.02, _p); cx.lineTo(_p.sx, _p.sy);
    cx.closePath();
    cx.fill();
    cx.stroke();

    // Barre delle copritrici alari e nervature delle remiganti
    cx.lineWidth = 1.0;
    cx.beginPath();
    projLocal(spec, 0.04, -0.06, zW * 1.02, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, -0.18, 0.08, zW * 1.08, _p); cx.lineTo(_p.sx, _p.sy);
    for (let r = 0; r < 4; r++) {
      projLocal(spec, -0.14 - r * 0.04, 0.02 + r * 0.03, zW * 1.05, _p);
      projLocal(spec, -0.52 - r * 0.02, 0.15 + r * 0.015, zW * 0.76, _p2);
      cx.moveTo(_p.sx, _p.sy);
      cx.lineTo(_p2.sx, _p2.sy);
    }
    cx.stroke();
  }

  // 6. Coda a ventaglio sul pigostilo (7 timoniere distinte)
  cx.strokeStyle = rgb + (0.76 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.35;
  cx.beginPath();
  for (let f = -3; f <= 3; f++) {
    projLocal(spec, -0.44, 0.16, f * 0.025, _p);
    projLocal(spec, -0.96, 0.38 + Math.abs(f) * 0.018, f * 0.075, _p2);
    cx.moveTo(_p.sx, _p.sy);
    cx.lineTo(_p2.sx, _p2.sy);
  }
  cx.stroke();

  // 7. Zampe aviane (tibiotarso, tarsometatarso e dita prensili sul ramo)
  cx.strokeStyle = rgb + (0.80 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.5;
  cx.beginPath();
  for (const side of [-1, 1]) {
    const zL = side * 0.11;
    projLocal(spec, -0.04, 0.36, zL, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.06, 0.76, zL, _p); cx.lineTo(_p.sx, _p.sy);
    // Dita anteriori + alluce posteriore intorno al posatoio
    projLocal(spec, 0.17, 0.79, zL, _p2); cx.lineTo(_p2.sx, _p2.sy);
    projLocal(spec, 0.06, 0.76, zL, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, -0.03, 0.79, zL, _p2); cx.lineTo(_p2.sx, _p2.sy);
  }
  cx.stroke();

  // 8. Siringe bivocale + onde acustiche 3D
  projLocal(spec, 0.22, -0.26, 0.04, _p);
  cx.strokeStyle = col;
  cx.lineWidth = 1.4;
  cx.beginPath();
  cx.arc(_p.sx, _p.sy, Math.max(2.5, 4.2 * _p.scale), 0, Math.PI * 2);
  cx.stroke();

  const wavePhase = rm ? (t * 0.0014) % 1 : 0.35;
  cx.lineWidth = 1.25;
  for (let w = 0; w < 3; w++) {
    const p = (wavePhase + w * 0.33) % 1;
    const rad = 0.16 + p * 0.44;
    cx.globalAlpha = (1 - p) * 0.55 * sa;
    cx.beginPath();
    for (let a = -0.65; a <= 0.65; a += 0.13) {
      projLocal(spec, 0.52 + Math.cos(a) * rad, -0.24 + Math.sin(a) * rad, Math.sin(a * 2) * 0.08, _p);
      if (a <= -0.64) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  }
  cx.globalAlpha = 1;
}

/* ============================================================
   3. TELEOGRYLLUS OCEANICUS — Grillo Silente 3D dettagliato
   ============================================================ */
function drawGrillo3D(cx, spec, t, sa, fa, col, rgb) {
  const rm = RM || state.ecoMode ? 0 : 1;
  const antSway = Math.sin(t * 0.0022) * 0.055 * rm;

  // 1. Addome segmentato (9 uriti con tergite/sternite)
  cx.fillStyle = rgb + (fa * 1.15).toFixed(2) + ')';
  cx.strokeStyle = rgb + (0.74 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.5;
  cx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    projLocal(spec, -0.35 + Math.cos(a) * 0.45, 0.04 + Math.sin(a) * 0.16, 0, _p);
    if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  }
  cx.fill();
  cx.stroke();

  // Anelli segmentati addominali 3D con spiracoli laterali
  cx.strokeStyle = rgb + (0.44 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.05;
  for (let s = 0; s < 7; s++) {
    const xSeg = -0.68 + s * 0.105;
    const rSeg = 0.15 * Math.sin(((s + 1) / 8) * Math.PI);
    cx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      projLocal(spec, xSeg, 0.04 + Math.sin(a) * rSeg, Math.cos(a) * rSeg * 1.2, _p);
      if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  }

  // 2. Pronoto a sella 3D + capsula cefalica, occhi composti e palpi mascellari
  cx.strokeStyle = rgb + (0.84 * sa).toFixed(2) + ')';
  cx.fillStyle = rgb + (fa * 1.3).toFixed(2) + ')';
  cx.lineWidth = 1.65;
  cx.beginPath();
  for (let i = 0; i <= 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    projLocal(spec, 0.23 + Math.cos(a) * 0.19, -0.04 + Math.sin(a) * 0.18, 0, _p);
    if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  }
  cx.fill();
  cx.stroke();

  // Bordo laterale del pronoto in 3D
  for (const side of [-1, 1]) {
    cx.beginPath();
    projLocal(spec, 0.07, -0.14, side * 0.18, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.39, -0.14, side * 0.17, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.37, 0.08, side * 0.19, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.08, 0.08, side * 0.20, _p); cx.lineTo(_p.sx, _p.sy);
    cx.closePath();
    cx.stroke();
  }

  // Capsula cefalica + palpi boccali
  cx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    projLocal(spec, 0.48 + Math.cos(a) * 0.14, -0.04 + Math.sin(a) * 0.17, 0, _p);
    if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  }
  cx.fill();
  cx.stroke();

  // Palpi mascellari e labiali
  cx.lineWidth = 1.15;
  for (const side of [-1, 1]) {
    cx.beginPath();
    projLocal(spec, 0.54, 0.08, side * 0.06, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.62, 0.18, side * 0.10, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.66, 0.25, side * 0.08, _p); cx.lineTo(_p.sx, _p.sy);
    cx.stroke();

    // Occhio composto faccettato
    projLocal(spec, 0.50, -0.10, side * 0.12, _p);
    cx.fillStyle = col;
    cx.beginPath();
    cx.arc(_p.sx, _p.sy, Math.max(2.3, 3.6 * _p.scale), 0, Math.PI * 2);
    cx.fill();
  }

  // 3. Tegmine piatte (mutazione flatwing) con reticolo completo di nervature
  for (const side of [-1, 1]) {
    cx.strokeStyle = col;
    cx.fillStyle = rgba(col, 0.15 * sa);
    cx.lineWidth = 1.55;
    cx.beginPath();
    projLocal(spec, 0.14, -0.16, side * 0.11, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, -0.12, -0.26, side * 0.25, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, -0.58, -0.14, side * 0.19, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, -0.20, -0.07, side * 0.14, _p); cx.lineTo(_p.sx, _p.sy);
    cx.closePath();
    cx.fill();
    cx.stroke();

    // Nervature longitudinali parallele + nervature trasversali (assenza di lima stridulatoria)
    cx.lineWidth = 0.9;
    cx.beginPath();
    for (let v = 0; v < 4; v++) {
      const f = v / 3;
      projLocal(spec, 0.08 - f * 0.04, -0.15 - f * 0.06, side * (0.13 + f * 0.08), _p);
      projLocal(spec, -0.48 - f * 0.03, -0.13 - f * 0.04, side * (0.16 + f * 0.04), _p2);
      cx.moveTo(_p.sx, _p.sy);
      cx.lineTo(_p2.sx, _p2.sy);
    }
    for (let c = 1; c <= 5; c++) {
      const u = c / 6;
      const cx0 = 0.06 - u * 0.52;
      projLocal(spec, cx0, -0.14, side * 0.14, _p);
      projLocal(spec, cx0 - 0.04, -0.22, side * 0.22, _p2);
      cx.moveTo(_p.sx, _p.sy);
      cx.lineTo(_p2.sx, _p2.sy);
    }
    cx.stroke();
  }

  // 4. Zampe posteriori saltatorie (femore muscolare striato + tibia spinosa + tarso) e zampe anteriori/mediane
  for (const side of [-1, 1]) {
    const zH = side * 0.27;
    // Femore metatoracico fusiforme volumico
    cx.fillStyle = rgb + (fa * 1.35).toFixed(2) + ')';
    cx.strokeStyle = rgb + (0.86 * sa).toFixed(2) + ')';
    cx.lineWidth = 1.65;
    cx.beginPath();
    projLocal(spec, -0.12, 0.08, zH * 0.72, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, -0.34, -0.16, zH * 0.95, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, -0.58, -0.25, zH, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, -0.32, -0.02, zH * 0.88, _p); cx.lineTo(_p.sx, _p.sy);
    cx.closePath();
    cx.fill();
    cx.stroke();

    // Striature muscolari a spina di pesce sul femore posteriore
    cx.lineWidth = 0.9;
    cx.beginPath();
    for (let m = 1; m <= 4; m++) {
      const u = m / 5;
      const fx = -0.14 - u * 0.40;
      const fy = 0.06 - u * 0.26;
      projLocal(spec, fx, fy - 0.04, zH * 0.9, _p);
      projLocal(spec, fx + 0.04, fy + 0.03, zH * 0.86, _p2);
      cx.moveTo(_p.sx, _p.sy);
      cx.lineTo(_p2.sx, _p2.sy);
    }
    cx.stroke();

    // Tibia posteriore + spine tibiali + tarso
    cx.lineWidth = 1.65;
    cx.beginPath();
    projLocal(spec, -0.58, -0.25, zH, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, -0.22, 0.35, zH * 0.95, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.03, 0.39, zH * 0.90, _p); cx.lineTo(_p.sx, _p.sy);
    cx.stroke();

    // Spine lungo la tibia posteriore
    cx.lineWidth = 1.05;
    cx.beginPath();
    for (let sp = 1; sp <= 4; sp++) {
      const u = sp / 5;
      const tx = -0.58 + u * 0.36;
      const ty = -0.25 + u * 0.60;
      projLocal(spec, tx, ty, zH * 0.97, _p);
      projLocal(spec, tx - 0.04, ty + 0.03, zH * 0.97, _p2);
      cx.moveTo(_p.sx, _p.sy);
      cx.lineTo(_p2.sx, _p2.sy);
    }
    cx.stroke();

    // Zampe anteriori (con organo timpanico) e mediane
    cx.lineWidth = 1.45;
    cx.beginPath();
    projLocal(spec, 0.36, 0.10, side * 0.14, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.46, 0.34, side * 0.24, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.56, 0.48, side * 0.22, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.63, 0.50, side * 0.22, _p); cx.lineTo(_p.sx, _p.sy);

    projLocal(spec, 0.14, 0.12, side * 0.16, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.10, 0.36, side * 0.25, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.18, 0.48, side * 0.24, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 0.25, 0.50, side * 0.24, _p); cx.lineTo(_p.sx, _p.sy);
    cx.stroke();

    // Organo timpanico tibiale evidenziato
    projLocal(spec, 0.46, 0.35, side * 0.24, _p);
    cx.strokeStyle = col;
    cx.beginPath();
    cx.arc(_p.sx, _p.sy, Math.max(2.3, 3.6 * _p.scale), 0, Math.PI * 2);
    cx.stroke();
  }

  // 5. Lunghe antenne filiformi 3D + cerci sensoriali posteriori
  cx.strokeStyle = rgb + (0.78 * sa).toFixed(2) + ')';
  cx.lineWidth = 1.3;
  for (const side of [-1, 1]) {
    cx.beginPath();
    projLocal(spec, 0.56, -0.12, side * 0.08, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, 0.84, -0.36 + antSway * side, side * 0.24, _p); cx.lineTo(_p.sx, _p.sy);
    projLocal(spec, 1.18, -0.58 - antSway, side * 0.36, _p); cx.lineTo(_p.sx, _p.sy);
    cx.stroke();

    // Cerci posteriori
    cx.beginPath();
    projLocal(spec, -0.78, 0.04, side * 0.05, _p); cx.moveTo(_p.sx, _p.sy);
    projLocal(spec, -1.08, 0.10, side * 0.17, _p); cx.lineTo(_p.sx, _p.sy);
    cx.stroke();
  }

  // 6. Archi di canto silenziato (tratteggiati)
  cx.save();
  cx.strokeStyle = col;
  cx.lineWidth = 1.15;
  cx.setLineDash([3, 6]);
  for (let w = 0; w < 2; w++) {
    const rad = 0.24 + w * 0.16;
    cx.globalAlpha = (0.42 - w * 0.15) * sa;
    cx.beginPath();
    for (let a = -2.3; a <= -0.8; a += 0.15) {
      projLocal(spec, -0.16 + Math.cos(a) * rad, -0.18 + Math.sin(a) * rad, Math.cos(a) * 0.12, _p);
      if (a <= -2.29) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
  }
  cx.restore();
}

/* ============================================================
   Rendering del Piano Orbitale dedicato in 3D
   ============================================================ */
function drawOrbitalPlane3D(cx, spec, isSelected, isHovered, t) {
  const plane = spec.orbitalPlane;
  const col = specimenColor(spec);
  const { u, v } = plane;
  const R = plane.radius;
  const { x: ax, y: ay, z: az } = spec.anchor;

  const alphaBase = isSelected ? 0.85 : isHovered ? 0.52 : 0.20;
  if (alphaBase <= 0.02) return;

  cx.save();

  cx.strokeStyle = col;
  cx.lineWidth = isSelected ? 1.8 : 1.15;
  cx.globalAlpha = alphaBase;
  if (!isSelected) cx.setLineDash([5, 6]);

  cx.beginPath();
  const steps = isSelected ? 72 : 48;
  for (let i = 0; i <= steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const wx = ax + R * (ca * u[0] + sa * v[0]);
    const wy = ay + R * (ca * u[1] + sa * v[1]);
    const wz = az + R * (ca * u[2] + sa * v[2]);
    project3D(wx, wy, wz, _p);
    if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
  }
  cx.stroke();
  cx.setLineDash([]);

  if (isSelected) {
    cx.globalAlpha = 0.28;
    cx.lineWidth = 1;
    cx.setLineDash([3, 5]);
    cx.beginPath();
    for (let i = 0; i <= 56; i++) {
      const ang = (i / 56) * Math.PI * 2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      project3D(
        ax + R * 0.66 * (ca * u[0] + sa * v[0]),
        ay + R * 0.66 * (ca * u[1] + sa * v[1]),
        az + R * 0.66 * (ca * u[2] + sa * v[2]),
        _p
      );
      if (i === 0) cx.moveTo(_p.sx, _p.sy); else cx.lineTo(_p.sx, _p.sy);
    }
    cx.stroke();
    cx.setLineDash([]);

    cx.globalAlpha = 0.24;
    cx.beginPath();
    project3D(ax - R * u[0], ay - R * u[1], az - R * u[2], _p); cx.moveTo(_p.sx, _p.sy);
    project3D(ax + R * u[0], ay + R * u[1], az + R * u[2], _p); cx.lineTo(_p.sx, _p.sy);
    project3D(ax - R * v[0], ay - R * v[1], az - R * v[2], _p); cx.moveTo(_p.sx, _p.sy);
    project3D(ax + R * v[0], ay + R * v[1], az + R * v[2], _p); cx.lineTo(_p.sx, _p.sy);
    cx.stroke();

    cx.globalAlpha = 0.55;
    cx.beginPath();
    for (let k = 0; k < 24; k++) {
      const ang = (k / 24) * Math.PI * 2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const rIn = k % 6 === 0 ? R * 0.93 : R * 0.965;
      const rOut = R * 1.025;
      project3D(ax + rIn * (ca * u[0] + sa * v[0]), ay + rIn * (ca * u[1] + sa * v[1]), az + rIn * (ca * u[2] + sa * v[2]), _p);
      project3D(ax + rOut * (ca * u[0] + sa * v[0]), ay + rOut * (ca * u[1] + sa * v[1]), az + rOut * (ca * u[2] + sa * v[2]), _p2);
      cx.moveTo(_p.sx, _p.sy);
      cx.lineTo(_p2.sx, _p2.sy);
    }
    cx.stroke();

    const ph = state.orbitPhase;
    const cp = Math.cos(ph), sp = Math.sin(ph);
    const ox = ax + R * (cp * u[0] + sp * v[0]);
    const oy = ay + R * (cp * u[1] + sp * v[1]);
    const oz = az + R * (cp * u[2] + sp * v[2]);
    project3D(ox, oy, oz, _p);

    cx.globalAlpha = 0.95;
    cx.fillStyle = col;
    cx.beginPath();
    cx.arc(_p.sx, _p.sy, 4.5, 0, Math.PI * 2);
    cx.fill();

    const pulse = (RM || state.ecoMode) ? 0 : (t * 0.0012) % 1;
    cx.globalAlpha = (1 - pulse) * 0.6;
    cx.beginPath();
    cx.arc(_p.sx, _p.sy, 5 + pulse * 11, 0, Math.PI * 2);
    cx.stroke();
  }

  cx.restore();
}

/* ============================================================
   Rendering dei Callout Anatomici 3D con layout anti-sovrapposizione
   ============================================================ */
function drawSpecimenCallouts(cx, spec, t) {
  const cvT = getThemeTokens().canvas;
  const col = specimenColor(spec);
  const { W, H } = state;

  project3D(spec.anchor.x, spec.anchor.y, spec.anchor.z, _p);
  const cx0 = _p.sx;
  const cy0 = _p.sy;

  const isMobile = W <= 760;
  const minX = isMobile ? 10 : 418;
  const maxX = W - 12;
  const minY = isMobile ? 54 : 74;
  const maxY = isMobile ? H * 0.40 : H - 82;

  const nodes = spec.callouts.map((c, idx) => {
    const p = projLocal(spec, c.pos[0], c.pos[1], c.pos[2], {});
    let dx = p.sx - cx0;
    let dy = p.sy - cy0;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const arm = isMobile ? 44 : 74;
    const sideRight = dx >= -0.08;
    const boxW = isMobile ? 148 : 206;
    const boxH = isMobile ? 28 : 40;

    let ex = p.sx + dx * arm;
    let ey = p.sy + dy * arm;
    let bx = sideRight ? ex + 12 : ex - 12 - boxW;
    let by = ey - boxH / 2;

    bx = clamp(bx, minX, Math.max(minX, maxX - boxW));
    by = clamp(by, minY, Math.max(minY, maxY - boxH));

    return {
      idx,
      callout: c,
      px: p.sx,
      py: p.sy,
      zOrder: p.zOrder,
      sideRight,
      bx,
      by,
      boxW,
      boxH
    };
  });

  for (const side of [true, false]) {
    const group = nodes.filter(n => n.sideRight === side).sort((a, b) => a.by - b.by);
    const gap = isMobile ? 5 : 8;
    for (let iter = 0; iter < 6; iter++) {
      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1];
        const curr = group[i];
        const overlap = prev.by + prev.boxH + gap - curr.by;
        if (overlap > 0) {
          prev.by = Math.max(minY, prev.by - overlap * 0.5);
          curr.by = Math.min(maxY - curr.boxH, curr.by + overlap * 0.5);
        }
      }
    }
  }

  activeCalloutBoxes = nodes.map(n => ({
    calloutIdx: n.idx,
    px: n.px,
    py: n.py,
    x: n.bx,
    y: n.by,
    w: n.boxW,
    h: n.boxH
  }));

  cx.save();
  for (const n of nodes) {
    const isSel = state.calloutSel === n.idx;
    const isHov = state.calloutHov === n.idx;
    const isHot = isSel || isHov;
    const depthFade = n.zOrder > 0.08 ? 0.62 : 1.0;

    const anchorX = n.sideRight ? n.bx : n.bx + n.boxW;
    const anchorY = n.by + n.boxH * 0.5;
    const elbowX = n.sideRight ? anchorX - 10 : anchorX + 10;

    cx.globalAlpha = (isHot ? 0.98 : 0.72) * depthFade;
    cx.strokeStyle = isHot ? cvT.linkHighlight : col;
    cx.lineWidth = isHot ? 1.75 : 1.15;
    cx.beginPath();
    cx.moveTo(n.px, n.py);
    cx.lineTo(elbowX, anchorY);
    cx.lineTo(anchorX, anchorY);
    cx.stroke();

    cx.fillStyle = isHot ? cvT.linkHighlight : col;
    cx.beginPath();
    cx.arc(n.px, n.py, isHot ? 4.4 : 3.1, 0, Math.PI * 2);
    cx.fill();

    if (isHot && !state.ecoMode) {
      const pulse = RM ? 0.3 : (t * 0.0014) % 1;
      cx.globalAlpha = (1 - pulse) * 0.75;
      cx.beginPath();
      cx.arc(n.px, n.py, 5 + pulse * 10, 0, Math.PI * 2);
      cx.stroke();
    }

    cx.globalAlpha = (isHot ? 0.98 : 0.88) * depthFade;
    cx.fillStyle = cvT.labelStroke;
    cx.beginPath();
    cx.roundRect(n.bx, n.by, n.boxW, n.boxH, 7);
    cx.fill();

    cx.strokeStyle = isHot ? cvT.linkHighlight : rgba(col, 0.55);
    cx.lineWidth = isHot ? 1.5 : 1;
    cx.stroke();

    const badgeW = 20;
    cx.fillStyle = isHot ? cvT.linkHighlight : col;
    cx.beginPath();
    cx.roundRect(n.bx + 5, n.by + 5, badgeW, n.boxH - 10, 4);
    cx.fill();

    cx.fillStyle = '#0c0d10';
    cx.font = '700 9.5px "JetBrains Mono", monospace';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(n.callout.code, n.bx + 5 + badgeW / 2, n.by + n.boxH / 2 + 0.5);

    const textX = n.bx + 31;
    const maxTextW = n.boxW - 37;
    cx.textAlign = 'left';
    cx.fillStyle = cvT.geoLabelInk;
    cx.font = isMobile
      ? '600 10.5px Figtree, system-ui, sans-serif'
      : '600 11.5px Figtree, system-ui, sans-serif';
    cx.fillText(n.callout.label, textX, isMobile ? n.by + n.boxH / 2 + 0.5 : n.by + 13.5, maxTextW);

    if (!isMobile) {
      cx.fillStyle = cvT.geoLabelSub;
      cx.font = '400 9.5px "JetBrains Mono", monospace';
      cx.fillText(n.callout.short, textX, n.by + 28, maxTextW);
    }
  }
  cx.restore();
}

/* ============================================================
   Entry point principale di rendering per tutti e 3 gli archetipi
   ============================================================ */
export function drawSpecimens3D(cx, t) {
  const cvT = getThemeTokens().canvas;
  const hasOrbit = state.specimenSel >= 0;

  if (!hasOrbit) activeCalloutBoxes = [];

  SPECIMENS.forEach((spec, idx) => {
    const isSel = state.specimenSel === idx;
    const isHov = state.specimenHov === idx;

    if (hasOrbit && !isSel && state.focus > 0.85) return;

    project3D(spec.anchor.x, spec.anchor.y, spec.anchor.z, _p);
    const radiusPx = Math.max(44, spec.modelScale * 360 * _p.scale * state.cam3D.zoom);
    specimenScreenBoxes[idx] = { sx: _p.sx, sy: _p.sy, r: radiusPx, scale: _p.scale };

    if (!isSel && (_p.sx < -radiusPx * 1.6 || _p.sx > state.W + radiusPx * 1.6 || _p.sy < -radiusPx * 1.6 || _p.sy > state.H + radiusPx * 1.6)) {
      return;
    }

    const col = specimenColor(spec);
    const rgb = cvT[spec.artSlot] || 'rgba(229, 197, 142,';
    const dimOther = hasOrbit && !isSel ? (1 - state.focus) : 1;
    const boost = isSel ? 1.35 : isHov ? 1.22 : 1.0;
    const sa = clamp((cvT.artStrokeAlpha || 0.9) * boost * dimOther, 0, 1);
    const fa = clamp((cvT.artFillAlpha || 0.08) * boost * dimOther, 0, 0.35);

    if (sa <= 0.02) return;

    drawOrbitalPlane3D(cx, spec, isSel, isHov, t);

    cx.save();
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    if (spec.id === 'archaeopteryx') drawArchaeopteryx3D(cx, spec, t, sa, fa, col, rgb);
    else if (spec.id === 'pettirosso') drawPettirosso3D(cx, spec, t, sa, fa, col, rgb);
    else drawGrillo3D(cx, spec, t, sa, fa, col, rgb);
    cx.restore();

    if (!isSel && dimOther > 0.25) {
      cx.save();
      const labelY = _p.sy + radiusPx * 0.62 + 12;
      cx.globalAlpha = (isHov ? 0.98 : 0.72) * dimOther;
      cx.textAlign = 'center';
      cx.lineJoin = 'round';
      cx.lineWidth = 3.2;
      cx.strokeStyle = cvT.labelStroke;

      cx.font = 'italic 600 13.5px Fraunces, Georgia, serif';
      cx.strokeText(spec.scientificName, _p.sx, labelY);
      cx.fillStyle = isHov ? cvT.linkHighlight : cvT.geoLabelInk;
      cx.fillText(spec.scientificName, _p.sx, labelY);

      cx.font = '500 9.5px "JetBrains Mono", monospace';
      const sub = isHov ? 'CLICCA PER VISTA ORBITALE E ANATOMIA' : spec.era;
      cx.strokeText(sub, _p.sx, labelY + 14);
      cx.fillStyle = isHov ? cvT.linkHighlight : cvT.geoLabelSub;
      cx.fillText(sub, _p.sx, labelY + 14);
      cx.restore();
    }

    if (isSel) {
      drawSpecimenCallouts(cx, spec, t);
    }
  });
}

/* ============================================================
   Hit-testing per organismi 3D e callout anatomici
   ============================================================ */
export function pickSpecimen(px, py) {
  if (state.viewMode !== '3d') return -1;
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < SPECIMENS.length; i++) {
    if (state.specimenSel === i) continue;
    if (state.specimenSel >= 0 && state.focus > 0.6) continue;
    const b = specimenScreenBoxes[i];
    if (!b) continue;
    const d = Math.hypot(px - b.sx, py - b.sy);
    if (d <= b.r * 0.78 && d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export function pickCallout(px, py) {
  if (state.viewMode !== '3d' || state.specimenSel < 0) return -1;
  for (let i = activeCalloutBoxes.length - 1; i >= 0; i--) {
    const b = activeCalloutBoxes[i];
    if (
      (px >= b.x - 4 && px <= b.x + b.w + 4 && py >= b.y - 4 && py <= b.y + b.h + 4) ||
      Math.hypot(px - b.px, py - b.py) <= 14
    ) {
      return b.calloutIdx;
    }
  }
  return -1;
}