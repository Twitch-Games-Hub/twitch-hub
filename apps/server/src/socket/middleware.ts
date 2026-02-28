import type { Socket } from 'socket.io';
import { verifyToken } from '../auth.js';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(new Error('Invalid token'));
  }

  socket.data.userId = payload.userId;
  socket.data.twitchId = payload.twitchId;
  next();
}
