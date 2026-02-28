import type { Game } from '@prisma/client';
import type { SessionBudget } from '@twitch-hub/shared-types';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      game?: Game;
      sessionBudget?: SessionBudget;
    }
  }
}
