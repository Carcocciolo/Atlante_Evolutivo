/* ============================================================
   camera.js — le camere inseguono un obiettivo ("goal") con
   smorzamento esponenziale: trascinamento, inerzia, zoom e volo
   verso la tavola selezionata sono tutti la stessa meccanica.
   ============================================================ */
import { state, RM, HOME_3D, HOME_GEO, clamp } from './data.js';
import { project3D } from './view3d.js';
import { geoThumbSize, geoOffset, layoutHubs } from './geo.js';

export const ZOOM_3D = [0.45, 4.8];
export const ZOOM_GEO = [0.75, 18];

const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const KEYS_3D = ['yaw', 'pitch', 'zoom', 'panX', 'panY'];

/** Avanza le camere di `dt` secondi. Restituisce true finché c'è movimento. */
export function stepCamera(dt) {
  const s = state;
  const k = 1 - Math.exp(-dt * (RM ? 60 : s.drag ? 24 : 6.5));
  let moving = false;

  if (s.viewMode === '3d') {
    const c = s.cam3D, g = s.goal3D;
    if (!s.drag) {
      if (s.autoRotate && !RM && s.sel < 0) {
        g.yaw += dt * 0.14;
        moving = true;
      }
      if (Math.abs(s.spin.yaw) + Math.abs(s.spin.pitch) > 0.01) {
        g.yaw += s.spin.yaw * dt;
        g.pitch = clamp(g.pitch + s.spin.pitch * dt, -1.35, 1.35);
        const decay = Math.exp(-dt * 3.2);
        s.spin.yaw *= decay; s.spin.pitch *= decay;
      } else s.spin.yaw = s.spin.pitch = 0;
    }
    for (const key of KEYS_3D) {
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
  Object.assign(state.goal3D, HOME_3D);
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

/** Porta la tavola `it` davanti alla camera, nell'area libera dello schermo. */
export function focusOn(it) {
  const want = freeCenter();
  if (state.viewMode === '3d') {
    const cur = state.cam3D, g = state.goal3D;
    const h = Math.hypot(it.x, it.z);
    const yaw = cur.yaw + wrapAngle(Math.atan2(-it.x, -it.z) - cur.yaw);
    const pitch = clamp(-Math.atan2(it.y, h), -1.1, 1.1);
    const zoom = 1.7;
    project3D(it.x, it.y, it.z, _probe, { yaw, pitch, zoom, panX: 0, panY: 0 });
    Object.assign(g, { yaw, pitch, zoom, panX: want.x - _probe.sx, panY: want.y - _probe.sy });
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
