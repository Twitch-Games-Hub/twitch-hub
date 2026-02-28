import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import { parsePagination } from '../utils/pagination.js';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

export const sessionsPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authMiddleware);

  // List user's sessions (paginated, filterable by status)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page, limit, skip } = parsePagination(
      request.query as { page?: string; limit?: string },
    );
    const status = (request.query as Record<string, string>).status;

    const where: Record<string, unknown> = { hostId: request.userId };
    if (status && ['LOBBY', 'LIVE', 'ENDED'].includes(status)) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      prisma.gameSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          game: { select: { title: true, type: true } },
          _count: { select: { responses: true } },
        },
      }),
      prisma.gameSession.count({ where }),
    ]);

    const mapped = sessions.map((s) => ({
      id: s.id,
      gameId: s.gameId,
      hostId: s.hostId,
      channelId: s.channelId,
      status: s.status,
      currentRound: s.currentRound,
      startedAt: s.startedAt?.toISOString() ?? null,
      endedAt: s.endedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      game: { title: s.game.title, type: s.game.type },
      responseCount: s._count.responses,
    }));

    return { sessions: mapped, total, page, limit };
  });

  // Get session results (FinalResults from state column)
  app.get<{ Params: { sessionId: string } }>('/:sessionId/results', async (request, reply) => {
    const session = await prisma.gameSession.findFirst({
      where: { id: request.params.sessionId, hostId: request.userId },
      select: { status: true, state: true },
    });

    if (!session) {
      reply.code(404);
      return { error: 'Session not found' };
    }

    if (session.status !== 'ENDED') {
      reply.code(404);
      return { error: 'Session has not ended' };
    }

    const results = session.state as Record<string, unknown> | null;
    if (!results || Object.keys(results).length === 0) {
      reply.code(404);
      return { error: 'No results available' };
    }

    return results;
  });

  // Get a single session with full game data
  app.get<{ Params: { sessionId: string } }>('/:sessionId', async (request, reply) => {
    const session = await prisma.gameSession.findFirst({
      where: { id: request.params.sessionId, hostId: request.userId },
      include: {
        game: true,
        _count: { select: { responses: true } },
      },
    });

    if (!session) {
      reply.code(404);
      return { error: 'Session not found' };
    }

    return {
      id: session.id,
      gameId: session.gameId,
      hostId: session.hostId,
      channelId: session.channelId,
      status: session.status,
      currentRound: session.currentRound,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      game: {
        id: session.game.id,
        type: session.game.type,
        title: session.game.title,
        description: session.game.description ?? undefined,
        coverImageUrl: session.game.coverImageUrl ?? undefined,
        config: session.game.config,
        status: session.game.status,
        createdAt: session.game.createdAt.toISOString(),
      },
      responseCount: session._count.responses,
    };
  });
};
