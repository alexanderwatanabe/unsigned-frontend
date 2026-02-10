<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

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

  let gridEl: HTMLElement;

  function getFullAssetId(hexAssetName: string): string {
    return `${UNSIGS_POLICY_ID}${hexAssetName}`;
  }

  // IntersectionObserver for staggered fade-in
  onMount(() => {
    if (!browser || !gridEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    function observeItems() {
      gridEl?.querySelectorAll('.grid-item').forEach((item, i) => {
        (item as HTMLElement).style.animationDelay = `${i * 30}ms`;
        observer.observe(item);
      });
    }

    observeItems();

    // Re-observe when items change
    const mutObserver = new MutationObserver(observeItems);
    mutObserver.observe(gridEl, { childList: true });

    return () => {
      observer.disconnect();
      mutObserver.disconnect();
    };
  });
</script>

<div class="grid" style="--grid-size: {gridSize}" data-resolution={imageResolution} bind:this={gridEl}>
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
    gap: 1px;
    width: 100%;
    max-width: 100%;
    background: var(--bg-void);
    min-height: 200px;
  }

  .grid-item {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    width: 100%;
    height: 100%;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.3s ease-out, transform 0.3s ease-out, box-shadow 0.2s ease;
  }

  .grid-item.visible,
  .grid-item:global(.visible) {
    opacity: 1;
    transform: translateY(0);
  }

  .grid-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .index {
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .grid-item:hover {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);
    z-index: 1;
  }

  .grid-item:hover .overlay {
    opacity: 1;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 10, 10, 0.8);
    backdrop-filter: blur(2px);
    z-index: 10;
  }

  .loading-dialog {
    background: var(--bg-surface);
    color: var(--text-primary);
    padding: var(--space-md) var(--space-lg);
    border-radius: 4px;
    font-size: var(--text-sm);
    border: 1px solid var(--border-default);
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    color: var(--text-dim);
  }

  @media (max-width: 768px) {
    .grid {
      width: 100%;
    }
  }
</style>
