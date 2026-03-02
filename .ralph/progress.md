# RALPH Progress Log

## Codebase Patterns

- **Svelte 5 runes**: Project uses `$props()`, `$state`, `$derived`, `$effect` throughout. Props destructured with type annotations.
- **Snippet pattern**: Child content passed via `children: Snippet` prop, rendered with `{@render children()}`.
- **State management**: Singleton runes-based stores (not context API). Stores in `src/lib/stores/` export reactive objects created via factory functions.
- **Canvas context**: New pattern introduced for PixiJS — uses `setContext('pixi-app')` in PixiWrapper to share the app instance with child components. Context value is a reactive getter `{ get app() { return app; } }` so consumers see updates when the async init completes.
- **Package manager**: pnpm 10.6 with workspaces. Store dir configured in `.npmrc` (was `/home/odo/...`, fixed to `/home/vagrant/...`).
- **Web app name**: `@twitch-hub/web` (for `--filter` commands).
- **Build pipeline**: `pnpm build` runs shared-types first, then all apps in parallel. Web uses `vite build` via SvelteKit.
- **TypeScript**: Strict mode, `moduleResolution: "bundler"`, `$lib` alias maps to `./src/lib`.
- **Overlay components**: Located in `src/lib/components/overlay/`, composed in `src/routes/overlay/[sessionId]/+page.svelte`.
- **Particle system**: Custom implementation (not @pixi/particle-emitter which is v7-only). Uses `app.renderer.generateTexture()` to convert Graphics→Texture, Sprite pool for reuse, ticker callbacks for animation. Located in `src/lib/canvas/particles/`.
- **PixiJS v8 init**: `new Application()` then `await app.init(options)` — async pattern. Canvas passed via `canvas` option.

---

## Iteration Log

### Iteration 1 — Task 1: Install PixiJS and create core canvas infrastructure

- **Status**: completed
- **Files changed**:
  - `apps/web/package.json` — added pixi.js@^8 and @pixi/particle-emitter@^5
  - `.npmrc` — fixed store-dir path from `/home/odo/` to `/home/vagrant/`
  - `apps/web/src/lib/canvas/theme.ts` — COLORS (brand/silver/steel/gold/diamond as hex numbers), EASING (quarticOut/quarticIn functions), TIMING (BURST_DURATION/SWEEP_DURATION/SHOCKWAVE_DURATION)
  - `apps/web/src/lib/canvas/reduced-motion.ts` — shouldAnimate() using matchMedia, SSR-safe with lazy query init
  - `apps/web/src/lib/canvas/pixi-app.ts` — createPixiApp(canvas) factory returning configured Application (transparent bg, antialias, devicePixelRatio, low-power, auto-resize to window)
  - `apps/web/src/lib/canvas/PixiWrapper.svelte` — Svelte 5 component with canvas element (fixed, z-0, pointer-events-none), async PixiJS init on mount, setContext('pixi-app'), cleanup on destroy
  - `apps/web/src/lib/canvas/index.ts` — barrel export of all canvas module public API
- **Summary**: Installed PixiJS v8.16.0 and particle-emitter v5.0.10. Created the foundational canvas module with theme constants, reduced-motion detection, PixiJS app factory, and wrapper Svelte component. Had to fix .npmrc store-dir for the environment. Build passes clean.
- **Patterns discovered**: PixiJS v8 uses async init (`await app.init()`), canvas option for pre-existing canvas element, `backgroundAlpha: 0` for transparency. Context pattern with reactive getter works well for async-initialized values in Svelte 5.

### Iteration 2 — Task 2: Build geometric particle system with shape generators and presets

- **Status**: completed
- **Files changed**:
  - `apps/web/src/lib/canvas/particles/shapes.ts` — 5 geometric shape generators (triangle, diamond, hexagon, line, dot) using PixiJS Graphics with 1px white sheen for metallic look
  - `apps/web/src/lib/canvas/particles/presets.ts` — ParticlePreset interface + 6 named presets (VOTE_BURST, AMBIENT_FIELD, CELEBRATION, SPARK, SHOCKWAVE_DEBRIS, WINNER_CROWN)
  - `apps/web/src/lib/canvas/particles/GeometricParticleSystem.ts` — Custom particle system with sprite pool, ticker-driven animation, burst()/startAmbient()/stopAmbient() API, 200 particle cap
  - `apps/web/src/lib/canvas/particles/index.ts` — barrel export
  - `apps/web/src/lib/canvas/index.ts` — added particles re-export
