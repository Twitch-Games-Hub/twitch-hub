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
