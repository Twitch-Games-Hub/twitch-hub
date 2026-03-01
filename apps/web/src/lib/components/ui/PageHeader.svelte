<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Snippet } from 'svelte';
  import ArrowLeftIcon from './icons/ArrowLeftIcon.svelte';

  let {
    title,
    subtitle = '',
    back,
    action,
  }: {
    title: string;
    subtitle?: string;
    back?: string;
    action?: Snippet;
  } = $props();
</script>

<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div class="flex items-center gap-3">
    {#if back}
      <a
        href={resolve(back as `/${string}`)}
        class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
        aria-label="Go back"
      >
        <ArrowLeftIcon size={20} />
      </a>
    {/if}
    <div>
      <h1 class="text-3xl font-bold text-text-primary">{title}</h1>
      {#if subtitle}
        <p class="mt-1 text-text-secondary">{subtitle}</p>
      {/if}
    </div>
  </div>
  {#if action}
    <div class="flex-shrink-0">
      {@render action()}
    </div>
  {/if}
</div>
