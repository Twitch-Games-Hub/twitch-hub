import { Graphics, Container, type Application } from 'pixi.js';
import { shouldAnimate } from '../reduced-motion';
import { COLORS, EASING, TIMING } from '../theme';

/**
 * Creates an expanding ring that scales outward from center,
 * fading opacity from 0.8 to 0 over SHOCKWAVE_DURATION ms.
 * Self-removes from stage when done.
 */
export function shockwave(
  app: Application,
  x: number,
  y: number,
  color: number = COLORS.brand,
): void {
  if (!shouldAnimate()) return;

  const ring = new Graphics();
  ring.circle(0, 0, 40);
  ring.stroke({ width: 3, color });

  ring.position.set(x, y);
  ring.scale.set(0.1);
  ring.alpha = 0.8;

  app.stage.addChild(ring);

  const duration = TIMING.SHOCKWAVE_DURATION;
  let elapsed = 0;

  const onTick = (ticker: { deltaMS: number }) => {
    elapsed += ticker.deltaMS;
    const t = Math.min(elapsed / duration, 1);
    const eased = EASING.quarticOut(t);

    ring.scale.set(0.1 + eased * 2.5);
    ring.alpha = 0.8 * (1 - eased);

    if (t >= 1) {
      app.ticker.remove(onTick);
      app.stage.removeChild(ring);
      ring.destroy();
    }
  };

  app.ticker.add(onTick);
}
