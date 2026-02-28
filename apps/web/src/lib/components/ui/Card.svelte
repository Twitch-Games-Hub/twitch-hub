<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    padding = 'md',
    variant = 'default',
    class: className = '',
    children,
  }: {
    padding?: 'sm' | 'md' | 'lg' | 'none';
    variant?: 'default' | 'item';
    class?: string;
    children: Snippet;
  } = $props();

  const variantClasses = {
    default: 'rounded-md bg-surface-secondary',
    item: 'rounded-md bg-surface-tertiary',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
</script>

<div
  class="border border-border-default {variantClasses[variant]} {paddingClasses[
    padding
  ]} {className}"
>
  {@render children()}
</div>
