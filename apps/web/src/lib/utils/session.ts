import { getDashboardSocket } from '$lib/socket';

/**
 * Creates a new game session via the dashboard socket.
 * Fetches an auth token, connects, emits `game:create-session`,
 * and resolves with the new sessionId (or throws on failure/timeout).
 */
export async function createGameSession(gameId: string): Promise<string> {
  const res = await fetch('/api/auth/token');
  if (!res.ok) throw new Error('Authentication failed');

  const { token } = await res.json();
  const socket = getDashboardSocket(token);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- socket events not fully typed
  const raw = socket as any;

  return new Promise<string>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('session:created', onCreated);
      raw.off('error', onError);
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout waiting for session creation'));
    }, 10_000);

    const onCreated = (data: { sessionId: string }) => {
      cleanup();
      resolve(data.sessionId);
    };

    const onError = (msg: string) => {
      cleanup();
      reject(new Error(msg));
    };

    socket.once('session:created', onCreated);
    raw.once('error', onError);

    const emit = () => raw.emit('game:create-session', gameId);
    if (socket.connected) {
      emit();
    } else {
      raw.once('connect', emit);
    }
  });
}
