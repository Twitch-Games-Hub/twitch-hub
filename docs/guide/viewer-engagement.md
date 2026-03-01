# Viewer Engagement

The play page (`/play/[sessionId]`) includes three real-time features that give viewers live feedback and a sense of community while they participate.

## Gamification Event Toasts

When the server emits a `gamification:event` (streak, achievement, or level-up), an animated toast appears at the bottom of the player's screen.

### Appearance

| Event type    | Color   | Example message                  |
| ------------- | ------- | -------------------------------- |
| `streak`      | Orange  | `3-answer streak! 🔥`            |
| `achievement` | Brand   | `Achievement unlocked: On Fire!` |
| `level_up`    | Emerald | `Level up! You're now Level 5!`  |

The toast auto-dismisses after 3 seconds with a fade-out transition. If multiple events arrive in quick succession they are queued and shown one at a time.

### Where it appears

The toast renders in a fixed overlay container (`z-50`, `bottom-20`, centred horizontally) so it never disturbs the game UI and is visible across all game states.

### Socket event

The `gamification:event` payload received on `/play`:

```ts
interface GamificationEvent {
  type: 'streak' | 'achievement' | 'level_up';
  playerId: string;
  displayName: string;
  data: StreakEventData | AchievementEventData | LevelUpEventData;
}
```

See [Player Progression System](/gamification) for when these events are emitted.

---

## Post-Round Personal Outcome Card

After each round ends, a personalised card appears below the results chart showing the player how their vote compared to everyone else.

### Per-game-type behaviour

**Hot Take**

Shows the player's rating alongside the round average, and a badge indicating whether they were with or against the majority bucket.

```
You rated 8 — average was 6.2
[With the majority!]
```

**Balance / Ranking**

Shows a simple win/lose message based on which side received more votes.

```
Your side won! 🎉
```

```
Your side lost 😔
```

**Blind Test**

No outcome card is shown — rank feedback is already provided by the leaderboard.

### Lifecycle

The card appears as soon as `game:round-end` is received and the player has a recorded answer for the current question. It disappears automatically when the next round starts (the submitted answers map is cleared on `game:round-start`). Players who did not submit an answer this round see no card.

---

## Live Player Avatar Strip

A horizontal row of Twitch profile pictures showing who is currently connected to the session. It is visible in two places:

- **Active round** — shown between the round header and the vote/results cards.
- **Lobby** — shown below the participant count while waiting for the streamer to start.

### Display rules

- Up to **10 avatars** are shown side by side.
- If more than 10 players are connected, a `+N more` badge is appended.
- Players without a profile image show a fallback circle with their initial letter.
- New players who join mid-session slide in from the right.
- The overflow badge pulses briefly whenever the total participant count changes.

### Data source

Avatars come from the `session:users` socket event emitted by the server on the `/play` namespace. The event carries `socketId`, `displayName`, and `profileImageUrl` for each connected player.

```ts
interface SessionUser {
  socketId: string;
  displayName: string | null;
  profileImageUrl?: string | null;
}
```

Only players who connect via a Twitch-authenticated token have a `profileImageUrl`; anonymous players get the initial-letter fallback.
