import { Router } from 'express';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireGameOwner } from '../middleware/requireGameOwner.js';
import type { Request, Response } from 'express';

export const gamesRouter = Router();

gamesRouter.use(authMiddleware);

// List user's games
gamesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const games = await prisma.game.findMany({
      where: { ownerId: req.userId },
      orderBy: { updatedAt: 'desc' },
      include: { sessions: { select: { id: true, status: true } } },
    });
    res.json(games);
  }),
);

// Get single game
gamesRouter.get(
  '/:gameId',
  requireGameOwner,
  asyncHandler(async (req: Request, res: Response) => {
    const game = await prisma.game.findFirst({
      where: { id: req.params.gameId, ownerId: req.userId },
      include: { sessions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json(game);
  }),
);

// Create game
gamesRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, title, description, coverImageUrl, config } = req.body;

    const game = await prisma.game.create({
      data: {
        ownerId: req.userId!,
        type,
        title,
        description: description || null,
        coverImageUrl: coverImageUrl || null,
        config: config || {},
        status: 'DRAFT',
      },
    });

    res.status(201).json(game);
  }),
);

// Update game
gamesRouter.put(
  '/:gameId',
  requireGameOwner,
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, coverImageUrl, config, status } = req.body;
    const game = await prisma.game.update({
      where: { id: req.params.gameId },
      data: {
        title,
        config,
        status,
        ...(description !== undefined ? { description: description || null } : {}),
        ...(coverImageUrl !== undefined ? { coverImageUrl: coverImageUrl || null } : {}),
      },
    });

    res.json(game);
  }),
);

// Delete game
gamesRouter.delete(
  '/:gameId',
  requireGameOwner,
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.game.delete({ where: { id: req.params.gameId } });
    res.json({ success: true });
  }),
);
