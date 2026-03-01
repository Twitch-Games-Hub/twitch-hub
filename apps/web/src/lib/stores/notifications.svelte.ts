import { NotificationStatus, type ApiNotification } from '@twitch-hub/shared-types';
import { apiGet, apiPost, apiDelete } from '$lib/api';

interface NotificationState {
  unreadCount: number;
  notifications: ApiNotification[];
  loading: boolean;
  loaded: boolean;
}

function createNotificationStore() {
  let state = $state<NotificationState>({
    unreadCount: 0,
    notifications: [],
    loading: false,
    loaded: false,
  });

  return {
    get unreadCount() {
      return state.unreadCount;
    },
    get notifications() {
      return state.notifications;
    },
    get loading() {
      return state.loading;
    },
    get loaded() {
      return state.loaded;
    },

    async fetchCount() {
      try {
        const data = await apiGet<{ unreadCount: number }>('/api/notifications/count');
        state.unreadCount = data.unreadCount;
      } catch {
        // Silently fail — count is non-critical
      }
    },

    async fetchNotifications() {
      state.loading = true;
      try {
        const data = await apiGet<{ notifications: ApiNotification[]; total: number }>(
          '/api/notifications?limit=20',
        );
        state.notifications = data.notifications;
        state.loaded = true;
      } catch {
        // Silently fail
      } finally {
        state.loading = false;
      }
    },

    async markAsRead(ids: string[]) {
      try {
        await apiPost('/api/notifications/read', { ids });
        state.notifications = state.notifications.map((n) =>
          ids.includes(n.id) ? { ...n, status: NotificationStatus.READ } : n,
        );
        state.unreadCount = Math.max(0, state.unreadCount - ids.length);
      } catch {
        // Silently fail
      }
    },

    async markAllAsRead() {
      try {
        await apiPost('/api/notifications/read-all', {});
        state.notifications = state.notifications.map((n) => ({
          ...n,
          status: NotificationStatus.READ,
        }));
        state.unreadCount = 0;
      } catch {
        // Silently fail
      }
    },

    async dismiss(id: string) {
      try {
        await apiDelete(`/api/notifications/${id}`);
        const notification = state.notifications.find((n) => n.id === id);
        state.notifications = state.notifications.filter((n) => n.id !== id);
        if (notification?.status === 'UNREAD') {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      } catch {
        // Silently fail
      }
    },

    addRealtime(notification: ApiNotification) {
      state.notifications = [notification, ...state.notifications];
      state.unreadCount += 1;
    },

    setUnreadCount(count: number) {
      state.unreadCount = count;
    },

    reset() {
      state = {
        unreadCount: 0,
        notifications: [],
        loading: false,
        loaded: false,
      };
    },
  };
}

export const notificationStore = createNotificationStore();
