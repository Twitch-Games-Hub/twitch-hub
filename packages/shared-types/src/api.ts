import type { GameType, GameStatus, SessionStatus } from './game.js';

export interface ApiUser {
  id: string;
  twitchId: string;
  twitchLogin: string;
  displayName: string;
  profileImageUrl?: string;
  role: 'STREAMER' | 'VIEWER';
}

export interface ApiGame {
  id: string;
  ownerId: string;
  type: GameType;
  title: string;
  config: unknown;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiGameSession {
  id: string;
  gameId: string;
  hostId: string;
  channelId: string;
  status: SessionStatus;
  currentRound: number;
  startedAt?: string;
  endedAt?: string;
}

export interface CreateGameRequest {
  type: GameType;
  title: string;
  config: unknown;
}

export interface ApiError {
  error: string;
  message: string;
}
