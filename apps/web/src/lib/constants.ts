import { GameType, GameStatus } from '@twitch-hub/shared-types';

export interface GameTypeMeta {
  label: string;
  description: string;
  icon: string;
  available: boolean;
}

export const GAME_TYPE_META: Record<GameType, GameTypeMeta> = {
  [GameType.HOT_TAKE]: {
    label: 'Hot Take Meter',
    description: 'Rate statements 1-10 and see the audience histogram live.',
    icon: 'fire',
    available: true,
  },
  [GameType.BALANCE]: {
    label: 'Balance Game',
    description: 'Would you rather? Compare streamer vs audience picks.',
    icon: 'balance',
    available: false,
  },
  [GameType.BRACKET]: {
    label: 'World Cup Bracket',
    description: 'Elimination bracket voted on by the audience.',
    icon: 'bracket',
    available: false,
  },
  [GameType.PERSONALITY]: {
    label: 'Personality Quiz',
    description: 'Multi-question quiz revealing personality types.',
    icon: 'personality',
    available: false,
  },
  [GameType.TIER_LIST]: {
    label: 'Tier List',
    description: 'Community-built tier lists with consensus rankings.',
    icon: 'tier',
    available: false,
  },
  [GameType.BLIND_TEST]: {
    label: 'Blind Test',
    description: 'Guess the answer with timed hints and leaderboards.',
    icon: 'blind',
    available: false,
  },
};

export interface GameStatusStyle {
  label: string;
  classes: string;
}

export const GAME_STATUS_STYLES: Record<GameStatus, GameStatusStyle> = {
  [GameStatus.DRAFT]: {
    label: 'Draft',
    classes: 'bg-warning-900/50 text-warning-500 border border-warning-500/20',
  },
  [GameStatus.READY]: {
    label: 'Ready',
    classes: 'bg-success-900/50 text-success-500 border border-success-500/20',
  },
  [GameStatus.ARCHIVED]: {
    label: 'Archived',
    classes: 'bg-surface-elevated text-text-muted border border-border-subtle',
  },
};
