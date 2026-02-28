<script lang="ts">
  import type { Snippet } from 'svelte';
  import XIcon from './icons/XIcon.svelte';

  let {
    open = $bindable(false),
    title = '',
    children,
  }: {
    open: boolean;
    title?: string;
    children: Snippet;
  } = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialogEl) return;
    if (open) {
      dialogEl.showModal();
    } else {
      dialogEl.close();
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl) {
      open = false;
    }
  }
</script>

{#if open}
  <dialog
    bind:this={dialogEl}
    onkeydown={handleKeydown}
    onclick={handleBackdropClick}
    class="fixed inset-0 z-50 m-auto max-w-md rounded-xl border border-border-default bg-surface-secondary p-0 text-text-primary shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    aria-labelledby={title ? 'modal-title' : undefined}
  >
    <div class="p-6">
      {#if title}
        <div class="mb-4 flex items-center justify-between">
          <h2 id="modal-title" class="text-lg font-semibold">{title}</h2>
          <button
            onclick={() => (open = false)}
            class="rounded-lg p-1 text-text-muted hover:bg-surface-tertiary hover:text-text-primary"
            aria-label="Close"
          >
            <XIcon size={20} />
          </button>
        </div>
      {/if}
      {@render children()}
    </div>
  </dialog>
{/if}
