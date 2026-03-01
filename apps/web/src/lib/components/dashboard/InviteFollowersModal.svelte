<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { apiGet, apiPost } from '$lib/api';
  import { toastStore } from '$lib/stores/toast.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

  interface Candidate {
    userId: string;
    twitchId: string;
    twitchLogin: string;
    displayName: string;
    profileImageUrl: string | null;
  }

  let {
    open = $bindable(false),
    sessionId,
  }: {
    open: boolean;
    sessionId: string;
  } = $props();

  let candidates = $state<Candidate[]>([]);
  let selected = new SvelteSet<string>();
  let search = $state('');
  let loading = $state(false);
  let sending = $state(false);
  let loaded = $state(false);

  const filtered = $derived(
    search
      ? candidates.filter(
          (c) =>
            c.displayName.toLowerCase().includes(search.toLowerCase()) ||
            c.twitchLogin.toLowerCase().includes(search.toLowerCase()),
        )
      : candidates,
  );

  const allSelected = $derived(
    filtered.length > 0 && filtered.every((c) => selected.has(c.twitchId)),
  );

  $effect(() => {
    if (open && !loaded) {
      fetchCandidates();
    }
  });

  async function fetchCandidates() {
    loading = true;
    try {
      const data = await apiGet<{ candidates: Candidate[] }>(
        `/api/sessions/${sessionId}/invite-candidates`,
      );
      candidates = data.candidates;
      loaded = true;
    } catch {
      toastStore.add('Failed to load followers', 'error');
    } finally {
      loading = false;
    }
  }

  function toggleAll() {
    if (allSelected) {
      for (const c of filtered) {
        selected.delete(c.twitchId);
      }
    } else {
      for (const c of filtered) {
        selected.add(c.twitchId);
      }
    }
  }

  function toggleCandidate(twitchId: string) {
    if (selected.has(twitchId)) {
      selected.delete(twitchId);
    } else {
      selected.add(twitchId);
    }
  }

  async function sendInvites() {
    if (selected.size === 0) return;
    sending = true;
    try {
      const data = await apiPost<{ invited: number; skipped: number }>(
        `/api/sessions/${sessionId}/invite`,
        { followerTwitchIds: Array.from(selected) },
      );
      toastStore.add(`Invited ${data.invited} follower${data.invited !== 1 ? 's' : ''}`, 'success');
      open = false;
      selected.clear();
    } catch {
      toastStore.add('Failed to send invites', 'error');
    } finally {
      sending = false;
    }
  }
</script>

<Modal bind:open title="Invite Followers">
  {#if loading}
    <div class="space-y-3">
      {#each [1, 2, 3, 4] as n (n)}
        <Skeleton height="2.5rem" rounded="rounded-lg" />
      {/each}
    </div>
  {:else if candidates.length === 0}
    <p class="py-4 text-center text-sm text-text-muted">
      No followers with app accounts found. Only followers who have signed up for Twitch Hub can
      receive invites.
    </p>
  {:else}
    <div class="space-y-3">
      <Input bind:value={search} placeholder="Search followers..." inputSize="sm" />

      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={allSelected}
            onchange={toggleAll}
            class="rounded border-border-default bg-surface-tertiary text-brand-500"
          />
          Select All ({filtered.length})
        </label>
        <span class="text-xs text-text-muted">{selected.size} selected</span>
      </div>

      <div class="max-h-60 overflow-y-auto space-y-1">
        {#each filtered as candidate (candidate.twitchId)}
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-tertiary"
          >
            <input
              type="checkbox"
              checked={selected.has(candidate.twitchId)}
              onchange={() => toggleCandidate(candidate.twitchId)}
              class="rounded border-border-default bg-surface-tertiary text-brand-500"
            />
            {#if candidate.profileImageUrl}
              <img src={candidate.profileImageUrl} alt="" class="h-7 w-7 rounded-full" />
            {:else}
              <div class="h-7 w-7 rounded-full bg-surface-tertiary"></div>
            {/if}
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-text-primary">{candidate.displayName}</p>
              <p class="truncate text-xs text-text-muted">@{candidate.twitchLogin}</p>
            </div>
          </label>
        {/each}
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onclick={() => (open = false)}>Cancel</Button>
        <Button size="sm" onclick={sendInvites} loading={sending} disabled={selected.size === 0}>
          Invite {selected.size} follower{selected.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  {/if}
</Modal>
