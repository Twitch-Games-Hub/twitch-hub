import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import { getFollowers } from '../twitch/api.js';
import { getValidAccessToken } from '../twitch/tokens.js';
import { createBulkSessionInvites } from '../services/NotificationService.js';
import { getUnreadCount } from '../services/NotificationService.js';
import { notificationBroadcaster } from '../socket/notificationBroadcaster.js';
import { logger } from '../logger.js';
import type { FastifyPluginAsync } from 'fastify';

const log = logger.child({ module: 'invites' });

export const invitesPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authMiddleware);

  // POST /:sessionId/invite — send invites to followers
  app.post<{ Params: { sessionId: string } }>('/:sessionId/invite', async (request, reply) => {
    const userId = request.userId!;
    const { sessionId } = request.params;
    const { followerTwitchIds } = request.body as { followerTwitchIds?: string[] };

    // Find the session
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { game: { select: { title: true, ownerId: true } } },
    });

    if (!session) {
      reply.code(404);
      return { error: 'Session not found' };
    }

    // Verify caller is host or authorized mod
    let isAuthorized = session.hostId === userId;
    if (!isAuthorized) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twitchId: true },
      });
      if (user) {
        const link = await prisma.moderatorLink.findFirst({
          where: { streamerId: session.hostId, modTwitchId: user.twitchId, enabled: true },
        });
        isAuthorized = !!link;
      }
    }

    if (!isAuthorized) {
      reply.code(403);
      return { error: 'Not authorized to send invites for this session' };
    }

    // Resolve follower twitchIds to app User records
    let targetTwitchIds = followerTwitchIds;

    if (!targetTwitchIds || targetTwitchIds.length === 0) {
      // If no specific followers provided, get all followers who are app users
      const tokens = await getValidAccessToken(session.hostId);
      if (!tokens) {
        reply.code(502);
        return { error: 'Failed to fetch followers from Twitch' };
      }

      const followersData = await getFollowers(tokens.twitchId, tokens.accessToken, 100);
      if (!followersData) {
        reply.code(502);
        return { error: 'Failed to fetch followers from Twitch' };
      }

      targetTwitchIds = followersData.data?.map((f: { user_id: string }) => f.user_id) ?? [];
    }

    if (targetTwitchIds.length === 0) {
      return { invited: 0, skipped: 0 };
    }

    // Find app users matching these twitch IDs (exclude the host themselves)
    const appUsers = await prisma.user.findMany({
      where: {
        twitchId: { in: targetTwitchIds },
        id: { not: session.hostId },
      },
      select: { id: true },
    });

    const recipientIds = appUsers.map((u) => u.id);
    const skipped = targetTwitchIds.length - recipientIds.length;

    if (recipientIds.length === 0) {
      return { invited: 0, skipped: targetTwitchIds.length };
    }

    // Create notifications
    const notifications = await createBulkSessionInvites(
      session.hostId,
      sessionId,
      session.game.title,
      recipientIds,
    );

    // Push real-time notifications
    for (let i = 0; i < notifications.length; i++) {
      const recipientId = recipientIds[i];
      notificationBroadcaster.notifyUser(recipientId, notifications[i]);
      const count = await getUnreadCount(recipientId);
      notificationBroadcaster.notifyUserCount(recipientId, count);
    }

    log.info({ sessionId, invited: recipientIds.length, skipped }, 'Session invites sent');

    return { invited: recipientIds.length, skipped };
  });

  // GET /:sessionId/invite-candidates — list followers who are app users
  app.get<{ Params: { sessionId: string } }>(
    '/:sessionId/invite-candidates',
    async (request, reply) => {
      const userId = request.userId!;
      const { sessionId } = request.params;

      // Find the session
      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        select: { hostId: true },
      });

      if (!session) {
        reply.code(404);
        return { error: 'Session not found' };
      }

      // Verify authorization
      let isAuthorized = session.hostId === userId;
      if (!isAuthorized) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { twitchId: true },
        });
        if (user) {
          const link = await prisma.moderatorLink.findFirst({
            where: { streamerId: session.hostId, modTwitchId: user.twitchId, enabled: true },
          });
          isAuthorized = !!link;
        }
      }

      if (!isAuthorized) {
        reply.code(403);
        return { error: 'Not authorized' };
      }

      // Get followers from Twitch
      const tokens = await getValidAccessToken(session.hostId);
      if (!tokens) {
        reply.code(502);
        return { error: 'Failed to authenticate with Twitch' };
      }

      const followersData = await getFollowers(tokens.twitchId, tokens.accessToken, 100);
      if (!followersData) {
        return { candidates: [] };
      }

      const followerTwitchIds: string[] =
        followersData.data?.map((f: { user_id: string }) => f.user_id) ?? [];

      if (followerTwitchIds.length === 0) {
        return { candidates: [] };
      }

      // Cross-reference with app users (exclude host)
      const appUsers = await prisma.user.findMany({
        where: {
          twitchId: { in: followerTwitchIds },
          id: { not: session.hostId },
        },
        select: {
          id: true,
          twitchId: true,
          twitchLogin: true,
          displayName: true,
          profileImageUrl: true,
        },
      });

      return {
        candidates: appUsers.map((u) => ({
          userId: u.id,
          twitchId: u.twitchId,
          twitchLogin: u.twitchLogin,
          displayName: u.displayName,
          profileImageUrl: u.profileImageUrl,
        })),
      };
    },
  );
};
