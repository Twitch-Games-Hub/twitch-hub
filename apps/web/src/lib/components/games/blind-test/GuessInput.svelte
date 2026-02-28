<script lang="ts">
	interface Props {
		disabled: boolean;
		timeRemaining: number;
		onsubmit: (guess: string) => void;
	}

	let { disabled, timeRemaining, onsubmit } = $props();

	let inputValue = $state('');

	function handleSubmit() {
		if (inputValue.trim() && !disabled) {
			onsubmit(inputValue.trim());
			inputValue = '';
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSubmit();
		}
	}

	function getTimerColor() {
		return timeRemaining < 5 ? 'text-red-500' : 'text-purple-400';
	}

	function getTimerBgColor() {
		return timeRemaining < 5 ? 'bg-red-900' : 'bg-gray-800';
	}
</script>

<div class="space-y-4">
	<div class="text-center">
		<div class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Time Remaining</div>
		<div class={`text-5xl font-bold font-mono ${getTimerColor()} transition-colors duration-200`}>
			{timeRemaining}s
		</div>
	</div>

	<div class={`rounded-lg p-4 ${getTimerBgColor()} transition-colors duration-200`}>
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={inputValue}
				onkeydown={handleKeyDown}
				disabled={disabled}
				placeholder="Enter your guess..."
				class="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2
				       focus:ring-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed
				       placeholder-gray-500"
			/>
			<button
				onclick={handleSubmit}
				disabled={disabled || !inputValue.trim()}
				class="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed
				       text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200
				       border-2 border-purple-500 hover:border-purple-400 disabled:border-gray-500"
			>
				Submit
			</button>
		</div>
	</div>

	<div class="text-xs text-gray-400 text-center">
		Press Enter or click Submit to guess
	</div>
</div>

<style lang="postcss">
	:global(html) {
		color-scheme: dark;
	}
</style>
