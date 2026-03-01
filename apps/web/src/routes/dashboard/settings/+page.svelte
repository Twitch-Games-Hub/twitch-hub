<script lang="ts">
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto(resolve('/dashboard/profile') + '?tab=moderators', { replaceState: true });
  });
</script>
