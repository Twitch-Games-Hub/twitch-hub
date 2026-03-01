<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount, onDestroy } from 'svelte';
  import {
    SessionStatus,
    type ApiSessionsResponse,
    type ApiSessionWithGame,
  } from '@twitch-hub/shared-types';

  let sessions = $state<ApiSessionWithGame[]>([]);
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  async function fetchActiveSessions() {
    try {
      const [liveRes, lobbyRes] = await Promise.all([
        fetch(`/api/sessions?page=1&limit=10&status=${SessionStatus.LIVE}`),
        fetch(`/api/sessions?page=1&limit=10&status=${SessionStatus.LOBBY}`),
      ]);
      if (!liveRes.ok || !lobbyRes.ok) return;
      const [liveData, lobbyData]: ApiSessionsResponse[] = await Promise.all([
        liveRes.json(),
        lobbyRes.json(),
      ]);
      sessions = [...liveData.sessions, ...lobbyData.sessions];
    } catch {
      // Silently fail — bar is non-critical
    }
  }

  onMount(() => {
    fetchActiveSessions();
    pollTimer = setInterval(fetchActiveSessions, 30_000);
  });

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
  });
</script>

{#if sessions.length > 0}
  <div class="border-b border-border-subtle bg-surface-secondary/60 px-4 py-2 overflow-x-auto">
    <div class="mx-auto flex max-w-5xl items-center gap-2">
      <span class="flex-shrink-0 text-xs font-medium text-text-muted">Active:</span>
      <div class="flex items-center gap-2">
        {#each sessions as session (session.id)}
          <a
            href={resolve(`/dashboard/sessions/${session.id}`)}
            class="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated px-3 py-1 text-xs transition-colors hover:border-brand-500/40 hover:bg-surface-tertiary"
          >
            <span
              class="h-2 w-2 flex-shrink-0 rounded-full {session.status === SessionStatus.LIVE
                ? 'bg-success-500'
                : 'bg-warning-500'}"
            ></span>
            <span class="max-w-[8rem] truncate text-text-primary">{session.game.title}</span>
            <span class="flex-shrink-0 text-brand-400">Resume</span>
          </a>
        {/each}
      </div>
    </div>
  </div>
{/if}
