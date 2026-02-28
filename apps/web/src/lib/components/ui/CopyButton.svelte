<script lang="ts">
  import CopyIcon from './icons/CopyIcon.svelte';
  import CheckIcon from './icons/CheckIcon.svelte';

  let { value }: { value: string } = $props();

  let copied = $state(false);
  let timeout: ReturnType<typeof setTimeout>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      // fallback
    }
  }
</script>

<button
  onclick={copy}
  class="inline-flex items-center rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
  aria-label={copied ? 'Copied' : 'Copy to clipboard'}
>
  {#if copied}
    <CheckIcon size={16} class="text-success-500" />
  {:else}
    <CopyIcon size={16} />
  {/if}
</button>
