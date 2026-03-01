import { authMiddleware } from '../auth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
} from '../services/NotificationService.js';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

export const notificationsPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authMiddleware);

  // GET / — paginated list, optional ?status=UNREAD filter
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!;
    const query = request.query as Record<string, string>;
    const status = query.status;
    const limit = Math.min(parseInt(query.limit || '20', 10), 50);
    const offset = parseInt(query.offset || '0', 10);

    const result = await getNotifications(userId, status, limit, offset);
    return result;
  });

  // GET /count — { unreadCount }
  app.get('/count', async (request: FastifyRequest) => {
    const userId = request.userId!;
    const unreadCount = await getUnreadCount(userId);
    return { unreadCount };
  });

  // POST /read — body { ids: string[] }
  app.post('/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!;
    const { ids } = request.body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      reply.code(400);
      return { error: 'ids must be a non-empty array' };
    }

    await markAsRead(userId, ids);
    return { success: true };
  });

  // POST /read-all
  app.post('/read-all', async (request: FastifyRequest) => {
    const userId = request.userId!;
    await markAllAsRead(userId);
    return { success: true };
  });

  // DELETE /:id
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params;

    const deleted = await dismissNotification(userId, id);
    if (!deleted) {
      reply.code(404);
      return { error: 'Notification not found' };
    }

    return { success: true };
  });
};
