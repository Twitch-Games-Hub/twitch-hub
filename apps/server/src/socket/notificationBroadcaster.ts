import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ApiNotification,
} from '@twitch-hub/shared-types';
import { logger } from '../logger.js';

const log = logger.child({ module: 'notification-broadcaster' });

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

class NotificationBroadcaster {
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private socketToUser = new Map<string, string>(); // socketId -> userId
  private io: AppServer | null = null;

  setServer(io: AppServer) {
    this.io = io;
  }

  trackUser(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    this.socketToUser.set(socketId, userId);
    log.debug({ userId, socketId }, 'User tracked for notifications');
  }

  untrackUser(socketId: string) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.socketToUser.delete(socketId);
    log.debug({ userId, socketId }, 'User untracked from notifications');
  }

  notifyUser(userId: string, notification: ApiNotification) {
    if (!this.io) return;

    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    const dashboard = this.io.of('/dashboard');
    for (const socketId of sockets) {
      const socket = dashboard.sockets.get(socketId);
      if (socket) {
        socket.emit('notification:received', notification);
      }
    }
  }

  notifyUserCount(userId: string, unreadCount: number) {
    if (!this.io) return;

    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    const dashboard = this.io.of('/dashboard');
    for (const socketId of sockets) {
      const socket = dashboard.sockets.get(socketId);
      if (socket) {
        socket.emit('notification:count', { unreadCount });
      }
    }
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }
}

export const notificationBroadcaster = new NotificationBroadcaster();
