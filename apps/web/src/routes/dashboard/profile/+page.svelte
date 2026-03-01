<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiGet } from '$lib/api';
  import type { ProfileData } from '@twitch-hub/shared-types';
  import { loadMorePaginated } from '$lib/utils/pagination';
  import { GAME_TYPE_META } from '$lib/constants';
  import type { GameType } from '@twitch-hub/shared-types';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { formatDate, formatDuration, timeAgo } from '$lib/utils/date';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import BillingTab from '$lib/components/profile/BillingTab.svelte';
  import ModeratorsTab from '$lib/components/profile/ModeratorsTab.svelte';

  type Tab = 'profile' | 'billing' | 'moderators';
  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
    { id: 'moderators', label: 'Moderators' },
  ];

  let profile = $state<ProfileData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let loadingMoreFollowed = $state(false);
  let loadingMoreFollowers = $state(false);

  // Derive active tab from URL params
  const activeTab: Tab = $derived.by(() => {
    const tab = $page.url.searchParams.get('tab');
    if (tab === 'billing' || tab === 'moderators') return tab;
    // Auto-switch to billing on Stripe redirects
    if ($page.url.searchParams.has('success') || $page.url.searchParams.has('canceled'))
      return 'billing';
    return 'profile';
  });

  const tabTitle = $derived(
    activeTab === 'billing'
      ? 'Billing - Profile'
      : activeTab === 'moderators'
        ? 'Moderators - Profile'
        : 'Profile',
  );

  const billingSuccess = $derived($page.url.searchParams.has('success'));
  const billingCanceled = $derived($page.url.searchParams.has('canceled'));

  function switchTab(tab: Tab) {
    const url = new URL($page.url);
    if (tab === 'profile') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    // Clear Stripe params when switching away from billing
    url.searchParams.delete('success');
    url.searchParams.delete('canceled');
    goto(url.pathname + url.search, { replaceState: true });
  }

  onMount(async () => {
    try {
      profile = await apiGet<ProfileData>('/api/profile');
      // Sync fresh Twitch profile image to auth store so navbar updates immediately
      if (profile?.twitchUser?.profile_image_url && authStore.user) {
        authStore.user.profileImageUrl = profile.twitchUser.profile_image_url;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load profile';
      toastStore.add('Failed to load profile', 'error');
    } finally {
      loading = false;
    }
  });

  const liveStreamIds = $derived(
    new Set(profile?.followedStreams?.data?.map((s) => s.user_id) ?? []),
  );

  const hasMissingScopes = $derived(
    profile && (profile.followed === null || profile.followers === null),
  );

  async function loadMoreFollowed() {
    if (!profile?.followed?.pagination.cursor) return;
    loadingMoreFollowed = true;
    try {
      profile.followed = await loadMorePaginated('/api/profile/followed', profile.followed);
    } catch {
      toastStore.add('Failed to load more', 'error');
    } finally {
      loadingMoreFollowed = false;
    }
  }

  async function loadMoreFollowers() {
    if (!profile?.followers?.pagination.cursor) return;
    loadingMoreFollowers = true;
    try {
      profile.followers = await loadMorePaginated('/api/profile/followers', profile.followers);
    } catch {
      toastStore.add('Failed to load more', 'error');
    } finally {
      loadingMoreFollowers = false;
    }
  }
</script>

<svelte:head>
  <title>{tabTitle} - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
  <PageHeader title="Profile" back="/dashboard" />

  <!-- Tabs -->
  <div class="mb-6 flex border-b border-border-default">
    {#each TABS as tab (tab.id)}
      <button
        class="relative px-4 py-2.5 text-sm font-medium transition-colors {activeTab === tab.id
          ? 'text-brand-400'
          : 'text-text-muted hover:text-text-secondary'}"
        onclick={() => switchTab(tab.id)}
      >
        {tab.label}
        {#if activeTab === tab.id}
          <span class="absolute inset-x-0 bottom-0 h-0.5 bg-brand-400"></span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Profile Tab -->
  {#if activeTab === 'profile'}
    {#if loading}
      <!-- Loading skeleton -->
      <div class="space-y-6">
        <Card padding="lg">
          <div class="flex items-center gap-6">
            <Skeleton width="5rem" height="5rem" rounded="rounded-full" />
            <div class="flex-1 space-y-3">
              <Skeleton width="12rem" height="1.5rem" />
              <Skeleton width="8rem" height="1rem" />
              <Skeleton width="16rem" height="1rem" />
            </div>
          </div>
        </Card>
        <div class="grid gap-6 md:grid-cols-2">
          <Skeleton height="10rem" rounded="rounded-xl" />
          <Skeleton height="10rem" rounded="rounded-xl" />
        </div>
        <Skeleton height="8rem" rounded="rounded-xl" />
      </div>
    {:else if error}
      <Card padding="lg">
        <p class="text-center text-text-muted">{error}</p>
      </Card>
    {:else if profile}
      <div class="space-y-6">
        <!-- Profile Header -->
        <Card
          padding="lg"
          class={profile.isStreamer
            ? 'border-brand-500/30 bg-gradient-to-br from-brand-600/5 to-transparent'
            : ''}
        >
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div class="relative flex-shrink-0">
              {#if profile.twitchUser?.profile_image_url}
                <img
                  src={profile.twitchUser.profile_image_url}
                  alt={profile.twitchUser.display_name}
                  class="h-20 w-20 rounded-full border-2 {profile.isStreamer
                    ? 'border-brand-400 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                    : 'border-border-default'}"
                />
              {:else}
                <div
                  class="flex h-20 w-20 items-center justify-center rounded-full bg-surface-elevated text-2xl font-bold text-text-muted"
                >
                  ?
                </div>
              {/if}
              {#if profile.stream}
                <span class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center">
                  <span
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-75"
                  ></span>
                  <span class="relative inline-flex h-3 w-3 rounded-full bg-success-500"></span>
                </span>
              {/if}
            </div>

            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-2xl font-bold text-text-primary">
                  {profile.twitchUser?.display_name ?? 'Unknown'}
                </h2>
                {#if profile.stream}
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full bg-danger-600/20 px-2.5 py-0.5 text-xs font-semibold text-danger-500"
                  >
                    <span class="h-2 w-2 rounded-full bg-danger-500"></span>
                    LIVE
                  </span>
                {/if}
                {#if profile.twitchUser?.broadcaster_type === 'partner'}
                  <span
                    class="rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs font-medium text-brand-400"
                    >Partner</span
                  >
                {:else if profile.twitchUser?.broadcaster_type === 'affiliate'}
                  <span
                    class="rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs font-medium text-brand-400"
                    >Affiliate</span
                  >
                {/if}
                {#if profile.isStreamer}
                  <span
                    class="rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs font-medium text-brand-400"
                    >Streamer</span
                  >
                {/if}
                {#if profile.twitchUser?.type}
                  <span
                    class="rounded-full bg-warning-900/50 px-2.5 py-0.5 text-xs font-medium text-warning-500"
                  >
                    {profile.twitchUser.type}
                  </span>
                {/if}
              </div>

              {#if profile.twitchUser}
                <p class="mt-1 text-sm text-text-muted">@{profile.twitchUser.login}</p>
              {/if}

              {#if profile.twitchUser?.description}
                <p class="mt-3 text-sm text-text-secondary">{profile.twitchUser.description}</p>
              {/if}

              {#if profile.twitchUser?.created_at}
                <p class="mt-2 text-xs text-text-muted">
                  Member since {formatDate(profile.twitchUser.created_at)}
                </p>
              {/if}
            </div>
          </div>
        </Card>

        <!-- Channel Info -->
        {#if profile.channel}
          <Card padding="lg">
            <h3 class="mb-3 text-lg font-semibold text-text-primary">Channel Info</h3>
            <div class="space-y-2">
              {#if profile.channel.title}
                <p class="text-sm text-text-secondary">
                  <span class="font-medium text-text-primary">Title:</span>
                  {profile.channel.title}
                </p>
              {/if}
              {#if profile.channel.game_name}
                <p class="text-sm text-text-secondary">
                  <span class="font-medium text-text-primary">Category:</span>
                  {profile.channel.game_name}
                </p>
              {/if}
              {#if profile.channel.broadcaster_language}
                <p class="text-sm text-text-secondary">
                  <span class="font-medium text-text-primary">Language:</span>
                  {profile.channel.broadcaster_language.toUpperCase()}
                </p>
              {/if}
              {#if profile.channel.tags?.length}
                <div class="flex flex-wrap gap-2 pt-1">
                  {#each profile.channel.tags as tag}
                    <span
                      class="rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs text-text-muted"
                    >
                      {tag}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          </Card>
        {/if}

        <!-- Live Stream -->
        {#if profile.stream}
          <Card padding="lg">
            <h3 class="mb-3 text-lg font-semibold text-text-primary">
              <span class="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-danger-500"></span>
              Currently Live
            </h3>
            <div class="space-y-3">
              <p class="text-sm text-text-secondary">{profile.stream.title}</p>
              <div class="flex flex-wrap gap-4 text-sm text-text-muted">
                {#if profile.stream.game_name}
                  <span
                    >Playing <span class="text-text-secondary">{profile.stream.game_name}</span
                    ></span
                  >
                {/if}
                <span>{profile.stream.viewer_count.toLocaleString()} viewers</span>
                <span>Uptime: {timeAgo(profile.stream.started_at)}</span>
              </div>
              {#if profile.stream.thumbnail_url}
                <img
                  src={profile.stream.thumbnail_url
                    .replace('{width}', '440')
                    .replace('{height}', '248')}
                  alt="Stream thumbnail"
                  class="mt-2 w-full max-w-md rounded-lg border border-border-subtle"
                />
              {/if}
            </div>
          </Card>
        {/if}

        <!-- Past Broadcasts -->
        {#if profile.broadcasts.length > 0}
          <Card padding="lg">
            <h3 class="mb-3 text-lg font-semibold text-text-primary">
              Past Broadcasts
              <span class="ml-2 text-sm font-normal text-text-muted">
                {profile.broadcasts.length}
              </span>
            </h3>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {#each profile.broadcasts as vod}
                <a
                  href={vod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group overflow-hidden rounded-lg border border-border-subtle transition-colors hover:border-border-default"
                >
                  <div class="relative aspect-video bg-surface-elevated">
                    <img
                      src={vod.thumbnail_url.replace('%{width}', '320').replace('%{height}', '180')}
                      alt={vod.title}
                      class="h-full w-full object-cover"
                    />
                    <span
                      class="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white"
                    >
                      {formatDuration(vod.duration)}
                    </span>
                  </div>
                  <div class="p-2.5">
                    <p
                      class="line-clamp-2 text-sm font-medium text-text-primary group-hover:text-brand-400"
                    >
                      {vod.title}
                    </p>
                    <div class="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
                      <span>{vod.view_count.toLocaleString()} views</span>
                      <span>·</span>
                      <span>{timeAgo(vod.created_at)} ago</span>
                    </div>
                  </div>
                </a>
              {/each}
            </div>
          </Card>
        {/if}

        <!-- Following / Followers -->
        <div class="grid gap-6 md:grid-cols-2">
          <!-- Following -->
          <Card padding="lg">
            <h3 class="mb-3 text-lg font-semibold text-text-primary">
              Following
              {#if profile.followed}
                <span class="ml-2 text-sm font-normal text-text-muted">
                  {profile.followed.total.toLocaleString()}
                </span>
              {/if}
            </h3>
            {#if profile.followed}
              {#if profile.followed.data.length === 0}
                <p class="text-sm text-text-muted">Not following anyone yet.</p>
              {:else}
                <ul class="space-y-2">
                  {#each profile.followed.data as channel}
                    <li
                      class="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-tertiary"
                    >
                      <div class="flex items-center gap-2">
                        {#if liveStreamIds.has(channel.broadcaster_id)}
                          <span
                            class="h-2 w-2 flex-shrink-0 rounded-full bg-success-500"
                            title="Live"
                          ></span>
                        {:else}
                          <span class="h-2 w-2 flex-shrink-0 rounded-full bg-transparent"></span>
                        {/if}
                        <span class="text-text-primary">{channel.broadcaster_name}</span>
                      </div>
                      <span class="text-xs text-text-muted">{formatDate(channel.followed_at)}</span>
                    </li>
                  {/each}
                </ul>
                {#if profile.followed.pagination.cursor}
                  <div class="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={loadingMoreFollowed}
                      onclick={loadMoreFollowed}
                    >
                      Load more
                    </Button>
                  </div>
                {/if}
              {/if}
            {:else}
              <p class="text-sm text-text-muted">
                Requires <span class="font-medium">user:read:follows</span> scope.
                <a href="/api/auth/twitch" class="text-brand-400 hover:underline">Re-authorize</a>
              </p>
            {/if}
          </Card>

          <!-- Followers -->
          <Card padding="lg">
            <h3 class="mb-3 text-lg font-semibold text-text-primary">
              Followers
              {#if profile.followers}
                <span class="ml-2 text-sm font-normal text-text-muted">
                  {profile.followers.total.toLocaleString()}
                </span>
              {/if}
            </h3>
            {#if profile.followers}
              {#if profile.followers.data.length === 0}
                <p class="text-sm text-text-muted">No followers yet.</p>
              {:else}
                <ul class="space-y-2">
                  {#each profile.followers.data as follower}
                    <li
                      class="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-tertiary"
                    >
                      <span class="text-text-primary">{follower.user_name}</span>
                      <span class="text-xs text-text-muted">{formatDate(follower.followed_at)}</span
                      >
                    </li>
                  {/each}
                </ul>
                {#if profile.followers.pagination.cursor}
                  <div class="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={loadingMoreFollowers}
                      onclick={loadMoreFollowers}
                    >
                      Load more
                    </Button>
                  </div>
                {/if}
              {/if}
            {:else}
              <p class="text-sm text-text-muted">
                Requires <span class="font-medium">moderator:read:followers</span> scope.
                <a href="/api/auth/twitch" class="text-brand-400 hover:underline">Re-authorize</a>
              </p>
            {/if}
          </Card>
        </div>

        <!-- Games Created -->
        <Card padding="lg">
          <h3 class="mb-3 text-lg font-semibold text-text-primary">
            Games Created
            <span class="ml-2 text-sm font-normal text-text-muted">
              {profile.appStats.gameCount}
            </span>
          </h3>
          {#if profile.appStats.games.length === 0}
            <p class="text-sm text-text-muted">No games created yet.</p>
          {:else}
            <div class="space-y-2">
              {#each profile.appStats.games as game}
                <a
                  href="/dashboard/games/{game.id}"
                  class="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-tertiary"
                >
                  <div>
                    <span class="font-medium text-text-primary">{game.title}</span>
                    <span class="ml-2 text-xs text-text-muted">
                      {GAME_TYPE_META[game.type as GameType]?.label ?? game.type}
                    </span>
                  </div>
                  <div class="flex items-center gap-3">
                    <StatusBadge
                      status={game.status as import('@twitch-hub/shared-types').GameStatus}
                    />
                    <span class="text-xs text-text-muted">{formatDate(game.createdAt)}</span>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </Card>

        <!-- Scope Warning -->
        {#if hasMissingScopes}
          <div
            class="rounded-lg border border-warning-500/20 bg-warning-900/10 px-4 py-3 text-sm text-text-muted"
          >
            Some data requires re-authorization with updated permissions.
            <a href="/api/auth/twitch" class="ml-1 text-brand-400 hover:underline">
              Re-authorize with Twitch
            </a>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Billing Tab -->
  {:else if activeTab === 'billing'}
    <BillingTab success={billingSuccess} canceled={billingCanceled} />

    <!-- Moderators Tab -->
  {:else if activeTab === 'moderators'}
    <ModeratorsTab />
  {/if}
</div>
