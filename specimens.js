/* ============================================================
   specimens.js — ologrammi 3D LiDAR ad alta densità,
   piani orbitali dedicati, callout anatomici 3D e dossier
   ============================================================ */
import { state, RM, clamp, rgba } from './data.js';
import { getThemeTokens, getResolvedTheme } from './theme.js';
import { project3D } from './view3d.js';

const SEG_STRIDE = 9;
const PT_STRIDE = 8;

function buildOrbitalPlane(name, inclinationDeg, nodeDeg, radius, initialPhase, initialElev) {
  const inc = (inclinationDeg * Math.PI) / 180;
  const node = (nodeDeg * Math.PI) / 180;
  const ci = Math.cos(inc), si = Math.sin(inc);
  const cn = Math.cos(node), sn = Math.sin(node);

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
    modelScale: 0.25,
    normScale: 1 / 115,
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
        id: 'claws',
        code: '01',
        label: 'Dita artigliate (I–III)',
        short: 'Falangi libere con artigli ricurvi sul margine alare',
        detail: 'A differenza degli uccelli moderni con carpometacarpo fuso, ogni ala conserva tre dita libere armate di artigli ricurvi utili per arrampicarsi o afferrare prede.',
        pos: [88 / 115, -32 / 115, 34 / 115]
      },
      {
        id: 'remiges',
        code: '02',
        label: 'Penne remiganti',
        short: 'Vessilli asimmetrici aerodinamici su ulna e mano',
        detail: 'Le penne primarie mostrano un vessillo esterno più stretto di quello interno, adattamento aerodinamico indispensabile per generare portanza e resistere alla torsione durante la battuta alare.',
        pos: [-105 / 115, -6 / 115, -8 / 115]
      },
      {
        id: 'tail',
        code: '03',
        label: 'Coda ossea (22 vert.)',
        short: 'Vertebre caudali articolate con timoniere bilaterali',
        detail: 'Privo di pigostilo, possiede una lunga colonna vertebrale caudale rigida bordata bilateralmente da penne timoniere disposte a fronda.',
        pos: [-12 / 115, 102 / 115, 14 / 115]
      },
      {
        id: 'teeth',
        code: '04',
        label: 'Cranio dentato & orbita',
        short: 'Denti conici e anello sclerotico da teropode',
        detail: 'Il cranio rettiliano allungato ospita piccoli denti conici smaltati infissi in alveoli e un anello osseo sclerotico attorno all’orbita oculare.',
        pos: [40 / 115, -98 / 115, -13 / 115]
      },
      {
        id: 'furcula',
        code: '05',
        label: 'Furcula & gastralia',
        short: 'Forcella clavicolare e costole addominali',
        detail: 'La robusta furcula a V funge da molla elastica per i muscoli pettorali, mentre la gabbia toracica conserva i gastralia ventrali tipici dei teropodi.',
        pos: [0, -24 / 115, 15 / 115]
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
    modelScale: 0.24,
    normScale: 1 / 72,
    orbitalPlane: buildOrbitalPlane(
      'Piano Bio-Acustico Boreale',
      29,
      -36,
      0.34,
      -0.42,
      0.17
    ),
    summary:
      'Discendente diretto dei dinosauri teropodi maniraptori: incarna la completa radiazione aviana con scheletro pneumatico leggero, becco corneo edentulo, pigostilo fuso, comunicazione bivocale e magnetoricezione retinica a criptocromo-4.',
    history: [
      'Dal punto di vista filogenetico, ogni passeriforme vivente è un dinosauro teropode aviano. In 150 milioni di anni di evoluzione, la linea che da forme simili ad Archaeopteryx porta a Erithacus rubecula ha fuso le vertebre caudali nel pigostilo, sostituito i denti con un becco leggero e sviluppato uno sterno carenato ad alta efficienza.',
      'Celebre negli studi etologici di David Lack, il pettirosso impiega lo scudo pettorale arancio-rosso come segnale territoriale innato (difeso da entrambi i sessi tutto l’anno) e modula nella siringe due flussi acustici indipendenti per comunicare nel sottobosco.'
    ],
    callouts: [
      {
        id: 'syrinx',
        code: '01',
        label: 'Siringe vocale',
        short: 'Organo fonatorio tracheobronchiale pulsante',
        detail: 'Dotata di due coppie indipendenti di membrane vibranti alla biforcazione dei bronchi, consente di modulare simultaneamente due frequenze sonore.',
        pos: [0, -18 / 72, 8 / 72]
      },
      {
        id: 'keel',
        code: '02',
        label: 'Carena sternale',
        short: 'Cresta ossea profonda per i muscoli del volo',
        detail: 'Lamina sternale pronunciata su cui si inseriscono i potenti muscoli pettorali e sopracoracoidei responsabili della battuta alare.',
        pos: [0, 4 / 72, 24 / 72]
      },
      {
        id: 'pygostyle',
        code: '03',
        label: 'Pigostilo fuso',
        short: 'Vertebre caudali saldate a supporto delle timoniere',
        detail: 'La fusione delle ultime vertebre caudali sostiene a ventaglio le penne timoniere, garantendo virate fulminee nel folto del sottobosco.',
        pos: [0, 40 / 72, -24 / 72]
      },
      {
        id: 'breast',
        code: '04',
        label: 'Piumaggio pettorale',
        short: 'Scudo territoriale ad alta densità LiDAR',
        detail: 'La livrea facciale e pettorale contrasta con il dorso bruno-olivastro, fungendo da stimolo chiave nelle dispute territoriali e nel corteggiamento.',
        pos: [14 / 72, -14 / 72, 24 / 72]
      },
      {
        id: 'beak',
        code: '05',
        label: 'Becco corneo edentulo',
        short: 'Rostro sottile per dieta insettivora',
        detail: 'La completa perdita dei denti e lo sviluppo della ranfoteca cornea alleggeriscono il cranio, ottimizzando la cattura rapida di insetti e larve.',
        pos: [0, -43 / 72, 40 / 72]
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
    modelScale: 0.25,
    normScale: 1 / 95,
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
        label: 'Ala piatta (mutazione silente)',
        short: 'Tegmine prive di lima stridulatoria (0 kHz vs Ormia)',
        detail: 'Le nervature delle ali anteriori maschili sono appiattite e prive della lima dentellata: sfregando le ali non producono alcun suono, eludendo la mosca parassitoide.',
        pos: [-8 / 95, -14 / 95, 12 / 95]
      },
      {
        id: 'femur',
        code: '02',
        label: 'Femore saltatorio',
        short: 'Muscolatura striata a spina di pesce e tibia spinosa',
        detail: 'Il femore metatoracico ingrossato ospita fasci muscolari pennati che accumulano energia elastica per scatti fulminei nella vegetazione.',
        pos: [-32 / 95, -14 / 95, 24 / 95]
      },
      {
        id: 'antennae',
        code: '03',
        label: 'Antenne sensoriali',
        short: 'Flagelli multi-articolati chemiorecettori',
        detail: 'L’assenza di richiamo acustico rende fondamentali le lunghe antenne multi-articolate per riconoscere i feromoni cuticolari delle femmine a breve distanza.',
        pos: [84 / 95, -38 / 95, 34 / 95]
      },
      {
        id: 'tympanum',
        code: '04',
        label: 'Organo timpanico tibiale',
        short: 'Recettore uditivo sulle zampe anteriori',
        detail: 'Situato sulle tibie protoraciche, consente ai maschi muti di intercettare il canto dei pochi maschi normo-alati e appostarsi silenziosamente nei loro pressi.',
        pos: [41 / 95, 22 / 95, 17 / 95]
      },
      {
        id: 'cerci',
        code: '05',
        label: 'Cerci addominali',
        short: 'Appendici posteriori sensibili alle correnti d’aria',
        detail: 'I due cerci sensoriali rilevano le minime variazioni di pressione d’aria generate dall’avvicinamento di predatori o parassiti in volo.',
        pos: [-74 / 95, -5 / 95, 18 / 95]
      }
    ]
  }
];

