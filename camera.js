/* ============================================================
   camera.js — rotazione 3D libera su matrice 3x3 (zero blocchi ai
   poli e zero gimbal lock) + smorzamento esponenziale fluido
   ============================================================ */
import { state, RM, HOME_3D, HOME_GEO, clamp } from './data.js';
import { project3D } from './view3d.js';
import { geoThumbSize, geoOffset, layoutHubs } from './geo.js';

export const ZOOM_3D = [0.45, 4.8];
export const ZOOM_GEO = [0.75, 18];

/** Ri-ortonormalizza una matrice 3x3 con Gram-Schmidt per evitare derive numeriche. */
function orthonormalize(m) {
  let l0 = Math.hypot(m[0], m[1], m[2]) || 1;
  m[0] /= l0; m[1] /= l0; m[2] /= l0;

  const d01 = m[0] * m[3] + m[1] * m[4] + m[2] * m[5];
  m[3] -= d01 * m[0];
  m[4] -= d01 * m[1];
  m[5] -= d01 * m[2];
  let l1 = Math.hypot(m[3], m[4], m[5]) || 1;
  m[3] /= l1; m[4] /= l1; m[5] /= l1;

  // Terza riga = prodotto vettoriale delle prime due (garantisce determinante +1)
  m[6] = m[1] * m[5] - m[2] * m[4];
  m[7] = m[2] * m[3] - m[0] * m[5];
  m[8] = m[0] * m[4] - m[1] * m[3];
  return m;
}

/**
 * Applica una rotazione incrementale nello spazio schermo (dx intorno all'asse Y
 * dello schermo, dy intorno all'asse X dello schermo) direttamente sulla matrice `m`.
 * Non ha poli né limiti di inclinazione.
 */
export function rotateMatrixScreen(m, dx, dy) {
  const cy = Math.cos(dx), sy = Math.sin(dx);
  const cx = Math.cos(dy), sx = Math.sin(dy);

  // R_x(dy) * R_y(dx)
  const r00 = cy,      r01 = 0,  r02 = -sy;
  const r10 = sx * sy, r11 = cx, r12 = sx * cy;
  const r20 = cx * sy, r21 = -sx, r22 = cx * cy;

  const out = new Array(9);
  for (let col = 0; col < 3; col++) {
    const x = m[col], y = m[col + 3], z = m[col + 6];
    out[col]     = r00 * x + r01 * y + r02 * z;
    out[col + 3] = r10 * x + r11 * y + r12 * z;
    out[col + 6] = r20 * x + r21 * y + r22 * z;
  }
  return orthonormalize(out);
}

/** Avanza le camere di `dt` secondi. Restituisce true finché c'è movimento. */
export function stepCamera(dt) {
  const s = state;
  const k = 1 - Math.exp(-dt * (RM ? 60 : s.drag ? 24 : 7.0));
  let moving = false;

  if (s.viewMode === '3d') {
    const c = s.cam3D, g = s.goal3D;
    if (!s.drag) {
      if (s.autoRotate && !RM && s.sel < 0) {
        g.rot = rotateMatrixScreen(g.rot, dt * 0.14, 0);
        moving = true;
      }
      if (Math.hypot(s.spin.vx, s.spin.vy) > 0.008) {
        g.rot = rotateMatrixScreen(g.rot, s.spin.vx * dt, s.spin.vy * dt);
        const decay = Math.exp(-dt * 3.4);
        s.spin.vx *= decay;
        s.spin.vy *= decay;
        moving = true;
      } else {
        s.spin.vx = s.spin.vy = 0;
      }
    }

    // Interpola la matrice di rotazione verso `g.rot` e ri-ortonormalizza
    let matDiff = 0;
    for (let i = 0; i < 9; i++) {
      const d = g.rot[i] - c.rot[i];
      c.rot[i] += d * k;
      matDiff = Math.max(matDiff, Math.abs(d));
    }
    if (matDiff > 1e-4) {
      orthonormalize(c.rot);
      moving = true;
    }

    for (const key of ['zoom', 'panX', 'panY']) {
      const d = g[key] - c[key];
      c[key] += d * k;
      if (Math.abs(d) > (key.startsWith('pan') ? 0.25 : 0.0006)) moving = true;
    }
  } else {
    const c = s.camGeo, g = s.goalGeo;
    for (const key of ['x', 'y', 'k']) {
      const d = g[key] - c[key];
      c[key] += d * k;
      if (Math.abs(d) > (key === 'k' ? 0.0008 : 0.3)) moving = true;
    }
  }
  return moving;
}

