<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    padding = 'md',
    class: className = '',
    children,
  }: {
    padding?: 'sm' | 'md' | 'lg' | 'none';
    class?: string;
    children: Snippet;
  } = $props();

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
</script>

<div
  class="rounded-xl border border-border-default bg-surface-secondary {paddingClasses[
    padding
  ]} {className}"
>
  {@render children()}
</div>
