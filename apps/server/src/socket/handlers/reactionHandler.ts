import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import { logger } from '../../logger.js';

const log = logger.child({ module: 'reaction' });

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const REACTION_COOLDOWN_MS = 1500;
const ALLOWED_EMOJIS = new Set(['👏', '🔥', '😮', '😂', '💯', '🎉']);

export function registerReactionHandlers(socket: AppSocket, io: AppServer) {
  let lastReactionAt = 0;

  socket.on('reaction:send', ({ sessionId, emoji }) => {
    const now = Date.now();
    if (now - lastReactionAt < REACTION_COOLDOWN_MS) return;
    if (!ALLOWED_EMOJIS.has(emoji)) return;
    lastReactionAt = now;

    io.of('/play').to(sessionId).emit('reaction:received', { emoji });
    log.debug({ sessionId, emoji }, 'Reaction broadcast');
  });
}
