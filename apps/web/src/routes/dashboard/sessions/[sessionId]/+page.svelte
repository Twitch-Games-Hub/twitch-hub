<script lang="ts">
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
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import SessionResults from '$lib/components/dashboard/SessionResults.svelte';
  import LiveSessionPanel from '$lib/components/dashboard/LiveSessionPanel.svelte';
  import InviteFollowersModal from '$lib/components/dashboard/InviteFollowersModal.svelte';
  import { SendIcon } from '$lib/components/ui/icons';

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

<div class="mx-auto max-w-4xl space-y-6 px-4 py-8">
  {#if loading}
    <div class="space-y-6">
      <Skeleton width="300px" height="2.5rem" />
      <Skeleton height="1rem" width="150px" />
      <Skeleton height="16rem" rounded="rounded-xl" />
    </div>
  {:else if session}
    <PageHeader
      title={session.game.title}
      subtitle={GAME_TYPE_META[session.game.type as GameType]?.label || session.game.type}
      back={backHref}
    />

    <!-- Session metadata -->
    <div class="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
      {#if statusStyle}
        <span
          class="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium {statusStyle.classes}"
        >
          {statusStyle.label}
        </span>
      {/if}
      <span>{session.responseCount} responses</span>
      {#if session.endedAt}
        <span>Ended {formatDate(session.endedAt)}</span>
      {:else if session.startedAt}
        <span>Started {formatDate(session.startedAt)}</span>
      {/if}
      {#if session.status === SessionStatus.LOBBY || session.status === SessionStatus.LIVE}
        <Button size="sm" variant="secondary" onclick={() => (inviteModalOpen = true)}>
          <SendIcon size={14} />
          Invite Followers
        </Button>
      {/if}
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
