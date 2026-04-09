<script lang="ts">
	import {
		getEdgeIndex,
		findAllArrangements,
		type EdgeIndex,
		type Arrangement,
	} from '$lib/unsig/edges';

	interface Props {
		ownedIds: number[];
	}

	let { ownedIds }: Props = $props();

	let edgeIndex: EdgeIndex | null = $state(null);
	let indexReady = $state(false);

	$effect(() => {
		if (ownedIds.length > 0 && !indexReady) {
			edgeIndex = getEdgeIndex();
			indexReady = true;
		}
	});

	let arrangements = $derived.by(() => {
		if (!edgeIndex || ownedIds.length < 2) return [];
		return findAllArrangements(ownedIds, edgeIndex);
	});

	let ownedSet = $derived(new Set(ownedIds));

	function imgUrl(id: number): string {
		return `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/256/${id.toString().padStart(5, '0')}.png`;
	}

	function formatId(id: number): string {
		return `#${id.toString().padStart(5, '0')}`;
	}

	function sizeLabel(a: Arrangement): string {
		if (a.rows === 1) return `${a.cols}-chain ↔`;
		if (a.cols === 1) return `${a.rows}-chain ↕`;
		return `${a.rows}×${a.cols}`;
	}
</script>

{#if arrangements.length > 0}
	<div class="pairs-section">
		<h3 class="section-title">
			edge matches
			<span class="section-count">
				{arrangements.length} {arrangements.length === 1 ? 'arrangement' : 'arrangements'}
			</span>
		</h3>

		{#each arrangements as arr}
			<div class="arrangement-block">
				<div class="arrangement-meta">
					<span class="arrangement-size">{sizeLabel(arr)}</span>
					<span
						class="arrangement-ownership"
						class:full={arr.ownershipPct === 100}
					>
						{arr.ownershipPct}% owned
						<span class="ownership-detail">
							({arr.ownedCount}/{arr.totalCount})
						</span>
					</span>
				</div>

				<div
					class="grid-display"
					style="--grid-cols: {arr.cols}; --grid-rows: {arr.rows}"
				>
					{#each arr.cells as row}
						{#each row as id}
							<a
								href="/nft/{id}"
								class="grid-cell"
								class:owned={ownedSet.has(id)}
							>
								<img
									src={imgUrl(id)}
									alt={formatId(id)}
									class="cell-img"
									loading="lazy"
								/>
								<div class="cell-info">
									<span class="cell-id">{formatId(id)}</span>
									{#if !ownedSet.has(id)}
										<span class="cell-badge">collection</span>
									{/if}
								</div>
							</a>
						{/each}
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.pairs-section {
		margin-top: var(--space-xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--border-default);
	}

	.section-title {
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--text-secondary);
		margin-bottom: var(--space-lg);
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
	}

	.section-count {
		color: var(--text-dim);
		font-size: var(--text-xs);
	}

	.arrangement-block {
		margin-bottom: var(--space-xl);
	}

	.arrangement-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--text-xs);
		color: var(--text-dim);
	}

	.arrangement-size {
		color: var(--text-secondary);
	}

	.arrangement-ownership.full {
		color: var(--accent, #10b981);
	}

	.ownership-detail {
		opacity: 0.6;
	}

	.grid-display {
		display: inline-grid;
		grid-template-columns: repeat(var(--grid-cols), 128px);
		grid-template-rows: repeat(var(--grid-rows), auto);
		gap: 2px;
	}

	.grid-cell {
		text-decoration: none;
		position: relative;
		transition: transform 0.15s ease;
		width: 128px;
	}

	.grid-cell:hover {
		transform: scale(1.02);
		z-index: 1;
	}

	.grid-cell.owned {
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
	}

	.grid-cell:not(.owned) {
		opacity: 0.6;
	}

	.grid-cell:not(.owned):hover {
		opacity: 1;
	}

	.cell-img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		display: block;
		background: black;
	}

	.cell-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 4px;
		background: rgba(0, 0, 0, 0.8);
	}

	.cell-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: var(--text-secondary);
	}

	.cell-badge {
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px;
		color: var(--text-dim);
		padding: 0 3px;
		border: 1px solid var(--border-default);
		border-radius: 2px;
	}

	@media (max-width: 768px) {
		.grid-display {
			grid-template-columns: repeat(var(--grid-cols), 96px);
		}

		.grid-cell {
			width: 96px;
		}
	}
</style>
