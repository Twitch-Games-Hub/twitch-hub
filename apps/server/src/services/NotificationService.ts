import { prisma } from '../db/client.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'notifications' });

export type NotificationInput = {
  recipientId: string;
  type: 'SESSION_INVITE';
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function createNotification(input: NotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
    },
  });

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data as Record<string, unknown>,
    status: notification.status,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function createBulkSessionInvites(
  streamerId: string,
  sessionId: string,
  gameTitle: string,
  recipientUserIds: string[],
) {
  if (recipientUserIds.length === 0) return [];

  // Get streamer display name for the notification text
  const streamer = await prisma.user.findUnique({
    where: { id: streamerId },
    select: { displayName: true },
  });
  const streamerName = streamer?.displayName ?? 'A streamer';

  const notifications = await Promise.all(
    recipientUserIds.map((recipientId) =>
      createNotification({
        recipientId,
        type: 'SESSION_INVITE',
        title: `${streamerName} is playing "${gameTitle}"`,
        body: `You've been invited to join a live session!`,
        data: { sessionId, gameTitle, streamerId },
      }),
    ),
  );

  log.info({ streamerId, sessionId, count: notifications.length }, 'Bulk session invites created');

  return notifications;
}

export async function getNotifications(userId: string, status?: string, limit = 20, offset = 0) {
  const where: Record<string, unknown> = { recipientId: userId };
  if (status && ['UNREAD', 'READ', 'DISMISSED'].includes(status)) {
    where.status = status;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data as Record<string, unknown>,
      status: n.status,
      createdAt: n.createdAt.toISOString(),
    })),
    total,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { recipientId: userId, status: 'UNREAD' },
  });
}

export async function markAsRead(userId: string, ids: string[]) {
  await prisma.notification.updateMany({
    where: { id: { in: ids }, recipientId: userId },
    data: { status: 'READ' },
  });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { recipientId: userId, status: 'UNREAD' },
    data: { status: 'READ' },
  });
}

export async function dismissNotification(userId: string, id: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, recipientId: userId },
  });
  if (!notification) return false;

  await prisma.notification.delete({ where: { id } });
  return true;
}
