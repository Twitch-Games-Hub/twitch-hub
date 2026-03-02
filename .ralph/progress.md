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
