<script lang="ts">
  import type { Snippet } from 'svelte';
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';

  let {
    open = $bindable(false),
    title = 'Are you sure?',
    message = '',
    confirmLabel = 'Confirm',
    confirmVariant = 'danger',
    onconfirm,
    children,
  }: {
    open: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    confirmVariant?: 'primary' | 'danger';
    onconfirm?: () => void;
    children?: Snippet;
  } = $props();

  function handleConfirm() {
    onconfirm?.();
    open = false;
  }
</script>

<Modal bind:open {title}>
  {#if children}
    <div class="mb-6">
      {@render children()}
    </div>
  {:else if message}
    <p class="mb-6 text-text-secondary">{message}</p>
  {/if}
  <div class="flex justify-end gap-3">
    <Button variant="secondary" onclick={() => (open = false)}>Cancel</Button>
    <Button variant={confirmVariant} onclick={handleConfirm}>{confirmLabel}</Button>
  </div>
</Modal>
