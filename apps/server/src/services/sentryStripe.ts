import * as Sentry from '@sentry/node';
import type Stripe from 'stripe';

export function isStripeError(
  err: unknown,
): err is { code?: string; type?: string; requestId?: string; message: string } {
  return (
    err instanceof Error &&
    ('type' in err || 'code' in err || 'requestId' in err) &&
    typeof (err as Record<string, unknown>).type === 'string'
  );
}

export function captureStripeError(
  err: unknown,
  operation: string,
  context?: Record<string, unknown>,
): void {
  const tags: Record<string, string> = { module: 'stripe', 'stripe.operation': operation };
  const extra: Record<string, unknown> = { ...context };

  if (isStripeError(err)) {
    if (err.code) tags['stripe.error_code'] = err.code;
    extra.stripeErrorType = err.type;
    extra.stripeRequestId = err.requestId;
  }

  Sentry.captureException(err, {
    tags,
    extra,
    fingerprint: ['stripe', operation, isStripeError(err) ? (err.code ?? 'unknown') : 'unknown'],
  });
}

export function addStripeBreadcrumb(
  operation: string,
  status: 'ok' | 'error',
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category: 'stripe',
    message: operation,
    level: status === 'ok' ? 'info' : 'error',
    data,
  });
}

export function setStripeUserContext(userId: string, customerId?: string): void {
  Sentry.setUser({ id: userId });
  if (customerId) {
    Sentry.setTag('stripe.customer_id', customerId);
  }
}

export async function withStripeSpan<T>(
  opName: string,
  context: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    { op: 'stripe', name: opName, attributes: context as Record<string, string> },
    async () => {
      try {
        const result = await fn();
        addStripeBreadcrumb(opName, 'ok', context);
        return result;
      } catch (err) {
        captureStripeError(err, opName, context);
        throw err;
      }
    },
  );
}
