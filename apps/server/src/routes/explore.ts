import { prisma } from '../db/client.js';
import { verifyToken } from '../auth.js';
import { computeRatings } from '../utils/ratings.js';
import { computeContentCount } from '../utils/contentCount.js';
import { parsePagination } from '../utils/pagination.js';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

export const explorePlugin: FastifyPluginAsync = async (app) => {
  function extractUserId(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const payload = verifyToken(authHeader.slice(7));
    return payload?.userId ?? null;
  }

  // List public READY games with ratings
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = extractUserId(request);
    const { page, limit } = parsePagination(request.query as { page?: string; limit?: string });
    const type = (request.query as Record<string, string>).type;
    const sort = (request.query as Record<string, string>).sort;

    const where: Record<string, unknown> = { status: 'READY' };
    if (type) where.type = type;

    const isNewest = sort === 'newest';

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        include: {
          owner: { select: { displayName: true, profileImageUrl: true, twitchLogin: true } },
          ratings: true,
          _count: { select: { sessions: true } },
          ...(userId ? { bookmarks: { where: { userId }, select: { id: true } } } : {}),
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
        description: game.description,
        coverImageUrl: game.coverImageUrl,
        config: game.config,
        status: game.status,
        createdAt: game.createdAt.toISOString(),
        owner: game.owner,
        ratingScore,
        ratingCount,
        userRating,
        isSaved: 'bookmarks' in game ? (game.bookmarks as unknown[]).length > 0 : false,
        playCount: game._count.sessions,
        contentCount: computeContentCount(game.type, game.config),
      };
    });

    if (!isNewest) {
      results.sort((a, b) => b.ratingScore - a.ratingScore);
    }

    const paginatedResults = isNewest ? results : results.slice((page - 1) * limit, page * limit);

    return { games: paginatedResults, total, page, limit };
  });

  // Get single public game
  app.get<{ Params: { gameId: string } }>('/:gameId', async (request, reply) => {
    const userId = extractUserId(request);

    const game = await prisma.game.findFirst({
      where: { id: request.params.gameId, status: 'READY' },
      include: {
        owner: { select: { displayName: true, profileImageUrl: true, twitchLogin: true } },
        ratings: true,
        _count: { select: { sessions: true } },
        ...(userId ? { bookmarks: { where: { userId }, select: { id: true } } } : {}),
      },
    });

    if (!game) {
      reply.code(404);
      return { error: 'Game not found' };
    }

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
      isSaved: 'bookmarks' in game ? (game.bookmarks as unknown[]).length > 0 : false,
      playCount: game._count.sessions,
      contentCount: computeContentCount(game.type, game.config),
    };
  });

  // Rate a game (upsert)
  app.post<{ Params: { gameId: string } }>('/:gameId/rate', async (request, reply) => {
    const userId = extractUserId(request);
    if (!userId) {
      reply.code(401);
      return { error: 'Authentication required' };
    }

    const { value } = request.body as { value: number };
    if (value !== 1 && value !== -1) {
      reply.code(400);
      return { error: 'Value must be 1 or -1' };
    }

    const game = await prisma.game.findFirst({
      where: { id: request.params.gameId, status: 'READY' },
    });

    if (!game) {
      reply.code(404);
      return { error: 'Game not found' };
    }

    if (game.ownerId === userId) {
      reply.code(403);
      return { error: 'Cannot rate your own game' };
    }

    await prisma.gameRating.upsert({
      where: { gameId_userId: { gameId: request.params.gameId, userId } },
      create: { gameId: request.params.gameId, userId, value },
      update: { value },
    });

    const ratings = await prisma.gameRating.findMany({
      where: { gameId: request.params.gameId },
    });

    const { ratingScore, ratingCount } = computeRatings(ratings, userId);

    return { ratingScore, ratingCount, userRating: value };
  });

  // Remove rating
  app.delete<{ Params: { gameId: string } }>('/:gameId/rate', async (request, reply) => {
    const userId = extractUserId(request);
    if (!userId) {
      reply.code(401);
      return { error: 'Authentication required' };
    }

    await prisma.gameRating.deleteMany({
      where: { gameId: request.params.gameId, userId },
    });

    const ratings = await prisma.gameRating.findMany({
      where: { gameId: request.params.gameId },
    });

    const { ratingScore, ratingCount } = computeRatings(ratings, userId);

    return { ratingScore, ratingCount, userRating: null };
  });

  // Save (bookmark) a game
  app.post<{ Params: { gameId: string } }>('/:gameId/save', async (request, reply) => {
    const userId = extractUserId(request);
    if (!userId) {
      reply.code(401);
      return { error: 'Authentication required' };
    }

    const game = await prisma.game.findFirst({
      where: { id: request.params.gameId, status: 'READY' },
    });

    if (!game) {
      reply.code(404);
      return { error: 'Game not found' };
    }

    if (game.ownerId === userId) {
      reply.code(403);
      return { error: 'Cannot save your own game' };
    }

    await prisma.gameBookmark.upsert({
      where: { gameId_userId: { gameId: request.params.gameId, userId } },
      create: { gameId: request.params.gameId, userId },
      update: {},
    });

    return { isSaved: true };
  });

  // Unsave (remove bookmark) a game
  app.delete<{ Params: { gameId: string } }>('/:gameId/save', async (request, reply) => {
    const userId = extractUserId(request);
    if (!userId) {
      reply.code(401);
      return { error: 'Authentication required' };
    }

    await prisma.gameBookmark.deleteMany({
      where: { gameId: request.params.gameId, userId },
    });

    return { isSaved: false };
  });
};
