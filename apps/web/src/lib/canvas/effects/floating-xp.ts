import { Text, type Application, type TextStyleOptions } from 'pixi.js';
import { shouldAnimate } from '../reduced-motion';
import { EASING } from '../theme';

const DEFAULT_FONT_SIZE = 18;
const DEFAULT_DURATION = 1200;
const DRIFT_DISTANCE = 60;

export interface FloatingXpOptions {
  color?: number;
  fontSize?: number;
  duration?: number;
}

/**
 * Spawns a floating "+{amount} XP" text that drifts upward and fades out.
 * Self-removes from stage when animation completes.
 *
 * For streak multiplier > 1, caller should pass gold color (0xfbbf24) and 22px font.
 */
export function spawnFloatingXp(
  app: Application,
  x: number,
  y: number,
  amount: number,
  options?: FloatingXpOptions,
): void {
  if (!shouldAnimate()) return;

  const fontSize = options?.fontSize ?? DEFAULT_FONT_SIZE;
  const color = options?.color ?? 0xffffff;
  const duration = options?.duration ?? DEFAULT_DURATION;

  const style: TextStyleOptions = {
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    fontSize,
    fill: color,
    dropShadow: {
      alpha: 0.6,
      angle: Math.PI / 4,
      blur: 4,
      color: 0x000000,
      distance: 2,
    },
  };

  const text = new Text({ text: `+${amount} XP`, style });
  text.anchor.set(0.5);
  text.position.set(x, y);
  text.alpha = 1;

  app.stage.addChild(text);

  const startY = y;
  let elapsed = 0;

  const onTick = (ticker: { deltaMS: number }) => {
    elapsed += ticker.deltaMS;
    const t = Math.min(elapsed / duration, 1);
    const eased = EASING.quarticOut(t);

    text.position.y = startY - eased * DRIFT_DISTANCE;
    text.alpha = 1 - eased;

    if (t >= 1) {
      app.ticker.remove(onTick);
      app.stage.removeChild(text);
      text.destroy();
    }
  };

  app.ticker.add(onTick);
}
