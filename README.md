# Twitch Hub

Interactive games and polls for Twitch streamers — powered by chat commands and real-time overlays.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![SvelteKit](https://img.shields.io/badge/SvelteKit-5-orange)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-black)
![Prisma](https://img.shields.io/badge/Prisma-6-teal)
![Tailwind](https://img.shields.io/badge/Tailwind-4-blue)
![Bun](https://img.shields.io/badge/Bun-1-f9f1e1)

## Quick Start

```bash
git clone https://github.com/your-org/twitch-hub.git
cd twitch-hub
bun install
docker compose up -d              # Postgres + Redis
cp .env.example .env              # Add your Twitch app credentials
bun run --filter @twitch-hub/server db:generate
bun run --filter @twitch-hub/server db:migrate
bun run dev
```

Web: `http://localhost:5173` | API: `http://localhost:3001`

## Documentation

Full docs available at the [documentation site](./docs/) — run `bun run docs:dev` to browse locally.

## Project Structure

```
twitch-hub/
├── apps/
│   ├── web/                    # SvelteKit 5 frontend
│   │   ├── src/lib/components/ # Game & overlay components
│   │   ├── src/lib/stores/     # Svelte 5 rune stores
│   │   └── src/routes/         # Pages (dashboard, play, overlay)
│   └── server/                 # Express + Socket.IO backend
│       ├── src/engine/         # Game engine (abstract base + 3 types)
│       ├── src/socket/         # Socket.IO namespaces & handlers
│       ├── src/twitch/         # Twitch EventSub + chat parser
│       └── prisma/             # Database schema & migrations
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

## Scripts

| Command                | Description               |
| ---------------------- | ------------------------- |
| `bun run dev`          | Start all services        |
| `bun run build`        | Build all packages        |
| `bun run lint`         | Run ESLint                |
| `bun run format:check` | Check Prettier formatting |
| `bun run typecheck`    | TypeScript type checking  |
| `bun run test`         | Run unit tests            |
| `bun run docs:dev`     | Documentation dev server  |

## Production

```bash
docker compose -f docker-compose.prod.yml up --build
```

## Contributing

See the [contributing guide](./docs/dev/contributing.md).

## License

MIT
