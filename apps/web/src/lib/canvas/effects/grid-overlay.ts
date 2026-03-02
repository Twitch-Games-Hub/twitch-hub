import { Graphics, type Application } from 'pixi.js';

const LINE_INTERVAL = 4;
const LINE_ALPHA = 0.03;

export interface GridOverlay {
  /** The graphics object on stage. */
  graphic: Graphics;
  /** Remove the overlay and clean up the resize listener. */
  destroy(): void;
}

/**
 * Draws a persistent subtle scan-line pattern (horizontal lines at 4px intervals).
 * Covers the full viewport and resizes on window resize.
 */
export function gridOverlay(app: Application): GridOverlay {
  const g = new Graphics();
  app.stage.addChild(g);

  function draw() {
    g.clear();
    const w = app.screen.width;
    const h = app.screen.height;

    for (let y = 0; y < h; y += LINE_INTERVAL) {
      g.moveTo(0, y);
      g.lineTo(w, y);
    }
    g.stroke({ width: 1, color: 0xffffff, alpha: LINE_ALPHA });
  }

  draw();

  const onResize = () => draw();
  window.addEventListener('resize', onResize);

  return {
    graphic: g,

    destroy() {
      window.removeEventListener('resize', onResize);
      app.stage.removeChild(g);
      g.destroy();
    },
  };
}
