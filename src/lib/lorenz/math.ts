export type Vec3 = { x: number; y: number; z: number };

export const CLASSIC = { sigma: 10, rho: 28, beta: 8 / 3 } as const;

/** Map Lorenz (x,y,z) → three.js Y-up world, centered on the butterfly. */
export const WORLD_SCALE = 0.135;
export const Z_CENTER = 27;

export function toWorld(x: number, y: number, z: number, out: Vec3): Vec3 {
  out.x = x * WORLD_SCALE;
  out.y = (z - Z_CENTER) * WORLD_SCALE;
  out.z = y * WORLD_SCALE;
  return out;
}

export function deriv(
  x: number,
  y: number,
  z: number,
  sigma: number,
  rho: number,
  beta: number,
  out: Vec3,
): Vec3 {
  out.x = sigma * (y - x);
  out.y = x * (rho - z) - y;
  out.z = x * y - beta * z;
  return out;
}

const k1: Vec3 = { x: 0, y: 0, z: 0 };
const k2: Vec3 = { x: 0, y: 0, z: 0 };
const k3: Vec3 = { x: 0, y: 0, z: 0 };
const k4: Vec3 = { x: 0, y: 0, z: 0 };

/** In-place RK4 step. Reuses scratch vectors — safe to call in the hot loop. */
export function rk4(
  p: Vec3,
  dt: number,
  sigma: number,
  rho: number,
  beta: number,
): void {
  deriv(p.x, p.y, p.z, sigma, rho, beta, k1);
  deriv(p.x + k1.x * dt * 0.5, p.y + k1.y * dt * 0.5, p.z + k1.z * dt * 0.5, sigma, rho, beta, k2);
  deriv(p.x + k2.x * dt * 0.5, p.y + k2.y * dt * 0.5, p.z + k2.z * dt * 0.5, sigma, rho, beta, k3);
  deriv(p.x + k3.x * dt, p.y + k3.y * dt, p.z + k3.z * dt, sigma, rho, beta, k4);
  p.x += (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x);
  p.y += (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y);
  p.z += (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z);
}

export function speedOf(p: Vec3, sigma: number, rho: number, beta: number): number {
  deriv(p.x, p.y, p.z, sigma, rho, beta, k1);
  return Math.hypot(k1.x, k1.y, k1.z);
}

/**
 * Scientific colormap for the attractor (not UI chrome):
 * deep slate → teal → bone → peach, keyed by t in [0, 1].
 */
const STOPS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0.18, 0.48, 0.52],
  [0.32, 0.32, 0.95, 0.9],
  [0.62, 1, 0.97, 0.84],
  [1, 1, 0.78, 0.56],
];

export function samplePalette(t: number, out: Vec3): Vec3 {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  let i = 0;
  while (i < STOPS.length - 2 && STOPS[i + 1]![0] < u) i += 1;
  const a = STOPS[i]!;
  const b = STOPS[i + 1]!;
  const span = b[0] - a[0] || 1;
  const f = (u - a[0]) / span;
  out.x = a[1] + (b[1] - a[1]) * f;
  out.y = a[2] + (b[2] - a[2]) * f;
  out.z = a[3] + (b[3] - a[3]) * f;
  return out;
}

export function formatParam(n: number, digits = 2): string {
  return n.toFixed(digits).replace(/\.?0+$/, (m) => (m.startsWith(".") ? "" : m));
}
