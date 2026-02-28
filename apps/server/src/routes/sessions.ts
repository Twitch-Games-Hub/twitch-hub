import { Router } from 'express';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { parsePagination } from '../utils/pagination.js';
import type { Request, Response } from 'express';

export const sessionsRouter = Router();

sessionsRouter.use(authMiddleware);

// List user's sessions (paginated, filterable by status)
sessionsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as { page?: string; limit?: string });
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = { hostId: req.userId };
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

    res.json({ sessions: mapped, total, page, limit });
  }),
);

// Get session results (FinalResults from state column)
sessionsRouter.get(
  '/:sessionId/results',
  asyncHandler(async (req: Request, res: Response) => {
    const session = await prisma.gameSession.findFirst({
      where: { id: req.params.sessionId, hostId: req.userId },
      select: { status: true, state: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.status !== 'ENDED') {
      res.status(404).json({ error: 'Session has not ended' });
      return;
    }

    const results = session.state as Record<string, unknown> | null;
    if (!results || Object.keys(results).length === 0) {
      res.status(404).json({ error: 'No results available' });
      return;
    }

    res.json(results);
  }),
);

// Get a single session with full game data
sessionsRouter.get(
  '/:sessionId',
  asyncHandler(async (req: Request, res: Response) => {
    const session = await prisma.gameSession.findFirst({
      where: { id: req.params.sessionId, hostId: req.userId },
      include: {
        game: true,
        _count: { select: { responses: true } },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({
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
    });
  }),
);
