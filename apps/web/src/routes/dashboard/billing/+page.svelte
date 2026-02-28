<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import * as Sentry from '@sentry/sveltekit';
  import { BillingPlan } from '@twitch-hub/shared-types';
  import { subscriptionStore } from '$lib/stores/subscription.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { posthogStore } from '$lib/stores/posthog.svelte';
  import { apiPost } from '$lib/api';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import type { ApiCheckoutResponse, ApiPortalResponse } from '@twitch-hub/shared-types';

  let checkoutLoading = $state<string | null>(null);
  let portalLoading = $state(false);

  onMount(() => {
    subscriptionStore.fetch();
    const success = $page.url.searchParams.get('success');
    const canceled = $page.url.searchParams.get('canceled');
    if (success) {
      toastStore.add('Payment successful! Your account has been updated.', 'success');
      posthogStore.capture('checkout_success');
      // Refresh subscription data after Stripe redirect
      setTimeout(() => subscriptionStore.fetch(), 1000);
    }
    if (canceled) {
      toastStore.add('Payment was canceled.', 'error');
      posthogStore.capture('checkout_cancelled');
    }
  });

  async function startCheckout(product: 'monthly' | 'annual' | 'credits') {
    checkoutLoading = product;
    posthogStore.capture('checkout_started', { product });
    Sentry.addBreadcrumb({ category: 'billing', message: `Checkout started: ${product}` });
    try {
      const { checkoutUrl } = await apiPost<ApiCheckoutResponse>('/api/billing/checkout', {
        product,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      toastStore.add(message, 'error');
      checkoutLoading = null;
    }
  }

  async function openPortal() {
    portalLoading = true;
    posthogStore.capture('portal_opened');
    Sentry.addBreadcrumb({ category: 'billing', message: 'Portal opened' });
    try {
      const { portalUrl } = await apiPost<ApiPortalResponse>('/api/billing/portal', {});
      window.location.href = portalUrl;
    } catch {
      toastStore.add('Failed to open billing portal', 'error');
      portalLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Billing - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8">
  <PageHeader title="Billing" />

  {#if subscriptionStore.loading && !subscriptionStore.loaded}
    <div class="space-y-4">
      <Skeleton height="8rem" rounded="rounded-xl" />
      <Skeleton height="12rem" rounded="rounded-xl" />
      <Skeleton height="6rem" rounded="rounded-xl" />
    </div>
  {:else}
    <!-- Current Status -->
    <Card padding="md" class="mb-6">
      <h2 class="text-sm font-semibold text-text-primary mb-3">Current Plan</h2>
      <div class="flex flex-wrap items-center gap-4">
        <div>
          {#if subscriptionStore.isSubscriber}
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-brand-900/30 px-3 py-1 text-sm font-medium text-brand-400 border border-brand-500/20"
            >
              Subscriber
            </span>
          {:else}
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1 text-sm font-medium text-text-secondary border border-border-subtle"
            >
              Free
            </span>
          {/if}
        </div>

        <div class="flex gap-6 text-sm text-text-muted">
          {#if !subscriptionStore.isSubscriber}
            <div>
              <span class="text-text-primary font-medium">{subscriptionStore.freeRemaining}</span>
              free session{subscriptionStore.freeRemaining !== 1 ? 's' : ''} remaining
            </div>
          {/if}
          <div>
            <span class="text-text-primary font-medium">{subscriptionStore.sessionCredits}</span>
            credit{subscriptionStore.sessionCredits !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {#if subscriptionStore.isSubscriber && subscriptionStore.cancelAtPeriodEnd && subscriptionStore.currentPeriodEnd}
        <p class="mt-3 text-xs text-warning-400">
          Your subscription will end on {new Date(
            subscriptionStore.currentPeriodEnd,
          ).toLocaleDateString()}.
        </p>
      {/if}

      {#if subscriptionStore.isSubscriber}
        <div class="mt-4">
          <Button size="sm" variant="secondary" onclick={openPortal} loading={portalLoading}>
            Manage Subscription
          </Button>
        </div>
      {/if}
    </Card>

    <!-- Subscribe Section -->
    {#if !subscriptionStore.isSubscriber}
      <div class="mb-6">
        <h2 class="text-sm font-semibold text-text-primary mb-3">
          Subscribe for Unlimited Sessions
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <Card padding="md" class="relative">
            <div class="space-y-2">
              <h3 class="text-sm font-semibold text-text-primary">Monthly</h3>
              <p class="text-2xl font-bold text-text-primary">
                2<span class="text-sm font-normal text-text-muted">&euro;/mo</span>
              </p>
              <p class="text-xs text-text-muted">Unlimited sessions, cancel anytime</p>
            </div>
            <div class="mt-4">
              <Button
                size="sm"
                variant="primary"
                class="w-full"
                onclick={() => startCheckout('monthly')}
                loading={checkoutLoading === 'monthly'}
                disabled={checkoutLoading !== null}
              >
                Subscribe Monthly
              </Button>
            </div>
          </Card>

          <Card padding="md" class="relative border-brand-500/30">
            <span
              class="absolute -top-2.5 right-3 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white"
            >
              Save 25%
            </span>
            <div class="space-y-2">
              <h3 class="text-sm font-semibold text-text-primary">Annual</h3>
              <p class="text-2xl font-bold text-text-primary">
                18<span class="text-sm font-normal text-text-muted">&euro;/yr</span>
              </p>
              <p class="text-xs text-text-muted">~1.50&euro;/mo &middot; Unlimited sessions</p>
            </div>
            <div class="mt-4">
              <Button
                size="sm"
                variant="primary"
                class="w-full"
                onclick={() => startCheckout('annual')}
                loading={checkoutLoading === 'annual'}
                disabled={checkoutLoading !== null}
              >
                Subscribe Annual
              </Button>
            </div>
          </Card>
        </div>
      </div>
    {/if}

    <!-- Credit Packs Section -->
    <div>
      <h2 class="text-sm font-semibold text-text-primary mb-3">Session Credit Packs</h2>
      <Card padding="md">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-sm font-semibold text-text-primary">5 Session Credits</h3>
            <p class="text-xs text-text-muted">
              1&euro; one-time purchase &middot; Credits never expire
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onclick={() => startCheckout('credits')}
            loading={checkoutLoading === 'credits'}
            disabled={checkoutLoading !== null}
          >
            Buy Credits
          </Button>
        </div>
      </Card>
    </div>
  {/if}
</div>
