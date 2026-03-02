import { Container, Graphics, type Application } from 'pixi.js';
import { shouldAnimate } from '../reduced-motion';
import { EASING, TIMING } from '../theme';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MetallicFill {
  /** The display object to add to the stage. */
  container: Container;
  /** Update the fill area dimensions. */
  update(rect: Rect): void;
  /** Clean up all resources. */
  destroy(): void;
}

/**
 * Animates a chrome gradient sweep across a rectangular area left-to-right.
 * Returns a MetallicFill object whose dimensions can be updated.
 */
export function metallicFill(
  app: Application,
  rect: Rect,
  color: number,
  duration: number = TIMING.SWEEP_DURATION,
): MetallicFill {
  const container = new Container();
  const baseFill = new Graphics();
  const sweepHighlight = new Graphics();

  container.addChild(baseFill);
  container.addChild(sweepHighlight);
  app.stage.addChild(container);

  let currentRect = { ...rect };

  function drawBase() {
    baseFill.clear();
    baseFill.rect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    baseFill.fill(color);
  }

  function drawSweep(sweepX: number) {
    sweepHighlight.clear();

    const bandWidth = Math.max(currentRect.width * 0.15, 8);
    const bandX = currentRect.x + sweepX - bandWidth / 2;

    // Clamp to rect bounds
    const left = Math.max(bandX, currentRect.x);
    const right = Math.min(bandX + bandWidth, currentRect.x + currentRect.width);
    if (right <= left) return;

    sweepHighlight.rect(left, currentRect.y, right - left, currentRect.height);
    sweepHighlight.fill({ color: 0xffffff, alpha: 0.25 });
  }

  drawBase();

  // Animate sweep
  if (shouldAnimate() && currentRect.width > 0) {
    let elapsed = 0;

    const onTick = (ticker: { deltaMS: number }) => {
      elapsed += ticker.deltaMS;
      const t = Math.min(elapsed / duration, 1);
      const eased = EASING.quarticOut(t);

      drawSweep(eased * currentRect.width);

      if (t >= 1) {
        app.ticker.remove(onTick);
        sweepHighlight.clear();
      }
    };

    app.ticker.add(onTick);
  }

  return {
    container,

    update(newRect: Rect) {
      currentRect = { ...newRect };
      drawBase();
    },

    destroy() {
      app.stage.removeChild(container);
      container.destroy({ children: true });
    },
  };
}
