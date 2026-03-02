// Dynamic import: dotenv may not be available in production Docker images
await import('dotenv/config').catch(() => {});
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://twitch_hub:twitch_hub@localhost:5432/twitch_hub',
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
});
