import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import { parsePagination } from '../utils/pagination.js';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

export const sessionsPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authMiddleware);

  // List user's sessions (paginated, filterable by status)
  // ?role=moderator returns sessions the user is authorized to control as a mod
  app.get('/', async (request: FastifyRequest, _reply: FastifyReply) => {
    const { page, limit, skip } = parsePagination(
      request.query as { page?: string; limit?: string },
    );
    const query = request.query as Record<string, string>;
    const status = query.status;
    const role = query.role;

    let where: Record<string, unknown>;

    if (role === 'moderator') {
      // Find sessions where this user is an enabled mod for the host
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { twitchId: true },
      });
      if (!user) {
        return { sessions: [], total: 0, page, limit };
      }

      const modLinks = await prisma.moderatorLink.findMany({
        where: { modTwitchId: user.twitchId, enabled: true },
        select: { streamerId: true },
      });
      const streamerIds = modLinks.map((l) => l.streamerId);

      if (streamerIds.length === 0) {
        return { sessions: [], total: 0, page, limit };
      }

      where = { hostId: { in: streamerIds } };
    } else {
      where = { hostId: request.userId };
    }

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

    const mapped = sessions.map((s: (typeof sessions)[number]) => ({
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

  // Helper: check if user is host or authorized mod for a session
  async function canAccessSession(sessionHostId: string, userId: string): Promise<boolean> {
    if (sessionHostId === userId) return true;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twitchId: true },
    });
    if (!user) return false;
    const link = await prisma.moderatorLink.findFirst({
      where: { streamerId: sessionHostId, modTwitchId: user.twitchId, enabled: true },
    });
    return !!link;
  }

  // Get session results (FinalResults from state column)
  app.get<{ Params: { sessionId: string } }>('/:sessionId/results', async (request, reply) => {
    const session = await prisma.gameSession.findUnique({
      where: { id: request.params.sessionId },
      select: { status: true, state: true, hostId: true },
    });

    if (!session || !(await canAccessSession(session.hostId, request.userId!))) {
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
    const session = await prisma.gameSession.findUnique({
      where: { id: request.params.sessionId },
      include: {
        game: true,
        _count: { select: { responses: true } },
      },
    });

    if (!session || !(await canAccessSession(session.hostId, request.userId!))) {
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
