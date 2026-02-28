import { prisma } from '../db/client.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requireGameOwner(
  request: FastifyRequest<{ Params: { gameId: string } }>,
  reply: FastifyReply,
) {
  const gameId = request.params.gameId;
  if (!gameId) {
    reply.code(400).send({ error: 'Missing gameId' });
    return;
  }

  const game = await prisma.game.findFirst({ where: { id: gameId, ownerId: request.userId } });
  if (!game) {
    reply.code(404).send({ error: 'Game not found' });
    return;
  }
  request.game = game;
}