/* ============================================================
   COSTRUTTORE PROCEDURALE DI GEOMETRIA LIDAR (TypedArray)
   ============================================================ */
class AnatomyBuilder {
  constructor(normScale) {
    this.ns = normScale;
    this.segList = [];
    this.ptList = [];
  }

  addSeg(x1, y1, z1, x2, y2, z2, colorCode = 0, weight = 1.0, animGroup = 0) {
    const s = this.ns;
    this.segList.push(
      x1 * s, y1 * s, z1 * s,
      x2 * s, y2 * s, z2 * s,
      colorCode, weight, animGroup
    );
  }

  addPt(x, y, z, colorCode = 0, size = 1.3, phase = 0, highOnly = 0, animGroup = 0) {
    const s = this.ns;
    this.ptList.push(
      x * s, y * s, z * s,
      colorCode, size, phase, highOnly, animGroup
    );
  }

  sampleLine(x1, y1, z1, x2, y2, z2, count, colorCode = 0, size = 1.25, jitter = 0.6, animGroup = 0) {
    for (let i = 0; i <= count; i++) {
      const t = i / Math.max(1, count);
      const jx = ((Math.sin(i * 12.9898 + x1) * 43758.5453) % 1 - 0.5) * jitter;
      const jy = ((Math.sin(i * 78.233 + y1) * 43758.5453) % 1 - 0.5) * jitter;
      const jz = ((Math.sin(i * 39.425 + z1) * 43758.5453) % 1 - 0.5) * jitter;
      this.addPt(
        x1 + (x2 - x1) * t + jx,
        y1 + (y2 - y1) * t + jy,
        z1 + (z2 - z1) * t + jz,
        colorCode,
        size,
        t * Math.PI * 2,
        i % 2,
        animGroup
      );
    }
  }

  addRing(cx, cy, cz, rx, ry, rz, axis, steps, colorCode = 0, drawLines = true, ptDensity = 1, animGroup = 0) {
    let prevX = 0, prevY = 0, prevZ = 0;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      let px = cx, py = cy, pz = cz;
      if (axis === 'xz') {
        px += c * rx;
        pz += s * rz;
      } else if (axis === 'xy') {
        px += c * rx;
        py += s * ry;
      } else {
        py += c * ry;
        pz += s * rz;
      }

      if (drawLines && i > 0) {
        this.addSeg(prevX, prevY, prevZ, px, py, pz, colorCode, 0.85, animGroup);
      }
      if (i < steps && ptDensity > 0) {
        this.addPt(px, py, pz, colorCode, 1.2, a, i % 2, animGroup);
      }
      prevX = px; prevY = py; prevZ = pz;
    }
  }

  build() {
    return {
      segments: new Float32Array(this.segList),
      points: new Float32Array(this.ptList)
    };
  }
}

/* ============================================================
   01. ARCHAEOPTERYX LITHOGRAPHICA (150 MA — LIDAR FOSSILE)
   ============================================================ */
