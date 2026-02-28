import { Router } from 'express';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import type { Request, Response } from 'express';

export const gamesRouter = Router();

gamesRouter.use(authMiddleware);

// List user's games
gamesRouter.get('/', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId;
  const games = await prisma.game.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    include: { sessions: { select: { id: true, status: true } } },
  });
  res.json(games);
});

// Get single game
gamesRouter.get('/:gameId', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId;
  const game = await prisma.game.findFirst({
    where: { id: req.params.gameId, ownerId: userId },
    include: { sessions: { orderBy: { createdAt: 'desc' } } },
  });
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  res.json(game);
});

// Create game
gamesRouter.post('/', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId;
  const { type, title, config } = req.body;

  const game = await prisma.game.create({
    data: {
      ownerId: userId,
      type,
      title,
      config: config || {},
      status: 'DRAFT',
    },
  });

  res.status(201).json(game);
});

// Update game
gamesRouter.put('/:gameId', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId;
  const existing = await prisma.game.findFirst({
    where: { id: req.params.gameId, ownerId: userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const { title, config, status } = req.body;
  const game = await prisma.game.update({
    where: { id: req.params.gameId },
    data: { title, config, status },
  });

  res.json(game);
});

// Delete game
gamesRouter.delete('/:gameId', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId;
  const existing = await prisma.game.findFirst({
    where: { id: req.params.gameId, ownerId: userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  await prisma.game.delete({ where: { id: req.params.gameId } });
  res.json({ success: true });
});
