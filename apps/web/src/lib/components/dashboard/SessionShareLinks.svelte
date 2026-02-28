<script lang="ts">
  import CopyButton from '$lib/components/ui/CopyButton.svelte';

  let { sessionId, appUrl }: { sessionId: string; appUrl: string } = $props();
</script>

<div class="space-y-2">
  <div class="flex items-center gap-2 rounded-lg bg-surface-tertiary px-3 py-2">
    <span class="flex-shrink-0 text-xs text-text-muted">Play</span>
    <code class="min-w-0 flex-1 truncate text-sm text-brand-400">
      {appUrl}/play/{sessionId}
    </code>
    <CopyButton value="{appUrl}/play/{sessionId}" />
  </div>
  <div class="flex items-center gap-2 rounded-lg bg-surface-tertiary px-3 py-2">
    <span class="flex-shrink-0 text-xs text-text-muted">OBS</span>
    <code class="min-w-0 flex-1 truncate text-sm text-brand-400">
      {appUrl}/overlay/{sessionId}
    </code>
    <CopyButton value="{appUrl}/overlay/{sessionId}" />
  </div>
</div>
