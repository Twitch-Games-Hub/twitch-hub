import { Sprite, Texture, type Application } from 'pixi.js';
import { shouldAnimate } from '../reduced-motion';
import { COLORS, EASING, TIMING } from '../theme';
import { shockwave } from './shockwave';
import { GeometricParticleSystem } from '../particles/GeometricParticleSystem';
import { SHOCKWAVE_DEBRIS, CELEBRATION } from '../particles/presets';
import { renderInsignia } from '../rank-insignias';
import { RankTier } from '@twitch-hub/shared-types';

/** Maps RankTier enum to rank-insignias.ts rank key and color. */
const RANK_CONFIG: Record<
  RankTier,
  { insigniaKey: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'; color: number }
> = {
  [RankTier.BRONZE]: { insigniaKey: 'bronze', color: 0xcd7f32 },
  [RankTier.SILVER]: { insigniaKey: 'silver', color: COLORS.silver },
  [RankTier.GOLD]: { insigniaKey: 'gold', color: COLORS.gold },
  [RankTier.PLATINUM]: { insigniaKey: 'platinum', color: 0xe5e4e2 },
  [RankTier.DIAMOND]: { insigniaKey: 'diamond', color: COLORS.diamond },
};

/**
 * Plays a rank-up celebration sequence:
 * 1. Screen-center shockwave with the new rank's color
 * 2. 300ms later: SHOCKWAVE_DEBRIS particles in rank color
 * 3. 500ms later: Rank insignia sprite scales in with overshoot bounce, holds 2s, fades out
 * 4. Gold CELEBRATION particles during insignia reveal
 */
export function playRankUpEffect(
  app: Application,
  newRank: RankTier,
  centerX: number,
  centerY: number,
): void {
  if (!shouldAnimate()) return;

  const config = RANK_CONFIG[newRank];

  // Step 1: Shockwave with rank color
  shockwave(app, centerX, centerY, config.color);

  // Step 2: 300ms later — SHOCKWAVE_DEBRIS in rank color
  setTimeout(() => {
    const debrisPs = new GeometricParticleSystem(app);
    debrisPs.burst(centerX, centerY, {
      ...SHOCKWAVE_DEBRIS,
      colors: [config.color, COLORS.silver],
    });
    setTimeout(() => debrisPs.destroy(), TIMING.SHOCKWAVE_DURATION);
  }, 300);

  // Step 3 & 4: 500ms later — insignia reveal + gold celebration
  setTimeout(() => {
    // Gold celebration particles during reveal
    const celebrationPs = new GeometricParticleSystem(app);
    celebrationPs.burst(centerX, centerY, {
      ...CELEBRATION,
      colors: [COLORS.gold, 0xffd700],
    });
    setTimeout(() => celebrationPs.destroy(), 1500);

    // Rank insignia sprite
    const dataUrl = renderInsignia(config.insigniaKey);
    if (!dataUrl) return;

    const img = new Image();
    img.onload = () => {
      const texture = Texture.from(img);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(centerX, centerY);
      sprite.scale.set(0);
      sprite.alpha = 1;

      // Scale up to 3x for visibility (base is 24px)
      const targetScale = 3;

      app.stage.addChild(sprite);

      // Phase 1: Scale 0 → 1.2 (overshoot) over 400ms
      let elapsed = 0;
      const scaleUpDuration = 400;

      const onScaleUp = (ticker: { deltaMS: number }) => {
        elapsed += ticker.deltaMS;
        const t = Math.min(elapsed / scaleUpDuration, 1);
        const eased = EASING.quarticOut(t);

        // Overshoot: scale to 1.2x of target
        sprite.scale.set(eased * targetScale * 1.2);

        if (t >= 1) {
          app.ticker.remove(onScaleUp);

          // Phase 2: Settle 1.2 → 1.0 over 200ms
          let settleElapsed = 0;
          const settleDuration = 200;

          const onSettle = (ticker2: { deltaMS: number }) => {
            settleElapsed += ticker2.deltaMS;
            const st = Math.min(settleElapsed / settleDuration, 1);
            const settleEased = EASING.quarticOut(st);

            // Interpolate from 1.2 → 1.0
            const scale = targetScale * (1.2 - 0.2 * settleEased);
            sprite.scale.set(scale);

            if (st >= 1) {
              app.ticker.remove(onSettle);

              // Phase 3: Hold 2 seconds, then fade out over 600ms
              setTimeout(() => {
                let fadeElapsed = 0;
                const fadeDuration = 600;

                const onFade = (ticker3: { deltaMS: number }) => {
                  fadeElapsed += ticker3.deltaMS;
                  const ft = Math.min(fadeElapsed / fadeDuration, 1);

                  sprite.alpha = 1 - ft;

                  if (ft >= 1) {
                    app.ticker.remove(onFade);
                    app.stage.removeChild(sprite);
                    sprite.destroy();
                    texture.destroy(true);
                  }
                };

                app.ticker.add(onFade);
              }, 2000);
            }
          };

          app.ticker.add(onSettle);
        }
      };

      app.ticker.add(onScaleUp);
    };
    img.src = dataUrl;
  }, 500);
}
