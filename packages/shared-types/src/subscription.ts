export enum BillingPlan {
  FREE = 'FREE',
  SUBSCRIBER = 'SUBSCRIBER',
}

export interface SessionBudget {
  canCreateSession: boolean;
  source: 'subscriber' | 'free' | 'credits' | 'none';
  freeRemaining: number;
  creditsRemaining: number;
  isSubscriber: boolean;
}

export interface ApiSubscription {
  plan: BillingPlan;
  sessionCredits: number;
  freeSessionsUsed: number;
  freeSessionsLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface ApiCheckoutResponse {
  checkoutUrl: string;
}

export interface ApiPortalResponse {
  portalUrl: string;
}

export const FREE_SESSIONS_PER_MONTH = 2;
export const CREDITS_PER_PACK = 5;
