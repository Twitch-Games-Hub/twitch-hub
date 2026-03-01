<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import XpBar from '$lib/components/gamification/XpBar.svelte';
  import AchievementGrid from '$lib/components/gamification/AchievementGrid.svelte';
  import LoyaltyBadge from '$lib/components/gamification/LoyaltyBadge.svelte';

  interface ProfileData {
    twitchLogin: string;
    displayName: string;
    profileImageUrl: string | null;
    totalXp: number;
    level: number;
    xpToNextLevel: number;
    xpInCurrentLevel: number;
    xpNeededForNext: number;
    totalSessions: number;
    totalResponses: number;
    correctAnswers: number;
    bestStreak: number;
    achievements: {
      id: string;
      name: string;
      description: string;
      category: string;
      iconUrl: string | null;
      earnedAt: string;
    }[];
    channelStats: {
      channelId: string;
      channelXp: number;
      loyaltyTier: string;
      sessionsPlayed: number;
    }[];
  }

  let profile = $state<ProfileData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    const twitchLogin = $page.params.twitchLogin;
    try {
      const res = await fetch(`/api/gamification/profile/${twitchLogin}`);
      if (!res.ok) {
        if (res.status === 404) {
          error = 'Player not found';
        } else {
          error = 'Failed to load profile';
        }
        return;
      }
      profile = await res.json();
    } catch {
      error = 'Failed to load profile';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>{profile?.displayName ?? 'Player'} - Twitch Hub</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8">
  {#if loading}
    <div class="space-y-6 animate-pulse">
      <div class="flex items-center gap-4">
        <div class="h-20 w-20 rounded-full bg-surface-elevated"></div>
        <div class="space-y-2">
          <div class="h-6 w-40 rounded bg-surface-elevated"></div>
          <div class="h-4 w-24 rounded bg-surface-elevated"></div>
        </div>
      </div>
      <div class="h-12 rounded-lg bg-surface-elevated"></div>
      <div class="grid grid-cols-4 gap-4">
        {#each Array(4) as _, i (i)}
          <div class="h-20 rounded-lg bg-surface-elevated"></div>
        {/each}
      </div>
    </div>
  {:else if error}
    <div class="py-20 text-center">
      <p class="text-lg text-text-muted">{error}</p>
    </div>
  {:else if profile}
    <!-- Header -->
    <div class="flex items-center gap-4 animate-fade-in">
      {#if profile.profileImageUrl}
        <img
          src={profile.profileImageUrl}
          alt={profile.displayName}
          class="h-20 w-20 rounded-full border-2 border-brand-500"
        />
      {:else}
        <div
          class="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/20 text-3xl font-bold text-brand-400"
        >
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
      {/if}
      <div>
        <h1 class="text-2xl font-bold text-text-primary">{profile.displayName}</h1>
        <p class="text-sm text-text-muted">@{profile.twitchLogin}</p>
      </div>
    </div>

    <!-- XP Bar -->
    <div class="mt-6 animate-slide-up">
      <XpBar
        level={profile.level}
        currentXp={profile.totalXp}
        xpNeededForNext={profile.xpNeededForNext}
        xpInCurrentLevel={profile.xpInCurrentLevel}
      />
    </div>

    <!-- Stats Grid -->
    <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 animate-slide-up">
      <div class="rounded-xl border border-border-default bg-surface-secondary p-4 text-center">
        <p class="text-2xl font-bold text-text-primary">{profile.totalSessions}</p>
        <p class="text-xs text-text-muted">Sessions</p>
      </div>
      <div class="rounded-xl border border-border-default bg-surface-secondary p-4 text-center">
        <p class="text-2xl font-bold text-text-primary">{profile.totalResponses}</p>
        <p class="text-xs text-text-muted">Responses</p>
      </div>
      <div class="rounded-xl border border-border-default bg-surface-secondary p-4 text-center">
        <p class="text-2xl font-bold text-text-primary">{profile.correctAnswers}</p>
        <p class="text-xs text-text-muted">Correct</p>
      </div>
      <div class="rounded-xl border border-border-default bg-surface-secondary p-4 text-center">
        <p class="text-2xl font-bold text-text-primary">{profile.bestStreak}</p>
        <p class="text-xs text-text-muted">Best Streak</p>
      </div>
    </div>

    <!-- Channel Loyalty -->
    {#if profile.channelStats.length > 0}
      <div class="mt-8">
        <h2 class="mb-3 text-lg font-semibold text-text-primary">Channel Loyalty</h2>
        <div class="space-y-2">
          {#each profile.channelStats as cs (cs.channelId)}
            <div
              class="flex items-center justify-between rounded-lg border border-border-default bg-surface-secondary px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm text-text-secondary">{cs.channelId}</span>
                <LoyaltyBadge tier={cs.loyaltyTier} size="sm" />
              </div>
              <div class="text-right">
                <span class="text-sm font-medium text-text-primary">{cs.channelXp} XP</span>
                <span class="ml-2 text-xs text-text-muted">{cs.sessionsPlayed} sessions</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Achievements -->
    <div class="mt-8">
      <h2 class="mb-3 text-lg font-semibold text-text-primary">
        Achievements
        <span class="text-sm font-normal text-text-muted">({profile.achievements.length})</span>
      </h2>
      <AchievementGrid earned={profile.achievements} />
    </div>
  {/if}
</div>
