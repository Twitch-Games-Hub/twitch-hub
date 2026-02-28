import { Router } from 'express';
import { prisma } from '../db/client.js';
import { verifyToken } from '../auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { computeRatings } from '../utils/ratings.js';
import { parsePagination } from '../utils/pagination.js';
import type { Request, Response } from 'express';

export const exploreRouter = Router();

function extractUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const payload = verifyToken(authHeader.slice(7));
  return payload?.userId ?? null;
}

// List public READY games with ratings
exploreRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const { page, limit } = parsePagination(req.query as { page?: string; limit?: string });
    const type = req.query.type as string | undefined;
    const sort = req.query.sort as string | undefined;

    const where: Record<string, unknown> = { status: 'READY' };
    if (type) where.type = type;

    const isNewest = sort === 'newest';

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        include: {
          owner: { select: { displayName: true, profileImageUrl: true, twitchLogin: true } },
          ratings: true,
        },
        orderBy: isNewest ? { createdAt: 'desc' } : undefined,
        ...(isNewest ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
      prisma.game.count({ where }),
    ]);

    const results = games.map((game) => {
      const { ratingScore, ratingCount, userRating } = computeRatings(game.ratings, userId);

      return {
        id: game.id,
        type: game.type,
        title: game.title,
        coverImageUrl: game.coverImageUrl,
        config: game.config,
        status: game.status,
        createdAt: game.createdAt.toISOString(),
        owner: game.owner,
        ratingScore,
        ratingCount,
        userRating,
      };
    });

    if (!isNewest) {
      results.sort((a, b) => b.ratingScore - a.ratingScore);
    }

    const paginatedResults = isNewest ? results : results.slice((page - 1) * limit, page * limit);

    res.json({ games: paginatedResults, total, page, limit });
  }),
);

// Get single public game
exploreRouter.get(
  '/:gameId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);

    const game = await prisma.game.findFirst({
      where: { id: req.params.gameId, status: 'READY' },
      include: {
        owner: { select: { displayName: true, profileImageUrl: true, twitchLogin: true } },
        ratings: true,
      },
    });

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const { ratingScore, ratingCount, userRating } = computeRatings(game.ratings, userId);

    res.json({
      id: game.id,
      type: game.type,
      title: game.title,
      coverImageUrl: game.coverImageUrl,
      config: game.config,
      status: game.status,
      createdAt: game.createdAt.toISOString(),
      owner: game.owner,
      ratingScore,
      ratingCount,
      userRating,
    });
  }),
);

// Rate a game (upsert)
exploreRouter.post(
  '/:gameId/rate',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { value } = req.body;
    if (value !== 1 && value !== -1) {
      res.status(400).json({ error: 'Value must be 1 or -1' });
      return;
    }

    const game = await prisma.game.findFirst({
      where: { id: req.params.gameId, status: 'READY' },
    });

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (game.ownerId === userId) {
      res.status(403).json({ error: 'Cannot rate your own game' });
      return;
    }

    await prisma.gameRating.upsert({
      where: { gameId_userId: { gameId: req.params.gameId, userId } },
      create: { gameId: req.params.gameId, userId, value },
      update: { value },
    });

    const ratings = await prisma.gameRating.findMany({
      where: { gameId: req.params.gameId },
    });

    const { ratingScore, ratingCount } = computeRatings(ratings, userId);

    res.json({ ratingScore, ratingCount, userRating: value });
  }),
);

// Remove rating
exploreRouter.delete(
  '/:gameId/rate',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    await prisma.gameRating.deleteMany({
      where: { gameId: req.params.gameId, userId },
    });

    const ratings = await prisma.gameRating.findMany({
      where: { gameId: req.params.gameId },
    });

    const { ratingScore, ratingCount } = computeRatings(ratings, userId);

    res.json({ ratingScore, ratingCount, userRating: null });
  }),
);
