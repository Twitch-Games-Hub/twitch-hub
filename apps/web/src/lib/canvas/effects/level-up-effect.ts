import type { Application } from 'pixi.js';
import { shouldAnimate } from '../reduced-motion';
import { COLORS } from '../theme';
import { shockwave } from './shockwave';
import { GeometricParticleSystem } from '../particles/GeometricParticleSystem';
import { CELEBRATION } from '../particles/presets';

/**
 * Plays a level-up celebration: shockwave at (x, y) with brand purple,
 * followed by a CELEBRATION particle burst after 200ms.
 */
export function playLevelUpEffect(app: Application, x: number, y: number): void {
  if (!shouldAnimate()) return;

  // Step 1: Shockwave at position
  shockwave(app, x, y, COLORS.brand);

  // Step 2: 200ms later — celebration particle burst (30 particles, brand purple + white)
  const timer = setTimeout(() => {
    const ps = new GeometricParticleSystem(app);
    ps.burst(x, y, {
      ...CELEBRATION,
      countMin: 30,
      countMax: 30,
      colors: [COLORS.brand, 0xffffff],
    });

    // Auto-clean after particles expire
    setTimeout(() => {
      ps.destroy();
    }, 1500);
  }, 200);

  // Store timer ref for potential cleanup (fire-and-forget pattern)
  void timer;
}
