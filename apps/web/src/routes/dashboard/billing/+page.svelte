<script lang="ts">
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  onMount(() => {
    let target = '/dashboard/profile?tab=billing';
    if ($page.url.searchParams.has('success')) target += '&success=true';
    if ($page.url.searchParams.has('canceled')) target += '&canceled=true';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    goto(resolve(target as any), { replaceState: true });
  });
</script>
