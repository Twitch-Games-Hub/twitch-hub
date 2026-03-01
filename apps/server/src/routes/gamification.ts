import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { xpForLevel } from '@twitch-hub/shared-types';

export const gamificationPlugin: FastifyPluginAsync = async (app) => {
  // Own profile (auth required)
  app.get(
    '/profile',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.userId! },
        select: { twitchLogin: true },
      });

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      const profile = await prisma.playerProfile.findFirst({
        where: {
          OR: [{ userId: request.userId! }, { twitchLogin: user.twitchLogin }],
        },
        include: {
          achievements: {
            include: { achievement: true },
            orderBy: { earnedAt: 'desc' },
          },
          channelStats: {
            orderBy: { channelXp: 'desc' },
          },
        },
      });

      if (!profile) {
        // Return empty profile
        return {
          totalXp: 0,
          level: 1,
          xpToNextLevel: xpForLevel(2),
          xpInCurrentLevel: 0,
          totalSessions: 0,
          totalResponses: 0,
          correctAnswers: 0,
          bestStreak: 0,
          achievements: [],
          channelStats: [],
        };
      }

      const nextLevel = Math.min(profile.level + 1, 50);
      const currentLevelXp = xpForLevel(profile.level);
      const nextLevelXp = xpForLevel(nextLevel);

      return {
        totalXp: profile.totalXp,
        level: profile.level,
        xpToNextLevel: nextLevelXp,
        xpInCurrentLevel: profile.totalXp - currentLevelXp,
        xpNeededForNext: nextLevelXp - currentLevelXp,
        totalSessions: profile.totalSessions,
        totalResponses: profile.totalResponses,
        correctAnswers: profile.correctAnswers,
        bestStreak: profile.bestStreak,
        achievements: profile.achievements.map((pa) => ({
          id: pa.achievementId,
          name: pa.achievement.name,
          description: pa.achievement.description,
          category: pa.achievement.category,
          iconUrl: pa.achievement.iconUrl,
          earnedAt: pa.earnedAt.toISOString(),
        })),
        channelStats: profile.channelStats.map((cs) => ({
          channelId: cs.channelId,
          channelXp: cs.channelXp,
          loyaltyTier: cs.loyaltyTier,
          sessionsPlayed: cs.sessionsPlayed,
          currentStreak: cs.currentStreak,
          bestStreak: cs.bestStreak,
          lastPlayedAt: cs.lastPlayedAt?.toISOString() ?? null,
        })),
      };
    },
  );

  // Public profile by twitchLogin
  app.get<{ Params: { twitchLogin: string } }>('/profile/:twitchLogin', async (request, reply) => {
    const { twitchLogin } = request.params;

    const profile = await prisma.playerProfile.findUnique({
      where: { twitchLogin },
      include: {
        achievements: {
          include: { achievement: true },
          orderBy: { earnedAt: 'desc' },
        },
        channelStats: {
          orderBy: { channelXp: 'desc' },
          take: 10,
        },
        user: {
          select: {
            displayName: true,
            profileImageUrl: true,
            twitchLogin: true,
          },
        },
      },
    });

    if (!profile) {
      reply.code(404);
      return { error: 'Profile not found' };
    }

    const nextLevel = Math.min(profile.level + 1, 50);
    const currentLevelXp = xpForLevel(profile.level);
    const nextLevelXp = xpForLevel(nextLevel);

    return {
      twitchLogin: profile.twitchLogin,
      displayName: profile.user?.displayName ?? profile.twitchLogin,
      profileImageUrl: profile.user?.profileImageUrl ?? null,
      totalXp: profile.totalXp,
      level: profile.level,
      xpToNextLevel: nextLevelXp,
      xpInCurrentLevel: profile.totalXp - currentLevelXp,
      xpNeededForNext: nextLevelXp - currentLevelXp,
      totalSessions: profile.totalSessions,
      totalResponses: profile.totalResponses,
      correctAnswers: profile.correctAnswers,
      bestStreak: profile.bestStreak,
      achievements: profile.achievements
        .filter((pa) => !pa.achievement.hidden || true) // Show all earned, even if hidden
        .map((pa) => ({
          id: pa.achievementId,
          name: pa.achievement.name,
          description: pa.achievement.description,
          category: pa.achievement.category,
          iconUrl: pa.achievement.iconUrl,
          earnedAt: pa.earnedAt.toISOString(),
        })),
      channelStats: profile.channelStats.map((cs) => ({
        channelId: cs.channelId,
        channelXp: cs.channelXp,
        loyaltyTier: cs.loyaltyTier,
        sessionsPlayed: cs.sessionsPlayed,
      })),
    };
  });

  // All achievement definitions
  app.get('/achievements', async () => {
    const definitions = await prisma.achievementDefinition.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return definitions.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      category: d.category,
      iconUrl: d.iconUrl,
      xpReward: d.xpReward,
      hidden: d.hidden,
      sortOrder: d.sortOrder,
    }));
  });

  // Channel loyalty leaderboard
  app.get<{ Params: { channelId: string }; Querystring: { limit?: string } }>(
    '/channel/:channelId/leaderboard',
    async (request, reply) => {
      const { channelId } = request.params;
      const limit = Math.min(parseInt(request.query.limit || '20', 10), 100);

      const stats = await prisma.channelPlayerStats.findMany({
        where: { channelId },
        orderBy: { channelXp: 'desc' },
        take: limit,
        include: {
          playerProfile: {
            select: {
              twitchLogin: true,
              level: true,
              user: {
                select: { displayName: true, profileImageUrl: true },
              },
            },
          },
        },
      });

      return stats.map((s) => ({
        playerProfileId: s.playerProfileId,
        twitchLogin: s.playerProfile.twitchLogin,
        displayName: s.playerProfile.user?.displayName ?? s.playerProfile.twitchLogin,
        profileImageUrl: s.playerProfile.user?.profileImageUrl ?? null,
        channelXp: s.channelXp,
        loyaltyTier: s.loyaltyTier,
        sessionsPlayed: s.sessionsPlayed,
        level: s.playerProfile.level,
      }));
    },
  );
};
