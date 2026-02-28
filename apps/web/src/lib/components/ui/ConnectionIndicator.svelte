<script lang="ts">
  let { connected }: { connected: boolean } = $props();
</script>

<div
  class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium {connected
    ? 'border-success-500/20 bg-success-900/30 text-success-500'
    : 'border-danger-500/20 bg-danger-900/30 text-danger-500'}"
  role="status"
  aria-live="polite"
>
  <span
    class="h-2 w-2 rounded-full {connected ? 'bg-success-500' : 'bg-danger-500'}"
    aria-hidden="true"
  ></span>
  {connected ? 'Connected' : 'Disconnected'}
</div>
