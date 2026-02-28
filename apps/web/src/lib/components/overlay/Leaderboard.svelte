<script lang="ts">
	interface Entry {
		userId: string;
		score: number;
	}

	interface Props {
		entries: Entry[];
		title: string;
	}

	let { entries, title } = $props();

	const medalColors = {
		0: 'from-yellow-400 to-yellow-600',
		1: 'from-gray-300 to-gray-500',
		2: 'from-orange-400 to-orange-600'
	};

	const medalEmojis = {
		0: '🥇',
		1: '🥈',
		2: '🥉'
	};

	function getMedalClass(index: number): string {
		if (index === 0) return medalColors[0];
		if (index === 1) return medalColors[1];
		if (index === 2) return medalColors[2];
		return '';
	}

	function getMedal(index: number): string {
		if (index === 0) return medalEmojis[0];
		if (index === 1) return medalEmojis[1];
		if (index === 2) return medalEmojis[2];
		return '';
	}

	function isMedalPosition(index: number): boolean {
		return index < 3;
	}
</script>

<div class="leaderboard-container">
	<div class="leaderboard-background">
		<div class="leaderboard-header">
			<h2 class="leaderboard-title">{title}</h2>
		</div>

		<div class="leaderboard-content">
			{#each entries as entry, index (entry.userId)}
				<div class="leaderboard-entry" class:medal-position={isMedalPosition(index)}>
					<div class="entry-rank">
						{#if isMedalPosition(index)}
							<span class="medal">{getMedal(index)}</span>
						{:else}
							<span class="rank-number">#{index + 1}</span>
						{/if}
					</div>

					<div class="entry-info">
						<div class="entry-userid">{entry.userId}</div>
					</div>

					<div class={`entry-score medal-${index}`}>
						{entry.score}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style lang="postcss">
	:global(html) {
		color-scheme: dark;
	}

	.leaderboard-container {
		position: relative;
		width: 100%;
		max-width: 400px;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	}

	.leaderboard-background {
		background: rgba(17, 24, 39, 0.85);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.3);
		border: 1px solid rgba(168, 85, 247, 0.2);
	}

	.leaderboard-header {
		background: linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(88, 28, 135, 0.2) 100%);
		padding: 16px 20px;
		border-bottom: 2px solid rgba(168, 85, 247, 0.2);
	}

	.leaderboard-title {
		margin: 0;
		color: #c084fc;
		font-size: 20px;
		font-weight: 700;
		letter-spacing: 0.5px;
		text-transform: uppercase;
	}

	.leaderboard-content {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 400px;
		overflow-y: auto;
	}

	.leaderboard-entry {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: rgba(31, 41, 55, 0.6);
		border-radius: 8px;
		transition: all 0.3s ease;
		border: 1px solid rgba(75, 85, 99, 0.3);
	}

	.leaderboard-entry.medal-position {
		background: rgba(31, 41, 55, 0.8);
		border: 1px solid rgba(168, 85, 247, 0.4);
	}

	.leaderboard-entry:hover {
		background: rgba(55, 65, 81, 0.8);
		transform: translateX(4px);
		box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);
	}

	.entry-rank {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 40px;
		font-weight: 700;
	}

	.medal {
		font-size: 24px;
		line-height: 1;
	}

	.rank-number {
		color: #9ca3af;
		font-size: 14px;
	}

	.entry-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.entry-userid {
		color: #e5e7eb;
		font-size: 14px;
		font-weight: 600;
		word-break: break-word;
	}

	.entry-score {
		font-size: 18px;
		font-weight: 700;
		min-width: 50px;
		text-align: right;
		transition: all 0.3s ease;
	}

	.entry-score.medal-0 {
		background: linear-gradient(135deg, #facc15 0%, #d97706 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.entry-score.medal-1 {
		background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.entry-score.medal-2 {
		background: linear-gradient(135deg, #fb923c 0%, #d97706 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.entry-score {
		color: #a78bfa;
	}

	@media (max-width: 640px) {
		.leaderboard-container {
			max-width: 100%;
		}

		.entry-userid {
			font-size: 12px;
		}

		.entry-score {
			font-size: 16px;
		}
	}
</style>
