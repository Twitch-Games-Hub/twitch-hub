import type { GameType, SessionStatus } from './game.js';

// --- Game State ---

export interface GameState {
  sessionId: string;
  gameType: GameType;
  status: SessionStatus;
  currentRound: number;
  totalRounds: number;
  roundData?: RoundData;
  participantCount: number;
}

export interface RoundData {
  round: number;
  questionId: string;
  prompt: string;
  options?: string[];
  endsAt?: string; // ISO timestamp
}

export interface RoundResults {
  round: number;
  questionId: string;
  distribution?: number[]; // histogram for HotTake (indices 0-9 for ratings 1-10)
  percentages?: Record<string, number>; // for Balance/Bracket
  totalResponses: number;
}

export interface FinalResults {
  sessionId: string;
  rounds: RoundResults[];
  totalParticipants: number;
}

export interface VoteAggregation {
  questionId: string;
  distribution: number[];
  totalVotes: number;
}

// --- Socket.IO Event Contracts ---

export interface ClientToServerEvents {
  'game:create-session': (gameId: string) => void;
  'game:start': (sessionId: string) => void;
  'game:next-round': (sessionId: string) => void;
  'game:end': (sessionId: string) => void;
  'response:submit': (data: {
    sessionId: string;
    questionId: string;
    answer: unknown;
  }) => void;
  'session:join': (sessionId: string) => void;
}

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:round-start': (round: RoundData) => void;
  'game:round-end': (results: RoundResults) => void;
  'game:ended': (finalResults: FinalResults) => void;
  'votes:update': (aggregation: VoteAggregation) => void;
  'participants:count': (count: number) => void;
  'error': (message: string) => void;
  'session:created': (data: { sessionId: string }) => void;
}
