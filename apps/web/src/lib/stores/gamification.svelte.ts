import { apiGet } from '$lib/api';
import type { AchievementCategory, LoyaltyTier } from '@twitch-hub/shared-types';

interface ChannelStat {
  channelId: string;
  channelXp: number;
  loyaltyTier: LoyaltyTier;
  sessionsPlayed: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedAt: string | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  iconUrl: string | null;
  earnedAt: string;
}

interface GamificationProfile {
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  totalSessions: number;
  totalResponses: number;
  correctAnswers: number;
  bestStreak: number;
  achievements: Achievement[];
  channelStats: ChannelStat[];
}

interface GamificationState {
  profile: GamificationProfile | null;
  loading: boolean;
  loaded: boolean;
}

function createGamificationStore() {
  let state = $state<GamificationState>({
    profile: null,
    loading: false,
    loaded: false,
  });

  return {
    get profile() {
      return state.profile;
    },
    get loading() {
      return state.loading;
    },
    get loaded() {
      return state.loaded;
    },

    async fetchProfile() {
      if (state.loading) return;
      state.loading = true;
      try {
        const data = await apiGet<GamificationProfile>('/api/gamification/profile');
        state.profile = data;
        state.loaded = true;
      } catch {
        // Silently fail — gamification is non-critical
      } finally {
        state.loading = false;
      }
    },

    reset() {
      state = {
        profile: null,
        loading: false,
        loaded: false,
      };
    },
  };
}

export const gamificationStore = createGamificationStore();
