import { COLORS, TIMING } from '../theme';

export type ShapeType = 'triangle' | 'diamond' | 'hexagon' | 'line' | 'dot';

export interface ParticlePreset {
  /** Number of particles to emit (min). */
  countMin: number;
  /** Number of particles to emit (max). */
  countMax: number;
  /** Particle shapes to randomly pick from. */
  shapes: ShapeType[];
  /** Particle color(s) — random pick per particle. */
  colors: number[];
  /** Lifetime in ms (min). */
  lifetimeMin: number;
  /** Lifetime in ms (max). */
  lifetimeMax: number;
  /** Initial speed in px/sec (min). */
  speedMin: number;
  /** Initial speed in px/sec (max). */
  speedMax: number;
  /** Direction range in radians [min, max]. null = full 360°. */
  directionRange: [number, number] | null;
  /** Start alpha. */
  alphaStart: number;
  /** End alpha (fades to this). */
  alphaEnd: number;
  /** Start scale. */
  scaleStart: number;
  /** End scale. */
  scaleEnd: number;
  /** Gravity in px/sec² (positive = downward). */
  gravity: number;
  /** Whether this is a continuous emitter vs one-shot burst. */
  continuous: boolean;
  /** For continuous: spawn interval in ms. */
  spawnInterval?: number;
}

/** Sharp outward burst for vote events. */
export const VOTE_BURST: ParticlePreset = {
  countMin: 8,
  countMax: 12,
  shapes: ['triangle', 'diamond', 'dot'],
  colors: [COLORS.brand, COLORS.silver, COLORS.diamond],
  lifetimeMin: TIMING.BURST_DURATION * 0.8,
  lifetimeMax: TIMING.BURST_DURATION,
  speedMin: 200,
  speedMax: 400,
  directionRange: null,
  alphaStart: 1,
  alphaEnd: 0,
  scaleStart: 1,
  scaleEnd: 0.3,
  gravity: 0,
  continuous: false,
};

/** Slow-drifting ambient hexagons. */
export const AMBIENT_FIELD: ParticlePreset = {
  countMin: 15,
  countMax: 20,
  shapes: ['hexagon'],
  colors: [COLORS.steel, COLORS.silver],
  lifetimeMin: 6000,
  lifetimeMax: 10000,
  speedMin: 5,
  speedMax: 15,
  directionRange: [-Math.PI, Math.PI],
  alphaStart: 0.1,
  alphaEnd: 0,
  scaleStart: 0.8,
  scaleEnd: 0.4,
  gravity: -2,
  continuous: true,
  spawnInterval: 500,
};

/** Upward fountain celebration burst — gold. */
export const CELEBRATION: ParticlePreset = {
  countMin: 30,
  countMax: 50,
  shapes: ['triangle', 'diamond', 'hexagon', 'dot'],
  colors: [COLORS.gold, COLORS.brand, COLORS.diamond],
  lifetimeMin: 800,
  lifetimeMax: 1500,
  speedMin: 150,
  speedMax: 350,
  directionRange: [-Math.PI * 0.8, -Math.PI * 0.2],
  alphaStart: 1,
  alphaEnd: 0,
  scaleStart: 1,
  scaleEnd: 0.2,
  gravity: 120,
  continuous: false,
};

/** Tiny fast sparks. */
export const SPARK: ParticlePreset = {
  countMin: 4,
  countMax: 6,
  shapes: ['dot'],
  colors: [COLORS.gold, 0xffffff],
  lifetimeMin: 80,
  lifetimeMax: 150,
  speedMin: 300,
  speedMax: 500,
  directionRange: null,
  alphaStart: 1,
  alphaEnd: 0,
  scaleStart: 0.8,
  scaleEnd: 0.1,
  gravity: 0,
  continuous: false,
};

/** Radial triangles expanding outward from shockwave. */
export const SHOCKWAVE_DEBRIS: ParticlePreset = {
  countMin: 20,
  countMax: 20,
  shapes: ['triangle'],
  colors: [COLORS.brand, COLORS.silver, COLORS.steel],
  lifetimeMin: 400,
  lifetimeMax: TIMING.SHOCKWAVE_DURATION,
  speedMin: 100,
  speedMax: 250,
  directionRange: null,
  alphaStart: 0.8,
  alphaEnd: 0,
  scaleStart: 1,
  scaleEnd: 0.5,
  gravity: 0,
  continuous: false,
};

/** Gold upward fountain — concentrated winner effect. */
export const WINNER_CROWN: ParticlePreset = {
  countMin: 30,
  countMax: 50,
  shapes: ['diamond', 'dot', 'triangle'],
  colors: [COLORS.gold, 0xffd700],
  lifetimeMin: 800,
  lifetimeMax: 1400,
  speedMin: 200,
  speedMax: 400,
  directionRange: [-Math.PI * 0.7, -Math.PI * 0.3],
  alphaStart: 1,
  alphaEnd: 0,
  scaleStart: 1.2,
  scaleEnd: 0.3,
  gravity: 150,
  continuous: false,
};
