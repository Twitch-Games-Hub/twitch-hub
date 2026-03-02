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
