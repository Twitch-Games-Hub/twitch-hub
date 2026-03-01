import type { GameType, SessionStatus } from './game.js';
import type { ApiNotification } from './notification.js';
import type { GamificationEvent, PlayerProfileSummary } from './gamification.js';

// --- Game State ---

export interface GameState {
  sessionId: string;
  gameType: GameType;
  status: SessionStatus;
  currentRound: number;
  totalRounds: number;
  roundData?: RoundData;
  participantCount: number;
  gameTitle?: string;
  coverImageUrl?: string;
}

export interface RoundData {
  round: number;
  questionId: string;
  prompt: string;
  options?: string[];
  optionImages?: (string | null)[]; // parallel array to options, null = no image
  endsAt?: string; // ISO timestamp
  meta?: Record<string, unknown>; // extra context (e.g. bracket level)
}

export interface RoundResults {
  round: number;
  questionId: string;
  distribution?: number[]; // histogram for HotTake (indices 0-9 for ratings 1-10)
  percentages?: Record<string, number>; // for Balance
  totalResponses: number;
}

export interface BracketMatchupResult {
  matchupIndex: number;
  bracketLevel: number;
  itemA: { id: string; name: string; imageUrl?: string };
  itemB: { id: string; name: string; imageUrl?: string };
  winnerId: string;
  voteCountA: number;
  voteCountB: number;
}

export interface RankingFinalData {
  bracketSize: number;
  matchups: BracketMatchupResult[];
  champion: { id: string; name: string; imageUrl?: string };
  rankings: { rank: number; item: { id: string; name: string; imageUrl?: string } }[];
}

export interface FinalResults {
  sessionId: string;
  rounds: RoundResults[];
  totalParticipants: number;
  ranking?: RankingFinalData;
}

export interface VoteAggregation {
  questionId: string;
  distribution: number[];
  totalVotes: number;
}

export interface MultiVoteAggregation {
  matchups: VoteAggregation[];
}

// --- Session Snapshot (for rejoin) ---

export interface SessionSnapshot {
  sessionId: string;
  gameState: GameState;
  currentRound: RoundData | null;
  votes: VoteAggregation | null;
  participantCount: number;
  finalResults?: FinalResults | null;
}

// --- Session Users ---

export interface SessionUser {
  socketId: string;
  userId?: string;
  displayName: string | null;
  profileImageUrl?: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  xp: number;
}

// --- Socket.IO Event Contracts ---

export interface ClientToServerEvents {
  'game:create-session': (data: string | { gameId: string; onBehalfOf?: string }) => void;
  'game:start': (sessionId: string) => void;
  'game:next-round': (sessionId: string) => void;
  'game:end': (sessionId: string) => void;
  'response:submit': (data: { sessionId: string; questionId: string; answer: unknown }) => void;
  'session:join': (sessionId: string) => void;
  'session:rejoin': (data: { sessionId: string }) => void;
}

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:round-start': (round: RoundData) => void;
  'game:round-end': (results: RoundResults) => void;
  'game:ended': (finalResults: FinalResults) => void;
  'votes:update': (aggregation: VoteAggregation) => void;
  'multi-votes:update': (aggregation: MultiVoteAggregation) => void;
  'participants:count': (count: number) => void;
  'session:users': (users: SessionUser[]) => void;
  'response:ack': (data: { questionId: string }) => void;
  error: (message: string) => void;
  'session:created': (data: { sessionId: string }) => void;
  'session:rejoined': (snapshot: SessionSnapshot) => void;
  'notification:received': (notification: ApiNotification) => void;
  'notification:count': (data: { unreadCount: number }) => void;
  'gamification:event': (data: GamificationEvent) => void;
  'gamification:profile': (data: PlayerProfileSummary) => void;
  'leaderboard:update': (entries: LeaderboardEntry[]) => void;
}
