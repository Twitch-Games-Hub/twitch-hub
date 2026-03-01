import * as Sentry from '@sentry/node';

export function trackEvent(userId: string, event: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: event,
    level: 'info',
    data: { userId, ...data },
  });
}