function buildArchaeopteryxLiDAR(normScale) {
  const b = new AnatomyBuilder(normScale);

  // 1. Colonna vertebrale cervicale a S + dorsale + bacino
  const neckPts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = Math.sin(t * Math.PI * 1.15) * 16 + t * 8;
    const y = -38 - t * 56;
    const z = Math.cos(t * Math.PI) * 14;
    neckPts.push([x, y, z]);
    if (i > 0) {
      const p = neckPts[i - 1];
      b.addSeg(p[0], p[1], p[2], x, y, z, 0, 1.6);
      b.sampleLine(p[0], p[1], p[2], x, y, z, 6, 0, 1.4, 0.8);
    }
    b.addSeg(x, y, z, x - 4, y - 2, z - 4, 1, 0.8);
  }

  const dorsalPts = [];
  for (let i = 0; i <= 11; i++) {
    const t = i / 11;
    const x = Math.sin(t * Math.PI) * -4;
    const y = -38 + t * 62;
    const z = Math.sin(t * Math.PI) * -6;
    dorsalPts.push([x, y, z]);
    if (i > 0) {
      const p = dorsalPts[i - 1];
      b.addSeg(p[0], p[1], p[2], x, y, z, 0, 1.8);
      b.sampleLine(p[0], p[1], p[2], x, y, z, 5, 0, 1.45, 0.7);
    }
    b.addSeg(x, y, z, x, y - 1, z - 6, 1, 0.9);
  }

  // 2. Coda ossea articolata (22 vertebre caudali + timoniere)
  let prevTail = [0, 24, 0];
  const tailVerts = [];
  for (let v = 1; v <= 22; v++) {
    const t = v / 22;
    const tx = -t * 16 - Math.sin(t * Math.PI) * 6;
    const ty = 24 + t * 114;
    const tz = Math.sin(t * Math.PI * 0.85) * 18;
    tailVerts.push([tx, ty, tz, t]);

    b.addSeg(prevTail[0], prevTail[1], prevTail[2], tx, ty, tz, 2, 1.45 - t * 0.6);
    b.sampleLine(prevTail[0], prevTail[1], prevTail[2], tx, ty, tz, 5, 2, 1.35, 0.5);

    const procW = (1 - t * 0.65) * 5.5;
    b.addSeg(tx - procW, ty, tz, tx + procW, ty, tz, 0, 0.75);
    b.addPt(tx, ty, tz, 2, 1.8, v * 0.3, 0);
    prevTail = [tx, ty, tz];
  }

  for (let idx = 5; idx < tailVerts.length; idx++) {
    const [vx, vy, vz, t] = tailVerts[idx];
    const vaneLen = 20 + Math.sin(((idx - 5) / 16) * Math.PI) * 18;
    [-1, 1].forEach(side => {
      const ex = vx + side * vaneLen;
      const ey = vy + 14 + t * 6;
      const ez = vz - 4 + Math.cos(t * 3) * 4;
      b.addSeg(vx, vy, vz, ex, ey, ez, 1, 0.85);
      b.sampleLine(vx, vy, vz, ex, ey, ez, 8, 1, 1.05, 1.1);
      b.addSeg(vx + side * vaneLen * 0.4, vy + 5, vz, ex - side * 2, ey + 5, ez, 1, 0.5);
    });
  }

  // 3. Gabbia toracica (9 paia di costole), gastralia, furcula e bacino
  for (let r = 0; r < 9; r++) {
    const t = r / 8;
    const ry = -32 + t * 44;
    const ribW = 14 + Math.sin(t * Math.PI) * 11;
    const ribD = 12 + Math.sin(t * Math.PI) * 10;
    [-1, 1].forEach(side => {
      const pts = [
        [0, ry, -4],
        [side * ribW * 0.75, ry + 3, 2],
        [side * ribW, ry + 9, ribD * 0.75],
        [side * ribW * 0.45, ry + 14, ribD]
      ];
      for (let k = 0; k < pts.length - 1; k++) {
        b.addSeg(pts[k][0], pts[k][1], pts[k][2], pts[k + 1][0], pts[k + 1][1], pts[k + 1][2], 0, 1.05);
        b.sampleLine(pts[k][0], pts[k][1], pts[k][2], pts[k + 1][0], pts[k + 1][1], pts[k + 1][2], 4, 0, 1.1, 0.5);
      }
    });
  }

  for (let g = 0; g < 6; g++) {
    const gy = 2 + g * 4.5;
    const gw = 11 - g * 0.9;
    b.addSeg(-gw, gy, 11, 0, gy - 2, 13, 1, 0.75);
    b.addSeg(0, gy - 2, 13, gw, gy, 11, 1, 0.75);
  }

  b.addSeg(-14, -36, 4, 0, -24, 15, 2, 1.5);
  b.addSeg(14, -36, 4, 0, -24, 15, 2, 1.5);
  [-1, 1].forEach(side => {
    b.addSeg(side * 6, 16, -2, side * 9, 28, -4, 0, 1.3);
    b.addSeg(side * 7, 22, 0, side * 8, 44, 10, 0, 1.2);
    b.addSeg(side * 7, 24, -2, side * 7, 40, -10, 0, 1.1);
  });

  // 4. Cranio da teropode con anello sclerotico, finestra antorbitale e denti conici
  const headX = 24, headY = -95, headZ = -14;
  const snoutX = 56, snoutY = -102, snoutZ = -12;
  b.addSeg(headX - 8, headY - 4, headZ - 2, headX + 8, headY - 8, headZ, 0, 1.5);
  b.addSeg(headX + 8, headY - 8, headZ, snoutX, snoutY, snoutZ, 0, 1.5);
  b.addSeg(snoutX, snoutY, snoutZ, headX + 10, headY + 2, headZ + 2, 0, 1.3);
  b.addSeg(headX + 10, headY + 2, headZ + 2, headX - 6, headY + 4, headZ + 1, 0, 1.3);
  b.addSeg(headX - 5, headY + 5, headZ + 1, snoutX - 3, snoutY + 6, snoutZ + 1, 0, 1.3);
  b.sampleLine(headX + 8, headY - 8, headZ, snoutX, snoutY, snoutZ, 12, 0, 1.25, 0.4);
  b.sampleLine(headX - 5, headY + 5, headZ + 1, snoutX - 3, snoutY + 6, snoutZ + 1, 12, 0, 1.2, 0.4);

  b.addRing(headX + 6, headY - 2, headZ + 2, 4.5, 4.5, 2.0, 'xy', 14, 2, true, 1);
  b.addRing(headX + 6, headY - 2, headZ - 2, 4.5, 4.5, 2.0, 'xy', 14, 2, true, 1);

  b.addSeg(headX + 15, headY - 4, headZ + 1, headX + 24, headY - 5, headZ + 1, 1, 0.9);
  b.addSeg(headX + 24, headY - 5, headZ + 1, headX + 19, headY + 1, headZ + 1, 1, 0.9);
  b.addSeg(headX + 19, headY + 1, headZ + 1, headX + 15, headY - 4, headZ + 1, 1, 0.9);

  for (let d = 0; d < 9; d++) {
    const dt = d / 8;
    const dx = headX + 17 + dt * 28;
    const dy = headY - 1 - dt * 4.5;
    b.addSeg(dx, dy, headZ + 1, dx + 0.5, dy + 2.4, headZ + 1, 2, 0.95);
    b.addSeg(dx, dy + 5.8, headZ + 1, dx + 0.5, dy + 3.6, headZ + 1, 2, 0.95);
  }

  // 5. Arti anteriori + 3 dita artigliate (I–III) + 14 remiganti per ala
  [-1, 1].forEach(side => {
    const sh = [side * 12, -34, 2];
    const el = [side * 42, -52, 16];
    const wr = [side * 76, -34, 26];

    b.addSeg(sh[0], sh[1], sh[2], el[0], el[1], el[2], 0, 1.8);
    b.addSeg(el[0], el[1], el[2], wr[0], wr[1], wr[2], 0, 1.5);
    b.addSeg(el[0], el[1] + 2.5, el[2] - 2, wr[0], wr[1] + 2, wr[2] - 2, 0, 1.2);
    b.sampleLine(sh[0], sh[1], sh[2], el[0], el[1], el[2], 12, 0, 1.4, 0.6);
    b.sampleLine(el[0], el[1], el[2], wr[0], wr[1], wr[2], 12, 0, 1.35, 0.6);

    const digits = [
      { len: 15, angY: -14, angZ: 8 },
      { len: 23, angY: -10, angZ: 12 },
      { len: 18, angY: -4, angZ: 10 }
    ];
    digits.forEach((dg, dIdx) => {
      const midX = wr[0] + side * dg.len * 0.55;
      const midY = wr[1] + dg.angY * 0.55 + dIdx * 2.2;
      const midZ = wr[2] + dg.angZ * 0.55;
      const tipX = wr[0] + side * dg.len;
      const tipY = wr[1] + dg.angY + dIdx * 2.5;
      const tipZ = wr[2] + dg.angZ;
      b.addSeg(wr[0], wr[1], wr[2], midX, midY, midZ, 2, 1.35);
      b.addSeg(midX, midY, midZ, tipX, tipY, tipZ, 2, 1.25);
      b.addSeg(tipX, tipY, tipZ, tipX + side * 4.5, tipY + 4.5, tipZ + 2, 2, 1.4);
      b.addPt(tipX + side * 4.5, tipY + 4.5, tipZ + 2, 2, 2.1, dIdx, 0);
    });

    for (let f = 0; f < 14; f++) {
      const ft = f / 13;
      const ox = el[0] + (wr[0] - el[0]) * Math.min(1, ft * 1.15) + (ft > 0.7 ? side * (ft - 0.7) * 28 : 0);
      const oy = el[1] + (wr[1] - el[1]) * Math.min(1, ft * 1.15);
      const oz = el[2] + (wr[2] - el[2]) * Math.min(1, ft * 1.15);

      const fLen = 46 + Math.sin(ft * Math.PI * 0.85) * 48;
      const sweepAngle = -0.25 + ft * 0.88;
      const tx = ox + side * Math.cos(sweepAngle) * fLen * 0.78;
      const ty = oy + Math.sin(sweepAngle) * fLen + 18;
      const tz = oz - 12 - Math.sin(ft * Math.PI) * 18;

      b.addSeg(ox, oy, oz, tx, ty, tz, f % 3 === 0 ? 2 : 1, 0.9);
      b.sampleLine(ox, oy, oz, tx, ty, tz, 14, f % 4 === 0 ? 2 : 1, 1.15, 1.4);

      const mx = (ox + tx) * 0.5;
      const my = (oy + ty) * 0.5;
      const mz = (oz + tz) * 0.5;
      b.addSeg(ox, oy, oz, mx - side * 2, my + 4, mz - 2, 1, 0.45);
      b.addSeg(mx - side * 2, my + 4, mz - 2, tx, ty, tz, 1, 0.45);
    }
  });

  // 6. Arti posteriori articolati
  [-1, 1].forEach(side => {
    const hip = [side * 9, 25, 0];
    const knee = [side * 16, 54, 18];
    const ankle = [side * 14, 88, -6];
    const foot = [side * 16, 114, 8];

    b.addSeg(hip[0], hip[1], hip[2], knee[0], knee[1], knee[2], 0, 1.7);
    b.addSeg(knee[0], knee[1], knee[2], ankle[0], ankle[1], ankle[2], 0, 1.5);
    b.addSeg(ankle[0], ankle[1], ankle[2], foot[0], foot[1], foot[2], 0, 1.35);
    b.sampleLine(hip[0], hip[1], hip[2], knee[0], knee[1], knee[2], 10, 0, 1.3, 0.5);
    b.sampleLine(knee[0], knee[1], knee[2], ankle[0], ankle[1], ankle[2], 10, 0, 1.25, 0.5);

    [-4, 0, 4].forEach((spread, idx) => {
      const toeTip = [foot[0] + spread, foot[1] + 8, foot[2] + 13 - Math.abs(spread) * 0.5];
      b.addSeg(foot[0], foot[1], foot[2], toeTip[0], toeTip[1], toeTip[2], 2, 1.1);
      b.addPt(toeTip[0], toeTip[1], toeTip[2], 2, 1.7, idx, 0);
    });
    b.addSeg(foot[0], foot[1] - 2, foot[2], foot[0], foot[1] + 3, foot[2] - 7, 2, 1.0);
  });

  return b.build();
}