- **Summary**: Built a custom particle system using PixiJS v8's native API instead of wrapping @pixi/particle-emitter, because the emitter v5 depends on PixiJS v7 (`@pixi/core`, `@pixi/display`) which is incompatible with v8's module structure. The custom system uses Graphics→Texture generation, Sprite pooling, and ticker-based animation. All shape generators produce small (8-16px) Graphics objects with metallic chrome sheen (1px white offset stroke at 0.4 alpha).
- **Patterns discovered**: @pixi/particle-emitter v5 is not compatible with PixiJS v8 at the type/module level (imports from @pixi/core etc.). Custom particle systems using `app.renderer.generateTexture(graphics)` + Sprite pooling + ticker callbacks are a clean v8-native alternative. The `poly()` method on Graphics is used for arbitrary shapes (triangle, diamond, hexagon).

### Iteration 3 — Task 3: Build canvas effects library (shockwave, metallic fill, line draw, glow, grid)

- **Status**: completed
- **Files changed**:
  - `apps/web/src/lib/canvas/effects/shockwave.ts` — expanding ring effect using Graphics circle, scales 0.1→2.6 with quarticOut easing, fades 0.8→0, self-removes via ticker
  - `apps/web/src/lib/canvas/effects/metallic-fill.ts` — chrome gradient sweep on rectangles, returns MetallicFill object with update()/destroy() methods, white highlight band sweeps left-to-right
  - `apps/web/src/lib/canvas/effects/line-draw.ts` — progressive line drawing from point A to B with configurable duration, returns Graphics for cleanup
  - `apps/web/src/lib/canvas/effects/glow.ts` — BlurFilter halo effect with moveTo()/destroy() API, uses Graphics circle + BlurFilter
  - `apps/web/src/lib/canvas/effects/grid-overlay.ts` — persistent scan-lines at 4px intervals with 0.03 alpha, auto-resizes on window resize
  - `apps/web/src/lib/canvas/effects/index.ts` — barrel export for all effects
  - `apps/web/src/lib/canvas/rank-insignias.ts` — shield/chevron rank badges (bronze/silver/gold/platinum/diamond) using Canvas 2D API, returns data URLs
  - `apps/web/src/lib/canvas/index.ts` — added effects and rank-insignias re-exports
- **Summary**: Built the full effects library with 5 canvas effects plus rank insignia renderer. Effects use PixiJS v8 Graphics + ticker pattern established in task 2. Metallic fill returns an updatable object for dynamic bar resizing. Glow uses BlurFilter for soft halo. Grid overlay handles window resize. Rank insignias use Canvas 2D directly (no PixiJS app dependency) for generating data URLs — more practical since they need to produce `<img src>` strings without a PixiJS Application context. All animated effects check shouldAnimate() and skip/render-final-state when reduced motion is preferred.
- **Patterns discovered**: PixiJS v8 BlurFilter constructor takes `{ strength, quality }` object. For effects that return controllable objects (metallic-fill, glow, grid-overlay), return plain objects with destroy() methods rather than extending PixiJS classes — simpler and more idiomatic TypeScript. Canvas 2D API is more practical than PixiJS for offline rendering to data URLs since it doesn't need an Application instance.

### Iteration 4 — Task 4: Migrate AmbientParticles to canvas (full replacement)

- **Status**: completed
- **Files changed**:
  - `apps/web/src/lib/components/overlay/AmbientParticles.svelte` — complete rewrite from HTML div particles to renderless canvas-effect controller
