import {
  XP_AWARDS,
  computeLevel,
  computeLoyaltyTier,
  getStreakMultiplier,
  type GamificationEvent,
  type LeaderboardEntry,
} from '@twitch-hub/shared-types';
import { redis } from '../db/redis.js';
import { prisma } from '../db/client.js';
import { logger } from '../logger.js';
import { REDIS_VOTE_TTL_SEC } from '../engine/GameEngine.js';
import { checkAchievements, type AchievementContext } from './AchievementChecker.js';

const log = logger.child({ module: 'gamification' });

// Redis key helpers
function xpKey(sessionId: string, playerId: string) {
  return `session:${sessionId}:xp:${playerId}`;
}
function streakKey(sessionId: string, playerId: string) {
  return `session:${sessionId}:streak:${playerId}`;
}
function firstRespondersKey(sessionId: string, round: number) {
  return `session:${sessionId}:round:${round}:first`;
}
function _completionsKey(sessionId: string) {
  return `session:${sessionId}:completions`;
}
function roundParticipantsKey(sessionId: string, round: number) {
  return `session:${sessionId}:round:${round}:participants`;
}
function leaderboardKey(sessionId: string) {
  return `session:${sessionId}:xp-leaderboard`;
}

export class GamificationService {
  private broadcastCallback?: (sessionId: string, event: string, data: unknown) => void;

  setBroadcastCallback(cb: (sessionId: string, event: string, data: unknown) => void) {
    this.broadcastCallback = cb;
  }

  /**
   * Find or create a PlayerProfile by userId or twitchLogin.
   */
  async resolveProfile(userId?: string | null, twitchLogin?: string | null): Promise<string> {
    // Try by userId first
    if (userId) {
      const existing = await prisma.playerProfile.findUnique({ where: { userId } });
      if (existing) return existing.id;
    }

    // Try by twitchLogin
    if (twitchLogin) {
      const existing = await prisma.playerProfile.findUnique({ where: { twitchLogin } });
      if (existing) {
        // Link userId if not yet linked
        if (userId && !existing.userId) {
          await prisma.playerProfile.update({
            where: { id: existing.id },
            data: { userId },
          });
        }
        return existing.id;
      }
    }

    // Create new profile
    const profile = await prisma.playerProfile.create({
      data: {
        userId: userId || null,
        twitchLogin: twitchLogin || null,
      },
    });
    return profile.id;
  }

  /**
   * Record that a player participated in a round (Redis accumulator).
   */
  async recordParticipation(sessionId: string, playerId: string, round: number): Promise<void> {
    const key = xpKey(sessionId, playerId);
    await redis.hincrby(key, 'ROUND_RESPONSE', XP_AWARDS.ROUND_RESPONSE);
    await redis.zincrby(leaderboardKey(sessionId), XP_AWARDS.ROUND_RESPONSE, playerId);
    await redis.expire(key, REDIS_VOTE_TTL_SEC);
    await redis.expire(leaderboardKey(sessionId), REDIS_VOTE_TTL_SEC);

    // Track round participants for session completion detection
    await redis.sadd(roundParticipantsKey(sessionId, round), playerId);
    await redis.expire(roundParticipantsKey(sessionId, round), REDIS_VOTE_TTL_SEC);
  }