/* ============================================================
   02. ERITHACUS RUBECULA (OGGI — OSTEOLOGIA & SIRINGE VOCALE)
   ============================================================ */
function buildRobinLiDAR(normScale) {
  const b = new AnatomyBuilder(normScale);

  // 1. Profilo aerodinamico del corpo (26 sezioni + 20 meridiani)
  const slices = 26;
  const radialSteps = 20;
  const shellRings = [];

  for (let i = 0; i <= slices; i++) {
    const t = i / slices;
    let cy = -58 + t * 124;
    let cz = 0;
    let rx = 0;
    let rz = 0;

    if (t < 0.26) {
      const ht = t / 0.26;
      const rHead = Math.sin(ht * Math.PI * 0.88) * 21 + 4;
      rx = rHead * 0.92;
      rz = rHead;
      cz = 14 - ht * 4;
    } else if (t < 0.72) {
      const bt = (t - 0.26) / 0.46;
      const env = Math.sin(bt * Math.PI * 0.92 + 0.12);
      rx = 16 + env * 22;
      rz = 18 + env * 27;
      cz = 6 - bt * 14;
    } else {
      const tt = (t - 0.72) / 0.28;
      rx = (1 - tt * 0.45) * 16;
      rz = (1 - tt * 0.85) * 14;
      cz = -8 - tt * 36;
      cy += tt * 8;
    }

    const ring = [];
    for (let s = 0; s <= radialSteps; s++) {
      const ang = (s / radialSteps) * Math.PI * 2;
      const px = Math.cos(ang) * rx;
      const py = cy;
      const pz = cz + Math.sin(ang) * rz;

      const isPectoral = Math.sin(ang) > 0.22 && t > 0.14 && t < 0.62;
      const colCode = isPectoral ? 2 : 1;
      const ptSize = isPectoral ? 1.55 : 1.1;

      ring.push([px, py, pz, colCode]);
      if (s < radialSteps) {
        b.addPt(px, py, pz, colCode, ptSize, ang + t * 4, (i + s) % 2);
        if (isPectoral) {
          b.addPt(
            px * 0.94 + Math.sin(s * 7) * 1.2,
            py + Math.cos(i * 5) * 1.2,
            pz * 0.96,
            2, 1.45, ang, 1
          );
        }
      }
    }
    shellRings.push(ring);

    if (i % 2 === 0 && i > 0 && i < slices) {
      for (let s = 0; s < radialSteps; s++) {
        const p1 = ring[s];
        const p2 = ring[s + 1];
        b.addSeg(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p1[3], 0.55);
      }
    }
  }

  for (let s = 0; s < radialSteps; s += 2) {
    for (let i = 0; i < slices; i++) {
      const p1 = shellRings[i][s];
      const p2 = shellRings[i + 1][s];
      b.addSeg(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p1[3], 0.5);
    }
  }

  // 2. Scheletro interno (Cranio, Colonna, Carena Sternale, Pigostilo)
  b.addRing(0, -45, 16, 11, 10, 12, 'yz', 14, 0, true, 1);
  b.addRing(-8, -46, 18, 4.2, 4.2, 2, 'yz', 12, 2, true, 1);
  b.addRing(8, -46, 18, 4.2, 4.2, 2, 'yz', 12, 2, true, 1);
  b.addSeg(0, -46, 27, 0, -43, 44, 0, 1.6);
  b.addSeg(-2.5, -45, 26, 0, -43, 44, 0, 1.1);
  b.addSeg(2.5, -45, 26, 0, -43, 44, 0, 1.1);
  b.addSeg(0, -42, 26, 0, -42, 42, 0, 1.2);

  const spineNodes = [
    [0, -36, 12], [0, -24, 4], [0, -10, -4], [0, 6, -8], [0, 20, -12], [0, 32, -18]
  ];
  for (let i = 0; i < spineNodes.length - 1; i++) {
    const a = spineNodes[i], c = spineNodes[i + 1];
    b.addSeg(a[0], a[1], a[2], c[0], c[1], c[2], 0, 1.6);
    b.sampleLine(a[0], a[1], a[2], c[0], c[1], c[2], 6, 0, 1.4, 0.3);
  }

  b.addSeg(0, 32, -18, 0, 44, -27, 2, 1.9);
  b.addSeg(0, 34, -17, 0, 42, -21, 2, 1.4);
  b.addSeg(0, 42, -21, 0, 44, -27, 2, 1.4);
  b.sampleLine(0, 32, -18, 0, 44, -27, 8, 2, 1.5, 0.4);

  const keelTop = [0, -16, 10];
  const keelFront = [0, -4, 26];
  const keelBottom = [0, 18, 16];
  const keelBack = [0, 14, 2];
  b.addSeg(keelTop[0], keelTop[1], keelTop[2], keelFront[0], keelFront[1], keelFront[2], 2, 1.85);
  b.addSeg(keelFront[0], keelFront[1], keelFront[2], keelBottom[0], keelBottom[1], keelBottom[2], 2, 1.85);
  b.addSeg(keelBottom[0], keelBottom[1], keelBottom[2], keelBack[0], keelBack[1], keelBack[2], 0, 1.3);
  b.addSeg(keelBack[0], keelBack[1], keelBack[2], keelTop[0], keelTop[1], keelTop[2], 0, 1.3);
  b.sampleLine(keelTop[0], keelTop[1], keelTop[2], keelFront[0], keelFront[1], keelFront[2], 10, 2, 1.5, 0.3);
  b.sampleLine(keelFront[0], keelFront[1], keelFront[2], keelBottom[0], keelBottom[1], keelBottom[2], 12, 2, 1.5, 0.3);

  for (let r = 0; r < 5; r++) {
    const ry = -16 + r * 6;
    [-1, 1].forEach(side => {
      b.addSeg(0, ry, -4, side * 14, ry + 3, 6, 0, 0.95);
      b.addSeg(side * 14, ry + 3, 6, side * 5, ry + 7, 15, 0, 0.95);
    });
  }

  // 3. Siringe vocale pulsante + onde acustiche sferiche (animGroup = 2)
  const syxY = -18, syxZ = 6;
  b.addRing(0, syxY, syxZ, 5.5, 5.5, 5.5, 'xz', 16, 2, true, 1, 2);
  b.addRing(0, syxY + 3, syxZ, 4.5, 4.5, 4.5, 'xz', 16, 2, true, 1, 2);
  b.addSeg(0, syxY - 12, syxZ + 2, 0, syxY, syxZ, 2, 1.6, 2);
  b.addSeg(0, syxY, syxZ, -6, syxY + 8, syxZ - 2, 2, 1.4, 2);
  b.addSeg(0, syxY, syxZ, 6, syxY + 8, syxZ - 2, 2, 1.4, 2);

  [24, 42, 62].forEach(rad => {
    b.addRing(0, syxY, syxZ + 12, rad, rad * 0.85, rad, 'xy', 28, 2, true, 1, 2);
    b.addRing(0, syxY, syxZ + 12, rad, rad * 0.85, rad, 'yz', 28, 2, false, 1, 2);
  });

  // 4. Ali ripiegate con copritrici e remiganti stratificate
  [-1, 1].forEach(side => {
    for (let c = 0; c < 4; c++) {
      const wy = -14 + c * 5;
      b.addSeg(side * 22, wy, 4, side * 26, wy + 12, -16, 0, 1.0);
    }
    for (let f = 0; f < 8; f++) {
      const sy = -10 + f * 3.5;
      const sz = 2 - f * 1.4;
      const ey = 26 + f * 2.5;
      const ez = -28 - f * 1.8;
      b.addSeg(side * 24, sy, sz, side * 14, ey, ez, 1, 0.95);
      b.sampleLine(side * 24, sy, sz, side * 14, ey, ez, 9, 1, 1.1, 0.6);
    }
  });

  // 5. Zampe sottili da passeriforme e ramo stilizzato di appoggio
  [-1, 1].forEach(side => {
    const sx = side * 9;
    b.addSeg(sx, 22, -2, sx + side * 2, 34, -6, 0, 1.2);
    b.addSeg(sx + side * 2, 34, -6, sx, 48, 4, 0, 1.2);
    b.addSeg(sx, 48, 4, sx - 2, 52, 9, 0, 1.0);
    b.addSeg(sx, 48, 4, sx + 2, 52, 9, 0, 1.0);
    b.addSeg(sx, 48, 4, sx, 52, -1, 0, 1.0);
  });

  let prevBr = [-68, 56, 12];
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    const bx = -68 + t * 136;
    const by = 56 - Math.sin(t * Math.PI) * 6 + (t - 0.5) * -8;
    const bz = 12 - Math.sin(t * Math.PI) * 8;
    b.addSeg(prevBr[0], prevBr[1], prevBr[2], bx, by, bz, 1, 1.6);
    b.sampleLine(prevBr[0], prevBr[1], prevBr[2], bx, by, bz, 4, 1, 1.2, 0.6);
    prevBr = [bx, by, bz];
  }

  return b.build();
}

