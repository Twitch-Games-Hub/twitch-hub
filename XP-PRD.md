# XP System — Product Requirements Document

## Overview

A persistent experience point (XP) system for Twitch Hub where viewers earn XP by participating in games, answering correctly, maintaining streaks, and completing sessions. XP accumulates across all game sessions, drives a named rank progression system (Bronze → Diamond), and is visualized through canvas overlay animations, profile pages, and leaderboards.

---

## User Decisions

| Decision          | Choice                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| XP Sources        | Participation, correct answers, consecutive-round streaks, game completion                     |
| Leveling          | Named ranks — Bronze, Silver, Gold, Platinum, Diamond                                          |
| Display Locations | Player profile, leaderboard page, game-over results, overlay (canvas)                          |
| Persistence       | PostgreSQL via Prisma (accumulates across sessions)                                            |
| Streak Multiplier | Consecutive correct rounds: 2x at 3, 3x at 5                                                   |
| Rank Thresholds   | Bronze(0), Silver(500), Gold(1500), Platinum(3500), Diamond(7000)                              |
| XP Broadcast      | Batch at end of each round (not per-vote)                                                      |
| Canvas Animations | Full effects: floating +XP, metallic progress bar, level-up shockwave, rank-up insignia reveal |

---

## Existing Infrastructure

The codebase already includes significant gamification scaffolding:

- **Database:** `PlayerProfile` (totalXp, level, bestStreak), `XpTransaction` (amount, reason, sessionId), `ChannelPlayerStats` (per-channel loyalty)
- **XpReason enum:** PARTICIPATION, ROUND_RESPONSE, CORRECT_ANSWER, SPEED_BONUS, STREAK_BONUS, MAJORITY_VOTER, SESSION_COMPLETION, FIRST_RESPONDER
- **GamificationService:** Fire-and-forget methods for recording XP events during gameplay
- **Socket events:** `gamification:event`, `gamification:session-summary`, `leaderboard:update`
- **Web:** Profile page at `/u/[twitchLogin]` with XpBar, game store tracks gamificationQueue + sessionSummary

### What Does NOT Exist Yet

1. Named rank tiers (Bronze→Diamond) with threshold constants
2. Streak multiplier logic (2x/3x) — streaks tracked but not multiplied
3. Round-end XP broadcast — summary only at game END
4. Canvas XP animations (no PixiJS XP effects)
5. Rank badges on profiles
6. Global XP leaderboard page
7. Rank-up detection logic

---

## Implementation Steps

### Step 1 — Shared Types & Utilities

**Files:** `packages/shared-types/src/gamification.ts`, `packages/shared-types/src/socket-events.ts`

Add foundational constants and types consumed by all downstream tasks:

- `RankTier` enum: BRONZE, SILVER, GOLD, PLATINUM, DIAMOND
- `RANK_TIER_THRESHOLDS`: `{ BRONZE: 0, SILVER: 500, GOLD: 1500, PLATINUM: 3500, DIAMOND: 7000 }`
- `computeRankTier(totalXp): RankTier` — returns the highest rank whose threshold the player meets
- `xpToNextRank(totalXp): { current, next, xpNeeded }` — progress toward next rank
- `STREAK_MULTIPLIERS` constants: `{ THRESHOLD_2X: 3, THRESHOLD_3X: 5, MULTIPLIER_2X: 2, MULTIPLIER_3X: 3 }`
- `getStreakMultiplier(consecutiveCorrect): number` — returns 1, 2, or 3
- `RoundXpSummary` interface: `{ round, playerXp: Record<string, { roundXp, totalSessionXp, streak, multiplier }> }`
- `RankUpEventData` interface: `{ previousRank, newRank, totalXp }`
- `XpTickEventData` interface: `{ amount, reason, multiplier }`
- Extend `GamificationEvent.type` union with `'rank_up' | 'xp_tick'`
- Add `'gamification:round-xp'` to `ServerToClientEvents`
- Add `rankTier: RankTier` to `PlayerProfileSummary`

### Step 2 — Streak Multiplier in GamificationService

**File:** `apps/server/src/services/GamificationService.ts`

Modify `recordCorrectAnswer` to apply streak multipliers:

