# Twitch Hub

Interactive games and polls for Twitch streamers — powered by chat commands and real-time overlays.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![SvelteKit](https://img.shields.io/badge/SvelteKit-5-orange)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-black)
![Prisma](https://img.shields.io/badge/Prisma-7-teal)
![Tailwind](https://img.shields.io/badge/Tailwind-4-blue)
![pnpm](https://img.shields.io/badge/pnpm-10-f69220)

## Quick Start

```bash
git clone https://github.com/your-org/twitch-hub.git
cd twitch-hub
pnpm install
docker compose up -d              # Postgres + Redis
cp .env.example apps/server/.env  # Add your Twitch app credentials
pnpm --filter @twitch-hub/server run db:generate
pnpm --filter @twitch-hub/server run db:push
pnpm run dev
```

Web: `http://localhost:5173` | API: `http://localhost:3001`

## Documentation

Full docs available at the [documentation site](./docs/) — run `pnpm run docs:dev` to browse locally.

## Project Structure

```
twitch-hub/
├── apps/
│   ├── web/                    # SvelteKit 5 frontend
│   │   ├── src/lib/components/ # Game & overlay components
│   │   ├── src/lib/stores/     # Svelte 5 rune stores
│   │   └── src/routes/         # Pages (dashboard, play, overlay)
│   └── server/                 # Fastify + Socket.IO backend
│       ├── src/engine/         # Game engine (abstract base + 4 types)
│       ├── src/socket/         # Socket.IO namespaces & handlers
│       ├── src/twitch/         # Twitch EventSub + chat parser
│       └── prisma/             # Database schema & seed
├── packages/
│   └── shared-types/           # TypeScript types shared between apps
└── docs/                       # VitePress documentation
```

## Game Types

| Game           | Description                              | Chat Command          |
| -------------- | ---------------------------------------- | --------------------- |
| **Hot Take**   | Rate statements 1-10, see live histogram | `!rate N`             |
| **Balance**    | A/B choice with animated tug-of-war bar  | `!vote A` / `!vote B` |
| **Blind Test** | Timed guessing with leaderboard          | `!answer text`        |
| **Ranking**    | Bracket tournament — vote head-to-head   | `!pick A` / `!pick B` |

## Scripts

| Command                 | Description               |
| ----------------------- | ------------------------- |
| `pnpm run dev`          | Start all services        |
| `pnpm run build`        | Build all packages        |
| `pnpm run lint`         | Run ESLint                |
| `pnpm run format:check` | Check Prettier formatting |
| `pnpm run typecheck`    | TypeScript type checking  |
| `pnpm run test`         | Run unit tests            |
| `pnpm run docs:dev`     | Documentation dev server  |

## Production

```bash
docker compose -f docker-compose.prod.yml up --build
```

## Contributing

See the [contributing guide](./docs/dev/contributing.md).

## License

MIT
