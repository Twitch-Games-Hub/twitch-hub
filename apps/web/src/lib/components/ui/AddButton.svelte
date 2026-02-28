<script lang="ts">
  import type { Snippet } from 'svelte';
  import { PlusIcon } from './icons';

  let {
    onclick,
    children,
  }: {
    onclick: () => void;
    children: Snippet;
  } = $props();
</script>

<button
  type="button"
  {onclick}
  class="mt-2 inline-flex items-center gap-1 text-sm text-brand-400 transition-colors hover:text-brand-300"
>
  <PlusIcon size={14} />
  {@render children()}
</button>
