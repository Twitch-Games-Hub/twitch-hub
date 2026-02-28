import type {
  GameState,
  RoundData,
  RoundResults,
  FinalResults,
  VoteAggregation,
  MultiVoteAggregation,
  SessionSnapshot,
  SessionUser,
} from '@twitch-hub/shared-types';
import type { Socket } from 'socket.io-client';

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
    });

    s.on('disconnect', () => {
      state.connected = false;
    });

    s.on('game:state', (gs: GameState) => {
      state.gameState = gs;
    });

    s.on('game:round-start', (round: RoundData) => {
      state.currentRound = round;
      state.roundResults = null;
      state.votes = null;
      state.multiVotes = null;
      state.submittedQuestionIds = [];
    });

    s.on('game:round-end', (results: RoundResults) => {
      state.roundResults = results;
    });

    s.on('game:ended', (final: FinalResults) => {
      state.finalResults = final;
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
    });

    s.on('connect_error', (err: Error) => {
      state.error = `Connection failed: ${err.message}`;
      state.connected = false;
    });

    s.on('response:ack', (data: { questionId: string }) => {
      if (!state.submittedQuestionIds.includes(data.questionId)) {
        state.submittedQuestionIds = [...state.submittedQuestionIds, data.questionId];
      }
    });

    s.on('session:rejoined', (snapshot: SessionSnapshot) => {
      state.gameState = snapshot.gameState;
      state.currentRound = snapshot.currentRound;
      state.votes = snapshot.votes;
      state.participantCount = snapshot.participantCount;
      if (snapshot.finalResults) {
        state.finalResults = snapshot.finalResults;
      }
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
    },

    rejoinSession(sessionId: string) {
      socket?.emit('session:rejoin', { sessionId });
    },

    joinSession(sessionId: string) {
      socket?.emit('session:join', sessionId);
    },

    submitResponse(sessionId: string, questionId: string, answer: unknown) {
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
