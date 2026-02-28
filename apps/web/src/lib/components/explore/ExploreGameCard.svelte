<script lang="ts">
  import { GameType, type ApiPublicGame } from '@twitch-hub/shared-types';
  import { GAME_TYPE_META } from '$lib/constants';
  import { authStore } from '$lib/stores/auth.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import {
    ThumbsUpIcon,
    ThumbsDownIcon,
    BookmarkIcon,
    UsersIcon,
    PlayIcon,
  } from '$lib/components/ui/icons';

  let {
    game,
    onrate,
    onsave,
    onstart,
    creatingGameId = null,
    showSave = true,
  }: {
    game: ApiPublicGame;
    onrate?: (game: ApiPublicGame, value: 1 | -1) => void;
    onsave?: (game: ApiPublicGame) => void;
    onstart?: (gameId: string) => void;
    creatingGameId?: string | null;
    showSave?: boolean;
  } = $props();

  const isOwn = $derived(authStore.user?.twitchLogin === game.owner.twitchLogin);
  const meta = $derived(GAME_TYPE_META[game.type as GameType]);

  const contentLabel = $derived.by(() => {
    switch (game.type) {
      case 'HOT_TAKE':
        return game.contentCount === 1 ? '1 statement' : `${game.contentCount} statements`;
      case 'BALANCE':
        return game.contentCount === 1 ? '1 question' : `${game.contentCount} questions`;
      case 'BLIND_TEST':
        return game.contentCount === 1 ? '1 round' : `${game.contentCount} rounds`;
      default:
        return `${game.contentCount} rounds`;
    }
  });
</script>

<Card padding="none" class="relative overflow-hidden">
  {#if game.coverImageUrl}
    <img
      src={game.coverImageUrl}
      alt=""
      loading="lazy"
      class="absolute inset-0 h-full w-full object-cover"
      onerror={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
    <div class="absolute inset-0 bg-surface-secondary/80 backdrop-blur-sm"></div>
  {/if}
  <div class="relative p-6">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span
            class="inline-block rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs font-medium text-brand-400"
          >
            {meta?.label || game.type}
          </span>
          {#if game.contentCount > 0}
            <span class="text-xs text-text-muted">
              {contentLabel}
            </span>
          {/if}
        </div>
        <h3 class="mb-1 truncate text-lg font-semibold text-text-primary">{game.title}</h3>
        {#if game.description}
          <p class="mb-2 line-clamp-2 text-sm text-text-muted">{game.description}</p>
        {/if}
        <div class="flex items-center gap-3 text-sm text-text-muted">
          <div class="flex items-center gap-1.5">
            {#if game.owner.profileImageUrl}
              <img src={game.owner.profileImageUrl} alt="" class="h-5 w-5 rounded-full" />
            {/if}
            <span>by {game.owner.displayName}</span>
          </div>
          {#if game.playCount > 0}
            <div class="flex items-center gap-1">
              <UsersIcon size={14} />
              <span>{game.playCount}</span>
            </div>
          {/if}
        </div>
      </div>

      {#if authStore.user && showSave && !isOwn}
        <button
          class="shrink-0 rounded-lg p-1.5 transition-colors {game.isSaved
            ? 'text-brand-400'
            : 'text-text-muted hover:text-text-secondary'}"
          onclick={() => onsave?.(game)}
          title={game.isSaved ? 'Unsave game' : 'Save game'}
          aria-label={game.isSaved ? 'Unsave game' : 'Save game'}
        >
          <BookmarkIcon size={20} filled={game.isSaved} />
        </button>
      {/if}
    </div>

    <div class="mt-4 flex items-center justify-between">
      <!-- Rating buttons -->
      <div class="flex items-center gap-1">
        <button
          class="rounded-lg p-1.5 transition-colors {game.userRating === 1
            ? 'text-success-500'
            : 'text-text-muted hover:text-text-secondary'} {isOwn
            ? 'cursor-not-allowed opacity-40'
            : ''}"
          onclick={() => onrate?.(game, 1)}
          disabled={isOwn}
          title={isOwn ? 'Cannot rate your own game' : 'Upvote'}
          aria-label="Upvote"
        >
          <ThumbsUpIcon size={18} />
        </button>
        <span
          class="min-w-[2rem] text-center text-sm font-medium {game.ratingScore > 0
            ? 'text-success-500'
            : game.ratingScore < 0
              ? 'text-danger-500'
              : 'text-text-muted'}"
        >
          {game.ratingScore}
        </span>
        <button
          class="rounded-lg p-1.5 transition-colors {game.userRating === -1
            ? 'text-danger-500'
            : 'text-text-muted hover:text-text-secondary'} {isOwn
            ? 'cursor-not-allowed opacity-40'
            : ''}"
          onclick={() => onrate?.(game, -1)}
          disabled={isOwn}
          title={isOwn ? 'Cannot rate your own game' : 'Downvote'}
          aria-label="Downvote"
        >
          <ThumbsDownIcon size={18} />
        </button>
      </div>

      {#if authStore.user}
        <Button
          onclick={() => onstart?.(game.id)}
          size="sm"
          loading={creatingGameId === game.id}
          disabled={creatingGameId !== null}
        >
          <PlayIcon size={14} />
          Start Game
        </Button>
      {/if}
    </div>
  </div>
</Card>
