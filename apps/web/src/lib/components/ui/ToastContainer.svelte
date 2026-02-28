<script lang="ts">
  import { toastStore } from '$lib/stores/toast.svelte';
  import Toast from './Toast.svelte';
</script>

{#if toastStore.toasts.length > 0}
  <div
    class="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 items-center"
    aria-live="polite"
    aria-label="Notifications"
  >
    {#each toastStore.toasts as toast (toast.id)}
      <Toast {toast} />
    {/each}
  </div>
{/if}
