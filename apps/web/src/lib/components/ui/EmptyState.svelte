<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    description = '',
    icon,
    action,
  }: {
    title: string;
    description?: string;
    icon?: Snippet;
    action?: Snippet;
  } = $props();
</script>

<div
  class="flex flex-col items-center justify-center rounded-xl border border-border-default bg-surface-secondary px-6 py-12 text-center"
>
  {#if icon}
    <div class="mb-4 text-text-muted">
      {@render icon()}
    </div>
  {/if}
  <h2 class="mb-2 text-xl font-semibold text-text-primary">{title}</h2>
  {#if description}
    <p class="mb-6 max-w-sm text-text-secondary">{description}</p>
  {/if}
  {#if action}
    {@render action()}
  {/if}
</div>
