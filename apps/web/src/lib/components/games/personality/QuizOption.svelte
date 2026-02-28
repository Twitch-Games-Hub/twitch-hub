<script lang="ts">
	interface Props {
		options: string[];
		disabled: boolean;
		onsubmit: (index: number) => void;
	}

	let { options, disabled, onsubmit } = $props();

	const letters = ['A', 'B', 'C', 'D'];

	function handleClick(index: number) {
		if (!disabled) {
			onsubmit(index);
		}
	}
</script>

<div class="space-y-3">
	{#each options as option, index}
		<button
			onclick={() => handleClick(index)}
			disabled={disabled}
			class="w-full bg-gray-800 hover:bg-purple-600 disabled:bg-gray-700 disabled:cursor-not-allowed
			       text-white px-6 py-4 rounded-lg font-semibold text-lg transition-colors duration-200
			       border-2 border-gray-700 hover:border-purple-500 disabled:border-gray-600
			       flex items-center gap-4"
		>
			<span class="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 w-10 h-10 rounded-lg
			            flex items-center justify-center font-bold text-white"
			>
				{letters[index]}
			</span>
			<span class="text-left flex-1">{option}</span>
		</button>
	{/each}
</div>

<style lang="postcss">
	:global(html) {
		color-scheme: dark;
	}
</style>
