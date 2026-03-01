# Player Progression System

Twitch Hub includes a gamification system that tracks player XP, levels, achievements, and channel loyalty across all game types.

## How It Works

All progression tracking uses **Redis during gameplay** (no database writes on the hot path) and writes to **Postgres asynchronously at session end**. This ensures vote processing latency is never affected.

## XP Awards

| Action                                       | XP          | Applies To                |
| -------------------------------------------- | ----------- | ------------------------- |
| Participation (1+ vote in session)           | 10          | All games                 |
| Per-round response                           | 2           | All games                 |
| Correct answer                               | 5           | BlindTest                 |
| Speed bonus (answer in <33% of window)       | 3           | BlindTest                 |
| Speed bonus (answer in <50% of window)       | 2           | BlindTest                 |
| Answer streak bonus (3+ consecutive correct) | +2 per step | BlindTest                 |
| Majority voter (voted with winning side)     | 3           | Balance, Ranking, HotTake |
| Session completion (stayed all rounds)       | 5           | All games                 |
| First responder (first 5 in a round)         | 2           | All games                 |

## Level Formula

```
level = floor(sqrt(totalXp / 25))
```

Capped at **Level 50** (62,500 XP).

| Level | XP Required |
| ----- | ----------- |
| 1     | 0           |
| 2     | 100         |
| 5     | 625         |
| 10    | 2,500       |
| 20    | 10,000      |
| 50    | 62,500      |

## Loyalty Tiers

Each channel has its own loyalty progression:

| Tier      | Channel XP Required |
| --------- | ------------------- |
| Newcomer  | 0                   |
| Regular   | 100                 |
| Dedicated | 500                 |
| Superfan  | 2,000               |
| Legendary | 10,000              |

## Achievements

### Participation

| ID            | Name        | Condition             |
| ------------- | ----------- | --------------------- |
| `first_steps` | First Steps | Complete 1 session    |
| `regular`     | Regular     | Complete 10 sessions  |
| `veteran`     | Veteran     | Complete 50 sessions  |
| `centurion`   | Centurion   | Complete 100 sessions |

### Skill

| ID             | Name         | Condition                     |
| -------------- | ------------ | ----------------------------- |
| `on_fire`      | On Fire      | 5-answer streak in a session  |
| `unstoppable`  | Unstoppable  | 10-answer streak in a session |
| `speed_demon`  | Speed Demon  | 5 speed bonuses in a session  |
| `perfect_game` | Perfect Game | All correct in a BlindTest    |
| `crowd_reader` | Crowd Reader | 10 consecutive majority votes |

### Social

| ID                | Name            | Condition           |
| ----------------- | --------------- | ------------------- |
| `channel_regular` | Channel Regular | Reach Regular tier  |
| `superfan`        | Superfan        | Reach Superfan tier |
| `channel_surfer`  | Channel Surfer  | Play in 5+ channels |

### Rare (Hidden)

| ID           | Name       | Condition                    |
| ------------ | ---------- | ---------------------------- |
| `night_owl`  | Night Owl  | Play between 2-5 AM          |
| `full_house` | Full House | 100+ participants in session |

## API Endpoints

### `GET /api/gamification/profile`

Returns the authenticated user's progression profile.

**Auth:** Required

### `GET /api/gamification/profile/:twitchLogin`

Returns a public player profile.

**Auth:** None

### `GET /api/gamification/achievements`

Returns all achievement definitions.

**Auth:** None

### `GET /api/gamification/channel/:channelId/leaderboard`

Returns the channel loyalty leaderboard.

**Query params:** `limit` (default: 20, max: 100)

**Auth:** None

## Socket Events

### `gamification:event`

Emitted to `/play` and `/overlay` namespaces during live sessions.

```ts
interface GamificationEvent {
  type: 'streak' | 'achievement' | 'level_up';
  playerId: string;
  displayName: string;
  data: StreakEventData | AchievementEventData | LevelUpEventData;
}
```

### `gamification:profile`

Emitted with the player's profile summary.

## Player Profile Page

Public profiles are available at `/u/:twitchLogin` and display:

- Level + XP progress bar
- Total sessions, responses, correct answers, best streak
- Achievement grid
- Channel loyalty tiers

## Seeding Achievements

Run the achievement seed script after schema push:

```bash
cd apps/server
bun prisma db push
bun run prisma/seed-achievements.ts
```
