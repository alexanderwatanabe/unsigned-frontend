<script lang="ts">
  import { browser } from '$app/environment';
  import { BrowserWalletState } from '@meshsdk/svelte';
  import { onMount } from 'svelte';
  import UnsigGrid from '$lib/components/UnsigGrid.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { goto } from '$app/navigation';
  import type { OwnedUnsig, WalletAsset } from '$lib/types';

  const UNSIGS_POLICY_ID = '0e14267a8020229adc0184dd25fa3174c3f7d6caadcb4425c70e7c04';
  const PAGE_SIZES = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256];
  const PREFETCH_PAGES = 1; // Number of pages to prefetch in each direction
  
  let loading = $state(false);
  let unsigCount = $state(0);
  let unsigIndices = $state<number[]>([]);
  let ownedUnsigs = $state<OwnedUnsig[]>([]);
  let error = $state<string | null>(null);
  let currentPage = $state(1);
  let itemsPerPage = $state(25);
  let displayItemsPerPage = $state(25);
  let gridItems = $state<Array<{ id: number; imageUrl: string; hexAssetName: string }>>([]);
  let currentResolution = $state(128);
  let prefetchedUrls = $state(new Set<string>());
  let activeAnimation = $state<string | null>(null);
  let showCompositionBuilder = $state(false);

  let gridSize = $derived(Math.sqrt(itemsPerPage));
  let totalPages = $derived(Math.ceil(unsigIndices.length / itemsPerPage));

  function getImageResolution(items: number): number {
    if (items === 1) return 1024;
    if (items <= 16) return 256;
    return 128; // Default to 128 for all larger grids
  }

  function getImageUrl(index: number, resolution: number): string {
    const paddedIndex = index.toString().padStart(5, '0');
    return `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/${resolution}/${paddedIndex}.png`;
  }

  function prefetchImage(url: string) {
    if (prefetchedUrls.has(url)) return;
    const img = new Image();
    img.src = url;
    prefetchedUrls.add(url);
  }

  function prefetchAdjacentPages() {
    if (!unsigIndices.length) return;

    // Calculate range of pages to prefetch
    const startPage = Math.max(1, currentPage - PREFETCH_PAGES);
    const endPage = Math.min(totalPages, currentPage + PREFETCH_PAGES);

    // Get all indices that need prefetching
    const indicesToPrefetch = new Set<number>();
    for (let page = startPage; page <= endPage; page++) {
      if (page === currentPage) continue; // Skip current page as it's already loaded
      const start = (page - 1) * itemsPerPage;
      const end = Math.min(start + itemsPerPage, unsigIndices.length);
      for (let i = start; i < end; i++) {
        indicesToPrefetch.add(unsigIndices[i]);
      }
    }

    // Prefetch images
    indicesToPrefetch.forEach(index => {
      const url = getImageUrl(index, currentResolution);
      prefetchImage(url);
    });
  }

  function findClosestPageSize(size: number): number {
    return PAGE_SIZES.reduce((prev, curr) => 
      Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
    );
  }

  function handleKeydown(event: KeyboardEvent) {
    // Only handle if not in an input field
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement || 
        event.target instanceof HTMLSelectElement) {
      return;
    }

    // Handle arrow keys and vim navigation
    switch (event.key.toLowerCase()) {
      case 'arrowleft':
      case 'h':
        event.preventDefault();
        if (currentPage > 1) {
          activeAnimation = 'slide-left';
          currentPage--;
          setTimeout(() => activeAnimation = null, 300);
        }
        break;
      
      case 'arrowright':
      case 'l':
        event.preventDefault();
        if (currentPage < totalPages) {
          activeAnimation = 'slide-right';
          currentPage++;
          setTimeout(() => activeAnimation = null, 300);
        }
        break;
      
      case 'j':
        event.preventDefault();
        const currentIndex = PAGE_SIZES.indexOf(itemsPerPage);
        if (currentIndex > 0) {
          activeAnimation = 'grid-shrink';
          handleItemsPerPageChange(PAGE_SIZES[currentIndex - 1]);
          setTimeout(() => activeAnimation = null, 300);
        }
        break;
      
      case 'k':
        event.preventDefault();
        const nextIndex = PAGE_SIZES.indexOf(itemsPerPage) + 1;
        if (nextIndex < PAGE_SIZES.length) {
          activeAnimation = 'grid-grow';
          handleItemsPerPageChange(PAGE_SIZES[nextIndex]);
          setTimeout(() => activeAnimation = null, 300);
        }
        break;
    }
  }

  onMount(() => {
    if (browser) {
      window.addEventListener('keydown', handleKeydown);
      return () => {
        window.removeEventListener('keydown', handleKeydown);
      };
    }
  });

  $effect(() => {
    // Update resolution based on items per page
    currentResolution = getImageResolution(itemsPerPage);
    // Clear prefetched URLs when resolution changes
    prefetchedUrls = new Set();
  });

  $effect(() => {
    if (browser && BrowserWalletState.connected && BrowserWalletState.wallet) {
      loading = true;
      error = null;
      BrowserWalletState.wallet.getAssets()
        .then((assets: WalletAsset[]) => {
          const unsigAssets = assets.filter((asset: WalletAsset) => asset.unit.startsWith(UNSIGS_POLICY_ID));
          unsigCount = unsigAssets.length;
          
          // Process assets to get both ID and hex asset name
          ownedUnsigs = unsigAssets
            .map((asset: WalletAsset) => extractAssetInfo(asset.unit))
            .filter((unsig): unsig is OwnedUnsig => unsig !== null)
            .sort((a: OwnedUnsig, b: OwnedUnsig) => a.id - b.id);
            
          // Keep the unsigIndices array for compatibility
          unsigIndices = ownedUnsigs.map(unsig => unsig.id);
          
          // Clear prefetched URLs when assets change
          prefetchedUrls = new Set();
        })
        .catch((err: Error) => {
          console.error('Failed to fetch assets:', err);
          error = err.message || 'Failed to fetch assets';
          unsigCount = 0;
          unsigIndices = [];
          ownedUnsigs = [];
        })
        .finally(() => {
          loading = false;
        });
    } else {
      unsigCount = 0;
      unsigIndices = [];
      ownedUnsigs = [];
      error = null;
    }
  });

  $effect(() => {
    // Update current items when page, indices, or resolution changes
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, ownedUnsigs.length);
    gridItems = ownedUnsigs.slice(start, end).map(unsig => ({
      id: unsig.id,
      imageUrl: getImageUrl(unsig.id, currentResolution),
      hexAssetName: unsig.hexAssetName
    }));

    // Prefetch adjacent pages after current page is set
    if (browser) {
      prefetchAdjacentPages();
    }
  });

  function extractAssetInfo(unit: string): OwnedUnsig | null {
    try {
      // Get the hex after the policy ID
      const hexAssetName = unit.slice(UNSIGS_POLICY_ID.length);
      
      // Convert hex to UTF-8 string
      const bytes = new Uint8Array(hexAssetName.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      const assetName = new TextDecoder().decode(bytes);
      
      // Extract number from the string
      const match = assetName.match(/\d+/);
      if (!match) return null;
      
      const id = parseInt(match[0], 10);
      return {
        id,
        hexAssetName
      };
    } catch (err) {
      console.error('Error extracting index:', err, 'from unit:', unit);
      return null;
    }
  }

  function handlePageChange(page: number) {
    currentPage = page;
  }

  function handleItemsPerPageChange(size: number) {
    itemsPerPage = size;
    displayItemsPerPage = size;
    // Clear prefetched URLs when grid size changes
    prefetchedUrls = new Set();
    // Adjust current page if necessary
    const newTotalPages = Math.ceil(unsigIndices.length / size);
    if (currentPage > newTotalPages) {
      currentPage = newTotalPages;
    }
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</svelte:head>

<div class="container mx-auto px-4 py-8">
  {#if !browser || !BrowserWalletState.connected}
    <div class="text-gray-600">please connect your wallet to view your unsigs</div>
  {:else if error}
    <div class="text-red-500">{error}</div>
  {:else if unsigCount === 0 && !loading}
    <div class="text-gray-600">no unsigs found in your wallet</div>
  {:else}
    <div class="grid-container" class:animate-left={activeAnimation === 'slide-left'} 
          class:animate-right={activeAnimation === 'slide-right'}
          class:animate-shrink={activeAnimation === 'grid-shrink'}
          class:animate-grow={activeAnimation === 'grid-grow'}>
      <UnsigGrid
        items={gridItems}
        {loading}
        {gridSize}
        imageResolution={currentResolution}
      />
    </div>

    <Pagination
      {currentPage}
      {totalPages}
      {itemsPerPage}
      {displayItemsPerPage}
      onPageChange={handlePageChange}
      onItemsPerPageChange={handleItemsPerPageChange}
    />
  {/if}
</div>

<style>
  :global(*) {
    font-family: 'JetBrains Mono', monospace;
  }

  .grid-container {
    width: 100%;
    max-width: min(90vw, calc(90vh * 1)); /* Square aspect ratio, limited by viewport */
    aspect-ratio: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    margin: 0 auto;
    overflow: hidden;
  }

  /* Ensure grid container maintains square ratio on smaller screens */
  @media (max-width: 768px) {
    .grid-container {
      max-width: 95vw;
      max-height: 95vw;
    }
  }

  /* Navigation animations */
  .animate-left {
    animation: slideLeft 0.3s ease-in-out;
  }

  .animate-right {
    animation: slideRight 0.3s ease-in-out;
  }

  .animate-shrink {
    animation: gridShrink 0.3s ease-in-out;
  }

  .animate-grow {
    animation: gridGrow 0.3s ease-in-out;
  }

  @keyframes slideLeft {
    0% { transform: translateX(0); opacity: 1; }
    15% { transform: translateX(-5px); opacity: 0.9; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideRight {
    0% { transform: translateX(0); opacity: 1; }
    15% { transform: translateX(5px); opacity: 0.9; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes gridShrink {
    0% { transform: scale(1); opacity: 1; }
    15% { transform: scale(0.99); opacity: 0.95; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes gridGrow {
    0% { transform: scale(1); opacity: 1; }
    15% { transform: scale(1.01); opacity: 0.95; }
    100% { transform: scale(1); opacity: 1; }
  }
</style> 