import type { Game } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      game?: Game;
    }
  }
}
