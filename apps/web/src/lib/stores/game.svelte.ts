import type {
  GameState,
  RoundData,
  RoundResults,
  FinalResults,
  VoteAggregation,
  MultiVoteAggregation,
  SessionSnapshot,
  SessionUser,
  GamificationEvent,
  LeaderboardEntry,
  SessionXpSummary,
} from '@twitch-hub/shared-types';
import type { Socket } from 'socket.io-client';
import * as Sentry from '@sentry/sveltekit';

export interface CompletedMatchup {
  matchupIndex: number;
  bracketLevel: number;
  bracketSize: number;
  itemA: { name: string; imageUrl?: string };
  itemB: { name: string; imageUrl?: string };
  winnerName: string;
  voteCountA: number;
  voteCountB: number;
}

interface GameStoreState {
  gameState: GameState | null;
  currentRound: RoundData | null;
  roundResults: RoundResults | null;
  finalResults: FinalResults | null;
  votes: VoteAggregation | null;
  multiVotes: MultiVoteAggregation | null;
  connectedUsers: SessionUser[];
  participantCount: number;
  connected: boolean;
  error: string | null;
  submittedQuestionIds: string[];
  completedMatchups: CompletedMatchup[];
  gamificationQueue: GamificationEvent[];
  submittedAnswers: Record<string, unknown>;
  leaderboard: LeaderboardEntry[];
  sessionSummary: SessionXpSummary | null;
}

