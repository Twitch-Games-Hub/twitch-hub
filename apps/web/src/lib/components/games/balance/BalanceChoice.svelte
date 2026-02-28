<script lang="ts">
	let { optionA, optionB, disabled = false, onsubmit } = $props();
</script>

<div class="flex gap-4 w-full h-full p-8">
	<!-- Option A Button -->
	<button
		class="flex-1 bg-gray-900 border-4 border-purple-500 rounded-lg font-bold text-2xl text-white hover:bg-purple-600 hover:border-purple-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
		{disabled}
		onclick={() => onsubmit('A')}
	>
		<div class="flex flex-col items-center justify-center h-full gap-2">
			<span class="text-6xl">A</span>
			<span class="text-xl">{optionA}</span>
		</div>
	</button>

	<!-- Option B Button -->
	<button
		class="flex-1 bg-gray-900 border-4 border-pink-500 rounded-lg font-bold text-2xl text-white hover:bg-pink-600 hover:border-pink-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
		{disabled}
		onclick={() => onsubmit('B')}
	>
		<div class="flex flex-col items-center justify-center h-full gap-2">
			<span class="text-6xl">B</span>
			<span class="text-xl">{optionB}</span>
		</div>
	</button>
</div>

<style>
	button {
		font-family: inherit;
	}
</style>