/** Zoom moltiplicativo; sulla mappa è centrato sul punto (px, py). */
export function zoomBy(f, px = state.W / 2, py = state.H / 2) {
  if (state.viewMode === '3d') {
    const g = state.goal3D;
    g.zoom = clamp(g.zoom * f, ...ZOOM_3D);
  } else {
    const g = state.goalGeo;
    const nk = clamp(g.k * f, ...ZOOM_GEO);
    const r = nk / g.k;
    const ox = state.W / 2, oy = state.H / 2;
    g.x = px - ox - (px - ox - g.x) * r;
    g.y = py - oy - (py - oy - g.y) * r;
    g.k = nk;
  }
  state.dirty = true;
}

export function resetView() {
  state.spin.vx = state.spin.vy = 0;
  state.goal3D.rot = [...HOME_3D.rot];
  state.goal3D.zoom = HOME_3D.zoom;
  state.goal3D.panX = HOME_3D.panX;
  state.goal3D.panY = HOME_3D.panY;
  Object.assign(state.goalGeo, HOME_GEO);
  state.dirty = true;
}

/** Quando si chiude la scheda la camera si allontana dolcemente. */
export function releaseFocus() {
  if (state.viewMode === '3d') {
    state.goal3D.zoom = 1;
    state.goal3D.panX = 0;
    state.goal3D.panY = 0;
  }
  state.dirty = true;
}

/** Centro dell'area libera accanto alla scheda (a sinistra su desktop, in basso su mobile). */
function freeCenter() {
  const { W, H } = state;
  if (W > 760) { const left = 398; return { x: left + (W - left) / 2, y: H / 2 }; }
  return { x: W / 2, y: H * 0.26 };
}

const _probe = {}, _off = {};

/**
 * Ruota lungo l'arco più breve (asse-angolo di Rodrigues) per portare il punto `it`
 * esattamente davanti alla camera lungo l'asse -Z.
 */
function alignPointFront(m, x, y, z) {
  // Posizione attuale nello spazio camera
  let vx = m[0] * x + m[1] * y + m[2] * z;
  let vy = m[3] * x + m[4] * y + m[5] * z;
  let vz = m[6] * x + m[7] * y + m[8] * z;
  const len = Math.hypot(vx, vy, vz);
  if (len < 1e-6) return [...m];
  vx /= len; vy /= len; vz /= len;

  // Vogliamo ruotare v = (vx, vy, vz) verso t = (0, 0, -1)
  // Asse di rotazione u = v x t = (-vy, vx, 0)
  const ux = -vy, uy = vx;
  const sinA = Math.hypot(ux, uy);
  const cosA = -vz; // dot(v, (0, 0, -1))

  if (sinA < 1e-6) {
    if (cosA > 0) return [...m];
    // Caso limite 180°: ruota di pi greco attorno all'asse Y
    return rotateMatrixScreen(m, Math.PI, 0);
  }

  const ax = ux / sinA, ay = uy / sinA;
  const t = 1 - cosA;
  // Formula di Rodrigues per R(u, angle)
  const r00 = t * ax * ax + cosA, r01 = t * ax * ay,        r02 = sinA * ay;
  const r10 = t * ax * ay,        r11 = t * ay * ay + cosA, r12 = -sinA * ax;
  const r20 = -sinA * ay,         r21 = sinA * ax,          r22 = cosA;

  const out = new Array(9);
  for (let col = 0; col < 3; col++) {
    const px = m[col], py = m[col + 3], pz = m[col + 6];
    out[col]     = r00 * px + r01 * py + r02 * pz;
    out[col + 3] = r10 * px + r11 * py + r12 * pz;
    out[col + 6] = r20 * px + r21 * py + r22 * pz;
  }
  return orthonormalize(out);
}

/** Porta la tavola `it` davanti alla camera, nell'area libera dello schermo. */
export function focusOn(it) {
  const want = freeCenter();
  if (state.viewMode === '3d') {
    const rot = alignPointFront(state.cam3D.rot, it.x, it.y, it.z);
    const zoom = 1.7;
    project3D(it.x, it.y, it.z, _probe, { rot, zoom, panX: 0, panY: 0 });
    Object.assign(state.goal3D, {
      rot,
      zoom,
      panX: want.x - _probe.sx,
      panY: want.y - _probe.sy
    });
  } else {
    const k = 3.0, size = geoThumbSize(k);
    const h = layoutHubs(size, { x: 0, y: 0, k }, new Map()).get(it.hubId);
    geoOffset(it, size, _off);
    Object.assign(state.goalGeo, {
      k,
      x: want.x - (h.x + _off.dx),
      y: want.y - (h.y + _off.dy)
    });
  }
  state.dirty = true;
}
