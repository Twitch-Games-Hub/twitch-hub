import type { Game } from '@prisma/client';
import type { SessionBudget } from '@twitch-hub/shared-types';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    game?: Game;
    sessionBudget?: SessionBudget;
  }
}
