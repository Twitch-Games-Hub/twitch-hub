<script lang="ts">
  import LoaderIcon from './icons/LoaderIcon.svelte';
  import type { Snippet } from 'svelte';

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    href,
    type = 'button',
    class: className = '',
    onclick,
    children,
  }: {
    variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'ghost';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  } = $props();

  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:ring-offset-2 focus:ring-offset-surface-primary disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
    secondary:
      'bg-surface-elevated text-text-primary border border-border-default hover:bg-surface-tertiary active:bg-surface-secondary',
    danger: 'bg-danger-600 text-white hover:bg-danger-500 active:bg-danger-900',
    'danger-outline':
      'border border-danger-500/20 bg-danger-900/20 text-danger-500 hover:bg-danger-900/40',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary',
  };

  const sizeClasses = {
    xs: 'px-2 py-1.5 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const classes = $derived(
    `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`,
  );
</script>

{#if href}
  <a {href} class={classes}>
    {#if loading}
      <LoaderIcon size={size === 'lg' ? 20 : 16} />
    {/if}
    {@render children()}
  </a>
{:else}
  <button {type} {onclick} disabled={disabled || loading} class={classes}>
    {#if loading}
      <LoaderIcon size={size === 'lg' ? 20 : 16} />
    {/if}
    {@render children()}
  </button>
{/if}
