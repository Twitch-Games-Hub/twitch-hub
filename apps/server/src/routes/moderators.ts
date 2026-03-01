import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import { getModerators } from '../twitch/api.js';
import { getValidAccessToken } from '../twitch/tokens.js';
import { logger } from '../logger.js';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { ApiModeratorLink } from '@twitch-hub/shared-types';

const log = logger.child({ module: 'moderators' });

// Track last sync time per streamer to avoid excessive API calls
const lastSyncMap = new Map<string, number>();
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

async function syncModeratorsFromTwitch(userId: string): Promise<ApiModeratorLink[] | null> {
  const tokens = await getValidAccessToken(userId);
  if (!tokens) return null;

  const result = await getModerators(tokens.twitchId, tokens.accessToken);
  if (!result) return null;

  const twitchMods: Array<{ user_id: string; user_login: string; user_name: string }> =
    result.data ?? [];

  // Upsert each mod
  for (const mod of twitchMods) {
    await prisma.moderatorLink.upsert({
      where: {
        streamerId_modTwitchId: { streamerId: userId, modTwitchId: mod.user_id },
      },
      create: {
        streamerId: userId,
        modTwitchId: mod.user_id,
        modLogin: mod.user_login,
        modDisplayName: mod.user_name,
      },
      update: {
        modLogin: mod.user_login,
        modDisplayName: mod.user_name,
      },
    });
  }

  // Remove mods no longer on Twitch's list (but keep disabled ones for history)
  const twitchModIds = twitchMods.map((m) => m.user_id);
  if (twitchModIds.length > 0) {
    await prisma.moderatorLink.deleteMany({
      where: {
        streamerId: userId,
        modTwitchId: { notIn: twitchModIds },
      },
    });
  }

  lastSyncMap.set(userId, Date.now());
  log.info({ userId, modCount: twitchMods.length }, 'Synced moderators from Twitch');

  return getModLinks(userId);
}

async function getModLinks(userId: string): Promise<ApiModeratorLink[]> {
  const links = await prisma.moderatorLink.findMany({
    where: { streamerId: userId },
    orderBy: { modDisplayName: 'asc' },
  });

  return links.map((l) => ({
    id: l.id,
    streamerId: l.streamerId,
    modTwitchId: l.modTwitchId,
    modLogin: l.modLogin,
    modDisplayName: l.modDisplayName,
    enabled: l.enabled,
  }));
}

export const moderatorsPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authMiddleware);

  // GET / — list streamer's mod links (auto-sync if stale)
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!;
    const lastSync = lastSyncMap.get(userId) ?? 0;
    const isStale = Date.now() - lastSync > SYNC_COOLDOWN_MS;

    if (isStale) {
      const synced = await syncModeratorsFromTwitch(userId);
      if (synced) return { moderators: synced };
      // If sync fails (e.g. missing scope), return existing data
    }

    const moderators = await getModLinks(userId);
    return { moderators };
  });

  // POST /sync — force re-sync from Twitch API
  app.post('/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!;
    const synced = await syncModeratorsFromTwitch(userId);

    if (!synced) {
      reply.code(502);
      return {
        error:
          'Failed to sync moderators from Twitch. You may need to re-authorize with the moderation:read scope.',
      };
    }

    return { moderators: synced };
  });

  // PUT /:modTwitchId — toggle mod enabled/disabled
  app.put<{ Params: { modTwitchId: string } }>('/:modTwitchId', async (request, reply) => {
    const userId = request.userId!;
    const { modTwitchId } = request.params;
    const { enabled } = request.body as { enabled: boolean };

    const link = await prisma.moderatorLink.findUnique({
      where: { streamerId_modTwitchId: { streamerId: userId, modTwitchId } },
    });

    if (!link) {
      reply.code(404);
      return { error: 'Moderator not found' };
    }

    const updated = await prisma.moderatorLink.update({
      where: { id: link.id },
      data: { enabled },
    });

    return {
      id: updated.id,
      streamerId: updated.streamerId,
      modTwitchId: updated.modTwitchId,
      modLogin: updated.modLogin,
      modDisplayName: updated.modDisplayName,
      enabled: updated.enabled,
    };
  });

  // GET /streamers — for mods: list streamers they moderate for
  app.get('/streamers', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!;

    // Get the current user's twitchId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twitchId: true },
    });

    if (!user) {
      reply.code(404);
      return { error: 'User not found' };
    }

    const links = await prisma.moderatorLink.findMany({
      where: { modTwitchId: user.twitchId, enabled: true },
      include: {
        streamer: {
          select: { id: true, displayName: true, profileImageUrl: true, twitchLogin: true },
        },
      },
    });

    return {
      streamers: links.map((l) => ({
        streamerId: l.streamer.id,
        displayName: l.streamer.displayName,
        profileImageUrl: l.streamer.profileImageUrl,
        twitchLogin: l.streamer.twitchLogin,
      })),
    };
  });

  // GET /streamers/:streamerId/games — for mods: get streamer's READY games
  app.get<{ Params: { streamerId: string } }>(
    '/streamers/:streamerId/games',
    async (request, reply) => {
      const userId = request.userId!;
      const { streamerId } = request.params;

      // Verify mod authorization
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twitchId: true },
      });

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      const link = await prisma.moderatorLink.findFirst({
        where: { streamerId, modTwitchId: user.twitchId, enabled: true },
      });

      if (!link) {
        reply.code(403);
        return { error: 'Not authorized as moderator for this streamer' };
      }

      const games = await prisma.game.findMany({
        where: { ownerId: streamerId, status: 'READY' },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          coverImageUrl: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        games: games.map((g) => ({
          ...g,
          createdAt: g.createdAt.toISOString(),
        })),
      };
    },
  );
};
