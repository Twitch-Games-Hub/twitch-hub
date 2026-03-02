import { Graphics } from 'pixi.js';

const SHEEN_ALPHA = 0.4;

/**
 * Draw a metallic sheen offset (1px lighter stroke for chrome effect).
 */
function addSheen(g: Graphics, color: number): void {
  g.stroke({ width: 1, color: 0xffffff, alpha: SHEEN_ALPHA });
}

/**
 * Equilateral triangle, ~12px tall.
 */
export function triangle(color: number = 0xc0c0c0): Graphics {
  const g = new Graphics();
  const h = 12;
  const w = 14;

  g.poly([0, -h / 2, w / 2, h / 2, -w / 2, h / 2]);
  g.fill(color);
  addSheen(g, color);

  return g;
}

/**
 * Diamond (rotated square), ~12px diagonal.
 */
export function diamond(color: number = 0xc0c0c0): Graphics {
  const g = new Graphics();
  const s = 6;

  g.poly([0, -s, s, 0, 0, s, -s, 0]);
  g.fill(color);
  addSheen(g, color);

  return g;
}

/**
 * Regular hexagon, ~14px wide.
 */
export function hexagon(color: number = 0xc0c0c0): Graphics {
  const g = new Graphics();
  const r = 7;
  const points: number[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(Math.cos(angle) * r, Math.sin(angle) * r);
  }

  g.poly(points);
  g.fill(color);
  addSheen(g, color);

  return g;
}

/**
 * Thin horizontal line, ~10px wide.
 */
export function line(color: number = 0xc0c0c0): Graphics {
  const g = new Graphics();

  g.moveTo(-5, 0);
  g.lineTo(5, 0);
  g.stroke({ width: 2, color });

  // Sheen: lighter line offset by 1px
  g.moveTo(-5, -1);
  g.lineTo(5, -1);
  g.stroke({ width: 1, color: 0xffffff, alpha: SHEEN_ALPHA });

  return g;
}

/**
 * Small circular dot, ~8px diameter.
 */
export function dot(color: number = 0xc0c0c0): Graphics {
  const g = new Graphics();

  g.circle(0, 0, 4);
  g.fill(color);

  // Sheen: smaller highlight circle offset up-left
  g.circle(-1, -1, 2);
  g.fill({ color: 0xffffff, alpha: SHEEN_ALPHA });

  return g;
}
