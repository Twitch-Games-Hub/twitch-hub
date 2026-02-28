export enum GameType {
  HOT_TAKE = 'HOT_TAKE',
  BRACKET = 'BRACKET',
  BALANCE = 'BALANCE',
  PERSONALITY = 'PERSONALITY',
  TIER_LIST = 'TIER_LIST',
  BLIND_TEST = 'BLIND_TEST',
}

export enum GameStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  ARCHIVED = 'ARCHIVED',
}

export enum SessionStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
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

export interface BracketConfig {
  items: string[];
  bracketSize: 8 | 16 | 32;
}

export interface BalanceConfig {
  questions: { optionA: string; optionB: string }[];
}

export interface PersonalityConfig {
  questions: { text: string; options: { label: string; weight: Record<string, number> }[] }[];
  resultTypes: { id: string; title: string; description: string }[];
}

export interface TierListConfig {
  items: string[];
  tiers: string[];
}

export interface BlindTestConfig {
  rounds: { answer: string; hints: string[]; mediaSrc?: string }[];
  answerWindowSec: number;
}

export type GameConfig =
  | HotTakeConfig
  | BracketConfig
  | BalanceConfig
  | PersonalityConfig
  | TierListConfig
  | BlindTestConfig;
