import { BlurFilter, Graphics, type Application } from 'pixi.js';
import { COLORS } from '../theme';

export interface GlowEffect {
  /** The glow graphics object on stage. */
  graphic: Graphics;
  /** Move the glow to a new position. */
  moveTo(x: number, y: number): void;
  /** Remove and clean up the glow. */
  destroy(): void;
}

/**
 * Creates a focused halo using BlurFilter.
 * Can be positioned or moved to follow an element.
 */
export function glow(
  app: Application,
  x: number,
  y: number,
  radius: number,
  color: number = COLORS.brand,
): GlowEffect {
  const g = new Graphics();

  g.circle(0, 0, radius);
  g.fill({ color, alpha: 0.5 });

  const blur = new BlurFilter({ strength: radius * 0.8, quality: 4 });
  g.filters = [blur];
  g.position.set(x, y);

  app.stage.addChild(g);

  return {
    graphic: g,

    moveTo(newX: number, newY: number) {
      g.position.set(newX, newY);
    },

    destroy() {
      app.stage.removeChild(g);
      g.destroy();
    },
  };
}
