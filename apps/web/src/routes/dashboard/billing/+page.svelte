<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  onMount(() => {
    let target = '/dashboard/profile?tab=billing';
    if ($page.url.searchParams.has('success')) target += '&success=true';
    if ($page.url.searchParams.has('canceled')) target += '&canceled=true';
    goto(target, { replaceState: true });
  });
</script>
