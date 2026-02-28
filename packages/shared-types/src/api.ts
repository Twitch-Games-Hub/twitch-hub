import type { GameType, GameStatus, SessionStatus } from './game.js';

export interface ApiUser {
  id: string;
  twitchId: string;
  twitchLogin: string;
  displayName: string;
  profileImageUrl?: string;
  role: 'STREAMER' | 'VIEWER';
}

export interface ApiGameBase {
  id: string;
  type: GameType;
  title: string;
  description?: string;
  coverImageUrl?: string;
  config: unknown;
  status: GameStatus;
  createdAt: string;
}

export interface ApiGame extends ApiGameBase {
  ownerId: string;
  updatedAt: string;
  sessions?: ApiGameSession[];
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
  description?: string;
  coverImageUrl?: string;
  config: unknown;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface ApiPublicGame extends ApiGameBase {
  owner: { displayName: string; profileImageUrl?: string; twitchLogin: string };
  ratingScore: number;
  ratingCount: number;
  userRating: number | null;
  isSaved: boolean;
  playCount: number;
  contentCount: number;
}

export interface RateGameResponse {
  ratingScore: number;
  ratingCount: number;
  userRating: number | null;
}

export interface TwitchUserProfile {
  id: string;
  login: string;
  display_name: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  broadcaster_type: '' | 'affiliate' | 'partner';
  type: '' | 'admin' | 'global_mod' | 'staff';
  created_at: string;
}

export interface TwitchChannelInfo {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  broadcaster_language: string;
  game_name: string;
  game_id: string;
  title: string;
  tags: string[];
}

export interface TwitchStreamInfo {
  id: string;
  user_id: string;
  user_login: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
  is_mature: boolean;
}

export interface TwitchFollowedChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  followed_at: string;
}

export interface TwitchPaginatedResponse<T> {
  total: number;
  data: T[];
  pagination: { cursor?: string };
}

export type TwitchFollowedData = TwitchPaginatedResponse<TwitchFollowedChannel>;

export interface TwitchFollower {
  user_id: string;
  user_login: string;
  user_name: string;
  followed_at: string;
}

export type TwitchFollowerData = TwitchPaginatedResponse<TwitchFollower>;

export interface TwitchFollowedStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
}

export interface TwitchFollowedStreamData {
  data: TwitchFollowedStream[];
  pagination: { cursor?: string };
}

export interface ApiSessionWithGame extends ApiGameSession {
  game: { title: string; type: string };
  responseCount: number;
  createdAt: string;
}

export interface ApiSessionDetail extends ApiGameSession {
  createdAt: string;
  game: ApiGameBase;
  responseCount: number;
}

export interface ApiSessionsResponse {
  sessions: ApiSessionWithGame[];
  total: number;
  page: number;
  limit: number;
}

export interface ProfileAppStats {
  games: { id: string; title: string; type: string; status: string; createdAt: string }[];
  gameCount: number;
}

export interface ProfileData {
  twitchUser: TwitchUserProfile | null;
  channel: TwitchChannelInfo | null;
  stream: TwitchStreamInfo | null;
  followed: TwitchFollowedData | null;
  followedStreams: TwitchFollowedStreamData | null;
  followers: TwitchFollowerData | null;
  appStats: ProfileAppStats;
}