  /**
   * Record a correct answer with speed bonus and streak tracking (BlindTest).
   */
  async recordCorrectAnswer(
    sessionId: string,
    playerId: string,
    answerTimeMs: number,
    windowMs: number,
  ): Promise<void> {
    const key = xpKey(sessionId, playerId);

    // Correct answer XP
    await redis.hincrby(key, 'CORRECT_ANSWER', XP_AWARDS.CORRECT_ANSWER);
    await redis.zincrby(leaderboardKey(sessionId), XP_AWARDS.CORRECT_ANSWER, playerId);

    // Speed bonus
    const ratio = answerTimeMs / windowMs;
    if (ratio < 0.33) {
      await redis.hincrby(key, 'SPEED_BONUS', XP_AWARDS.SPEED_BONUS_FAST);
      await redis.zincrby(leaderboardKey(sessionId), XP_AWARDS.SPEED_BONUS_FAST, playerId);
    } else if (ratio < 0.5) {
      await redis.hincrby(key, 'SPEED_BONUS', XP_AWARDS.SPEED_BONUS_MEDIUM);
      await redis.zincrby(leaderboardKey(sessionId), XP_AWARDS.SPEED_BONUS_MEDIUM, playerId);
    }

    await redis.expire(key, REDIS_VOTE_TTL_SEC);
    await redis.expire(leaderboardKey(sessionId), REDIS_VOTE_TTL_SEC);

    // Streak tracking
    const sKey = streakKey(sessionId, playerId);
    const newStreak = await redis.incr(sKey);
    await redis.expire(sKey, REDIS_VOTE_TTL_SEC);

    // Streak multiplier bonus (2x at streak 3, 3x at streak 5)
    const multiplier = getStreakMultiplier(newStreak);
    if (multiplier > 1) {
      const bonusXp = XP_AWARDS.CORRECT_ANSWER * (multiplier - 1);
      await redis.hincrby(key, 'STREAK_BONUS', bonusXp);
      await redis.zincrby(leaderboardKey(sessionId), bonusXp, playerId);
    }

    // Broadcast streak milestones
    if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
      this.broadcastCallback?.(sessionId, 'gamification:event', {
        type: 'streak',
        playerId,
        displayName: playerId,
        data: { streakType: 'answer', count: newStreak, multiplier },
      } satisfies GamificationEvent);
    }
  }

  /**
   * Reset streak on wrong answer.
   */
  async resetStreak(sessionId: string, playerId: string): Promise<void> {
    const sKey = streakKey(sessionId, playerId);
    await redis.set(sKey, '0');
    await redis.expire(sKey, REDIS_VOTE_TTL_SEC);
  }

  /**
   * Track first responders for a round (first 5 get bonus).
   */
  async recordFirstResponder(sessionId: string, round: number, playerId: string): Promise<void> {
    const key = firstRespondersKey(sessionId, round);
    const count = await redis.zcard(key);
    if (count < 5) {
      await redis.zadd(key, Date.now(), playerId);
      await redis.expire(key, REDIS_VOTE_TTL_SEC);

      // Award first responder XP
      const xpK = xpKey(sessionId, playerId);
      await redis.hincrby(xpK, 'FIRST_RESPONDER', XP_AWARDS.FIRST_RESPONDER);
      await redis.zincrby(leaderboardKey(sessionId), XP_AWARDS.FIRST_RESPONDER, playerId);
      await redis.expire(xpK, REDIS_VOTE_TTL_SEC);
      await redis.expire(leaderboardKey(sessionId), REDIS_VOTE_TTL_SEC);
    }
  }

  /**
   * Award majority voter XP to players who voted with the winning side.
   */
  async recordMajorityVoters(sessionId: string, playerIds: string[]): Promise<void> {
    const pipeline = redis.pipeline();
    for (const playerId of playerIds) {
      const key = xpKey(sessionId, playerId);
      pipeline.hincrby(key, 'MAJORITY_VOTER', XP_AWARDS.MAJORITY_VOTER);
      pipeline.expire(key, REDIS_VOTE_TTL_SEC);
      pipeline.zincrby(leaderboardKey(sessionId), XP_AWARDS.MAJORITY_VOTER, playerId);
    }
    pipeline.expire(leaderboardKey(sessionId), REDIS_VOTE_TTL_SEC);
    await pipeline.exec();
  }

  /**
   * Get top-N players by session XP from the sorted set.
   */
  async getSessionLeaderboard(sessionId: string, topN = 10): Promise<LeaderboardEntry[]> {
    const raw = await redis.zrevrange(leaderboardKey(sessionId), 0, topN - 1, 'WITHSCORES');
    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({ rank: entries.length + 1, playerId: raw[i], xp: parseInt(raw[i + 1], 10) });
    }
    return entries;
  }

  /**
   * Finalize session: read Redis accumulators, write to Postgres, award achievements.
   * Fire-and-forget — caller should not await.
   */
  async finalizeSession(
    sessionId: string,
    channelId: string,
    participantIds: string[],
    totalRounds: number,
  ): Promise<void> {
    try {
      // Determine who completed all rounds (responded in every round)
      const completionPlayerIds = await this.getSessionCompleters(
        sessionId,
        participantIds,
        totalRounds,
      );

      // Read all XP accumulators from Redis
      const playerXpData = new Map<string, Record<string, number>>();
      const playerStreaks = new Map<string, number>();

      for (const playerId of participantIds) {
        const key = xpKey(sessionId, playerId);
        const data = await redis.hgetall(key);
        if (Object.keys(data).length > 0) {
          const parsed: Record<string, number> = {};
          for (const [reason, amount] of Object.entries(data)) {
            parsed[reason] = parseInt(amount, 10);
          }
          playerXpData.set(playerId, parsed);
        }

        // Read streak
        const sKey = streakKey(sessionId, playerId);
        const streak = await redis.get(sKey);
        if (streak) {
          playerStreaks.set(playerId, parseInt(streak, 10));
        }
      }

      // Add participation + session completion bonuses
      for (const playerId of participantIds) {
        const data = playerXpData.get(playerId) ?? {};
        data['PARTICIPATION'] = (data['PARTICIPATION'] ?? 0) + XP_AWARDS.PARTICIPATION;
        if (completionPlayerIds.has(playerId)) {
          data['SESSION_COMPLETION'] =
            (data['SESSION_COMPLETION'] ?? 0) + XP_AWARDS.SESSION_COMPLETION;
        }
        playerXpData.set(playerId, data);
      }

      // Write to Postgres in a transaction
      await prisma.$transaction(async (tx) => {
        for (const [playerId, xpData] of playerXpData) {
          const totalSessionXp = Object.values(xpData).reduce((sum, v) => sum + v, 0);
          if (totalSessionXp <= 0) continue;

          // Resolve or create profile
          const profileId = await this.resolveProfileInTx(tx, playerId);

          // Create XP transactions
          const txRecords = Object.entries(xpData)
            .filter(([, amount]) => amount > 0)
            .map(([reason, amount]) => ({
              playerProfileId: profileId,
              sessionId,
              channelId,
              amount,
              reason: reason as
                | 'PARTICIPATION'
                | 'ROUND_RESPONSE'
                | 'CORRECT_ANSWER'
                | 'SPEED_BONUS'
                | 'STREAK_BONUS'
                | 'MAJORITY_VOTER'
                | 'SESSION_COMPLETION'
                | 'FIRST_RESPONDER',
            }));

          if (txRecords.length > 0) {
            await tx.xpTransaction.createMany({ data: txRecords });
          }

          // Update profile aggregates
          const sessionStreak = playerStreaks.get(playerId) ?? 0;
          const correctAnswers = xpData['CORRECT_ANSWER']
            ? Math.floor(xpData['CORRECT_ANSWER'] / XP_AWARDS.CORRECT_ANSWER)
            : 0;
          const roundResponses = xpData['ROUND_RESPONSE']
            ? Math.floor(xpData['ROUND_RESPONSE'] / XP_AWARDS.ROUND_RESPONSE)
            : 0;

          const profile = await tx.playerProfile.update({
            where: { id: profileId },
            data: {
              totalXp: { increment: totalSessionXp },
              totalSessions: { increment: 1 },
              totalResponses: { increment: roundResponses },
              correctAnswers: { increment: correctAnswers },
              bestStreak:
                sessionStreak > 0
                  ? {
                      set: Math.max(
                        sessionStreak,
                        (await tx.playerProfile.findUnique({
                          where: { id: profileId },
                          select: { bestStreak: true },
                        }))!.bestStreak,
                      ),
                    }
                  : undefined,
            },
          });

          // Update level
          const newLevel = computeLevel(profile.totalXp);
          if (newLevel !== profile.level) {
            await tx.playerProfile.update({
              where: { id: profileId },
              data: { level: newLevel },
            });

            // Broadcast level-up event
            this.broadcastCallback?.(sessionId, 'gamification:event', {
              type: 'level_up',
              playerId,
              displayName: playerId,
              data: { newLevel },
            } satisfies GamificationEvent);
          }

          // Update channel stats
          await tx.channelPlayerStats.upsert({
            where: {
              playerProfileId_channelId: { playerProfileId: profileId, channelId },
            },
            create: {
              playerProfileId: profileId,
              channelId,
              channelXp: totalSessionXp,
              sessionsPlayed: 1,
              currentStreak: 1,
              bestStreak: 1,
              lastPlayedAt: new Date(),
              loyaltyTier: computeLoyaltyTier(totalSessionXp),
            },
            update: {
              channelXp: { increment: totalSessionXp },
              sessionsPlayed: { increment: 1 },
              currentStreak: { increment: 1 },
              lastPlayedAt: new Date(),
            },
          });

          // Update channel loyalty tier
          const channelStats = await tx.channelPlayerStats.findUnique({
            where: {
              playerProfileId_channelId: { playerProfileId: profileId, channelId },
            },
          });
          if (channelStats) {
            const newTier = computeLoyaltyTier(channelStats.channelXp);
            if (newTier !== channelStats.loyaltyTier) {
              await tx.channelPlayerStats.update({
                where: { id: channelStats.id },
                data: { loyaltyTier: newTier },
              });
            }
            // Update best streak
            if (channelStats.currentStreak > channelStats.bestStreak) {
              await tx.channelPlayerStats.update({
                where: { id: channelStats.id },
                data: { bestStreak: channelStats.currentStreak },
              });
            }
          }

          // Check achievements
          const updatedProfile = await tx.playerProfile.findUnique({
            where: { id: profileId },
            include: {
              achievements: { select: { achievementId: true } },
              channelStats: true,
            },
          });
          if (updatedProfile) {
            const earnedIds = new Set(updatedProfile.achievements.map((a) => a.achievementId));
            const ctx: AchievementContext = {
              profile: updatedProfile,
              sessionBestStreak: sessionStreak,
              sessionCorrectAnswers: correctAnswers,
              sessionTotalRounds: totalRounds,
              sessionSpeedBonuses: xpData['SPEED_BONUS']
                ? Math.floor(
                    xpData['SPEED_BONUS'] /
                      Math.min(XP_AWARDS.SPEED_BONUS_MEDIUM, XP_AWARDS.SPEED_BONUS_FAST),
                  )
                : 0,
              sessionParticipantCount: participantIds.length,
              uniqueChannelCount: updatedProfile.channelStats.length,
              sessionHour: new Date().getHours(),
            };

            const newAchievements = checkAchievements(ctx, earnedIds);
            for (const achievementId of newAchievements) {
              await tx.playerAchievement.create({
                data: {
                  playerProfileId: profileId,
                  achievementId,
                  sessionId,
                },
              });

              // Award achievement XP bonus
              const def = await tx.achievementDefinition.findUnique({
                where: { id: achievementId },
              });
              if (def && def.xpReward > 0) {
                await tx.playerProfile.update({
                  where: { id: profileId },
                  data: { totalXp: { increment: def.xpReward } },
                });
                await tx.xpTransaction.create({
                  data: {
                    playerProfileId: profileId,
                    sessionId,
                    channelId,
                    amount: def.xpReward,
                    reason: 'PARTICIPATION', // Achievement bonus tracked as participation
                  },
                });
              }

              // Broadcast achievement event
              this.broadcastCallback?.(sessionId, 'gamification:event', {
                type: 'achievement',
                playerId,
                displayName: playerId,
                data: { achievementId, name: def?.name ?? achievementId },
              } satisfies GamificationEvent);
            }
          }
        }
      });

      log.info(
        { sessionId, participants: participantIds.length },
        'Session gamification finalized',
      );
    } catch (err) {
      log.error({ err, sessionId }, 'Failed to finalize gamification');
    }
  }

  /**
   * Resolve profile inside a transaction context.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async resolveProfileInTx(tx: any, playerId: string): Promise<string> {
    // Try by userId
    let profile = await tx.playerProfile.findUnique({ where: { userId: playerId } });
    if (profile) return profile.id;

    // Try by twitchLogin
    profile = await tx.playerProfile.findUnique({ where: { twitchLogin: playerId } });
    if (profile) return profile.id;

    // Check if playerId looks like a user ID (cuid) or twitchLogin
    const isUserId = playerId.length > 20; // cuids are ~25 chars
    profile = await tx.playerProfile.create({
      data: {
        userId: isUserId ? playerId : null,
        twitchLogin: isUserId ? null : playerId,
      },
    });
    return profile.id;
  }

  /**
   * Find players who participated in every round.
   */
  private async getSessionCompleters(
    sessionId: string,
    participantIds: string[],
    totalRounds: number,
  ): Promise<Set<string>> {
    if (totalRounds <= 0) return new Set();

    const completers = new Set<string>(participantIds);

    for (let round = 1; round <= totalRounds; round++) {
      const key = roundParticipantsKey(sessionId, round);
      const members = await redis.smembers(key);
      const roundSet = new Set(members);

      for (const playerId of completers) {
        if (!roundSet.has(playerId)) {
          completers.delete(playerId);
        }
      }
    }

    return completers;
  }
}

export const gamificationService = new GamificationService();
