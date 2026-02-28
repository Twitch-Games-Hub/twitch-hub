# Contributing

## Branch Naming

```
feat/short-description
fix/short-description
chore/short-description
docs/short-description
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add blind test leaderboard animation
fix: prevent duplicate votes on reconnect
chore: update dependencies
docs: add overlay setup guide
test: add chatParser edge case tests
```

## Pull Request Process

1. Create a branch from `main`
2. Make changes and ensure all checks pass:
   ```bash
   bun run lint
   bun run format:check
   bun run typecheck
   bun run test
   bun run build
   ```
3. Push and open a PR against `main`
4. CI runs automatically (lint, typecheck, build, test)

## Pre-commit Hooks

Husky + lint-staged runs on every commit:

- ESLint auto-fix + Prettier for `.ts`, `.js`, `.svelte` files
- Prettier for `.json`, `.md`, `.yml`, `.css`, `.html` files

## Adding a New Game Type

1. **Define config** in `packages/shared-types/src/game.ts`:

   ```ts
   export interface MyGameConfig {
     // game-specific configuration
   }
   ```

2. **Add enum value** to `GameType` in shared-types and Prisma schema

3. **Create engine** in `apps/server/src/engine/types/MyGame.ts`:

   ```ts
   export class MyGame extends GameEngine<MyGameConfig, AnswerType> {
     getGameType() {
       return GameType.MY_GAME;
     }
     getTotalRounds() {
       /* ... */
     }
     getRoundData(round: number) {
       /* ... */
     }
     async processAnswer(userId, answer, questionId) {
       /* ... */
     }
     async computeRoundResults(round) {
       /* ... */
     }
     async computeFinalResults() {
       /* ... */
     }
   }
   ```

4. **Register** in `GameRegistry`

5. **Add chat command** in `chatParser.ts`

6. **Create overlay component** in `apps/web/src/lib/components/overlay/`

7. **Run migrations**: `bun run --filter @twitch-hub/server db:migrate`
