<script lang="ts">
  let { size = 20, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="currentColor"
  stroke="none"
  class={className}
  aria-hidden="true"
>
  <polygon points="6,4 20,12 6,20" />
</svg>
