<script lang="ts">
  import { TrashIcon } from '$lib/components/ui/icons';
  import Button from '$lib/components/ui/Button.svelte';

  let {
    label,
    canDelete = true,
    ondelete,
  }: {
    label: string;
    canDelete?: boolean;
    ondelete?: () => void;
  } = $props();
</script>

<div class="mb-2 flex items-center justify-between">
  <span class="text-xs font-medium text-text-muted">{label}</span>
  {#if canDelete && ondelete}
    <Button variant="danger-outline" size="xs" onclick={ondelete}>
      <TrashIcon size={14} />
    </Button>
  {/if}
</div>
