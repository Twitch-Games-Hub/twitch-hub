export const COLORS = {
  brand: 0x7c3aed,
  silver: 0xc0c0c0,
  steel: 0x71717a,
  gold: 0xfbbf24,
  diamond: 0x22d3ee,
} as const;

/** Quartic sharp-out: fast start, gentle stop */
function quarticOut(t: number): number {
  const t1 = t - 1;
  return 1 - t1 * t1 * t1 * t1;
}

/** Quartic sharp-in: gentle start, fast end */
function quarticIn(t: number): number {
  return t * t * t * t;
}

export const EASING = {
  quarticOut,
  quarticIn,
} as const;

export const TIMING = {
  BURST_DURATION: 300,
  SWEEP_DURATION: 600,
  SHOCKWAVE_DURATION: 600,
} as const;
