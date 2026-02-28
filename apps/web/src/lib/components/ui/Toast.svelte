<script lang="ts">
  import type { ToastItem } from '$lib/stores/toast.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import XIcon from './icons/XIcon.svelte';
  import CheckIcon from './icons/CheckIcon.svelte';

  let { toast }: { toast: ToastItem } = $props();

  const variantClasses = {
    success: 'border-success-500/30 bg-success-900/40 text-success-500',
    error: 'border-danger-500/30 bg-danger-900/40 text-danger-500',
    info: 'border-brand-400/30 bg-brand-900/40 text-brand-300',
  };
</script>

<div
  class="animate-slide-down flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg {variantClasses[
    toast.variant
  ]}"
  role="alert"
>
  {#if toast.variant === 'success'}
    <CheckIcon size={16} />
  {/if}
  <span class="flex-1 text-sm">{toast.message}</span>
  <button
    onclick={() => toastStore.dismiss(toast.id)}
    class="rounded p-0.5 opacity-60 hover:opacity-100"
    aria-label="Dismiss"
  >
    <XIcon size={14} />
  </button>
</div>
