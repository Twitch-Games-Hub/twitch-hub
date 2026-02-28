import { Router } from 'express';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { computeRatings } from '../utils/ratings.js';
import { computeContentCount } from '../utils/contentCount.js';
import { parsePagination } from '../utils/pagination.js';
import type { Request, Response } from 'express';

export const bookmarksRouter = Router();

bookmarksRouter.use(authMiddleware);

// List saved games for the authenticated user
bookmarksRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { page, limit, skip } = parsePagination(req.query as { page?: string; limit?: string });

    const where = { userId, game: { status: 'READY' as const } };

    const [bookmarks, total] = await Promise.all([
      prisma.gameBookmark.findMany({
        where,
        include: {
          game: {
            include: {
              owner: { select: { displayName: true, profileImageUrl: true, twitchLogin: true } },
              ratings: true,
              _count: { select: { sessions: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.gameBookmark.count({ where }),
    ]);

    const games = bookmarks.map(({ game }) => {
      const { ratingScore, ratingCount, userRating } = computeRatings(game.ratings, userId);

      return {
        id: game.id,
        type: game.type,
        title: game.title,
        description: game.description,
        coverImageUrl: game.coverImageUrl,
        config: game.config,
        status: game.status,
        createdAt: game.createdAt.toISOString(),
        owner: game.owner,
        ratingScore,
        ratingCount,
        userRating,
        isSaved: true,
        playCount: game._count.sessions,
        contentCount: computeContentCount(game.type, game.config),
      };
    });

    res.json({ games, total, page, limit });
  }),
);