- **Summary**: Rewrote AmbientParticles.svelte to be a purely script-based component with zero HTML output. It gets the PixiJS app from Svelte context (`getContext('pixi-app')`), creates a `GeometricParticleSystem` with the `AMBIENT_FIELD` preset (slow-drifting hexagons at 0.1 opacity), and initializes the `gridOverlay` scan-line effect. Cleanup on component destroy calls `stopAmbient()`, `destroy()` on the particle system, and `destroy()` on the grid overlay. The old CSS `particle-drift` keyframes in app.css are left for Task 10's cleanup pass. This validates the full PixiJS pipeline: PixiWrapper context → particle system → canvas rendering.
- **Patterns discovered**: Renderless canvas-controller components work well in Svelte 5 — just a `<script>` block with `getContext` + `onMount` cleanup pattern. No HTML template needed. The `onMount` return function handles cleanup cleanly.

### Iteration 5 — Task 5: Migrate RoundSplash to hybrid canvas + HTML

- **Status**: completed
- **Files changed**:
  - `apps/web/src/lib/components/overlay/RoundSplash.svelte` — migrated from CSS-only effects to hybrid canvas + HTML
- **Summary**: Modified RoundSplash.svelte to use canvas effects for visual flair while keeping text in HTML. Removed the `.radial-burst` div (CSS radial gradient circle) and two `.accent-line` divs (CSS-animated horizontal lines) along with their corresponding CSS rules. Added PixiJS context integration (`getContext('pixi-app')`), which fires a `shockwave` ring effect and `SHOCKWAVE_DEBRIS` particle burst simultaneously at viewport center on mount. The particle system auto-cleans after 600ms via setTimeout. The existing `onDone` callback timing (1500ms) and HTML text with `animate-scale-in-overshoot` CSS animation are preserved. The `onMount` cleanup handles both the onDone timer and particle system cleanup, with a guard for when PixiJS app is unavailable.
- **Patterns discovered**: Hybrid canvas + HTML components follow a clean pattern: keep DOM text/layout, replace decorative CSS effects with canvas calls. The `pixiCtx?.app` guard pattern handles cases where PixiJS context may not yet be initialized or is unavailable. One-shot effects (shockwave, burst) with auto-cleanup timers are simpler than persistent effects — create a temporary GeometricParticleSystem, burst, then destroy after the effect duration.

### Iteration 6 — Task 6: Migrate TugOfWar to hybrid canvas + HTML

- **Status**: completed
- **Files changed**:
  - `apps/web/src/lib/components/overlay/TugOfWar.svelte` — migrated from CSS-animated bars/chevrons to hybrid canvas + HTML
- **Summary**: The largest overlay migration. Removed: two bar fill divs with CSS `leading-side-shimmer` shimmer animation, SVG rope texture overlay, CSS chevron momentum indicators (`.chevron-left`/`.chevron-right` with `momentum-pulse-left`/`momentum-pulse-right` animations), knot glow line with `bar-pulse-glow` animation, and the entire `<style>` block. Replaced with canvas effects: two `metallicFill` rectangles (brand purple for A, pink for B) with chrome sweep, a `glow` effect at the knot marker position, a `Graphics` cross-hatch rope pattern at 0.08 alpha, SPARK particles at knot when `isClose` (sides within 10%), and VOTE_BURST particles at the side receiving a vote (throttled to 100ms via Date.now() comparison). Three `$effect()` blocks handle: (1) syncing all canvas positions with DOM via `getBoundingClientRect()` on the bar container, (2) SPARK particle spawning when `isClose`, (3) VOTE_BURST detection by comparing previous vs current `totalVotes`/`votesA`. HTML preserved: all labels, percentages, TweenedNumber components, images, knot marker circle with `animate-tow-wobble`, and vote count footer.
- **Patterns discovered**: For persistent canvas effects that need continuous position updates (fills, glow), create them in `onMount` and update via `$effect()` — this avoids recreating PixiJS objects on every reactive change. Vote detection pattern: track `prevTotalVotes`/`prevVotesA` as module-level variables (not $state) to compare changes in `$effect()`without causing re-runs. SPARK continuous effects use`setInterval`inside`$effect()` with cleanup return, re-establishing the interval when reactive dependencies change.

### Iteration 7 — Task 7: Migrate Histogram to hybrid canvas + HTML

- **Status**: completed
- **Files changed**:
  - `apps/web/src/lib/components/overlay/Histogram.svelte` — migrated from CSS-styled bar divs to hybrid canvas + HTML
