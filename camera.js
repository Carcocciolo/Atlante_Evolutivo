/* ============================================================
   camera.js — trackball 3D libera (supera i poli senza blocco)
   e inseguimento obiettivo con smorzamento esponenziale
   ============================================================ */
import { state, RM, HOME_GEO, clamp } from './data.js';
import { project3D } from './view3d.js';
import { geoThumbSize, geoOffset, layoutHubs } from './geo.js';

export const ZOOM_3D = [0.45, 4.8];
export const ZOOM_GEO = [0.75, 18];

/* ---------- algebra matriciale 3x3 (salvata in array 16 per compatibilità) ---------- */
export function setIdentityRot(m) {
  m.fill(0);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/** Applica una rotazione incrementale nel sistema schermo: dyaw attorno a Y, dpitch attorno a X. */
export function rotateScreenSpace(m, dyaw, dpitch) {
  if (Math.abs(dyaw) > 1e-9) {
    // Rotazione attorno all'asse Y dello schermo (ruota X e Z)
    const c = Math.cos(-dyaw), s = Math.sin(-dyaw);
    const r00 = m[0], r01 = m[1], r02 = m[2];
    const r20 = m[8], r21 = m[9], r22 = m[10];
    m[0] = c * r00 + s * r20;
    m[1] = c * r01 + s * r21;
    m[2] = c * r02 + s * r22;
    m[8] = -s * r00 + c * r20;
    m[9] = -s * r01 + c * r21;
    m[10] = -s * r02 + c * r22;
  }
  if (Math.abs(dpitch) > 1e-9) {
    // Rotazione attorno all'asse X dello schermo (ruota Y e Z — permette di superare i poli!)
    const c = Math.cos(dpitch), s = Math.sin(dpitch);
    const r10 = m[4], r11 = m[5], r12 = m[6];
    const r20 = m[8], r21 = m[9], r22 = m[10];
    m[4] = c * r10 - s * r20;
    m[5] = c * r11 - s * r21;
    m[6] = c * r12 - s * r22;
    m[8] = s * r10 + c * r20;
    m[9] = s * r11 + c * r21;
    m[10] = s * r12 + c * r22;
  }
  orthonormalize(m);
}

/** Ortogonalizzazione di Gram-Schmidt per evitare deriva numerica. */
function orthonormalize(m) {
  let x0 = m[0], x1 = m[1], x2 = m[2];
  let lx = Math.hypot(x0, x1, x2) || 1;
  x0 /= lx; x1 /= lx; x2 /= lx;

  let y0 = m[4], y1 = m[5], y2 = m[6];
  const dot = x0 * y0 + x1 * y1 + x2 * y2;
  y0 -= dot * x0; y1 -= dot * x1; y2 -= dot * x2;
  let ly = Math.hypot(y0, y1, y2) || 1;
  y0 /= ly; y1 /= ly; y2 /= ly;

  // Z = X × Y
  const z0 = x1 * y2 - x2 * y1;
  const z1 = x2 * y0 - x0 * y2;
  const z2 = x0 * y1 - x1 * y0;

  m[0] = x0; m[1] = x1; m[2] = x2;
  m[4] = y0; m[5] = y1; m[6] = y2;
  m[8] = z0; m[9] = z1; m[10] = z2;
}

/** Interpola la matrice `cur` verso `goal` e ortogonalizza. */
function lerpRot(cur, goal, k) {
  let diff = 0;
  for (const idx of [0, 1, 2, 4, 5, 6, 8, 9, 10]) {
    const d = goal[idx] - cur[idx];
    cur[idx] += d * k;
    diff = Math.max(diff, Math.abs(d));
  }
  if (diff > 1e-6) orthonormalize(cur);
  return diff;
}

export function initHome3D(m) {
  setIdentityRot(m);
  rotateScreenSpace(m, 0.35, 0.18);
  return m;
}

// Inizializza le camere 3D all'avvio
initHome3D(state.cam3D.rot);
initHome3D(state.goal3D.rot);

/** Avanza le camere di `dt` secondi. Restituisce true finché c'è movimento. */
export function stepCamera(dt) {
  const s = state;
  const instant = RM || s.ecoMode;
  const k = 1 - Math.exp(-dt * (instant ? 60 : s.drag ? 26 : 7.2));
  let moving = false;

  if (s.viewMode === '3d') {
    const c = s.cam3D, g = s.goal3D;
    if (!s.drag) {
      if (s.autoRotate && !instant && s.sel < 0) {
        const stepYaw = dt * 0.14;
        g.yaw += stepYaw;
        rotateScreenSpace(g.rot, stepYaw, 0);
        moving = true;
      }
      if (Math.abs(s.spin.yaw) + Math.abs(s.spin.pitch) > 0.008) {
        const dy = s.spin.yaw * dt;
        const dp = s.spin.pitch * dt;
        g.yaw += dy;
        g.pitch += dp;
        rotateScreenSpace(g.rot, dy, dp);
        const decay = Math.exp(-dt * 3.4);
        s.spin.yaw *= decay;
        s.spin.pitch *= decay;
        moving = true;
      } else {
        s.spin.yaw = s.spin.pitch = 0;
      }
    }

    const rotDiff = lerpRot(c.rot, g.rot, k);
    if (rotDiff > 0.0006) moving = true;

    for (const key of ['yaw', 'pitch', 'zoom', 'panX', 'panY']) {
      const d = g[key] - c[key];
      c[key] += d * k;
      if (Math.abs(d) > (key.startsWith('pan') ? 0.3 : 0.0008)) moving = true;
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
  state.spin.yaw = state.spin.pitch = 0;
  initHome3D(state.goal3D.rot);
  Object.assign(state.goal3D, { yaw: 0.35, pitch: 0.18, zoom: 1, panX: 0, panY: 0 });
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

/** Centro dell'area libera accanto alla scheda (a destra su desktop, in alto su mobile). */
function freeCenter() {
  const { W, H } = state;
  if (W > 760) { const left = 398; return { x: left + (W - left) / 2, y: H / 2 }; }
  return { x: W / 2, y: H * 0.25 };
}

const _probe = {}, _off = {};

/** Porta la tavola `it` davanti alla camera, nell'area libera dello schermo. */
export function focusOn(it) {
  const want = freeCenter();
  if (state.viewMode === '3d') {
    const g = state.goal3D;
    // Costruisce una matrice di vista che porta `it` esattamente verso -Z (davanti alla camera)
    const len = Math.hypot(it.x, it.y, it.z) || 1;
    let zx = -it.x / len, zy = -it.y / len, zz = -it.z / len;

    // Vettore "up" di riferimento (se quasi parallelo a Z, usa X)
    let ux = 0, uy = 1, uz = 0;
    if (Math.abs(zy) > 0.94) { ux = 0; uy = 0; uz = 1; }

    // X = up × Z
    let xx = uy * zz - uz * zy;
    let xy = uz * zx - ux * zz;
    let xz = ux * zy - uy * zx;
    const xl = Math.hypot(xx, xy, xz) || 1;
    xx /= xl; xy /= xl; xz /= xl;

    // Y = Z × X
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    const rot = new Float64Array(16);
    rot[0] = xx; rot[1] = xy; rot[2] = xz;
    rot[4] = yx; rot[5] = yy; rot[6] = yz;
    rot[8] = zx; rot[9] = zy; rot[10] = zz;
    rot[15] = 1;

    const zoom = state.W <= 760 ? 1.45 : 1.7;
    project3D(it.x, it.y, it.z, _probe, { rot, zoom, panX: 0, panY: 0 });
    g.rot.set(rot);
    g.zoom = zoom;
    g.panX = want.x - _probe.sx;
    g.panY = want.y - _probe.sy;
  } else {
    const k = state.W <= 760 ? 2.6 : 3.0;
    const size = geoThumbSize(k);
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
