export enum NotificationType {
  SESSION_INVITE = 'SESSION_INVITE',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  DISMISSED = 'DISMISSED',
}

export interface ApiNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: NotificationStatus;
  createdAt: string;
}

export interface NotificationCountResponse {
  unreadCount: number;
}