/* ============================================================
   03. TELEOGRYLLUS OCEANICUS (KAUAI — MICRO-CT & FLATWING)
   ============================================================ */
function buildCricketLiDAR(normScale) {
  const b = new AnatomyBuilder(normScale);

  // 1. Capsula cefalica con griglia degli occhi composti
  const headX = 46, headY = -6, headZ = 10;
  b.addRing(headX, headY, headZ, 11, 12, 12, 'yz', 16, 0, true, 1);
  b.addRing(headX + 5, headY + 1, headZ + 1, 8, 9, 9, 'yz', 14, 0, true, 1);
  b.addSeg(headX + 8, headY + 6, headZ + 2, headX + 12, headY + 14, headZ + 4, 0, 1.2);
  b.addSeg(headX + 6, headY + 8, headZ - 3, headX + 14, headY + 16, headZ - 5, 2, 0.9);
  b.addSeg(headX + 6, headY + 8, headZ + 5, headX + 14, headY + 16, headZ + 7, 2, 0.9);

  [-1, 1].forEach(side => {
    const eyeX = headX + 3;
    const eyeY = headY - 3;
    const eyeZ = headZ + side * 10.5;
    for (let lat = -3; lat <= 3; lat++) {
      for (let lon = -3; lon <= 3; lon++) {
        if (lat * lat + lon * lon <= 10) {
          b.addPt(
            eyeX + lon * 1.4,
            eyeY + lat * 1.5,
            eyeZ + side * Math.cos(lat * 0.35) * 2.2,
            2, 1.55, lat + lon, 0
          );
        }
      }
    }
  });

  // 2. Coppia di antenne filiformi lunghissime multi-articolate (animGroup = 1)
  [-1, 1].forEach(side => {
    let prevA = [headX + 7, headY - 5, headZ + side * 5];
    const segs = 30;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const ax = headX + 7 + t * 92 + Math.sin(t * 2.2) * 14;
      const ay = headY - 5 - Math.pow(t, 0.85) * 58 + Math.sin(t * 4.5) * 6;
      const az = headZ + side * (5 + t * 44 + Math.sin(t * 3.1) * 10);

      b.addSeg(prevA[0], prevA[1], prevA[2], ax, ay, az, 2, 1.15 - t * 0.55, 1);
      b.addPt(ax, ay, az, 2, 1.35 - t * 0.4, t * 6, i % 2, 1);
      prevA = [ax, ay, az];
    }
  });

  // 3. Pronoto a sella, torace e addome a 9 segmenti con cerci posteriori
  for (let p = 0; p <= 4; p++) {
    const pt = p / 4;
    const px = 34 - pt * 18;
    b.addRing(px, -6, 6 - pt * 3, 4, 12 + Math.sin(pt * Math.PI) * 2, 14 + Math.sin(pt * Math.PI) * 2, 'yz', 16, 0, true, 1);
  }

  const abdSegs = 9;
  let prevAbd = null;
  for (let s = 0; s < abdSegs; s++) {
    const t = s / (abdSegs - 1);
    const ax = 12 - s * 8.2;
    const ay = -3 + Math.sin(t * Math.PI) * 3 + t * 4;
    const az = 1 - s * 2.2;
    const ry = 11.5 * (1 - t * 0.52);
    const rz = 13.0 * (1 - t * 0.52);

    b.addRing(ax, ay, az, 3, ry, rz, 'yz', 16, 0, true, 1);
    b.addPt(ax, ay + 1, az + rz, 2, 1.6, s, 0);
    b.addPt(ax, ay + 1, az - rz, 2, 1.6, s, 0);

    if (prevAbd) {
      b.addSeg(prevAbd[0], prevAbd[1] - prevAbd[3], prevAbd[2], ax, ay - ry, az, 1, 0.85);
      b.addSeg(prevAbd[0], prevAbd[1] + prevAbd[3], prevAbd[2], ax, ay + ry, az, 1, 0.85);
    }
    prevAbd = [ax, ay, az, ry, rz];
  }

  const tailBase = [-56, 1, -17];
  [-1, 1].forEach(side => {
    const cTip = [-92, -10, -17 + side * 22];
    b.addSeg(tailBase[0], tailBase[1], tailBase[2] + side * 3, cTip[0], cTip[1], cTip[2], 0, 1.15);
    b.sampleLine(tailBase[0], tailBase[1], tailBase[2] + side * 3, cTip[0], cTip[1], cTip[2], 12, 2, 1.15, 0.9);
  });

  // 4. Ali anteriori (Tegmine) mutazione FLATWING + onda acustica smorzata (0 kHz)
  [-1, 1].forEach(side => {
    const wStart = [18, -14, 3 + side * 2];
    const wEnd = [-38, -10, -10 + side * 4];
    const wSpan = side * 12;

    const steps = 16;
    let prevOuter = null;
    let prevInner = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const env = Math.sin(t * Math.PI);
      const wx = wStart[0] + (wEnd[0] - wStart[0]) * t;
      const wy = wStart[1] + (wEnd[1] - wStart[1]) * t - 1.5;
      const wzIn = wStart[2] + (wEnd[2] - wStart[2]) * t;
      const wzOut = wzIn + wSpan * env;

      if (prevOuter) {
        b.addSeg(prevOuter[0], prevOuter[1], prevOuter[2], wx, wy, wzOut, 2, 1.25);
        b.addSeg(prevInner[0], prevInner[1], prevInner[2], wx, wy, wzIn, 2, 0.95);
      }
      if (i > 0 && i < steps) {
        b.addSeg(wx, wy, wzIn, wx - 2, wy, wzOut, 2, 0.7);
        b.sampleLine(wx, wy, wzIn, wx, wy, wzOut, 4, 2, 1.15, 0.3);
      }
      prevOuter = [wx, wy, wzOut];
      prevInner = [wx, wy, wzIn];
    }
    b.addSeg(wStart[0], wStart[1] - 1.5, wStart[2] + wSpan * 0.4, wEnd[0] + 6, wEnd[1] - 1.5, wEnd[2] + wSpan * 0.35, 2, 1.1);
  });

  for (let w = 0; w <= 24; w++) {
    const t = w / 24;
    const wx = -36 + t * 56;
    const wy = -28 + Math.sin(t * Math.PI * 6) * 0.9;
    b.addPt(wx, wy, -4, 2, 1.35, t * 4, 0);
    if (w > 0) {
      const px = -36 + ((w - 1) / 24) * 56;
      b.addSeg(px, -28, -4, wx, wy, -4, 2, 0.85);
    }
  }

  // 5. Zampe posteriori saltatorie + anteriori con organo timpanico
  [-1, 1].forEach(side => {
    const coxa = [-6, 4, side * 12];
    const knee = [-48, -24, side * 24];
    const ankle = [-78, 24, side * 22];
    const tarsusTip = [-98, 28, side * 24];

    const femSteps = 12;
    for (let f = 0; f <= femSteps; f++) {
      const ft = f / femSteps;
      const fx = coxa[0] + (knee[0] - coxa[0]) * ft;
      const fy = coxa[1] + (knee[1] - coxa[1]) * ft;
      const fz = coxa[2] + (knee[2] - coxa[2]) * ft;
      const fRad = 3.2 + Math.sin(ft * Math.PI * 0.85) * 6.5;

      b.addRing(fx, fy, fz, 2.5, fRad, fRad * 0.65, 'yz', 10, 0, f % 2 === 0, 1);

      if (f > 1 && f < femSteps - 1) {
        const outerZ = fz + side * fRad * 0.68;
        b.addSeg(fx + 2, fy - fRad * 0.65, outerZ, fx - 1.5, fy, outerZ + side * 0.6, 2, 0.95);
        b.addSeg(fx - 1.5, fy, outerZ + side * 0.6, fx + 2, fy + fRad * 0.65, outerZ, 2, 0.95);
      }
    }

    b.addSeg(knee[0], knee[1], knee[2], ankle[0], ankle[1], ankle[2], 0, 1.55);
    b.sampleLine(knee[0], knee[1], knee[2], ankle[0], ankle[1], ankle[2], 14, 0, 1.25, 0.3);
    for (let sp = 2; sp <= 9; sp++) {
      const st = sp / 10;
      const sx = knee[0] + (ankle[0] - knee[0]) * st;
      const sy = knee[1] + (ankle[1] - knee[1]) * st;
      const sz = knee[2] + (ankle[2] - knee[2]) * st;
      b.addSeg(sx, sy, sz - 1.5, sx - 4.5, sy - 2.5, sz - 3.5, 2, 1.05);
      b.addSeg(sx, sy, sz + 1.5, sx - 4.5, sy - 2.5, sz + 3.5, 2, 1.05);
    }

    b.addSeg(ankle[0], ankle[1], ankle[2], tarsusTip[0], tarsusTip[1], tarsusTip[2], 0, 1.15);

    const fHip = [26, 5, side * 10];
    const fKnee = [36, 16, side * 18];
    const fFoot = [46, 28, side * 16];
    b.addSeg(fHip[0], fHip[1], fHip[2], fKnee[0], fKnee[1], fKnee[2], 0, 1.2);
    b.addSeg(fKnee[0], fKnee[1], fKnee[2], fFoot[0], fFoot[1], fFoot[2], 0, 1.1);
    b.addPt((fKnee[0] + fFoot[0]) * 0.5, (fKnee[1] + fFoot[1]) * 0.5, (fKnee[2] + fFoot[2]) * 0.5, 2, 2.2, side, 0);

    const mHip = [12, 6, side * 11];
    const mKnee = [8, 18, side * 20];
    const mFoot = [2, 28, side * 18];
    b.addSeg(mHip[0], mHip[1], mHip[2], mKnee[0], mKnee[1], mKnee[2], 0, 1.2);
    b.addSeg(mKnee[0], mKnee[1], mKnee[2], mFoot[0], mFoot[1], mFoot[2], 0, 1.1);
  });

  return b.build();
}

