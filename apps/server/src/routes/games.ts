import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import { requireGameOwner } from '../middleware/requireGameOwner.js';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

export const gamesPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authMiddleware);

  // List user's games
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const games = await prisma.game.findMany({
      where: { ownerId: request.userId },
      orderBy: { updatedAt: 'desc' },
      include: { sessions: { select: { id: true, status: true } } },
    });
    return games;
  });

  // Get single game
  app.get<{ Params: { gameId: string } }>(
    '/:gameId',
    { preHandler: [requireGameOwner] },
    async (request, reply) => {
      const game = await prisma.game.findFirst({
        where: { id: request.params.gameId, ownerId: request.userId },
        include: { sessions: { orderBy: { createdAt: 'desc' } } },
      });
      if (!game) {
        reply.code(404);
        return { error: 'Game not found' };
      }
      return game;
    },
  );

  // Create game
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { type, title, description, coverImageUrl, config } = request.body as any;

    const game = await prisma.game.create({
      data: {
        ownerId: request.userId!,
        type,
        title,
        description: description || null,
        coverImageUrl: coverImageUrl || null,
        config: config || {},
        status: 'DRAFT',
      },
    });

    reply.code(201);
    return game;
  });

  // Update game
  app.put<{ Params: { gameId: string } }>(
    '/:gameId',
    { preHandler: [requireGameOwner] },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { title, description, coverImageUrl, config, status } = request.body as any;
      const game = await prisma.game.update({
        where: { id: request.params.gameId },
        data: {
          title,
          config,
          status,
          ...(description !== undefined ? { description: description || null } : {}),
          ...(coverImageUrl !== undefined ? { coverImageUrl: coverImageUrl || null } : {}),
        },
      });

      return game;
    },
  );

  // Delete game
  app.delete<{ Params: { gameId: string } }>(
    '/:gameId',
    { preHandler: [requireGameOwner] },
    async (request, reply) => {
      await prisma.game.delete({ where: { id: request.params.gameId } });
      return { success: true };
    },
  );
};
