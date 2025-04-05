<script lang="ts">
  // Define the policy ID constant in this component as well
  const UNSIGS_POLICY_ID = '0e14267a8020229adc0184dd25fa3174c3f7d6caadcb4425c70e7c04';

  interface UnsigItem {
    id: number;
    imageUrl: string;
    hexAssetName?: string;
  }

  export let items: UnsigItem[] = [];
  export let loading = false;
  export let gridSize = 5;
  export let imageResolution = 256;
  
  // Computed function to get full asset ID when needed
  function getFullAssetId(hexAssetName: string): string {
    return `${UNSIGS_POLICY_ID}${hexAssetName}`;
  }
</script>

<div class="grid" style="--grid-size: {gridSize}" data-resolution={imageResolution}>
  {#if loading}
    <div class="loading-overlay">
      <div class="loading-dialog">
        loading...
      </div>
    </div>
  {/if}
  
  {#if items.length > 0}
    {#each items as item}
      <a 
        href="/nft/{item.id}" 
        class="grid-item" 
        data-hex-asset-name={item.hexAssetName}
        data-full-asset-id={item.hexAssetName ? getFullAssetId(item.hexAssetName) : undefined}
      >
        <img src={item.imageUrl} alt={`unsig #${item.id}`} loading="lazy" />
        <div class="overlay">
          <span class="index">#{item.id.toString().padStart(5, '0')}</span>
        </div>
      </a>
    {/each}
  {:else if !loading}
    <div class="empty-state">
      <p>no items found</p>
    </div>
  {/if}
</div>

<style>
  .grid {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--grid-size), 1fr);
    gap: 0.5rem;
    width: 70vh;
    height: 70vh;
    margin: 0 auto;
    min-height: 200px;
    min-width: 200px;
    max-width: 100%;
  }

  /* Scale grid items based on resolution */
  .grid[data-resolution="1024"] {
    --item-base-size: calc(70vh / var(--grid-size));
  }

  .grid[data-resolution="256"] {
    --item-base-size: calc(70vh / var(--grid-size));
  }

  .grid[data-resolution="128"] {
    --item-base-size: calc(70vh / var(--grid-size));
  }

  .grid-item {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }

  .grid-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .index {
    color: white;
    font-size: 1rem;
    font-weight: 500;
  }

  .grid-item:hover .overlay {
    opacity: 1;
  }

  .grid-item:hover img {
    transform: scale(1.05);
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(2px);
  }

  .loading-dialog {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    font-size: 1rem;
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: #666;
  }

  @media (max-width: 768px) {
    .grid {
      width: 100%;
      height: auto;
      aspect-ratio: 1;
    }
  }
</style> 