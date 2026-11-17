/* ============================================================
   camera.js — trackball 3D libera, orbite dedicate per piano
   orbitale degli archetipi e inseguimento con smorzamento
   ============================================================ */
import { state, RM, HOME_GEO, clamp } from './data.js';
import { project3D } from './view3d.js';
import { geoThumbSize, geoOffset, layoutHubs } from './geo.js';
import { SPECIMENS } from './specimens.js';

export const ZOOM_3D = [0.45, 5.2];
export const ZOOM_GEO = [0.75, 18];

export function setIdentityRot(m) {
  m.fill(0);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function rotateScreenSpace(m, dyaw, dpitch) {
  if (Math.abs(dyaw) > 1e-9) {
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

function orthonormalize(m) {
  let x0 = m[0], x1 = m[1], x2 = m[2];
  let lx = Math.hypot(x0, x1, x2);
  if (lx < 1e-6) { x0 = 1; x1 = 0; x2 = 0; lx = 1; }
  x0 /= lx; x1 /= lx; x2 /= lx;

  let y0 = m[4], y1 = m[5], y2 = m[6];
  const dot = x0 * y0 + x1 * y1 + x2 * y2;
  y0 -= dot * x0; y1 -= dot * x1; y2 -= dot * x2;
  let ly = Math.hypot(y0, y1, y2);
  if (ly < 1e-6) {
    y0 = Math.abs(x1) < 0.9 ? 0 : 1;
    y1 = Math.abs(x1) < 0.9 ? 1 : 0;
    y2 = 0;
    const d2 = x0 * y0 + x1 * y1 + x2 * y2;
    y0 -= d2 * x0; y1 -= d2 * x1; y2 -= d2 * x2;
    ly = Math.hypot(y0, y1, y2) || 1;
  }
  y0 /= ly; y1 /= ly; y2 /= ly;

  const z0 = x1 * y2 - x2 * y1;
  const z1 = x2 * y0 - x0 * y2;
  const z2 = x0 * y1 - x1 * y0;

  m[0] = x0; m[1] = x1; m[2] = x2;
  m[4] = y0; m[5] = y1; m[6] = y2;
  m[8] = z0; m[9] = z1; m[10] = z2;
}

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

/**
 * Calcola la matrice di rotazione della camera sul piano orbitale dedicato
 * di uno specifico archetipo evolutivo alla fase `phase` e elevazione `elev`.
 * Nel sistema di proiezione canvas +Y è verso il basso, quindi la normale n
 * (con n[1] > 0) mantiene sempre l'orientamento verticale corretto senza capovolgimenti.
 */
export function computeOrbitalRotation(spec, phase, elev, outRot = new Float64Array(16)) {
  const { u, v, n } = spec.orbitalPlane;
  const cp = Math.cos(phase), sp = Math.sin(phase);
  const ce = Math.cos(elev), se = Math.sin(elev);

  // Garantisce che la normale di riferimento punti sempre verso +Y (basso schermo)
  const sign = n[1] >= 0 ? 1 : -1;
  const nx = n[0] * sign, ny = n[1] * sign, nz = n[2] * sign;

  // Vettore radiale dal centro dello specimen verso la camera nel suo piano orbitale
  const rx = ce * (cp * u[0] + sp * v[0]) - se * nx;
  const ry = ce * (cp * u[1] + sp * v[1]) - se * ny;
  const rz = ce * (cp * u[2] + sp * v[2]) - se * nz;

  // Asse Z camera (direzione di profondità lungo la visuale)
  let zx = -rx, zy = -ry, zz = -rz;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl; zy /= zl; zz /= zl;

  // Asse +Y camera allineato alla normale del piano orbitale (così -Y resta l'alto sullo schermo)
  const ux = nx, uy = ny, uz = nz;

  // X = normalize(up x Z)
  let xx = uy * zz - uz * zy;
  let xy = uz * zx - ux * zz;
  let xz = ux * zy - uy * zx;
  const xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl; xy /= xl; xz /= xl;

  // Y = Z x X
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  outRot[0] = xx; outRot[1] = xy; outRot[2] = xz; outRot[3] = 0;
  outRot[4] = yx; outRot[5] = yy; outRot[6] = yz; outRot[7] = 0;
  outRot[8] = zx; outRot[9] = zy; outRot[10] = zz; outRot[11] = 0;
  outRot[12] = 0; outRot[13] = 0; outRot[14] = 0; outRot[15] = 1;
  return outRot;
}

export function initHome3D(m) {
  setIdentityRot(m);
  rotateScreenSpace(m, 0.35, 0.18);
  return m;
}

initHome3D(state.cam3D.rot);
initHome3D(state.goal3D.rot);

export function stepCamera(dt) {
  const s = state;
  const instant = RM || s.ecoMode;
  const k = 1 - Math.exp(-dt * (instant ? 60 : s.drag ? 26 : 7.2));
  let moving = false;

  if (s.viewMode === '3d') {
    const c = s.cam3D, g = s.goal3D;
    const activeSpec = s.specimenSel >= 0 ? SPECIMENS[s.specimenSel] : null;

    if (activeSpec) {
      if (!s.drag) {
        if (s.autoRotate && !instant) {
          s.orbitPhase += dt * 0.24;
          moving = true;
        }
        if (Math.abs(s.spin.yaw) > 0.006) {
          s.orbitPhase += s.spin.yaw * dt;
          s.spin.yaw *= Math.exp(-dt * 3.8);
          moving = true;
        } else {
          s.spin.yaw = 0;
        }
        const elevDiff = activeSpec.orbitalPlane.initialElev - s.orbitElev;
        if (Math.abs(elevDiff) > 0.0008) {
          s.orbitElev += elevDiff * Math.min(1, dt * 2.2);
          moving = true;
        }
      }
      computeOrbitalRotation(activeSpec, s.orbitPhase, s.orbitElev, g.rot);
      g.targetX = activeSpec.anchor.x;
      g.targetY = activeSpec.anchor.y;
      g.targetZ = activeSpec.anchor.z;
    } else if (!s.drag) {
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

    for (const key of ['yaw', 'pitch', 'zoom', 'panX', 'panY', 'targetX', 'targetY', 'targetZ']) {
      const d = g[key] - c[key];
      c[key] += d * k;
      const eps = key.startsWith('pan') ? 0.3 : 0.0008;
      if (Math.abs(d) > eps) moving = true;
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
  if (state.specimenSel >= 0 && SPECIMENS[state.specimenSel]) {
    const spec = SPECIMENS[state.specimenSel];
    state.orbitPhase = spec.orbitalPlane.initialPhase;
    state.orbitElev = spec.orbitalPlane.initialElev;
    focusOnSpecimen(spec);
    return;
  }
  initHome3D(state.goal3D.rot);
  Object.assign(state.goal3D, {
    yaw: 0.35, pitch: 0.18, zoom: 1, panX: 0, panY: 0,
    targetX: 0, targetY: 0, targetZ: 0
  });
  Object.assign(state.goalGeo, HOME_GEO);
  state.dirty = true;
}

export function releaseFocus() {
  if (state.viewMode === '3d') {
    state.goal3D.zoom = 1;
    state.goal3D.panX = 0;
    state.goal3D.panY = 0;
    state.goal3D.targetX = 0;
    state.goal3D.targetY = 0;
    state.goal3D.targetZ = 0;
  }
  state.dirty = true;
}

function freeCenter() {
  const { W, H } = state;
  if (W > 760) { const left = 408; return { x: left + (W - left) / 2, y: H / 2 }; }
  return { x: W / 2, y: H * 0.25 };
}

const _probe = {}, _off = {};

export function focusOn(it) {
  const want = freeCenter();
  if (state.viewMode === '3d') {
    const g = state.goal3D;
    g.targetX = 0;
    g.targetY = 0;
    g.targetZ = 0;

    const len = Math.hypot(it.x, it.y, it.z) || 1;
    let zx = -it.x / len, zy = -it.y / len, zz = -it.z / len;

    let ux = 0, uy = 1, uz = 0;
    if (Math.abs(zy) > 0.94) { ux = 0; uy = 0; uz = 1; }

    let xx = uy * zz - uz * zy;
    let xy = uz * zx - ux * zz;
    let xz = ux * zy - uy * zx;
    const xl = Math.hypot(xx, xy, xz) || 1;
    xx /= xl; xy /= xl; xz /= xl;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    const rot = new Float64Array(16);
    rot[0] = xx; rot[1] = xy; rot[2] = xz;
    rot[4] = yx; rot[5] = yy; rot[6] = yz;
    rot[8] = zx; rot[9] = zy; rot[10] = zz;
    rot[15] = 1;

    const zoom = state.W <= 760 ? 1.45 : 1.72;
    project3D(it.x, it.y, it.z, _probe, { rot, zoom, panX: 0, panY: 0, targetX: 0, targetY: 0, targetZ: 0 });
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

/**
 * Sposta la camera nella vista orbitale dedicata attorno a un archetipo evolutivo,
 * centrandola sul suo anchor 3D e allineandola al suo piano orbitale proprio.
 */
export function focusOnSpecimen(spec) {
  if (!spec) return;
  const want = freeCenter();
  const g = state.goal3D;
  state.spin.yaw = state.spin.pitch = 0;

  g.targetX = spec.anchor.x;
  g.targetY = spec.anchor.y;
  g.targetZ = spec.anchor.z;

  computeOrbitalRotation(spec, state.orbitPhase, state.orbitElev, g.rot);
  g.zoom = state.W <= 760 ? 1.65 : 1.98;
  g.panX = want.x - state.W / 2;
  g.panY = want.y - state.H / 2;
  state.dirty = true;
}

/**
 * Orienta la fase orbitale sul piano dello specimen per portare in primo piano
 * uno specifico callout anatomico 3D.
 */
export function focusOnCallout(spec, calloutIdx) {
  if (!spec || !spec.callouts || !spec.callouts[calloutIdx]) return;
  const c = spec.callouts[calloutIdx];
  const [lx, ly, lz] = c.pos;
  const { u, v } = spec.orbitalPlane;
  const pu = lx * u[0] + ly * u[1] + lz * u[2];
  const pv = lx * v[0] + ly * v[1] + lz * v[2];
  if (Math.hypot(pu, pv) > 1e-4) {
    state.orbitPhase = Math.atan2(pv, pu) + 0.36;
  }
  state.orbitElev = spec.orbitalPlane.initialElev;
  state.spin.yaw = 0;
  state.dirty = true;
}