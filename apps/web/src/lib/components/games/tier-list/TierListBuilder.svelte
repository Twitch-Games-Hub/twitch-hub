<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		items: string[];
		tiers: string[];
		disabled?: boolean;
		onsubmit?: (placements: Record<string, string>) => void;
	}

	let {
		items = [],
		tiers = ['S', 'A', 'B', 'C', 'D', 'F'],
		disabled = false,
		onsubmit
	}: Props = $props();

	// State management
	let placements = $state<Record<string, string>>({});
	let selectedItem = $state<string | null>(null);

	// Color mapping for tiers
	const tierColors: Record<string, string> = {
		S: 'border-l-red-500 bg-red-500/10',
		A: 'border-l-orange-500 bg-orange-500/10',
		B: 'border-l-yellow-500 bg-yellow-500/10',
		C: 'border-l-green-500 bg-green-500/10',
		D: 'border-l-blue-500 bg-blue-500/10',
		F: 'border-l-gray-500 bg-gray-500/10'
	};

	const tierLabelColors: Record<string, string> = {
		S: 'bg-red-600 text-white',
		A: 'bg-orange-600 text-white',
		B: 'bg-yellow-600 text-gray-900',
		C: 'bg-green-600 text-white',
		D: 'bg-blue-600 text-white',
		F: 'bg-gray-600 text-white'
	};

	// Initialize placements from items
	onMount(() => {
		placements = {};
		items.forEach((item) => {
			placements[item] = '';
		});
	});

	// Get unplaced items
	function getUnplacedItems() {
		return items.filter((item) => !placements[item] || placements[item] === '');
	}

	// Get items in a specific tier
	function getItemsInTier(tier: string) {
		return items.filter((item) => placements[item] === tier);
	}

	// Handle item selection
	function selectItem(item: string) {
		if (disabled) return;
		selectedItem = selectedItem === item ? null : item;
	}

	// Handle tier click to place item
	function placeTier(tier: string) {
		if (!selectedItem || disabled) return;
		placements[selectedItem] = tier;
		selectedItem = null;
	}

	// Handle placed item click to return to pool
	function returnToPool(item: string) {
		if (disabled) return;
		placements[item] = '';
		selectedItem = null;
	}

	// Check if all items are placed
	function allItemsPlaced() {
		return items.every((item) => placements[item] && placements[item] !== '');
	}

	// Handle submit
	function handleSubmit() {
		if (allItemsPlaced() && onsubmit) {
			onsubmit(placements);
		}
	}
</script>

<div class="w-full max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg border border-gray-800">
	<!-- Tier List Grid -->
	<div class="space-y-4 mb-8">
		{#each tiers as tier}
			<div class="flex items-stretch gap-4 h-24 rounded-lg overflow-hidden">
				<!-- Tier Label -->
				<button
					class="px-6 py-4 font-bold text-lg rounded-l-lg {tierLabelColors[tier] || 'bg-gray-700 text-white'} cursor-default flex-shrink-0 flex items-center justify-center w-16"
					disabled={true}
				>
					{tier}
				</button>

				<!-- Tier Content Area -->
				<div
					class="flex-1 border-l-4 {tierColors[tier] || 'border-l-gray-500 bg-gray-500/10'} rounded-r-lg p-4 cursor-pointer transition-colors hover:bg-opacity-20 flex flex-wrap items-center gap-3 content-start overflow-y-auto"
					onclick={() => placeTier(tier)}
					role="region"
					aria-label="Tier {tier} placement area"
				>
					{#each getItemsInTier(tier) as item (item)}
						<button
							class="px-4 py-2 bg-gray-800 border border-gray-600 rounded-full text-white font-medium text-sm hover:bg-gray-700 transition-colors flex-shrink-0"
							onclick={(e) => {
								e.stopPropagation();
								returnToPool(item);
							}}
							disabled={disabled}
							title="Click to return to pool"
						>
							{item}
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- Unplaced Items Pool -->
	<div class="mb-6">
		<h3 class="text-lg font-semibold text-gray-100 mb-3">Items to Rank</h3>
		<div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700 min-h-24 flex flex-wrap items-center gap-3 content-start overflow-y-auto">
			{#if getUnplacedItems().length === 0}
				<p class="text-gray-400 text-sm w-full">All items placed!</p>
			{:else}
				{#each getUnplacedItems() as item (item)}
					<button
						class="px-4 py-2 rounded-full font-medium text-sm transition-all flex-shrink-0 {selectedItem === item
							? 'bg-blue-600 text-white ring-2 ring-blue-400'
							: 'bg-gray-700 text-gray-100 hover:bg-gray-600 border border-gray-600'}"
						onclick={() => selectItem(item)}
						disabled={disabled}
						title={selectedItem === item ? 'Click a tier to place' : 'Click to select'}
					>
						{item}
					</button>
				{/each}
			{/if}
		</div>
		{#if selectedItem}
			<p class="text-sm text-gray-400 mt-3">
				Selected: <span class="text-blue-400 font-semibold">{selectedItem}</span> - Click a tier to place it
			</p>
		{/if}
	</div>

	<!-- Submit Button -->
	<div class="flex justify-center">
		<button
			class="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-blue-700 active:enabled:scale-95"
			onclick={handleSubmit}
			disabled={!allItemsPlaced() || disabled}
		>
			Submit Tier List
		</button>
	</div>
</div>

<style>
	:global {
		/* Ensure smooth scrolling for tier content areas */
		div[role='region'] {
			scroll-behavior: smooth;
		}
	}
</style>
