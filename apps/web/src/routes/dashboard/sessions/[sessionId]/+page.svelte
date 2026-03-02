<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Pathname } from '$app/types';
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { apiGet } from '$lib/api';
  import { toastStore } from '$lib/stores/toast.svelte';
  import {
    SessionStatus,
    type ApiSessionDetail,
    type FinalResults,
    type GameType,
  } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META, SESSION_STATUS_STYLES } from '$lib/constants';
  import { formatDate } from '$lib/utils/date';
  import { getDashboardSocket, disconnectDashboard } from '$lib/socket';
  import { gameStore } from '$lib/stores/game.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import SessionResults from '$lib/components/dashboard/SessionResults.svelte';
  import LiveSessionPanel from '$lib/components/dashboard/LiveSessionPanel.svelte';
  import InviteFollowersModal from '$lib/components/dashboard/InviteFollowersModal.svelte';
  import { ArrowLeftIcon, SendIcon } from '$lib/components/ui/icons';

  let session = $state<ApiSessionDetail | null>(null);
  let results = $state<FinalResults | null>(null);
  let loading = $state(true);
  let inviteModalOpen = $state(false);

  const sessionId = $derived($page.params.sessionId ?? '');
  const source = $derived($page.url.searchParams.get('source'));
  const appUrl = $derived($page.url.origin);

  const backHref = $derived(
    source === 'explore'
      ? '/explore'
      : session
        ? `/dashboard/games/${session.gameId}`
        : '/dashboard',
  );

  const statusStyle = $derived(
    session ? SESSION_STATUS_STYLES[session.status as SessionStatus] : null,
  );

  const gameTypeMeta = $derived(session ? GAME_TYPE_META[session.game.type as GameType] : null);

  const isActive = $derived(
    session && (session.status === SessionStatus.LOBBY || session.status === SessionStatus.LIVE),
  );

  onMount(async () => {
    try {
      const [sessionRes, resultsRes] = await Promise.allSettled([
        apiGet<ApiSessionDetail>(`/api/sessions/${sessionId}`),
        apiGet<FinalResults>(`/api/sessions/${sessionId}/results`),
      ]);

      if (sessionRes.status === 'fulfilled') {
        session = sessionRes.value;
      }
      if (resultsRes.status === 'fulfilled') {
        results = resultsRes.value;
      }

      // Wire up socket for active (non-ended) sessions
      if (session && session.status !== SessionStatus.ENDED) {
        try {
          const tokenRes = await fetch('/api/auth/token');
          const { token } = await tokenRes.json();
          const socket = getDashboardSocket(token);
          gameStore.bindSocket(socket);
          gameStore.rejoinSession(session.id);
        } catch {
          toastStore.add('Failed to connect to live session', 'error');
        }
      }
    } catch {
      toastStore.add('Failed to load session', 'error');
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    gameStore.reset();
    disconnectDashboard();
  });
</script>

<svelte:head>
  <title>{session?.game.title || 'Session'} - Session Details - Dashboard</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 px-4 py-8">
  {#if loading}
    <!-- Loading skeleton matching header shape -->
    <div class="space-y-6">
      <div class="overflow-hidden rounded-xl border border-border-default">
        <Skeleton height="10rem" rounded="rounded-none" />
        <div class="flex items-center gap-4 p-4">
          <Skeleton width="3.5rem" height="3.5rem" rounded="rounded-lg" />
          <div class="flex-1 space-y-2">
            <Skeleton width="200px" height="1.5rem" />
            <Skeleton width="120px" height="1rem" />
          </div>
        </div>
      </div>
      <Skeleton height="16rem" rounded="rounded-xl" />
    </div>
  {:else if session}
    <!-- Rich header card -->
    <div class="overflow-hidden rounded-xl border border-border-default bg-surface-secondary">
      <!-- Cover image / gradient background -->
      <div class="relative h-32 sm:h-40">
        {#if session.game.coverImageUrl}
          <img
            src={session.game.coverImageUrl}
            alt=""
            class="absolute inset-0 h-full w-full object-cover"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-surface-secondary via-surface-secondary/80 to-surface-secondary/30"
          ></div>
        {:else}
          <div
            class="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-surface-secondary to-surface-secondary"
          ></div>
        {/if}

        <!-- Back button -->
        <a
          href={resolve(backHref as Pathname)}
          class="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-surface-primary/80 text-text-muted backdrop-blur-sm transition-colors hover:bg-surface-primary hover:text-text-primary"
        >
          <ArrowLeftIcon size={16} />
        </a>
      </div>

      <!-- Game info row -->
      <div class="relative -mt-8 px-4 pb-4 sm:px-6">
        <div class="flex flex-wrap items-end gap-4">
          <!-- Thumbnail -->
          {#if session.game.coverImageUrl}
            <img
              src={session.game.coverImageUrl}
              alt={session.game.title}
              class="h-14 w-14 flex-shrink-0 rounded-lg border-2 border-surface-secondary object-cover shadow-lg"
            />
          {:else}
            <div
              class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border-2 border-surface-secondary bg-brand-900/40 text-xl shadow-lg"
            >
              {gameTypeMeta?.icon === 'fire'
                ? '🔥'
                : gameTypeMeta?.icon === 'balance'
                  ? '⚖️'
                  : gameTypeMeta?.icon === 'blind'
                    ? '🎵'
                    : '🏆'}
            </div>
          {/if}

          <!-- Title + pills -->
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-xl font-bold text-text-primary sm:text-2xl">
              {session.game.title}
            </h1>
            <div class="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              {#if gameTypeMeta}
                <span
                  class="rounded-md bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-muted"
                >
                  {gameTypeMeta.label}
                </span>
              {/if}
              {#if statusStyle}
                <span
                  class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium {statusStyle.classes}"
                >
                  {statusStyle.label}
                </span>
              {/if}
              <span class="text-xs text-text-muted">{session.responseCount} responses</span>
              {#if session.endedAt}
                <span class="text-xs text-text-muted">Ended {formatDate(session.endedAt)}</span>
              {:else if session.startedAt}
                <span class="text-xs text-text-muted">Started {formatDate(session.startedAt)}</span>
              {/if}
            </div>
          </div>

          <!-- Invite button -->
          {#if isActive}
            <Button size="sm" variant="secondary" onclick={() => (inviteModalOpen = true)}>
              <SendIcon size={14} />
              Invite
            </Button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Results content -->
    {#if session.status === SessionStatus.ENDED && results}
      <SessionResults finalResults={results} game={session.game} />
    {:else if session.status === SessionStatus.ENDED}
      <EmptyState
        title="No Results Available"
        description="This session ended before results were recorded."
      >
        {#snippet action()}
          <Button href={backHref}>Go Back</Button>
        {/snippet}
      </EmptyState>
    {:else}
      <LiveSessionPanel
        game={session.game}
        {sessionId}
        {appUrl}
        onStartGame={() => gameStore.startGame(sessionId)}
        onNextRound={() => gameStore.nextRound(sessionId)}
        onEndGame={() => gameStore.endGame(sessionId)}
      />
    {/if}
  {:else}
    <EmptyState
      title="Session not found"
      description="This session doesn't exist or you don't have access."
    >
      {#snippet action()}
        <Button href={backHref}>Go Back</Button>
      {/snippet}
    </EmptyState>
  {/if}
</div>

{#if session}
  <InviteFollowersModal bind:open={inviteModalOpen} sessionId={session.id} />
{/if}
