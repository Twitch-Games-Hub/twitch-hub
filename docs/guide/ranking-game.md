# Ranking Game

The **Ranking** game type is an elimination bracket tournament inspired by uwufufu. Items compete in head-to-head matchups, the Twitch audience votes on each matchup simultaneously, the majority-vote winner advances, and the bracket narrows until a champion is crowned.

## Configuration

When creating a Ranking game, you configure:

- **Bracket Size**: 8, 16, or 32 items. Determines how many items enter the tournament.
- **Items**: Each item has a name and an optional image URL. You need at least as many items as the bracket size.
- **Round Duration**: How many seconds viewers have to vote on each matchup (5-300 seconds).

## How the Bracket Works

1. Items are randomly shuffled and paired into first-round matchups.
2. Each matchup is one "round" — viewers vote A or B to pick the winner.
3. The item with more votes advances to the next bracket level. Ties go to item A.
4. The bracket narrows: 16 → 8 → 4 → 2 → Final.
5. Total matchups = bracket size - 1 (e.g., 8-item bracket = 7 matchups).

### Bracket Levels

- **Round of N**: The early rounds (e.g., Round of 16, Round of 32)
- **Quarterfinals**: When 8 items compete for 4 spots
- **Semifinals**: When 4 items compete for 2 spots
- **Final**: The championship matchup

## Chat Command

Viewers can vote from Twitch chat using:

```
!pick A    — vote for the first item
!pick B    — vote for the second item
!pick 1    — alias for A
!pick 2    — alias for B
```

## Results

After all matchups complete, the game shows:

- **Champion**: The winning item
- **Rankings**: 1st (champion), 2nd (finalist), 3rd-4th (semifinalists), etc.
- **Full Bracket**: A visual bracket tree showing every matchup with vote counts
