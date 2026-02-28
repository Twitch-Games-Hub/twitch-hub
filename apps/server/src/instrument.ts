import * as Sentry from '@sentry/node';

const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampler: ({ name, parentSampled }) => {
    // Always sample Stripe-related spans and webhook route
    if (name.includes('stripe.') || name.includes('/api/billing/webhook')) return 1.0;
    // Respect parent decision if set
    if (typeof parentSampled === 'boolean') return parentSampled ? 1.0 : 0;
    return isProduction ? 0.2 : 1.0;
  },
});
