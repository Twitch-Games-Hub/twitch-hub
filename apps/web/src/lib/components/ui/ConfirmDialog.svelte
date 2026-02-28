<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';

  let {
    open = $bindable(false),
    title = 'Are you sure?',
    message = '',
    confirmLabel = 'Confirm',
    onconfirm,
  }: {
    open: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    onconfirm?: () => void;
  } = $props();

  function handleConfirm() {
    onconfirm?.();
    open = false;
  }
</script>

<Modal bind:open {title}>
  {#if message}
    <p class="mb-6 text-text-secondary">{message}</p>
  {/if}
  <div class="flex justify-end gap-3">
    <Button variant="secondary" onclick={() => (open = false)}>Cancel</Button>
    <Button variant="danger" onclick={handleConfirm}>{confirmLabel}</Button>
  </div>
</Modal>
