export const DEFAULT_PX_PER_SEC = 30;
export const DENSITY_DEFAULT = 1.0;
export const DENSITY_MIN = 0.1;
export const DENSITY_MAX = 4.0;

export function clampDensity(d) {
  if (typeof d !== 'number' || !Number.isFinite(d)) return DENSITY_DEFAULT;
  if (d < DENSITY_MIN) return DENSITY_MIN;
  if (d > DENSITY_MAX) return DENSITY_MAX;
  return d;
}

export function clampUserFactor(u) {
  if (typeof u !== 'number' || !Number.isFinite(u) || u <= 0) return 1.0;
  return u;
}
