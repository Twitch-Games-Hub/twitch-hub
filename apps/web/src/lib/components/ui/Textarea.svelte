<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  let {
    inputSize = 'md',
    variant = 'default',
    value = $bindable(undefined),
    class: className = '',
    ...rest
  }: Omit<HTMLTextareaAttributes, 'value'> & {
    inputSize?: 'sm' | 'md';
    variant?: 'default' | 'nested';
    value?: string;
  } = $props();

  const baseClasses =
    'w-full rounded-lg border border-border-default text-text-primary placeholder-text-muted focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/50';

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  const variantClasses = {
    default: 'bg-surface-tertiary',
    nested: 'bg-surface-primary',
  };
</script>

<textarea
  class="{baseClasses} {sizeClasses[inputSize]} {variantClasses[variant]} {className}"
  bind:value
  {...rest}
></textarea>