- **Summary**: Migrated Histogram.svelte to hybrid canvas + HTML. Removed: colored bar divs with `bg-gradient-to-t` Tailwind classes, CSS `.bar` class (box-shadow glow + transition), `.bar-leading` class (bar-pulse-glow animation + shimmer-sweep pseudo-element), and the entire `<style>` block. Replaced with canvas effects: `metallicFill` rectangles (COLORS.brand purple) for each bar, `glow` effect positioned at the top-center of the leading bar, and `VOTE_BURST` particles firing at the top of any bar whose vote count increases. Fills array is managed dynamically to match `distribution.length`. Per-bar burst throttling at 100ms via `lastBurstTimes` array. Two `$effect()` blocks handle: (1) syncing fill positions + leading glow via `getBoundingClientRect()` on bar reference divs, (2) VOTE_BURST detection by comparing `prevDistribution` vs current `distribution`. HTML preserved: TweenedNumber vote count above each bar, numeric labels below, label text, total votes pill. Build passes clean.
- **Patterns discovered**: For variable-length canvas effect arrays (fills matching distribution bars), manage the array imperatively (non-`$state`) inside the position-sync `$effect` — grow/shrink to match the reactive array length. Use `$state` for singleton canvas objects (glow, particles) so their creation in `onMount` triggers the `$effect` to re-run.

### Iteration 8 — Task 8: Migrate BracketViz to hybrid canvas + HTML

- **Status**: completed
- **Files changed**:
  - `apps/web/src/lib/components/overlay/BracketViz.svelte` — migrated from CSS pseudo-elements/animations to hybrid canvas + HTML
- **Summary**: Migrated BracketViz.svelte to hybrid canvas + HTML. Removed: `.sparkle-dot` spans and their CSS animation, `.champion-card` CSS `champion-glow` animation, `.winner-row` CSS box-shadow, `.bracket-level::after` pseudo-element connectors, and the entire `<style>` block. Replaced with: `lineDraw` canvas connectors between bracket levels with sequential delay (`level * TIMING.SWEEP_DURATION` so level 0 draws first, then level 1, etc.), `glow` effects on all `.winner-row` elements and champion card, `CELEBRATION` particle burst at champion position, and `WINNER_CROWN` particle fountain 300ms after celebration. DOM refs (`levelRefs[]` and `championRef`) used with `querySelectorAll` + `getBoundingClientRect()` to read card positions for canvas drawing. Three `$effect()` blocks handle: (1) connector line drawing, (2) glow positioning on winners/champion, (3) celebration firing once on champion reveal. `celebrationFired` flag prevents repeated bursts. Build passes clean.
- **Patterns discovered**: For bracket-style DOM with nested levels, `bind:this` on level container divs + `querySelectorAll` for child cards works well to pair DOM positions with canvas effects. Using `setTimeout` with level-based delay inside `$effect` provides sequential animation without complex promise chains. One-shot celebration effects need a guard flag (`celebrationFired`) to prevent re-firing when reactive dependencies re-trigger the `$effect`.

### Iteration 9 — Task 9: Migrate Leaderboard rank badges and GameOverResults celebration

- **Status**: completed
- **Files changed**:
  - `apps/web/src/lib/components/overlay/Leaderboard.svelte` — replaced emoji medals with canvas-rendered shield insignias
  - `apps/web/src/lib/components/overlay/GameOverResults.svelte` — replaced trophy emoji + sparkle-dots with CELEBRATION particle burst
- **Summary**: Migrated Leaderboard.svelte to use canvas-rendered rank insignias instead of emoji medals. Replaced `medalEmojis` object and `getMedal()` function with `RANK_MAP` (0→gold, 1→silver, 2→bronze) and `$derived` `insigniaUrls` that calls `renderInsignia()` for each rank. Medal emoji spans replaced with `<img>` tags using data URL sources. CSS `.medal` class replaced with `.insignia` class. Migrated GameOverResults.svelte: removed trophy emoji div (`animate-trophy-bounce` with 🏆), `trophySparkles` array, `sparkle-dot` spans, and `.sparkle-dot` CSS. Added PixiJS context integration (`getContext('pixi-app')`) and CELEBRATION particle burst (30-50 particles, gold + brand purple colors) fired at viewport upper-center on component mount. Particle system auto-cleans after 1600ms. All HTML text, layout, stagger-reveal animations preserved in both components.
- **Patterns discovered**: For static canvas-rendered images (insignias), `$derived.by()` is a clean way to pre-compute data URLs once — they only re-render if inputs change. The `renderInsignia()` function uses Canvas 2D API (not PixiJS) so it works without a PixiJS app context, making it suitable for use in any component.