const LIDAR_MODELS = [
  buildArchaeopteryxLiDAR(SPECIMENS[0].normScale),
  buildRobinLiDAR(SPECIMENS[1].normScale),
  buildCricketLiDAR(SPECIMENS[2].normScale)
];

/* ============================================================
   Runtime cache per hit-testing di organismi e callout 3D
   ============================================================ */
const specimenScreenBoxes = SPECIMENS.map(() => ({ sx: 0, sy: 0, r: 60, scale: 1 }));
let activeCalloutBoxes = [];

const _p = { sx: 0, sy: 0, scale: 1, zOrder: 0 };
const _p2 = { sx: 0, sy: 0, scale: 1, zOrder: 0 };
const _anim = { x: 0, y: 0, z: 0 };
const FOV_LOCAL = 2.6;

function projLocal(spec, lx, ly, lz, out = _p) {
  const s = spec.modelScale;
  const isSelected = state.specimenSel >= 0 && SPECIMENS[state.specimenSel] === spec;
  if (isSelected) {
    return project3D(
      spec.anchor.x + lx * s,
      spec.anchor.y + ly * s,
      spec.anchor.z + lz * s,
      out
    );
  }

  const { W, H } = state;
  const c = state.cam3D;
  const m = c.rot;
  const dx = spec.anchor.x - (c.targetX || 0);
  const dy = spec.anchor.y - (c.targetY || 0);
  const dz = spec.anchor.z - (c.targetZ || 0);

  const ax1 = m[0] * dx + m[1] * dy + m[2] * dz;
  const ay2 = m[4] * dx + m[5] * dy + m[6] * dz;
  const az2 = m[8] * dx + m[9] * dy + m[10] * dz;

  const x1 = ax1 + lx * s;
  const y2 = ay2 + ly * s;
  const z2 = az2 + lz * s;

  const depth = FOV_LOCAL / Math.max(0.35, FOV_LOCAL + z2);
  const baseScale = W <= 760 ? 0.48 : 0.44;
  const k = Math.min(W, H) * baseScale * c.zoom * depth;
  out.sx = W / 2 + c.panX + x1 * k;
  out.sy = H / 2 + c.panY + y2 * k;
  out.scale = depth;
  out.zOrder = z2;
  return out;
}

