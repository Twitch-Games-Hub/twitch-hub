<script lang="ts">
  import { toastStore } from '$lib/stores/toast.svelte';
  import Toast from './Toast.svelte';
</script>

{#if toastStore.toasts.length > 0}
  <div
    class="fixed right-4 top-4 z-[100] flex flex-col gap-2"
    aria-live="polite"
    aria-label="Notifications"
  >
    {#each toastStore.toasts as toast (toast.id)}
      <Toast {toast} />
    {/each}
  </div>
{/if}
