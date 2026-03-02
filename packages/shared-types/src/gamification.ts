// --- Gamification Types ---

export enum LoyaltyTier {
  NEWCOMER = 'NEWCOMER',
  REGULAR = 'REGULAR',
  DEDICATED = 'DEDICATED',
  SUPERFAN = 'SUPERFAN',
  LEGENDARY = 'LEGENDARY',
}

export enum XpReason {
  PARTICIPATION = 'PARTICIPATION',
  ROUND_RESPONSE = 'ROUND_RESPONSE',
  CORRECT_ANSWER = 'CORRECT_ANSWER',
  SPEED_BONUS = 'SPEED_BONUS',
  STREAK_BONUS = 'STREAK_BONUS',
  MAJORITY_VOTER = 'MAJORITY_VOTER',
  SESSION_COMPLETION = 'SESSION_COMPLETION',
  FIRST_RESPONDER = 'FIRST_RESPONDER',
}

export enum AchievementCategory {
  PARTICIPATION = 'PARTICIPATION',
  SKILL = 'SKILL',
  SOCIAL = 'SOCIAL',
  RARE = 'RARE',
}

export enum RankTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export interface PlayerProfileSummary {
  totalXp: number;
  level: number;
  totalSessions: number;
  totalResponses: number;
  correctAnswers: number;
  bestStreak: number;
  loyaltyTier?: LoyaltyTier;
  channelXp?: number;
  rankTier: RankTier;
  achievements: { id: string; name: string; category: string; earnedAt: string }[];
}

export interface AchievementDefinitionApi {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  iconUrl: string | null;
  xpReward: number;
  hidden: boolean;
  sortOrder: number;
}

export interface GamificationEvent {
  type: 'streak' | 'achievement' | 'level_up' | 'rank_up' | 'xp_tick';
  playerId: string;
  displayName: string;
  data:
    | StreakEventData
    | AchievementEventData
    | LevelUpEventData
    | RankUpEventData
    | XpTickEventData;
}

export interface StreakEventData {
  streakType: 'answer';
  count: number;
}

export interface AchievementEventData {
  achievementId: string;
  name: string;
}

export interface LevelUpEventData {
  newLevel: number;
}

export interface RankUpEventData {
  previousRank: RankTier;
  newRank: RankTier;
  totalXp: number;
}

export interface XpTickEventData {
  amount: number;
  reason: XpReason;
  multiplier: number;
}

export interface RoundXpSummary {
  round: number;
  playerXp: Record<
    string,
    { roundXp: number; totalSessionXp: number; streak: number; multiplier: number }
  >;
}

export interface ChannelLeaderboardEntry {
  playerProfileId: string;
  twitchLogin: string | null;
  channelXp: number;
  loyaltyTier: LoyaltyTier;
  sessionsPlayed: number;
  level: number;
}

// --- Constants ---

export const LOYALTY_TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  [LoyaltyTier.NEWCOMER]: 0,
  [LoyaltyTier.REGULAR]: 100,
  [LoyaltyTier.DEDICATED]: 500,
  [LoyaltyTier.SUPERFAN]: 2000,
  [LoyaltyTier.LEGENDARY]: 10000,
};

export const MAX_LEVEL = 50;

export function computeLevel(totalXp: number): number {
  const level = Math.floor(Math.sqrt(totalXp / 25));
  return Math.min(Math.max(level, 1), MAX_LEVEL);
}

export function xpForLevel(level: number): number {
  return level * level * 25;
}

export function computeLoyaltyTier(channelXp: number): LoyaltyTier {
  if (channelXp >= LOYALTY_TIER_THRESHOLDS[LoyaltyTier.LEGENDARY]) return LoyaltyTier.LEGENDARY;
  if (channelXp >= LOYALTY_TIER_THRESHOLDS[LoyaltyTier.SUPERFAN]) return LoyaltyTier.SUPERFAN;
  if (channelXp >= LOYALTY_TIER_THRESHOLDS[LoyaltyTier.DEDICATED]) return LoyaltyTier.DEDICATED;
  if (channelXp >= LOYALTY_TIER_THRESHOLDS[LoyaltyTier.REGULAR]) return LoyaltyTier.REGULAR;
  return LoyaltyTier.NEWCOMER;
}

// --- XP Award Rules ---

export const XP_AWARDS = {
  PARTICIPATION: 10,
  ROUND_RESPONSE: 2,
  CORRECT_ANSWER: 5,
  SPEED_BONUS_FAST: 3, // answer in <33% of window
  SPEED_BONUS_MEDIUM: 2, // answer in <50% of window
  STREAK_BONUS_PER_STEP: 2, // +2 per streak step (3+)
  MAJORITY_VOTER: 3,
  SESSION_COMPLETION: 5,
  FIRST_RESPONDER: 2,
} as const;

// --- Rank Tiers ---

export const RANK_TIER_THRESHOLDS: Record<RankTier, number> = {
  [RankTier.BRONZE]: 0,
  [RankTier.SILVER]: 500,
  [RankTier.GOLD]: 1500,
  [RankTier.PLATINUM]: 3500,
  [RankTier.DIAMOND]: 7000,
};

export function computeRankTier(totalXp: number): RankTier {
  if (totalXp >= RANK_TIER_THRESHOLDS[RankTier.DIAMOND]) return RankTier.DIAMOND;
  if (totalXp >= RANK_TIER_THRESHOLDS[RankTier.PLATINUM]) return RankTier.PLATINUM;
  if (totalXp >= RANK_TIER_THRESHOLDS[RankTier.GOLD]) return RankTier.GOLD;
  if (totalXp >= RANK_TIER_THRESHOLDS[RankTier.SILVER]) return RankTier.SILVER;
  return RankTier.BRONZE;
}

export function xpToNextRank(totalXp: number): {
  current: RankTier;
  next: RankTier | null;
  xpNeeded: number;
} {
  const current = computeRankTier(totalXp);
  const tiers = [
    RankTier.BRONZE,
    RankTier.SILVER,
    RankTier.GOLD,
    RankTier.PLATINUM,
    RankTier.DIAMOND,
  ];
  const currentIndex = tiers.indexOf(current);
  if (currentIndex === tiers.length - 1) {
    return { current, next: null, xpNeeded: 0 };
  }
  const next = tiers[currentIndex + 1];
  return { current, next, xpNeeded: RANK_TIER_THRESHOLDS[next] - totalXp };
}

// --- Streak Multiplier ---

export const STREAK_MULTIPLIERS = {
  THRESHOLD_2X: 3,
  THRESHOLD_3X: 5,
  MULTIPLIER_2X: 2,
  MULTIPLIER_3X: 3,
} as const;

export function getStreakMultiplier(consecutiveCorrect: number): number {
  if (consecutiveCorrect >= STREAK_MULTIPLIERS.THRESHOLD_3X)
    return STREAK_MULTIPLIERS.MULTIPLIER_3X;
  if (consecutiveCorrect >= STREAK_MULTIPLIERS.THRESHOLD_2X)
    return STREAK_MULTIPLIERS.MULTIPLIER_2X;
  return 1;
}