function getAnimatedLocal(lx, ly, lz, animGroup, modelIndex, tSec) {
  if (animGroup === 0 || RM || state.ecoMode) {
    _anim.x = lx;
    _anim.y = ly;
    _anim.z = lz;
    return _anim;
  }
  if (animGroup === 1 && modelIndex === 2) {
    const ns = SPECIMENS[2].normScale;
    const dist = Math.max(0, (lx - 52 * ns) / (95 * ns));
    const sway = Math.sin(tSec * 2.1 + dist * 2.4) * (dist * dist * 11 * ns);
    const swayZ = Math.cos(tSec * 1.7 + dist * 2.0) * (dist * dist * 8 * ns);
    _anim.x = lx - Math.abs(sway) * 0.25;
    _anim.y = ly + sway;
    _anim.z = lz + swayZ;
    return _anim;
  }
  if (animGroup === 2 && modelIndex === 1) {
    const ns = SPECIMENS[1].normScale;
    const cy = -18 * ns;
    const cz = 6 * ns;
    const pulse = 1 + Math.sin(tSec * 4.2) * 0.08;
    _anim.x = lx * pulse;
    _anim.y = cy + (ly - cy) * pulse;
    _anim.z = cz + (lz - cz) * pulse;
    return _anim;
  }
  _anim.x = lx;
  _anim.y = ly;
  _anim.z = lz;
  return _anim;
}

function specimenColor(spec) {
  return state.col[spec.catKey] || '#e5c58e';
}

