import { create } from "zustand";
import { PRESETS } from "./presets";

export type ColorMode = "height" | "speed" | "age";

export type LorenzState = {
  sigma: number;
  rho: number;
  beta: number;
  speed: number;
  particles: number;
  trail: number;
  paused: boolean;
  autoRotate: boolean;
  colorMode: ColorMode;
  presetId: string;
  generation: number;
  perturbNonce: number;
  leadX: number;
  leadY: number;
  leadZ: number;
  simTime: number;
  panelOpen: boolean;
  aboutOpen: boolean;
};

export type LorenzActions = {
  setSigma: (v: number) => void;
  setRho: (v: number) => void;
  setBeta: (v: number) => void;
  setSpeed: (v: number) => void;
  setParticles: (v: number) => void;
  setTrail: (v: number) => void;
  setColorMode: (v: ColorMode) => void;
  setPaused: (v: boolean) => void;
  togglePaused: () => void;
  setAutoRotate: (v: boolean) => void;
  applyPreset: (id: string) => void;
  reset: () => void;
  perturb: () => void;
  setLead: (x: number, y: number, z: number, t: number) => void;
  setPanelOpen: (v: boolean) => void;
  setAboutOpen: (v: boolean) => void;
};

const classic = PRESETS[0]!;

const initial: LorenzState = {
  sigma: classic.sigma,
  rho: classic.rho,
  beta: classic.beta,
  speed: 1,
  particles: 18,
  trail: 3600,
  paused: false,
  autoRotate: true,
  colorMode: "height",
  presetId: classic.id,
  generation: 0,
  perturbNonce: 0,
  leadX: 0.1,
  leadY: 0,
  leadZ: 0,
  simTime: 0,
  panelOpen: false,
  aboutOpen: false,
};

export const useLorenz = create<LorenzState & LorenzActions>((set) => ({
  ...initial,
  setSigma: (sigma) => set({ sigma, presetId: "custom" }),
  setRho: (rho) => set({ rho, presetId: "custom" }),
  setBeta: (beta) => set({ beta, presetId: "custom" }),
  setSpeed: (speed) => set({ speed }),
  setParticles: (particles) => set({ particles }),
  setTrail: (trail) => set({ trail }),
  setColorMode: (colorMode) => set({ colorMode }),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  applyPreset: (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    set((s) => ({
      sigma: p.sigma,
      rho: p.rho,
      beta: p.beta,
      presetId: p.id,
      generation: s.generation + 1,
      paused: false,
    }));
  },
  reset: () => set((s) => ({ generation: s.generation + 1, paused: false })),
  perturb: () => set((s) => ({ perturbNonce: s.perturbNonce + 1, paused: false })),
  setLead: (leadX, leadY, leadZ, simTime) => set({ leadX, leadY, leadZ, simTime }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setAboutOpen: (aboutOpen) => set({ aboutOpen }),
}));