### Iteration 10 — Task 10: Integrate PixiWrapper into overlay page and clean up replaced CSS

- **Status**: completed
- **Files changed**:
  - `apps/web/src/routes/overlay/[sessionId]/+page.svelte` — wrapped content with `<PixiWrapper>`, added z-10 to overlay-container
  - `apps/web/src/app.css` — removed 8 orphaned keyframes and their --animate-\* declarations
- **Summary**: Integrated PixiWrapper into the overlay page by wrapping all `.overlay-container` content. The canvas renders at z-index 0 with pointer-events: none and transparent background (configured in pixi-app.ts from task 1), while all HTML content sits above at z-index 10. AmbientParticles conditional rendering during `live` + `round-results` phases preserved as-is. Cleaned up 8 CSS keyframes from app.css that were replaced by canvas effects in tasks 4-9: `particle-drift`, `bar-pulse-glow`, `momentum-pulse-left`, `momentum-pulse-right`, `trophy-bounce`, `sparkle-burst`, `champion-glow`, `line-extend`, plus their corresponding `--animate-*` custom property declarations. Verified all 16 remaining keyframes are still actively referenced. Build and `pnpm run check` pass clean (0 errors, 0 TypeScript warnings).
- **Patterns discovered**: When cleaning up CSS, systematically grep all animation names across the entire `src/` directory (excluding app.css definitions) to identify which are still referenced. Both `animate-` utility class usage in Svelte templates and direct `animation:` property usage in component `<style>` blocks must be checked.

### Iteration 11 — Task 11: Add rank tier constants, streak multiplier logic, and round-XP types to shared-types

- **Status**: completed
- **Files changed**:
  - `packages/shared-types/src/gamification.ts` — added RankTier enum, RANK_TIER_THRESHOLDS, computeRankTier(), xpToNextRank(), STREAK_MULTIPLIERS, getStreakMultiplier(), RoundXpSummary/RankUpEventData/XpTickEventData interfaces, extended GamificationEvent and PlayerProfileSummary
  - `packages/shared-types/src/socket-events.ts` — added RoundXpSummary import and 'gamification:round-xp' to ServerToClientEvents
- **Summary**: Added all foundational XP system types to shared-types. RankTier enum (BRONZE→DIAMOND) with threshold mapping (0/500/1500/3500/7000). computeRankTier() follows the same descending-if pattern as existing computeLoyaltyTier(). xpToNextRank() returns current/next/xpNeeded tuple. STREAK_MULTIPLIERS constants with getStreakMultiplier() returning 1/2/3 based on consecutive correct thresholds 3/5. Three new interfaces: RoundXpSummary (per-round per-player XP data), RankUpEventData, XpTickEventData. Extended GamificationEvent type union with 'rank_up' | 'xp_tick' and corresponding data types. Added rankTier: RankTier to PlayerProfileSummary. Added 'gamification:round-xp' socket event. All existing barrel exports cover new additions since they use `export *`. Build passes clean with no errors.
- **Patterns discovered**: shared-types barrel export (`export * from './gamification.js'`) automatically re-exports all new additions — no barrel update needed when adding to existing files. The existing computeLoyaltyTier() pattern (descending if-chain from highest to lowest threshold) is the established convention for tier computation functions.

### Iteration 12 — Task 12: Add streak multiplier logic to GamificationService

- **Status**: completed
- **Files changed**:
  - `apps/server/src/services/GamificationService.ts` — imported getStreakMultiplier, replaced flat STREAK_BONUS_PER_STEP with multiplied bonus XP, added multiplier to streak milestone broadcast
  - `packages/shared-types/src/gamification.ts` — added optional `multiplier?: number` field to StreakEventData interface
