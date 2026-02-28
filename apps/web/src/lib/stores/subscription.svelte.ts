import { BillingPlan, type ApiSubscription } from '@twitch-hub/shared-types';
import { apiGet } from '$lib/api';
import * as Sentry from '@sentry/sveltekit';

interface SubscriptionState {
  plan: BillingPlan;
  sessionCredits: number;
  freeSessionsUsed: number;
  freeSessionsLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  loading: boolean;
  loaded: boolean;
}

function createSubscriptionStore() {
  let state = $state<SubscriptionState>({
    plan: BillingPlan.FREE,
    sessionCredits: 0,
    freeSessionsUsed: 0,
    freeSessionsLimit: 2,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    loading: false,
    loaded: false,
  });

  return {
    get plan() {
      return state.plan;
    },
    get sessionCredits() {
      return state.sessionCredits;
    },
    get freeSessionsUsed() {
      return state.freeSessionsUsed;
    },
    get freeSessionsLimit() {
      return state.freeSessionsLimit;
    },
    get freeRemaining() {
      return Math.max(0, state.freeSessionsLimit - state.freeSessionsUsed);
    },
    get currentPeriodEnd() {
      return state.currentPeriodEnd;
    },
    get cancelAtPeriodEnd() {
      return state.cancelAtPeriodEnd;
    },
    get isSubscriber() {
      return state.plan === BillingPlan.SUBSCRIBER;
    },
    get canCreateSession() {
      if (state.plan === BillingPlan.SUBSCRIBER) return true;
      if (state.freeSessionsUsed < state.freeSessionsLimit) return true;
      if (state.sessionCredits > 0) return true;
      return false;
    },
    get loading() {
      return state.loading;
    },
    get loaded() {
      return state.loaded;
    },

    async fetch() {
      state.loading = true;
      try {
        const data = await apiGet<ApiSubscription>('/api/billing/subscription');
        state.plan = data.plan;
        state.sessionCredits = data.sessionCredits;
        state.freeSessionsUsed = data.freeSessionsUsed;
        state.freeSessionsLimit = data.freeSessionsLimit;
        state.currentPeriodEnd = data.currentPeriodEnd;
        state.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
        state.loaded = true;
      } catch (err) {
        Sentry.addBreadcrumb({
          category: 'billing',
          message: 'Failed to fetch subscription data',
          level: 'warning',
          data: { error: err instanceof Error ? err.message : 'unknown' },
        });
      } finally {
        state.loading = false;
      }
    },

    reset() {
      state.plan = BillingPlan.FREE;
      state.sessionCredits = 0;
      state.freeSessionsUsed = 0;
      state.freeSessionsLimit = 2;
      state.currentPeriodEnd = null;
      state.cancelAtPeriodEnd = false;
      state.loaded = false;
    },
  };
}

export const subscriptionStore = createSubscriptionStore();
