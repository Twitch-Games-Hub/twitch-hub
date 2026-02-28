<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    for: forAttr,
    variant = 'primary',
    children,
  }: {
    for?: string;
    variant?: 'primary' | 'secondary';
    children: Snippet;
  } = $props();

  const variantClasses = {
    primary: 'mb-2 block text-sm font-medium text-text-secondary',
    secondary: 'mb-1 block text-xs font-medium text-text-muted',
  };
</script>

<label for={forAttr} class={variantClasses[variant]}>
  {@render children()}
</label>