function hexToRGB(hex) {
  const n = parseInt((hex || '#e5c58e').slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbaStr(rgb, alpha) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(alpha, 0, 1).toFixed(3)})`;
}

/* ============================================================
   RENDERING OLOGRAMMA 3D LIDAR AD ALTA DENSITÀ
   ============================================================ */
function drawLiDARModel3D(cx, spec, modelIndex, t, boost, dimOther) {
  const model = LIDAR_MODELS[modelIndex];
  const segs = model.segments;
  const pts = model.points;
  const isLight = getResolvedTheme() === 'light';
  const tSec = t * 0.001;

  const accentHex = specimenColor(spec);
  const accentRGB = hexToRGB(accentHex);
  const inkRGB = isLight ? [27, 26, 23] : [242, 239, 231];
  const brassRGB = isLight ? [138, 100, 40] : [229, 197, 142];
  const cyanScanRGB = isLight ? [2, 132, 199] : [186, 242, 255];

  const laserActive = !state.ecoMode;
  const scanY = laserActive ? Math.sin(tSec * 1.35) * 0.92 : 999;
  const highDensity = !state.ecoMode;
  const scaleBoost = Math.max(0.75, Math.min(2.2, state.cam3D.zoom * (state.specimenSel === modelIndex ? 1.15 : 0.92)));

  // 1. Piano di scansione laser LiDAR locale sul modello selezionato
  if (laserActive && state.specimenSel === modelIndex) {
    const span = 0.95;
    const c1 = projLocal(spec, -span, scanY, -span, {});
    const c2 = projLocal(spec, span, scanY, -span, {});
    const c3 = projLocal(spec, span, scanY, span, {});
    const c4 = projLocal(spec, -span, scanY, span, {});

    cx.save();
    cx.fillStyle = rgbaStr(cyanScanRGB, isLight ? 0.06 : 0.05);
    cx.beginPath();
    cx.moveTo(c1.sx, c1.sy);
    cx.lineTo(c2.sx, c2.sy);
    cx.lineTo(c3.sx, c3.sy);
    cx.lineTo(c4.sx, c4.sy);
    cx.closePath();
    cx.fill();

    cx.strokeStyle = rgbaStr(cyanScanRGB, isLight ? 0.42 : 0.36);
    cx.lineWidth = 1.05;
    cx.setLineDash([5, 5]);
    cx.stroke();
    cx.setLineDash([]);
    cx.restore();
  }

  // 2. Segmenti osteologici / nervature / wireframe
  for (let i = 0; i < segs.length; i += SEG_STRIDE) {
    const animGroup = segs[i + 8];
    const a1 = getAnimatedLocal(segs[i], segs[i + 1], segs[i + 2], animGroup, modelIndex, tSec);
    const x1 = a1.x, y1 = a1.y, z1 = a1.z;
    const a2 = getAnimatedLocal(segs[i + 3], segs[i + 4], segs[i + 5], animGroup, modelIndex, tSec);
    const x2 = a2.x, y2 = a2.y, z2 = a2.z;

    projLocal(spec, x1, y1, z1, _p);
    const sx1 = _p.sx, sy1 = _p.sy, sz1 = _p.zOrder, sc1 = _p.scale;
    projLocal(spec, x2, y2, z2, _p2);
    const sx2 = _p2.sx, sy2 = _p2.sy, sz2 = _p2.zOrder;

    const avgZ = (sz1 + sz2) * 0.5;
    const depthFactor = clamp(1 - avgZ * 0.38, 0.25, 1.0) * dimOther;
    const midY = (y1 + y2) * 0.5;
    const scanDist = laserActive ? Math.abs(midY - scanY) : 999;
    const isScanned = scanDist < 0.095;

    const colorCode = segs[i + 6];
    const weight = segs[i + 7];
    const baseRGB = colorCode === 2 ? accentRGB : (colorCode === 1 ? brassRGB : inkRGB);

    cx.strokeStyle = isScanned
      ? rgbaStr(cyanScanRGB, Math.min(0.95, depthFactor * 1.15))
      : rgbaStr(baseRGB, depthFactor * (colorCode === 1 ? 0.44 : 0.74) * boost);
    cx.lineWidth = Math.max(0.55, weight * sc1 * scaleBoost * (isScanned ? 1.42 : 0.92));

    cx.beginPath();
    cx.moveTo(sx1, sy1);
    cx.lineTo(sx2, sy2);
    cx.stroke();
  }

  // 3. Nuvola di punti LiDAR ad alta densità
  for (let i = 0; i < pts.length; i += PT_STRIDE) {
    if (!highDensity && pts[i + 6] === 1) continue;

    const animGroup = pts[i + 7];
    const a = getAnimatedLocal(pts[i], pts[i + 1], pts[i + 2], animGroup, modelIndex, tSec);
    const lx = a.x, ly = a.y, lz = a.z;

    projLocal(spec, lx, ly, lz, _p);
    const depthFactor = clamp(1 - _p.zOrder * 0.38, 0.26, 1.0) * dimOther;
    const scanDist = laserActive ? Math.abs(ly - scanY) : 999;
    const scanBoost = scanDist < 0.11 ? (1 - scanDist / 0.11) : 0;

    const colorCode = pts[i + 3];
    const baseSize = pts[i + 4];
    const phase = pts[i + 5];
    const shimmer = (RM || state.ecoMode) ? 0.95 : (0.86 + Math.sin(tSec * 3.0 + phase) * 0.14);

    const baseRGB = colorCode === 2 ? accentRGB : (colorCode === 1 ? brassRGB : inkRGB);
    const finalRGB = scanBoost > 0.25 ? cyanScanRGB : baseRGB;
    const radius = Math.max(0.65, baseSize * _p.scale * scaleBoost * 0.85 * (1 + scanBoost * 0.82));
    const alpha = Math.min(1.0, depthFactor * shimmer * (0.78 + scanBoost * 0.4) * boost);

    if (!state.ecoMode && (scanBoost > 0.45 || baseSize >= 1.9)) {
      cx.fillStyle = rgbaStr(finalRGB, alpha * 0.22);
      cx.beginPath();
      cx.arc(_p.sx, _p.sy, radius * 2.4, 0, Math.PI * 2);
      cx.fill();
    }

    cx.fillStyle = rgbaStr(finalRGB, alpha);
    cx.beginPath();
    cx.arc(_p.sx, _p.sy, radius, 0, Math.PI * 2);
    cx.fill();
  }
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
  const invS = 1 / spec.modelScale;
  for (let i = 0; i <= steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const lx = R * (ca * u[0] + sa * v[0]) * invS;
    const ly = R * (ca * u[1] + sa * v[1]) * invS;
    const lz = R * (ca * u[2] + sa * v[2]) * invS;
    projLocal(spec, lx, ly, lz, _p);
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

    const dimOther = hasOrbit && !isSel ? (1 - state.focus) : 1;
    const boost = isSel ? 1.25 : isHov ? 1.15 : 1.0;
    const sa = clamp((cvT.artStrokeAlpha || 0.9) * boost * dimOther, 0, 1);

    if (sa <= 0.02) return;

    drawOrbitalPlane3D(cx, spec, isSel, isHov, t);

    cx.save();
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    drawLiDARModel3D(cx, spec, idx, t, boost, dimOther);
    cx.restore();

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
