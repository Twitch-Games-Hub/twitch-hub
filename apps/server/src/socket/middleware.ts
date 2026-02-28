import type { Socket } from 'socket.io';
import { verifyToken } from '../auth.js';
import { logger } from '../logger.js';
import { isValidUuid } from '../utils/validation.js';

const log = logger.child({ module: 'socket-auth' });

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    log.warn({ socketId: socket.id }, 'Socket auth failed: no token');
    return next(new Error('Authentication required'));
  }

  const payload = verifyToken(token);
  if (!payload) {
    log.warn({ socketId: socket.id }, 'Socket auth failed: invalid token');
    return next(new Error('Invalid token'));
  }

  socket.data.userId = payload.userId;
  socket.data.twitchId = payload.twitchId;
  log.debug({ socketId: socket.id, userId: payload.userId }, 'Socket authenticated');
  next();
}

export function optionalSocketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    const anonId = socket.handshake.auth?.anonId;
    if (isValidUuid(anonId)) {
      socket.data.anonId = anonId;
    }
    return next();
  }

  const payload = verifyToken(token);
  if (!payload) {
    log.debug(
      { socketId: socket.id },
      'Optional socket auth: invalid token, continuing anonymously',
    );
    return next();
  }

  socket.data.userId = payload.userId;
  socket.data.twitchId = payload.twitchId;
  log.debug({ socketId: socket.id, userId: payload.userId }, 'Optional socket auth succeeded');
  next();
}
