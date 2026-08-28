import { rk4, samplePalette, speedOf, toWorld, type Vec3 } from "./math";
import type { ColorMode } from "./store";

export const MAX_PARTICLES = 48;
export const MAX_TRAIL = 8000;
export const MAX_FOSSIL = 28000;

const world: Vec3 = { x: 0, y: 0, z: 0 };
const color: Vec3 = { x: 0, y: 0, z: 0 };

function hash01(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class LorenzSimulation {
  readonly states: Vec3[] = [];
  readonly trailPos: Float32Array;
  readonly trailCol: Float32Array;
  readonly headPos: Float32Array;
  readonly headCol: Float32Array;
  readonly fossilPos: Float32Array;
  readonly fossilCol: Float32Array;
  /** Next write index in the MAX_TRAIL ring. */
  heads: Int32Array;
  filled: Int32Array;
  fossilHead = 0;
  fossilFilled = 0;
  simTime = 0;
  recordAcc = 0;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) this.states.push({ x: 0, y: 0, z: 0 });
    this.trailPos = new Float32Array(MAX_PARTICLES * MAX_TRAIL * 3);
    this.trailCol = new Float32Array(MAX_PARTICLES * MAX_TRAIL * 3);
    this.headPos = new Float32Array(MAX_PARTICLES * 3);
    this.headCol = new Float32Array(MAX_PARTICLES * 3);
    this.fossilPos = new Float32Array(MAX_FOSSIL * 3);
    this.fossilCol = new Float32Array(MAX_FOSSIL * 3);
    this.heads = new Int32Array(MAX_PARTICLES);
    this.filled = new Int32Array(MAX_PARTICLES);
    this.seed(18);
    this.warmup({
      sigma: 10,
      rho: 28,
      beta: 8 / 3,
      speed: 1.4,
      particles: 18,
      colorMode: "height",
    });
  }

  seed(count: number, spread = 0.08): void {
    this.simTime = 0;
    this.fossilHead = 0;
    this.fossilFilled = 0;
    this.recordAcc = 0;
    this.trailPos.fill(0);
    this.trailCol.fill(0);
    this.fossilPos.fill(0);
    this.fossilCol.fill(0);
    this.heads.fill(0);
    this.filled.fill(0);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.states[i]!;
      p.x = 0.1 + (hash01(i) - 0.5) * spread;
      p.y = (hash01(i + 17) - 0.5) * spread;
      p.z = (hash01(i + 31) - 0.5) * spread * 0.5;
    }
    this.stampHeads(count);
  }

  warmup(params: {
    sigma: number;
    rho: number;
    beta: number;
    speed: number;
    particles: number;
    colorMode: ColorMode;
  }): void {
    for (let i = 0; i < 900; i++) this.step(1 / 60, params);
  }

  perturb(count: number, amount = 0.18): void {
    for (let i = 0; i < count; i++) {
      const p = this.states[i]!;
      p.x += (hash01(i + this.simTime * 13) - 0.5) * amount;
      p.y += (hash01(i + 9 + this.simTime * 7) - 0.5) * amount;
      p.z += (hash01(i + 21) - 0.5) * amount * 0.45;
    }
  }

  step(
    dt: number,
    params: {
      sigma: number;
      rho: number;
      beta: number;
      speed: number;
      particles: number;
      colorMode: ColorMode;
    },
  ): void {
    const { sigma, rho, beta, speed, particles, colorMode } = params;
    const advance = Math.min(dt, 0.05) * 0.9 * speed;
    if (advance <= 0) return;

    const h = 0.004;
    const steps = Math.min(48, Math.max(1, Math.round(advance / h)));
    const dh = advance / steps;

    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < particles; i++) {
        const p = this.states[i]!;
        rk4(p, dh, sigma, rho, beta);
        if (!Number.isFinite(p.x + p.y + p.z) || Math.abs(p.x) > 1e3) {
          p.x = 0.1;
          p.y = 0;
          p.z = 0;
        }
      }
      this.simTime += dh;
      this.recordAcc += 1;
      if (this.recordAcc % 2 === 0) {
        this.record(particles, sigma, rho, beta, colorMode);
      }
    }
    this.stampHeads(particles, sigma, rho, beta, colorMode);
  }

  private record(
    particles: number,
    sigma: number,
    rho: number,
    beta: number,
    colorMode: ColorMode,
  ): void {
    for (let i = 0; i < particles; i++) {
      const p = this.states[i]!;
      const idx = this.heads[i]!;
      toWorld(p.x, p.y, p.z, world);
      const base = (i * MAX_TRAIL + idx) * 3;
      this.trailPos[base] = world.x;
      this.trailPos[base + 1] = world.y;
      this.trailPos[base + 2] = world.z;
      this.colorFor(p, colorMode, sigma, rho, beta, color);
      this.trailCol[base] = color.x;
      this.trailCol[base + 1] = color.y;
      this.trailCol[base + 2] = color.z;
      this.heads[i] = (idx + 1) % MAX_TRAIL;
      if (this.filled[i]! < MAX_TRAIL) this.filled[i] += 1;
    }

    const fi = this.fossilHead % particles;
    const fp = this.states[fi]!;
    toWorld(fp.x, fp.y, fp.z, world);
    this.colorFor(fp, colorMode, sigma, rho, beta, color);
    const fo = this.fossilHead * 3;
    this.fossilPos[fo] = world.x;
    this.fossilPos[fo + 1] = world.y;
    this.fossilPos[fo + 2] = world.z;
    this.fossilCol[fo] = Math.min(1, color.x * 0.85);
    this.fossilCol[fo + 1] = Math.min(1, color.y * 0.85);
    this.fossilCol[fo + 2] = Math.min(1, color.z * 0.85);
    this.fossilHead = (this.fossilHead + 1) % MAX_FOSSIL;
    if (this.fossilFilled < MAX_FOSSIL) this.fossilFilled += 1;
  }

  private stampHeads(
    particles: number,
    sigma = 10,
    rho = 28,
    beta = 8 / 3,
    colorMode: ColorMode = "height",
  ): void {
    for (let i = 0; i < particles; i++) {
      const p = this.states[i]!;
      toWorld(p.x, p.y, p.z, world);
      const o = i * 3;
      this.headPos[o] = world.x;
      this.headPos[o + 1] = world.y;
      this.headPos[o + 2] = world.z;
      this.colorFor(p, colorMode, sigma, rho, beta, color);
      this.headCol[o] = Math.min(1, color.x * 1.35);
      this.headCol[o + 1] = Math.min(1, color.y * 1.35);
      this.headCol[o + 2] = Math.min(1, color.z * 1.35);
    }
  }

  private colorFor(
    p: Vec3,
    mode: ColorMode,
    sigma: number,
    rho: number,
    beta: number,
    out: Vec3,
  ): Vec3 {
    if (mode === "height") {
      samplePalette((p.z - 5) / 40, out);
    } else if (mode === "speed") {
      samplePalette(speedOf(p, sigma, rho, beta) / 80, out);
    } else {
      samplePalette(0.38, out);
    }
    out.x = Math.min(1, out.x * 1.25);
    out.y = Math.min(1, out.y * 1.25);
    out.z = Math.min(1, out.z * 1.25);
    return out;
  }

  /** Write chronological trail into `posOut`/`colOut`. Returns vertex count. */
  writeTrailOrdered(
    i: number,
    trail: number,
    posOut: Float32Array,
    colOut: Float32Array,
  ): number {
    const tLen = Math.min(MAX_TRAIL, Math.max(64, trail | 0));
    const count = Math.min(this.filled[i]!, tLen);
    const head = this.heads[i]!;
    const denom = count - 1 || 1;
    for (let k = 0; k < count; k++) {
      const src = (head - count + k + MAX_TRAIL) % MAX_TRAIL;
      const fade = 0.28 + 0.72 * (k / denom) ** 0.4;
      const si = (i * MAX_TRAIL + src) * 3;
      const di = k * 3;
      posOut[di] = this.trailPos[si]!;
      posOut[di + 1] = this.trailPos[si + 1]!;
      posOut[di + 2] = this.trailPos[si + 2]!;
      colOut[di] = this.trailCol[si]! * fade;
      colOut[di + 1] = this.trailCol[si + 1]! * fade;
      colOut[di + 2] = this.trailCol[si + 2]! * fade;
    }
    return count;
  }

  lead(): Vec3 {
    return this.states[0]!;
  }
}