- After incrementing the streak counter in Redis, compute: `multiplier = getStreakMultiplier(newStreak)`
- Replace flat `STREAK_BONUS_PER_STEP` with: `bonusXp = CORRECT_ANSWER * (multiplier - 1)`
  - Streak 3: correct answer yields 5 + 5 = 10 XP (2x)
  - Streak 5: correct answer yields 5 + 10 = 15 XP (3x)
- Include multiplier value in streak milestone broadcast event data

### Step 3 — Round-End XP Broadcast

**Files:** `apps/server/src/services/GamificationService.ts`, `apps/server/src/socket/handlers/gameHandler.ts`, `apps/server/src/engine/GameEngine.ts`, `apps/web/src/lib/stores/game.svelte.ts`

Emit per-round XP data so the overlay can animate:

- New `getRoundXpSummary(sessionId, round, participantIds)` method on GamificationService
  - Computes per-player round XP deltas by diffing current vs previous Redis totals
  - Returns `RoundXpSummary` with roundXp, totalSessionXp, streak, multiplier per player
- Emit `gamification:round-xp` after each `game:round-end` in:
  - `game:next-round` handler in gameHandler.ts
  - `onRoundTimerExpired` in GameEngine.ts (via callback wired through GameRegistry)
- Game store: add `roundXpSummary: RoundXpSummary | null`, listen for event, reset on `game:round-start`

### Step 4 — Rank-Up Detection

**File:** `apps/server/src/services/GamificationService.ts`

Detect when a player crosses a rank threshold during session finalization:

- In `finalizeSession`, before `tx.playerProfile.update`:
  - Read current `totalXp`, compute `previousRank = computeRankTier(totalXp)`
- After update:
  - Compute `newRank = computeRankTier(updatedTotalXp)`
  - If `newRank !== previousRank`, broadcast `rank_up` GamificationEvent with `{ previousRank, newRank, totalXp }`

### Step 5 — Profile API & Global Leaderboard Endpoint

**File:** `apps/server/src/routes/gamification.ts`

- Add `rankTier: computeRankTier(profile.totalXp)` to both `/profile` and `/profile/:twitchLogin` responses
- New endpoint: `GET /api/gamification/leaderboard?limit=50&offset=0`
  - Query `PlayerProfile` ordered by `totalXp` desc, include user display name + avatar
  - Return: `{ entries: [{ rank, twitchLogin, displayName, profileImageUrl, totalXp, level, rankTier }], total, limit, offset }`
  - Limit capped at 100

### Step 6 — RankBadge Component & Profile Update

**Files:** New `apps/web/src/lib/components/gamification/RankBadge.svelte`, modify `apps/web/src/routes/u/[twitchLogin]/+page.svelte`, `apps/web/src/lib/components/gamification/XpBar.svelte`

- `RankBadge.svelte`: Metallic gradient pill badge per tier
  - Bronze: amber gradient, Silver: gray gradient, Gold: yellow gradient, Platinum: cyan/blue gradient, Diamond: cyan/teal gradient + shimmer animation
  - Size variants: sm, md, lg
- Profile page: show RankBadge next to display name
- XpBar: optionally show rank tier name next to level

### Step 7 — Global Leaderboard Page

**File:** New `apps/web/src/routes/leaderboard/+page.svelte`

- Paginated table: rank, player avatar+name (link to `/u/{twitchLogin}`), RankBadge, level, total XP
- Top 3 highlighted rows
- Previous/Next pagination (50 per page)
- Add Leaderboard link to app navigation

### Step 8 — GameOverResults XP Summary

**Files:** `apps/web/src/lib/components/overlay/GameOverResults.svelte`, `apps/web/src/routes/overlay/[sessionId]/+page.svelte`

- New props: `sessionSummary: SessionXpSummary | null`, `leaderboard: LeaderboardEntry[]`
- Session XP leaderboard section (stagger-reveal at 1200ms)
- Personal XP breakdown with human-readable reason labels (stagger-reveal at 1600ms)
- Total XP earned with separator line
- Overlay page passes `gameStore.sessionSummary` and `gameStore.leaderboard`

### Step 9 — Canvas Floating +XP & Progress Bar Effects

**Files:** New `apps/web/src/lib/canvas/effects/floating-xp.ts`, `apps/web/src/lib/canvas/effects/xp-progress-bar.ts`

> **Depends on:** PixiJS canvas infrastructure (tasks 1-3)

- `spawnFloatingXp(app, x, y, amount, opts)`:
  - PixiJS Text "+N XP", bold 18px, white with drop shadow
  - Drifts upward ~60px, fades over 1200ms with easeOutQuart
  - Gold color + 22px font when streak multiplier > 1
  - Respects reduced motion
