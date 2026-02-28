import { GameType, GameStatus, SessionStatus } from '@twitch-hub/shared-types';

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
    available: true,
  },
  [GameType.BLIND_TEST]: {
    label: 'Blind Test',
    description: 'Guess the answer with timed hints and leaderboards.',
    icon: 'blind',
    available: true,
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
    label: 'Published',
    classes: 'bg-success-900/50 text-success-500 border border-success-500/20',
  },
  [GameStatus.ARCHIVED]: {
    label: 'Archived',
    classes: 'bg-surface-elevated text-text-muted border border-border-subtle',
  },
};

export interface SessionStatusStyle {
  label: string;
  classes: string;
}

export const SESSION_STATUS_STYLES: Record<SessionStatus, SessionStatusStyle> = {
  [SessionStatus.LOBBY]: {
    label: 'Lobby',
    classes: 'bg-warning-900/50 text-warning-500 border border-warning-500/20',
  },
  [SessionStatus.LIVE]: {
    label: 'Live',
    classes: 'bg-success-900/50 text-success-500 border border-success-500/20',
  },
  [SessionStatus.ENDED]: {
    label: 'Ended',
    classes: 'bg-surface-elevated text-text-muted border border-border-subtle',
  },
};

export const SESSION_COOKIE_NAME = 'session';
export const TOAST_TIMEOUT_MS = 4000;
export const DEFAULT_SERVER_URL = 'http://localhost:3001';
