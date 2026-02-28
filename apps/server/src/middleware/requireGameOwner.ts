import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client.js';

export async function requireGameOwner(req: Request, res: Response, next: NextFunction) {
  const gameId = req.params.gameId;
  if (!gameId) {
    res.status(400).json({ error: 'Missing gameId' });
    return;
  }

  try {
    const game = await prisma.game.findFirst({ where: { id: gameId, ownerId: req.userId } });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    req.game = game;
    next();
  } catch (err) {
    next(err);
  }
}
