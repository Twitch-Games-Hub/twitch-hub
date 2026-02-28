<script lang="ts">
  import { GameStatus } from '@twitch-hub/shared-types';
  import { GAME_STATUS_STYLES } from '$lib/constants';

  let { status }: { status: GameStatus } = $props();

  const style = $derived(GAME_STATUS_STYLES[status]);
</script>

<span
  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {style.classes}"
>
  {style.label}
</span>