- **Summary**: Modified `recordCorrectAnswer` to use `getStreakMultiplier(newStreak)` after incrementing the streak counter. Replaced the flat `STREAK_BONUS_PER_STEP` (2 XP per streak step) with a multiplied correct-answer bonus: when `multiplier > 1`, awards `XP_AWARDS.CORRECT_ANSWER * (multiplier - 1)` as STREAK_BONUS. At streak 3-4 this yields 5 bonus XP (2x total: 5+5=10), at streak >=5 this yields 10 bonus XP (3x total: 5+10=15). Streak milestone broadcasts now include the multiplier value in event data. `finalizeSession` correctly aggregates variable STREAK_BONUS amounts because it uses `redis.hgetall()` which reads the accumulated total from `hincrby` calls — the key name `STREAK_BONUS` hasn't changed, only the amounts vary.
- **Patterns discovered**: The `hincrby`/`hgetall` Redis accumulator pattern in GamificationService naturally handles variable XP amounts — no changes needed to `finalizeSession` when changing the per-increment amount, since it reads the accumulated total.

### Iteration 13 — Task 13: Add round-end XP broadcast to gameHandler and game store

- **Status**: completed
- **Files changed**:
  - `apps/server/src/services/GamificationService.ts` — added `prevXpKey` helper, `getRoundXpSummary` method, imported `RoundXpSummary` type
  - `apps/server/src/socket/handlers/gameHandler.ts` — added round XP broadcast after round-end in `game:next-round` handler
  - `apps/server/src/engine/GameEngine.ts` — added `onRoundXpCallback` private field, `setOnRoundXpCallback` setter, call in `onRoundTimerExpired`
  - `apps/server/src/engine/GameRegistry.ts` — wired `onRoundXpCallback` in `initSession` to call `gamificationService.getRoundXpSummary` and broadcast
  - `apps/web/src/lib/stores/game.svelte.ts` — added `roundXpSummary` state, getter, `gamification:round-xp` listener, reset on round-start
- **Summary**: Implemented per-round XP data emission. `getRoundXpSummary` reads each participant's XP hash from Redis, computes total session XP, diffs against a stored previous total (Redis key `session:{sessionId}:prevxp:{playerId}`), reads streak count, computes multiplier, and returns `RoundXpSummary` with per-player data filtered to `roundXp > 0`. Two broadcast paths: (1) manual `game:next-round` handler broadcasts after round-end with try/catch, (2) auto-timer path via `onRoundXpCallback` on GameEngine called in `onRoundTimerExpired`, wired in GameRegistry's `initSession`. Game store updated with full lifecycle: listen → store → reset on round-start.
- **Patterns discovered**: The prevxp Redis key pattern (`session:{sid}:prevxp:{pid}`) for tracking round-over-round XP deltas is clean — store cumulative total after each round, diff on next. The callback pattern on GameEngine (`setOnRoundXpCallback`) follows the same convention as `setOnAutoEnd` and `setBroadcastCallback` — private field + setter + optional chaining call.

### Iteration 14 — Task 14: Add rank-up detection to GamificationService finalizeSession

- **Status**: completed
- **Files changed**:
  - `apps/server/src/services/GamificationService.ts` — imported `computeRankTier`, added pre-update rank read, post-update rank comparison, `rank_up` broadcast, updated `level_up` broadcast with rank info
  - `packages/shared-types/src/gamification.ts` — extended `LevelUpEventData` with optional `rankUp` field
- **Summary**: Added rank-up detection to `finalizeSession` inside the transaction loop. Before the `tx.playerProfile.update` that increments `totalXp`, reads the player's current `totalXp` via `findUnique` and computes `previousRank` via `computeRankTier`. After the update, computes `newRank` from the updated `profile.totalXp`. If ranks differ, broadcasts a `rank_up` GamificationEvent with `previousRank`, `newRank`, and `totalXp`. Also updated the existing `level_up` broadcast to include optional `rankUp` data when a level-up coincides with a rank change. Extended `LevelUpEventData` interface with `rankUp?: { previousRank: RankTier; newRank: RankTier }`.
- **Patterns discovered**: The pre-read + post-compare pattern for detecting threshold crossings works cleanly inside Prisma transactions — read before increment, compare after. Using `satisfies GamificationEvent` ensures type safety at the call site without casting.
