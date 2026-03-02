import { Container, Graphics, type Application } from 'pixi.js';
import { shouldAnimate } from '../reduced-motion';
import { EASING, TIMING } from '../theme';
import { glow, type GlowEffect } from './glow';

const DEFAULT_ANIMATE_DURATION = 800;

/**
 * Canvas-rendered XP progress bar with dark background track
 * and metallic gradient fill that matches the player's rank tier color.
 */
export class CanvasXpProgressBar {
  private app: Application;
  private container: Container;
  private track: Graphics;
  private fill: Graphics;
  private sweepHighlight: Graphics;
  private barY: number;
  private barWidth: number;
  private barHeight: number;
  private currentProgress = 0;
  private currentColor = 0xffffff;
  private glowEffect: GlowEffect | null = null;
  private tweenTickerCb: ((ticker: { deltaMS: number }) => void) | null = null;

  constructor(app: Application, y: number, width: number, height: number) {
    this.app = app;
    this.barY = y;
    this.barWidth = width;
    this.barHeight = height;

    this.container = new Container();
    this.track = new Graphics();
    this.fill = new Graphics();
    this.sweepHighlight = new Graphics();

    this.container.addChild(this.track);
    this.container.addChild(this.fill);
    this.container.addChild(this.sweepHighlight);
    app.stage.addChild(this.container);

    this.drawTrack();
  }

  /** Update progress (0-1) and fill color immediately. */
  update(progress: number, rankColor: number): void {
    const prevColor = this.currentColor;
    this.currentProgress = Math.max(0, Math.min(1, progress));
    this.currentColor = rankColor;

    this.drawFill();

    // Flash glow on rank color change (rank-up)
    if (prevColor !== rankColor && prevColor !== 0xffffff) {
      this.flashGlow(rankColor);
    }
  }

  /** Smoothly tween fill width from `from` to `to` over `duration` ms. */
  animateFill(from: number, to: number, duration: number = DEFAULT_ANIMATE_DURATION): void {
    // Remove any existing tween
    if (this.tweenTickerCb) {
      this.app.ticker.remove(this.tweenTickerCb);
      this.tweenTickerCb = null;
    }

    const clampedFrom = Math.max(0, Math.min(1, from));
    const clampedTo = Math.max(0, Math.min(1, to));

    if (!shouldAnimate()) {
      this.currentProgress = clampedTo;
      this.drawFill();
      return;
    }

    let elapsed = 0;

    const onTick = (ticker: { deltaMS: number }) => {
      elapsed += ticker.deltaMS;
      const t = Math.min(elapsed / duration, 1);
      const eased = EASING.quarticOut(t);

      this.currentProgress = clampedFrom + (clampedTo - clampedFrom) * eased;
      this.drawFill();

      // Animate chrome sweep during fill
      this.drawSweep(eased);

      if (t >= 1) {
        this.app.ticker.remove(onTick);
        this.tweenTickerCb = null;
        this.sweepHighlight.clear();
      }
    };

    this.tweenTickerCb = onTick;
    this.app.ticker.add(onTick);
  }

  /** Remove all resources from the stage. */
  destroy(): void {
    if (this.tweenTickerCb) {
      this.app.ticker.remove(this.tweenTickerCb);
      this.tweenTickerCb = null;
    }

    if (this.glowEffect) {
      this.glowEffect.destroy();
      this.glowEffect = null;
    }

    this.app.stage.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  private drawTrack(): void {
    this.track.clear();
    this.track.roundRect(0, this.barY, this.barWidth, this.barHeight, this.barHeight / 2);
    this.track.fill({ color: 0x1a1a2e, alpha: 0.8 });
  }

  private drawFill(): void {
    this.fill.clear();
    const fillWidth = this.barWidth * this.currentProgress;
    if (fillWidth <= 0) return;

    this.fill.roundRect(0, this.barY, fillWidth, this.barHeight, this.barHeight / 2);
    this.fill.fill(this.currentColor);
  }

  private drawSweep(sweepProgress: number): void {
    this.sweepHighlight.clear();
    const fillWidth = this.barWidth * this.currentProgress;
    if (fillWidth <= 0) return;

    const bandWidth = Math.max(fillWidth * 0.15, 6);
    const bandX = sweepProgress * fillWidth - bandWidth / 2;

    const left = Math.max(bandX, 0);
    const right = Math.min(bandX + bandWidth, fillWidth);
    if (right <= left) return;

    this.sweepHighlight.roundRect(
      left,
      this.barY,
      right - left,
      this.barHeight,
      this.barHeight / 2,
    );
    this.sweepHighlight.fill({ color: 0xffffff, alpha: 0.25 });
  }

  private flashGlow(color: number): void {
    if (!shouldAnimate()) return;

    // Clean up previous glow
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }

    const centerX = this.barWidth / 2;
    const centerY = this.barY + this.barHeight / 2;

    this.glowEffect = glow(this.app, centerX, centerY, this.barHeight * 2, color);

    // Fade out glow over SWEEP_DURATION
    let elapsed = 0;
    const g = this.glowEffect.graphic;
    const startAlpha = g.alpha;

    const onTick = (ticker: { deltaMS: number }) => {
      elapsed += ticker.deltaMS;
      const t = Math.min(elapsed / TIMING.SWEEP_DURATION, 1);

      g.alpha = startAlpha * (1 - EASING.quarticIn(t));

      if (t >= 1) {
        this.app.ticker.remove(onTick);
        if (this.glowEffect) {
          this.glowEffect.destroy();
          this.glowEffect = null;
        }
      }
    };

    this.app.ticker.add(onTick);
  }
}
