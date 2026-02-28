import type {
  GameState,
  RoundData,
  RoundResults,
  FinalResults,
  VoteAggregation,
  SessionSnapshot,
} from '@twitch-hub/shared-types';
import type { Socket } from 'socket.io-client';

interface GameStoreState {
  gameState: GameState | null;
  currentRound: RoundData | null;
  roundResults: RoundResults | null;
  finalResults: FinalResults | null;
  votes: VoteAggregation | null;
  participantCount: number;
  connected: boolean;
  error: string | null;
}

function createGameStore() {
  let state = $state<GameStoreState>({
    gameState: null,
    currentRound: null,
    roundResults: null,
    finalResults: null,
    votes: null,
    participantCount: 0,
    connected: false,
    error: null,
  });

  let socket: Socket | null = null;

  function bindSocket(s: Socket) {
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

    s.on('participants:count', (count: number) => {
      state.participantCount = count;
    });

    s.on('error', (msg: string) => {
      state.error = msg;
    });

    s.on('connect_error', (err: Error) => {
      state.error = `Connection failed: ${err.message}`;
      state.connected = false;
    });
  }

  function reset() {
    state.gameState = null;
    state.currentRound = null;
    state.roundResults = null;
    state.finalResults = null;
    state.votes = null;
    state.participantCount = 0;
    state.error = null;
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
    get participantCount() {
      return state.participantCount;
    },
    get connected() {
      return state.connected;
    },
    get error() {
      return state.error;
    },

    bindSocket,
    reset,

    hydrateFromSnapshot(snapshot: SessionSnapshot) {
      state.gameState = snapshot.gameState;
      state.currentRound = snapshot.currentRound;
      state.votes = snapshot.votes;
      state.participantCount = snapshot.participantCount;
      state.roundResults = null;
      state.finalResults = null;
    },

    rejoinSession(gameId: string) {
      socket?.emit('session:rejoin', { gameId });
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
