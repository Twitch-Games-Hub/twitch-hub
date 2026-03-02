import { Graphics, type Application } from 'pixi.js';
import { shouldAnimate } from '../reduced-motion';
import { EASING, TIMING } from '../theme';

export interface Point {
  x: number;
  y: number;
}

/**
 * Progressively draws a line from startPoint to endPoint over the given duration.
 * Returns the Graphics object for cleanup. Self-animates via app ticker.
 */
export function lineDraw(
  app: Application,
  startPoint: Point,
  endPoint: Point,
  color: number,
  duration: number = TIMING.SWEEP_DURATION,
): Graphics {
  const line = new Graphics();
  app.stage.addChild(line);

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;

  function drawLine(progress: number) {
    line.clear();
    line.moveTo(startPoint.x, startPoint.y);
    line.lineTo(startPoint.x + dx * progress, startPoint.y + dy * progress);
    line.stroke({ width: 2, color });
  }

  if (!shouldAnimate()) {
    // Render final state instantly
    drawLine(1);
    return line;
  }

  let elapsed = 0;

  const onTick = (ticker: { deltaMS: number }) => {
    elapsed += ticker.deltaMS;
    const t = Math.min(elapsed / duration, 1);
    const eased = EASING.quarticOut(t);

    drawLine(eased);

    if (t >= 1) {
      app.ticker.remove(onTick);
    }
  };

  app.ticker.add(onTick);

  return line;
}
