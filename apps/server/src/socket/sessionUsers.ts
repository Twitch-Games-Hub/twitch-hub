import type { SessionUser } from '@twitch-hub/shared-types';
import { prisma } from '../db/client.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'session-users' });

// sessionId -> Map<socketId, SessionUser>
const sessionUsersMap = new Map<string, Map<string, SessionUser>>();
// socketId -> sessionId (reverse lookup)
const socketSessionMap = new Map<string, string>();

export async function trackUser(
  sessionId: string,
  socketId: string,
  userId?: string,
): Promise<SessionUser[]> {
  let displayName: string | null = null;
  let profileImageUrl: string | null = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, profileImageUrl: true },
    });
    if (user) {
      displayName = user.displayName;
      profileImageUrl = user.profileImageUrl;
    }
  }

  const sessionUser: SessionUser = { socketId, displayName, profileImageUrl };

  if (!sessionUsersMap.has(sessionId)) {
    sessionUsersMap.set(sessionId, new Map());
  }
  sessionUsersMap.get(sessionId)!.set(socketId, sessionUser);
  socketSessionMap.set(socketId, sessionId);

  log.debug({ sessionId, socketId, displayName }, 'User tracked');
  return getUsers(sessionId);
}

export function untrackUser(socketId: string): { sessionId: string; users: SessionUser[] } | null {
  const sessionId = socketSessionMap.get(socketId);
  if (!sessionId) return null;

  socketSessionMap.delete(socketId);
  const users = sessionUsersMap.get(sessionId);
  if (users) {
    users.delete(socketId);
    if (users.size === 0) {
      sessionUsersMap.delete(sessionId);
    }
  }

  log.debug({ sessionId, socketId }, 'User untracked');
  return { sessionId, users: getUsers(sessionId) };
}

export function getUsers(sessionId: string): SessionUser[] {
  const users = sessionUsersMap.get(sessionId);
  if (!users) return [];
  return Array.from(users.values());
}

export function clearSession(sessionId: string): void {
  const users = sessionUsersMap.get(sessionId);
  if (users) {
    for (const socketId of users.keys()) {
      socketSessionMap.delete(socketId);
    }
    sessionUsersMap.delete(sessionId);
  }
  log.debug({ sessionId }, 'Session users cleared');
}
