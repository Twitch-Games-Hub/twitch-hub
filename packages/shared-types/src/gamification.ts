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

export interface PlayerProfileSummary {
  totalXp: number;
  level: number;
  totalSessions: number;
  totalResponses: number;
  correctAnswers: number;
  bestStreak: number;
  loyaltyTier?: LoyaltyTier;
  channelXp?: number;
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
  type: 'streak' | 'achievement' | 'level_up';
  playerId: string;
  displayName: string;
  data: StreakEventData | AchievementEventData | LevelUpEventData;
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
