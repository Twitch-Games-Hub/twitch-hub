export interface AchievementContext {
  profile: {
    totalSessions: number;
    bestStreak: number;
    channelStats: { loyaltyTier: string }[];
  };
  sessionBestStreak: number;
  sessionCorrectAnswers: number;
  sessionTotalRounds: number;
  sessionSpeedBonuses: number;
  sessionParticipantCount: number;
  uniqueChannelCount: number;
  sessionHour: number;
}

type AchievementCheck = (ctx: AchievementContext) => boolean;

const checks: Record<string, AchievementCheck> = {
  // Participation
  first_steps: (ctx) => ctx.profile.totalSessions >= 1,
  regular: (ctx) => ctx.profile.totalSessions >= 10,
  veteran: (ctx) => ctx.profile.totalSessions >= 50,
  centurion: (ctx) => ctx.profile.totalSessions >= 100,

  // Skill
  on_fire: (ctx) => ctx.sessionBestStreak >= 5,
  unstoppable: (ctx) => ctx.sessionBestStreak >= 10,
  speed_demon: (ctx) => ctx.sessionSpeedBonuses >= 5,
  perfect_game: (ctx) =>
    ctx.sessionTotalRounds > 0 && ctx.sessionCorrectAnswers >= ctx.sessionTotalRounds,
  crowd_reader: (ctx) => ctx.profile.bestStreak >= 10, // 10 consecutive majority votes tracked via bestStreak

  // Social
  channel_regular: (ctx) =>
    ctx.profile.channelStats.some(
      (cs) =>
        cs.loyaltyTier === 'REGULAR' ||
        cs.loyaltyTier === 'DEDICATED' ||
        cs.loyaltyTier === 'SUPERFAN' ||
        cs.loyaltyTier === 'LEGENDARY',
    ),
  superfan: (ctx) =>
    ctx.profile.channelStats.some(
      (cs) => cs.loyaltyTier === 'SUPERFAN' || cs.loyaltyTier === 'LEGENDARY',
    ),
  channel_surfer: (ctx) => ctx.uniqueChannelCount >= 5,

  // Rare (hidden until earned)
  night_owl: (ctx) => ctx.sessionHour >= 2 && ctx.sessionHour < 5,
  full_house: (ctx) => ctx.sessionParticipantCount >= 100,
};

/**
 * Check which achievements a player has newly earned.
 * Returns array of achievement IDs to award.
 */
export function checkAchievements(ctx: AchievementContext, alreadyEarned: Set<string>): string[] {
  const newlyEarned: string[] = [];

  for (const [id, check] of Object.entries(checks)) {
    if (alreadyEarned.has(id)) continue;
    try {
      if (check(ctx)) {
        newlyEarned.push(id);
      }
    } catch {
      // Skip broken checks
    }
  }

  return newlyEarned;
}
