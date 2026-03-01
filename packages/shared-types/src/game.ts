export enum GameType {
  HOT_TAKE = 'HOT_TAKE',
  BALANCE = 'BALANCE',
  BLIND_TEST = 'BLIND_TEST',
  RANKING = 'RANKING',
}

export enum GameStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  ARCHIVED = 'ARCHIVED',
}

export enum SessionStatus {
  LOBBY = 'LOBBY',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
}

export enum ResponseSource {
  WEB = 'WEB',
  CHAT = 'CHAT',
}

// --- Game config shapes ---

export interface HotTakeConfig {
  statements: string[];
  roundDurationSec: number;
}

export interface BalanceConfig {
  questions: { optionA: string; optionB: string; imageUrlA?: string; imageUrlB?: string }[];
  roundDurationSec?: number;
}

export interface BlindTestConfig {
  rounds: { answer: string; hints: string[]; mediaSrc?: string; imageUrl?: string }[];
  answerWindowSec: number;
}

export interface RankingItem {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface RankingConfig {
  items: RankingItem[];
  bracketSize: 8 | 16 | 32;
  roundDurationSec: number;
}

export type GameConfig = HotTakeConfig | BalanceConfig | BlindTestConfig | RankingConfig;
