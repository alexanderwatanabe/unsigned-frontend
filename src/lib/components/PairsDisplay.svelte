<script lang="ts">
	import {
		getEdgeIndex,
		findPairsAmongOwned,
		buildChain,
		deduplicateChains,
		findEdgeMatches,
		type EdgeIndex,
		type Chain,
		type Direction,
	} from '$lib/unsig/edges';

	interface Props {
		ownedIds: number[];
	}

	let { ownedIds }: Props = $props();

	let edgeIndex: EdgeIndex | null = $state(null);
	let indexReady = $state(false);

	$effect(() => {
		if (ownedIds.length > 0 && !indexReady) {
			// Build index on first need — fast (~10ms for 31K unsigs)
			edgeIndex = getEdgeIndex();
			indexReady = true;
		}
	});

	let chains = $derived.by(() => {
		if (!edgeIndex || ownedIds.length < 2) return [];
		const pairs = findPairsAmongOwned(ownedIds, edgeIndex);
		if (pairs.length === 0) return [];

		const ownedSet = new Set(ownedIds);
		const rawChains = pairs.map((pair) => buildChain(pair, edgeIndex!, ownedSet));
		return deduplicateChains(rawChains);
	});

	// For each chain endpoint, count how many more unsigs could extend it
	let chainExtensions = $derived.by(() => {
		if (!edgeIndex) return [];
		return chains.map((chain) => {
			const isH = chain.direction === 'horizontal';
			const lastId = chain.ids[chain.ids.length - 1];
			const firstId = chain.ids[0];
			const forwardEdge: Direction = isH ? 'east' : 'south';
			const backwardEdge: Direction = isH ? 'west' : 'north';

			const forwardMatches = findEdgeMatches(lastId, forwardEdge, edgeIndex!)
				.filter((id) => !chain.ids.includes(id));
			const backwardMatches = findEdgeMatches(firstId, backwardEdge, edgeIndex!)
				.filter((id) => !chain.ids.includes(id));

			return {
				forward: forwardMatches.length,
				backward: backwardMatches.length,
			};
		});
	});

	let ownedSet = $derived(new Set(ownedIds));

	function imgUrl(id: number): string {
		return `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/256/${id.toString().padStart(5, '0')}.png`;
	}

	function formatId(id: number): string {
		return `#${id.toString().padStart(5, '0')}`;
	}
</script>

{#if chains.length > 0}
	<div class="pairs-section">
		<h3 class="pairs-title">
			edge matches
			<span class="pairs-count">
				{chains.length} {chains.length === 1 ? 'chain' : 'chains'}
			</span>
		</h3>

		{#each chains as chain, i}
			{@const ext = chainExtensions[i]}
			<div class="chain-block">
				<div class="chain-meta">
					<span class="chain-direction">
						{chain.direction === 'horizontal' ? '↔' : '↕'}
					</span>
					<span class="chain-length">
						{chain.ids.length} unsigs
					</span>
					{#if ext && (ext.backward > 0 || ext.forward > 0)}
						<span class="chain-extensions">
							· {ext.backward + ext.forward} more can extend
						</span>
					{/if}
				</div>

				<div
					class="chain-images"
					class:vertical={chain.direction === 'vertical'}
				>
					{#each chain.ids as id}
						<a
							href="/nft/{id}"
							class="chain-item"
							class:owned={ownedSet.has(id)}
						>
							<img
								src={imgUrl(id)}
								alt={formatId(id)}
								class="chain-img"
								loading="lazy"
							/>
							<div class="chain-item-info">
								<span class="chain-item-id">{formatId(id)}</span>
								{#if !ownedSet.has(id)}
									<span class="chain-item-badge">collection</span>
								{/if}
							</div>
						</a>
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

	.pairs-title {
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--text-secondary);
		margin-bottom: var(--space-lg);
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
	}

	.pairs-count {
		color: var(--text-dim);
		font-size: var(--text-xs);
	}

	.chain-block {
		margin-bottom: var(--space-lg);
	}

	.chain-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--text-xs);
		color: var(--text-dim);
	}

	.chain-direction {
		font-size: var(--text-sm);
	}

	.chain-extensions {
		color: var(--text-dim);
	}

	.chain-images {
		display: flex;
		gap: 2px;
		overflow-x: auto;
		padding-bottom: var(--space-sm);
	}

	.chain-images.vertical {
		flex-direction: column;
		overflow-x: visible;
		overflow-y: auto;
		max-height: 80vh;
		max-width: 200px;
	}

	.chain-item {
		flex-shrink: 0;
		width: 128px;
		text-decoration: none;
		position: relative;
		transition: transform 0.15s ease;
	}

	.chain-images.vertical .chain-item {
		width: 128px;
	}

	.chain-item:hover {
		transform: scale(1.02);
		z-index: 1;
	}

	.chain-item.owned {
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
	}

	.chain-item:not(.owned) {
		opacity: 0.6;
	}

	.chain-item:not(.owned):hover {
		opacity: 1;
	}

	.chain-img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		display: block;
		background: black;
	}

	.chain-item-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2px 4px;
		background: rgba(0, 0, 0, 0.8);
	}

	.chain-item-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: var(--text-secondary);
	}

	.chain-item-badge {
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px;
		color: var(--text-dim);
		padding: 0 3px;
		border: 1px solid var(--border-default);
		border-radius: 2px;
	}
</style>
