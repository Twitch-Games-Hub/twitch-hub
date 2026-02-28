<script lang="ts">
  import { onMount } from 'svelte';
  import {
    SessionStatus,
    type GameType,
    type ApiSessionsResponse,
    type ApiSessionWithGame,
  } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META, SESSION_STATUS_STYLES } from '$lib/constants';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { formatDate, timeAgo } from '$lib/utils/date';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  let activeSessions = $state<ApiSessionWithGame[]>([]);
  let archivedSessions = $state<ApiSessionWithGame[]>([]);
  let loadingActive = $state(true);
  let loadingArchive = $state(true);
  let loadingMore = $state(false);
  let archivePage = $state(1);
  let archiveTotal = $state(0);

  const archiveLimit = 20;
  const hasMoreArchive = $derived(archivePage * archiveLimit < archiveTotal);

  async function fetchActiveSessions() {
    loadingActive = true;
    try {
      const [liveRes, lobbyRes] = await Promise.all([
        fetch(`/api/sessions?page=1&limit=10&status=${SessionStatus.LIVE}`),
        fetch(`/api/sessions?page=1&limit=10&status=${SessionStatus.LOBBY}`),
      ]);
      if (!liveRes.ok || !lobbyRes.ok) throw new Error('Failed to fetch');
      const [liveData, lobbyData]: ApiSessionsResponse[] = await Promise.all([
        liveRes.json(),
        lobbyRes.json(),
      ]);
      activeSessions = [...liveData.sessions, ...lobbyData.sessions];
    } catch {
      toastStore.add('Failed to load active sessions', 'error');
    } finally {
      loadingActive = false;
    }
  }

  async function fetchArchivedSessions(reset = false) {
    if (reset) {
      archivePage = 1;
      loadingArchive = true;
    } else {
      loadingMore = true;
    }

    try {
      const params = new URLSearchParams({
        page: String(archivePage),
        limit: String(archiveLimit),
        status: SessionStatus.ENDED,
      });
      const res = await fetch(`/api/sessions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: ApiSessionsResponse = await res.json();
      if (reset) {
        archivedSessions = data.sessions;
      } else {
        archivedSessions = [...archivedSessions, ...data.sessions];
      }
      archiveTotal = data.total;
    } catch {
      toastStore.add('Failed to load archived sessions', 'error');
    } finally {
      loadingArchive = false;
      loadingMore = false;
    }
  }

  function loadMoreArchive() {
    archivePage += 1;
    fetchArchivedSessions(false);
  }

  onMount(() => {
    fetchActiveSessions();
    fetchArchivedSessions(true);
  });
</script>

{#snippet sessionCard(session: ApiSessionWithGame)}
  {@const statusStyle = SESSION_STATUS_STYLES[session.status as SessionStatus]}
  {@const typeMeta = GAME_TYPE_META[session.game.type as GameType]}
  <Card padding="md">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0 flex-1">
        <div class="mb-1 flex flex-wrap items-center gap-2">
          <h3 class="truncate font-semibold text-text-primary">{session.game.title}</h3>
          {#if typeMeta}
            <span
              class="rounded-full bg-brand-600/20 px-2 py-0.5 text-xs font-medium text-brand-400"
            >
              {typeMeta.label}
            </span>
          {/if}
          {#if statusStyle}
            <span class="rounded-full px-2 py-0.5 text-xs font-bold {statusStyle.classes}">
              {statusStyle.label}
            </span>
          {/if}
        </div>
        <div class="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <span>Round {session.currentRound}</span>
          <span>{session.responseCount} response{session.responseCount !== 1 ? 's' : ''}</span>
          {#if session.startedAt}
            <span title={formatDate(session.startedAt)}
              >Started {timeAgo(session.startedAt)} ago</span
            >
          {:else}
            <span title={formatDate(session.createdAt)}
              >Created {timeAgo(session.createdAt)} ago</span
            >
          {/if}
        </div>
      </div>
      <div class="flex-shrink-0">
        {#if session.status === SessionStatus.LOBBY || session.status === SessionStatus.LIVE}
          <Button href="/dashboard/sessions/{session.id}" size="sm">Resume</Button>
        {:else}
          <Button href="/dashboard/sessions/{session.id}" variant="secondary" size="sm">
            View
          </Button>
        {/if}
      </div>
    </div>
  </Card>
{/snippet}

<svelte:head>
  <title>Sessions - Dashboard</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
  <PageHeader title="Sessions" subtitle="Manage your game sessions" back="/dashboard" />

  <!-- Active Sessions -->
  {#if loadingActive}
    <div class="space-y-4">
      <Skeleton height="6rem" rounded="rounded-xl" />
    </div>
  {:else if activeSessions.length > 0}
    <div class="mb-10 space-y-3">
      {#each activeSessions as session (session.id)}
        {@render sessionCard(session)}
      {/each}
    </div>
  {/if}

  <!-- Archive Section -->
  <div>
    <h2 class="mb-4 text-lg font-semibold text-text-secondary">Archive</h2>

    {#if loadingArchive}
      <div class="space-y-4">
        {#each Array(3) as _, i (i)}
          <Skeleton height="6rem" rounded="rounded-xl" />
        {/each}
      </div>
    {:else if archivedSessions.length === 0 && activeSessions.length === 0}
      <EmptyState
        title="No sessions yet"
        description="Start a live session from one of your games to see it here."
      >
        {#snippet action()}
          <Button href="/dashboard">Go to Games</Button>
        {/snippet}
      </EmptyState>
    {:else if archivedSessions.length === 0}
      <p class="text-sm text-text-muted">No archived sessions.</p>
    {:else}
      <div class="space-y-3">
        {#each archivedSessions as session (session.id)}
          {@render sessionCard(session)}
        {/each}
      </div>

      {#if hasMoreArchive}
        <div class="mt-8 text-center">
          <Button onclick={loadMoreArchive} loading={loadingMore} variant="secondary">
            Load More
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</div>
