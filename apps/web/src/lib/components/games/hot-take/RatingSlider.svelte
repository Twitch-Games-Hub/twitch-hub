<script lang="ts">
  let { value = $bindable(5), disabled = false, onsubmit }: {
    value: number;
    disabled?: boolean;
    onsubmit?: (value: number) => void;
  } = $props();

  function handleSubmit() {
    onsubmit?.(value);
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <span class="text-sm text-gray-400">Your Rating</span>
    <span class="text-3xl font-bold text-purple-400">{value}</span>
  </div>

  <input
    type="range"
    min="1"
    max="10"
    step="1"
    bind:value
    {disabled}
    class="h-3 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
  />

  <div class="flex justify-between text-xs text-gray-500">
    <span>1</span>
    <span>2</span>
    <span>3</span>
    <span>4</span>
    <span>5</span>
    <span>6</span>
    <span>7</span>
    <span>8</span>
    <span>9</span>
    <span>10</span>
  </div>

  <button
    onclick={handleSubmit}
    {disabled}
    class="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
  >
    Submit Rating
  </button>
</div>
