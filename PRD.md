# Canvas Overlay Transformation — Clean/Competitive Style

## Context

The Twitch Hub overlay (what viewers see on stream via OBS) currently renders entirely with HTML divs + CSS animations — histograms are colored divs, the tug-of-war is two expanding divs with a CSS wobble, confetti is 48 DOM elements falling. It works, but feels like a dashboard, not a game.

This plan transforms the overlay into a GPU-accelerated Canvas experience using **PixiJS v8**, with sharp geometric particles, metallic sheens, and precision animations inspired by competitive games (Valorant, Apex). The result should make streamers' broadcasts look like a polished esports production.

**Architecture**: A single PixiJS Canvas sits behind the Svelte HTML. Visual effects (particles, glows, fills, shockwaves) render on Canvas. Text and interactive elements stay in Svelte/HTML for accessibility and font quality.

---

## Step 1: Install PixiJS + Create Core Infrastructure

**Install dependencies:**

```bash
pnpm --filter @twitch-hub/web add pixi.js@^8 @pixi/particle-emitter@^5
```

**Create new files in `apps/web/src/lib/canvas/`:**

| File                 | Purpose                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme.ts`           | Color palette (brand purple, silver, steel, gold, diamond), easing curves (quartic sharp-out/in), timing constants                            |
| `reduced-motion.ts`  | Detects `prefers-reduced-motion`, exports `shouldAnimate()` — all effects respect this                                                        |
| `pixi-app.ts`        | Factory: creates PixiJS `Application` with transparent bg, antialias, retina resolution, low-power GPU preference (OBS-friendly)              |
| `PixiWrapper.svelte` | Svelte component: mounts `<canvas>` fixed behind HTML, initializes PixiJS app, exposes via `setContext('pixi-app')`, handles resize + cleanup |

---

## Step 2: Build Geometric Particle System

**Create `apps/web/src/lib/canvas/particles/`:**

| File                         | Purpose                                                                                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shapes.ts`                  | Generators for triangle, diamond, hexagon, thin line, dot — each returns a `Graphics` object with subtle metallic gradient (chrome sheen via 1px lighter offset)                                                                                                          |
| `GeometricParticleSystem.ts` | Wraps `@pixi/particle-emitter`. API: `burst(x, y, preset)` for one-shot, `startAmbient(preset)` / `stopAmbient()` for continuous. Caps total particles at 200, pools objects for reuse                                                                                    |
| `presets.ts`                 | `VOTE_BURST` (8-12 particles, sharp outward, 300ms), `AMBIENT_FIELD` (15-20 slow-drift hexagons, 0.1 opacity), `CELEBRATION` (30-50 upward fountain, gold), `SPARK` (4-6 tiny fast dots), `SHOCKWAVE_DEBRIS` (20 radial triangles), `WINNER_CROWN` (gold upward fountain) |

---

## Step 3: Build Effects Library

**Create `apps/web/src/lib/canvas/effects/`:**

| File               | Purpose                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `shockwave.ts`     | Expanding ring that scales from center, fades 0.8→0 over 600ms — for round transitions                               |
| `metallic-fill.ts` | Chrome gradient sweep that reveals a rectangular area left-to-right — for histogram bars and tug-of-war fills        |
| `line-draw.ts`     | Progressive line from A to B over a duration — for bracket connectors                                                |
| `glow.ts`          | Focused `BlurFilter` halo in white/purple — for leading indicators and winners                                       |
| `grid-overlay.ts`  | Subtle scan-line pattern (horizontal lines at 4px intervals, 0.03 alpha) — persistent background during live/results |

**Also create:**

- `apps/web/src/lib/canvas/rank-insignias.ts` — Programmatic shield/chevron rank badges (bronze/silver/gold/platinum/diamond) rendered via PixiJS Graphics, replacing emoji medals

---

## Step 4: Migrate AmbientParticles (Full Replacement)

**Modify:** `apps/web/src/lib/components/overlay/AmbientParticles.svelte`

- Remove all HTML markup (the 10 drifting divs)
- Replace with a thin wrapper that gets `pixi-app` from context, creates `GeometricParticleSystem` with `AMBIENT_FIELD` preset + `grid-overlay` scan-lines
- Starts on mount, stops on destroy
- Easiest migration — validates the entire PixiJS pipeline works

---

## Step 5: Migrate RoundSplash (Hybrid: Canvas Effects + HTML Text)

**Modify:** `apps/web/src/lib/components/overlay/RoundSplash.svelte`

- **Keep**: HTML text ("Round N of M") with existing `scale-in-overshoot` CSS
- **Replace with Canvas**: Remove `.radial-burst` div and `.accent-line` divs → fire `shockwave` effect at viewport center + `SHOCKWAVE_DEBRIS` particle burst
- On mount, trigger both effects simultaneously; they auto-clean after 600ms

---

## Step 6: Migrate TugOfWar (Hybrid — Largest Migration)

**Modify:** `apps/web/src/lib/components/overlay/TugOfWar.svelte`

