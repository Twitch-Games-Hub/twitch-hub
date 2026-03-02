import { Container, Sprite, Texture, type Application } from 'pixi.js';
import { shouldAnimate } from '../reduced-motion';
import { triangle, diamond, hexagon, line, dot } from './shapes';
import type { ParticlePreset, ShapeType } from './presets';

const MAX_PARTICLES = 200;

interface ActiveParticle {
  sprite: Sprite;
  vx: number;
  vy: number;
  lifetime: number;
  elapsed: number;
  alphaStart: number;
  alphaEnd: number;
  scaleStart: number;
  scaleEnd: number;
  gravity: number;
}

const SHAPE_GENERATORS: Record<ShapeType, (color: number) => import('pixi.js').Graphics> = {
  triangle,
  diamond,
  hexagon,
  line,
  dot,
};

export class GeometricParticleSystem {
  private container: Container;
  private app: Application;
  private active: ActiveParticle[] = [];
  private pool: Sprite[] = [];
  private textureCache = new Map<string, Texture>();
  private ambientTimer: ReturnType<typeof setInterval> | null = null;
  private ambientPreset: ParticlePreset | null = null;
  private tickerCallback: ((ticker: { deltaMS: number }) => void) | null = null;

  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    app.stage.addChild(this.container);

    this.tickerCallback = (ticker) => this.update(ticker.deltaMS);
    app.ticker.add(this.tickerCallback);
  }

  /**
   * One-shot particle burst at a position.
   */
  burst(x: number, y: number, preset: ParticlePreset): void {
    if (!shouldAnimate()) return;

    const count = randInt(preset.countMin, preset.countMax);
    for (let i = 0; i < count; i++) {
      if (this.active.length >= MAX_PARTICLES) break;
      this.spawnParticle(x, y, preset);
    }
  }

  /**
   * Start continuous particle emission.
   */
  startAmbient(preset: ParticlePreset): void {
    if (!shouldAnimate()) return;
    this.stopAmbient();

    this.ambientPreset = preset;
    const interval = preset.spawnInterval ?? 500;

    // Spawn initial batch
    const count = randInt(preset.countMin, preset.countMax);
    for (let i = 0; i < count; i++) {
      if (this.active.length >= MAX_PARTICLES) break;
      const x = Math.random() * this.app.screen.width;
      const y = Math.random() * this.app.screen.height;
      this.spawnParticle(x, y, preset);
    }

    this.ambientTimer = setInterval(() => {
      if (!shouldAnimate() || this.active.length >= MAX_PARTICLES) return;

      const x = Math.random() * this.app.screen.width;
      const y = Math.random() * this.app.screen.height;
      this.spawnParticle(x, y, preset);
    }, interval);
  }

  /**
   * Stop continuous particle emission.
   */
  stopAmbient(): void {
    if (this.ambientTimer !== null) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    this.ambientPreset = null;
  }

  /**
   * Clean up all resources.
   */
  destroy(): void {
    this.stopAmbient();

    if (this.tickerCallback) {
      this.app.ticker.remove(this.tickerCallback);
      this.tickerCallback = null;
    }

    for (const p of this.active) {
      this.container.removeChild(p.sprite);
    }
    this.active.length = 0;

    for (const s of this.pool) {
      s.destroy();
    }
    this.pool.length = 0;

    for (const tex of this.textureCache.values()) {
      tex.destroy(true);
    }
    this.textureCache.clear();

    this.container.destroy({ children: true });
  }

  private getTexture(shape: ShapeType, color: number): Texture {
    const key = `${shape}_${color.toString(16)}`;
    let tex = this.textureCache.get(key);
    if (!tex) {
      const g = SHAPE_GENERATORS[shape](color);
      tex = this.app.renderer.generateTexture(g);
      g.destroy();
      this.textureCache.set(key, tex);
    }
    return tex;
  }

  private acquireSprite(texture: Texture): Sprite {
    let sprite = this.pool.pop();
    if (sprite) {
      sprite.texture = texture;
      sprite.alpha = 1;
      sprite.scale.set(1);
      sprite.visible = true;
    } else {
      sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
    }
    this.container.addChild(sprite);
    return sprite;
  }

  private releaseSprite(sprite: Sprite): void {
    sprite.visible = false;
    this.container.removeChild(sprite);
    this.pool.push(sprite);
  }

  private spawnParticle(x: number, y: number, preset: ParticlePreset): void {
    const shape = preset.shapes[Math.floor(Math.random() * preset.shapes.length)];
    const color = preset.colors[Math.floor(Math.random() * preset.colors.length)];
    const texture = this.getTexture(shape, color);
    const sprite = this.acquireSprite(texture);

    sprite.position.set(x, y);
    sprite.rotation = Math.random() * Math.PI * 2;

    const speed = randFloat(preset.speedMin, preset.speedMax);
    let angle: number;
    if (preset.directionRange) {
      angle = randFloat(preset.directionRange[0], preset.directionRange[1]);
    } else {
      angle = Math.random() * Math.PI * 2;
    }

    const lifetime = randFloat(preset.lifetimeMin, preset.lifetimeMax);

    sprite.alpha = preset.alphaStart;
    sprite.scale.set(preset.scaleStart);

    this.active.push({
      sprite,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime,
      elapsed: 0,
      alphaStart: preset.alphaStart,
      alphaEnd: preset.alphaEnd,
      scaleStart: preset.scaleStart,
      scaleEnd: preset.scaleEnd,
      gravity: preset.gravity,
    });
  }

  private update(deltaMS: number): void {
    const dt = deltaMS / 1000;
    let i = this.active.length;

    while (i--) {
      const p = this.active[i];
      p.elapsed += deltaMS;

      if (p.elapsed >= p.lifetime) {
        this.releaseSprite(p.sprite);
        this.active.splice(i, 1);
        continue;
      }

      const t = p.elapsed / p.lifetime;

      // Update position
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;

      // Interpolate alpha and scale
      p.sprite.alpha = p.alphaStart + (p.alphaEnd - p.alphaStart) * t;
      const scale = p.scaleStart + (p.scaleEnd - p.scaleStart) * t;
      p.sprite.scale.set(scale);

      // Slow rotation
      p.sprite.rotation += dt * 0.5;
    }
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