function createGameStore() {
  let state = $state<GameStoreState>({
    gameState: null,
    currentRound: null,
    roundResults: null,
    finalResults: null,
    votes: null,
    multiVotes: null,
    connectedUsers: [],
    participantCount: 0,
    connected: false,
    error: null,
    submittedQuestionIds: [],
    completedMatchups: [],
    gamificationQueue: [],
    submittedAnswers: {},
    leaderboard: [],
    sessionSummary: null,
  });

  let socket: Socket | null = null;

  const STORE_EVENTS = [
    'connect',
    'disconnect',
    'game:state',
    'game:round-start',
    'game:round-end',
    'game:ended',
    'votes:update',
    'multi-votes:update',
    'participants:count',
    'error',
    'connect_error',
    'session:users',
    'session:rejoined',
    'response:ack',
    'gamification:event',
    'leaderboard:update',
    'reaction:received',
    'gamification:session-summary',
  ];

  function bindSocket(s: Socket) {
    if (socket === s) return;
    if (socket) {
      for (const ev of STORE_EVENTS) socket.removeAllListeners(ev);
    }
    socket = s;

    s.on('connect', () => {
      state.connected = true;
      state.error = null;
      Sentry.logger.info('Socket connected');
    });

    s.on('disconnect', (reason) => {
      state.connected = false;
      Sentry.logger.warn('Socket disconnected', { reason });
    });

    s.on('game:state', (gs: GameState) => {
      state.gameState = gs;
      Sentry.logger.info('Game state changed', { status: gs.status, sessionId: gs.sessionId });
    });

    s.on('game:round-start', (round: RoundData) => {
      state.currentRound = round;
      state.roundResults = null;
      state.votes = null;
      state.multiVotes = null;
      state.submittedQuestionIds = [];
      state.submittedAnswers = {};
      Sentry.logger.info('Round started', { round: round.round });
    });

    s.on('game:round-end', (results: RoundResults) => {
      if (
        state.gameState?.gameType === 'RANKING' &&
        state.currentRound?.meta &&
        results.distribution?.length === 2
      ) {
        const [a, b] = results.distribution;
        const winnerIdx = b > a ? 1 : 0;
        state.completedMatchups = [
          ...state.completedMatchups,
          {
            matchupIndex: state.currentRound.meta.matchupIndex as number,
            bracketLevel: state.currentRound.meta.bracketLevel as number,
            bracketSize: state.currentRound.meta.bracketSize as number,
            itemA: {
              name: state.currentRound.options?.[0] ?? 'A',
              imageUrl: state.currentRound.optionImages?.[0] ?? undefined,
            },
            itemB: {
              name: state.currentRound.options?.[1] ?? 'B',
              imageUrl: state.currentRound.optionImages?.[1] ?? undefined,
            },
            winnerName: state.currentRound.options?.[winnerIdx] ?? (winnerIdx === 0 ? 'A' : 'B'),
            voteCountA: a,
            voteCountB: b,
          },
        ];
      }
      state.roundResults = results;
      Sentry.logger.info('Round ended', { round: results.round });
    });

    s.on('game:ended', (final: FinalResults) => {
      state.finalResults = final;
      Sentry.logger.info('Game ended', { totalParticipants: final.totalParticipants });
    });

    s.on('votes:update', (agg: VoteAggregation) => {
      state.votes = agg;
    });

    s.on('multi-votes:update', (agg: MultiVoteAggregation) => {
      state.multiVotes = agg;
    });

    s.on('participants:count', (count: number) => {
      state.participantCount = count;
    });

    s.on('session:users', (users: SessionUser[]) => {
      state.connectedUsers = users;
    });

    s.on('error', (msg: string) => {
      state.error = msg;
      Sentry.logger.error('Game error received', { message: msg });
    });

    s.on('connect_error', (err: Error) => {
      state.error = `Connection failed: ${err.message}`;
      state.connected = false;
      Sentry.logger.error('Socket connection failed', { message: err.message });
    });

    s.on('response:ack', (data: { questionId: string }) => {
      if (!state.submittedQuestionIds.includes(data.questionId)) {
        state.submittedQuestionIds = [...state.submittedQuestionIds, data.questionId];
      }
    });

    s.on('gamification:event', (event: GamificationEvent) => {
      state.gamificationQueue = [...state.gamificationQueue, event];
    });

    s.on('leaderboard:update', (entries: LeaderboardEntry[]) => {
      state.leaderboard = entries;
    });

    s.on('gamification:session-summary', (summary: SessionXpSummary) => {
      state.sessionSummary = summary;
    });

    s.on('session:rejoined', (snapshot: SessionSnapshot) => {
      state.gameState = snapshot.gameState;
      state.currentRound = snapshot.currentRound;
      state.votes = snapshot.votes;
      state.participantCount = snapshot.participantCount;
      state.completedMatchups = [];
      if (snapshot.finalResults) {
        state.finalResults = snapshot.finalResults;
      }
      Sentry.logger.info('Session rejoined', {
        status: snapshot.gameState.status,
        participants: snapshot.participantCount,
      });
    });
  }

  function reset() {
    state.gameState = null;
    state.currentRound = null;
    state.roundResults = null;
    state.finalResults = null;
    state.votes = null;
    state.multiVotes = null;
    state.connectedUsers = [];
    state.participantCount = 0;
    state.error = null;
    state.submittedQuestionIds = [];
    state.completedMatchups = [];
    state.gamificationQueue = [];
    state.submittedAnswers = {};
    state.leaderboard = [];
    state.sessionSummary = null;
  }

  return {
    get gameState() {
      return state.gameState;
    },
    get currentRound() {
      return state.currentRound;
    },
    get roundResults() {
      return state.roundResults;
    },
    get finalResults() {
      return state.finalResults;
    },
    get votes() {
      return state.votes;
    },
    get multiVotes() {
      return state.multiVotes;
    },
    get connectedUsers() {
      return state.connectedUsers;
    },
    get participantCount() {
      return state.participantCount;
    },
    get connected() {
      return state.connected;
    },
    get error() {
      return state.error;
    },
    get submittedQuestionIds() {
      return state.submittedQuestionIds;
    },
    get completedMatchups() {
      return state.completedMatchups;
    },
    get gamificationQueue() {
      return state.gamificationQueue;
    },
    get submittedAnswers() {
      return state.submittedAnswers;
    },
    get leaderboard() {
      return state.leaderboard;
    },
    get sessionSummary() {
      return state.sessionSummary;
    },
    dequeueGamificationEvent() {
      state.gamificationQueue = state.gamificationQueue.slice(1);
    },
    isQuestionSubmitted(questionId: string) {
      return state.submittedQuestionIds.includes(questionId);
    },

    bindSocket,
    reset,

    hydrateFromSnapshot(snapshot: SessionSnapshot) {
      state.gameState = snapshot.gameState;
      state.currentRound = snapshot.currentRound;
      state.votes = snapshot.votes;
      state.multiVotes = null;
      state.participantCount = snapshot.participantCount;
      state.roundResults = null;
      state.finalResults = null;
      state.completedMatchups = [];
    },

    rejoinSession(sessionId: string) {
      socket?.emit('session:rejoin', { sessionId });
    },

    joinSession(sessionId: string) {
      socket?.emit('session:join', sessionId);
    },

    submitResponse(sessionId: string, questionId: string, answer: unknown) {
      state.submittedAnswers = { ...state.submittedAnswers, [questionId]: answer };
      socket?.emit('response:submit', { sessionId, questionId, answer });
    },

    createSession(gameId: string) {
      socket?.emit('game:create-session', gameId);
    },

    startGame(sessionId: string) {
      socket?.emit('game:start', sessionId);
    },

    nextRound(sessionId: string) {
      socket?.emit('game:next-round', sessionId);
    },

    endGame(sessionId: string) {
      socket?.emit('game:end', sessionId);
    },
  };
}

export const gameStore = createGameStore();