- **Keep in HTML**: Labels (A/B names, percentages, vote count), knot marker circle (positioned via CSS `left%`), option images
- **Move to Canvas**:
  - Bar fills → `metallic-fill` rectangles with chrome sweep animation
  - Rope texture → Canvas cross-hatch pattern replacing SVG overlay
  - Momentum indicators → geometric particles instead of CSS chevrons
  - Knot glow → focused `glow` filter on Canvas at knot position
- **New Canvas effects**:
  - Friction `SPARK` particles at knot position when `isClose` (within 10%)
  - `VOTE_BURST` at the side that just received a vote (throttled: max 1 per 100ms)
- Reactive via `$effect()` watching `percentA`, `percentB`, `totalVotes`
- Canvas positions mapped from DOM via `getBoundingClientRect()`

---

## Step 7: Migrate Histogram (Hybrid)

**Modify:** `apps/web/src/lib/components/overlay/Histogram.svelte`

- **Keep in HTML**: Vote count numbers above bars (`TweenedNumber`), bar labels below, total votes pill
- **Move to Canvas**: Colored bar rectangles → `metallic-fill` Graphics objects with chrome gradient
- **New Canvas effects**:
  - `VOTE_BURST` at top of bar that grew (detect by comparing old vs new `distribution`)
  - Leading bar gets focused purple `glow` filter
  - Throttle bursts: max 1 per 100ms per bar
- Bar positions: read from DOM container layout, map to Canvas coordinates

---

## Step 8: Migrate BracketViz (Hybrid)

**Modify:** `apps/web/src/lib/components/overlay/BracketViz.svelte`

- **Keep in HTML**: All matchup cards (names, scores, images)
- **Move to Canvas**: Connector lines between bracket levels → `line-draw` effect with sequential drawing (level 0 first, then level 1, etc.)
- **Replace**: CSS `.sparkle-dot` elements → `CELEBRATION` Canvas particles
- **New**: Winner cards get focused `glow` filter; champion gets `WINNER_CROWN` particle fountain
- Remove CSS `::after` pseudo-elements for connectors

---

## Step 9: Migrate Leaderboard + GameOverResults

**Modify:** `apps/web/src/lib/components/overlay/Leaderboard.svelte`

- Replace emoji medals (🥇🥈🥉) with Canvas-rendered rank insignias (gold/silver/bronze shields)
- Insignias rendered via PixiJS Graphics → converted to data URL → used as `<img src>` in HTML

**Modify:** `apps/web/src/lib/components/overlay/GameOverResults.svelte`

- Replace trophy emoji + `.sparkle-dot` divs with Canvas `CELEBRATION` burst (50 particles, gold + brand)
- Fire celebration on component mount (game-over phase entry)

---

## Step 10: Integrate PixiWrapper into Overlay Page

**Modify:** `apps/web/src/routes/overlay/[sessionId]/+page.svelte`

- Wrap entire content area with `<PixiWrapper>` component
- Canvas renders as first element at z-index 0 with `pointer-events-none`
- All Svelte HTML layers on top at higher z-index
- AmbientParticles rendered during `live` + `round-results` phases (existing logic stays)
- Clean up any removed CSS keyframe animations from `app.css`

---

## Critical Files

| File                                                          | Action                                  |
| ------------------------------------------------------------- | --------------------------------------- |
| `apps/web/package.json`                                       | Add pixi.js, @pixi/particle-emitter     |
| `apps/web/src/lib/canvas/` (14 new files)                     | Core infrastructure, particles, effects |
| `apps/web/src/lib/components/overlay/AmbientParticles.svelte` | Full rewrite                            |
| `apps/web/src/lib/components/overlay/RoundSplash.svelte`      | Hybrid migration                        |
| `apps/web/src/lib/components/overlay/TugOfWar.svelte`         | Hybrid migration                        |
| `apps/web/src/lib/components/overlay/Histogram.svelte`        | Hybrid migration                        |
| `apps/web/src/lib/components/overlay/BracketViz.svelte`       | Hybrid migration                        |
| `apps/web/src/lib/components/overlay/Leaderboard.svelte`      | Rank insignias                          |
| `apps/web/src/lib/components/overlay/GameOverResults.svelte`  | Celebration effects                     |
| `apps/web/src/routes/overlay/[sessionId]/+page.svelte`        | Mount PixiWrapper                       |
| `apps/web/src/app.css`                                        | Remove replaced keyframes               |

---

## Verification

1. **After Step 3**: Create temp route `/overlay/test` — mount PixiWrapper with buttons to fire each particle preset. Verify transparent bg, particles render, reduced-motion disables them
2. **After each component step**: Open overlay in browser with mock game data, verify effects fire at correct positions, HTML text stays crisp above Canvas
3. **After Step 10**: Full end-to-end test — start a real game session, verify all phases (lobby → splash → live → round-results → game-over) with Canvas effects
4. **OBS test**: Add overlay URL as OBS browser source — verify transparent bg, no WebGL errors, 30fps minimum
5. **Performance**: Monitor `app.ticker.FPS`, target <5ms/frame ambient, <10ms/frame during bursts, max 200 active particles
6. Delete temp test route when done