- `CanvasXpProgressBar`:
  - Metallic gradient fill bar using `metallic-fill` effect
  - `update(progress, rankColor)` and `animateFill(from, to, duration)` methods
  - Fill color matches current rank tier
  - Flash with glow effect on rank change

### Step 10 — Canvas Celebrations & XP Effects Controller

**Files:** New `apps/web/src/lib/canvas/effects/level-up-effect.ts`, `rank-up-effect.ts`, `apps/web/src/lib/components/overlay/XpEffectsController.svelte`

> **Depends on:** PixiJS tasks 1-3, 10; XP tasks steps 1, 3, 4, 9

- **Level-up effect:** Shockwave (brand purple) → 200ms delay → CELEBRATION particles (30, purple + white)
- **Rank-up effect:** Shockwave (rank color) → 300ms → SHOCKWAVE_DEBRIS (rank color) → 500ms → rank insignia Sprite scales 0→1.2→1.0 with overshoot bounce, holds 2s, fades + gold CELEBRATION particles
- **XpEffectsController.svelte:** Renderless Svelte 5 component
  - Watches `gameStore.roundXpSummary` → spawns floating +XP per player (staggered 50ms)
  - Watches `gameStore.gamificationQueue` → triggers level-up or rank-up effects
  - Mounted in overlay page inside PixiWrapper during live/round-results/game-over phases
  - All effects respect reduced motion preferences

---

## Dependency Graph

```
Step 1 (shared types)
├── Step 2 (streak multipliers)
│   ├── Step 3 (round-end XP broadcast)
│   │   └── Step 10 (canvas celebrations + controller)
│   └── Step 4 (rank-up detection)
│       └── Step 10
├── Step 5 (API + leaderboard endpoint)
│   ├── Step 6 (RankBadge + profile)
│   │   └── Step 7 (leaderboard page)
│   └── Step 7
├── Step 8 (GameOverResults XP display)
└── Step 9 (canvas floating XP + progress bar) ← also depends on PixiJS tasks 1-3
    └── Step 10 ← also depends on PixiJS task 10

Independent of canvas (can start immediately): Steps 2, 3, 4, 5, 6, 7, 8
Requires canvas tasks 1-3: Steps 9, 10
Requires canvas task 10 (PixiWrapper): Step 10
```

---

## Key Files

| File                                                             | Role                                     |
| ---------------------------------------------------------------- | ---------------------------------------- |
| `packages/shared-types/src/gamification.ts`                      | Rank tiers, multipliers, XP types        |
| `packages/shared-types/src/socket-events.ts`                     | Round XP socket event                    |
| `apps/server/src/services/GamificationService.ts`                | Multipliers, round XP, rank-up detection |
| `apps/server/src/socket/handlers/gameHandler.ts`                 | Round-end XP broadcast                   |
| `apps/server/src/engine/GameEngine.ts`                           | Auto-timer round XP callback             |
| `apps/server/src/routes/gamification.ts`                         | Profile + leaderboard API                |
| `apps/web/src/lib/stores/game.svelte.ts`                         | Client-side roundXpSummary state         |
| `apps/web/src/lib/components/gamification/RankBadge.svelte`      | Rank badge UI                            |
| `apps/web/src/lib/components/gamification/XpBar.svelte`          | XP progress bar                          |
| `apps/web/src/routes/u/[twitchLogin]/+page.svelte`               | Profile page                             |
| `apps/web/src/routes/leaderboard/+page.svelte`                   | Global leaderboard                       |
| `apps/web/src/lib/components/overlay/GameOverResults.svelte`     | Game-over XP summary                     |
| `apps/web/src/lib/canvas/effects/floating-xp.ts`                 | Canvas +XP animation                     |
| `apps/web/src/lib/canvas/effects/xp-progress-bar.ts`             | Canvas XP bar                            |
| `apps/web/src/lib/canvas/effects/level-up-effect.ts`             | Level-up celebration                     |
| `apps/web/src/lib/canvas/effects/rank-up-effect.ts`              | Rank-up celebration                      |
| `apps/web/src/lib/components/overlay/XpEffectsController.svelte` | Effect orchestrator                      |
| `apps/web/src/routes/overlay/[sessionId]/+page.svelte`           | Overlay integration point                |
