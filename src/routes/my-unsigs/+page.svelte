<script lang="ts">
  import { browser } from '$app/environment';
  import { BrowserWalletState } from '@meshsdk/svelte';
  import { onMount } from 'svelte';
  import UnsigGrid from '$lib/components/UnsigGrid.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import { goto } from '$app/navigation';
  import { getUnsig } from '$lib/unsigs';
  import { createUnsig } from '$lib/unsig/generator';
  import { unsigToImageData } from '$lib/unsig/generator';
  import { generateUnsigAsync } from '$lib/unsig/worker-api';
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

  // Download all state
  let showDownloadModal = $state(false);
  let downloadAllProgress = $state(0);
  let downloadAllCurrent = $state(0);
  let downloadAllTotal = $state(0);
  let downloadAllCurrentId = $state('');
  let downloadAllCancelled = $state(false);
  let downloadAllAbort: AbortController | null = $state(null);
  let downloadAllError = $state('');
  let downloadAllState = $state<'generating' | 'done' | 'error'>('generating');

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

  async function downloadAll() {
    if (!ownedUnsigs.length) return;

    const size = 4096;
    downloadAllTotal = ownedUnsigs.length;
    downloadAllCurrent = 0;
    downloadAllProgress = 0;
    downloadAllCancelled = false;
    downloadAllError = '';
    downloadAllState = 'generating';
    showDownloadModal = true;

    const abort = new AbortController();
    downloadAllAbort = abort;

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    try {
      for (let i = 0; i < ownedUnsigs.length; i++) {
        if (downloadAllCancelled || abort.signal.aborted) break;

        const unsig = ownedUnsigs[i];
        const paddedId = unsig.id.toString().padStart(5, '0');
        downloadAllCurrent = i + 1;
        downloadAllCurrentId = paddedId;

        const unsigData = getUnsig(unsig.id.toString());
        if (!unsigData) continue;

        tempCanvas.width = size;
        tempCanvas.height = size;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);

        if (unsigData.index !== 0) {
          const formattedUnsig = createUnsig(Number(unsigData.index), {
            multipliers: unsigData.properties.multipliers.map(Number),
            colors: unsigData.properties.colors,
            distributions: unsigData.properties.distributions,
            rotations: unsigData.properties.rotations.map(Number)
          });

          const { imageData } = await generateUnsigAsync(formattedUnsig, size, {
            onProgress(percent) {
              downloadAllProgress = Math.round(((i + percent / 100) / ownedUnsigs.length) * 100);
            },
            signal: abort.signal,
          });
          const fullData = unsigToImageData(imageData, size);
          ctx.putImageData(fullData, 0, 0);
        } else {
          downloadAllProgress = Math.round(((i + 1) / ownedUnsigs.length) * 100);
        }

        const blob = await new Promise<Blob>(resolve => {
          tempCanvas.toBlob(blob => { if (blob) resolve(blob); }, 'image/png');
        });
        const link = document.createElement('a');
        link.download = `unsig_${paddedId}_${size}px.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);

        // Brief pause between downloads to avoid browser throttling
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!downloadAllCancelled && !abort.signal.aborted) {
        downloadAllProgress = 100;
        downloadAllState = 'done';
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        showDownloadModal = false;
        return;
      }
      console.error('Error during batch download:', err);
      downloadAllError = `failed on unsig #${downloadAllCurrentId}. ${downloadAllCurrent - 1} of ${downloadAllTotal} downloaded.`;
      downloadAllState = 'error';
    } finally {
      downloadAllAbort = null;
    }
  }
</script>

<div class="my-unsigs-page">
  {#if !browser || !BrowserWalletState.connected}
    <div class="empty-message">please connect your wallet to view your unsigs</div>
  {:else if error}
    <div class="error-message">{error}</div>
  {:else if unsigCount === 0 && !loading}
    <div class="empty-message">no unsigs found in your wallet</div>
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

    <div class="download-all-container">
      <button class="download-all-btn" onclick={downloadAll}>
        download all ({unsigCount})
      </button>
    </div>
  {/if}
</div>

<Modal bind:showModal={showDownloadModal}>
  {#snippet header()}
    {#if downloadAllState === 'generating'}
      <h3 class="modal-title font-serif">downloading collection</h3>
    {:else if downloadAllState === 'done'}
      <h3 class="modal-title font-serif">download complete</h3>
    {:else}
      <h3 class="modal-title font-serif">error</h3>
    {/if}
  {/snippet}
  {#snippet content()}
    {#if downloadAllState === 'generating'}
      <p class="modal-text">rendering unsig #{downloadAllCurrentId} ({downloadAllCurrent} of {downloadAllTotal})</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {downloadAllProgress}%"></div>
      </div>
      <p class="modal-progress-label">{downloadAllProgress}%</p>
      <div class="modal-actions">
        <button class="modal-btn" onclick={() => { downloadAllCancelled = true; downloadAllAbort?.abort(); showDownloadModal = false; }}>cancel</button>
      </div>
    {:else if downloadAllState === 'done'}
      <p class="modal-text">{downloadAllTotal} unsigs downloaded at 4,096px</p>
      <div class="modal-actions">
        <button class="modal-btn" onclick={() => { showDownloadModal = false; }}>close</button>
      </div>
    {:else}
      <p class="modal-text">{downloadAllError}</p>
      <div class="modal-actions">
        <button class="modal-btn" onclick={() => { showDownloadModal = false; }}>close</button>
      </div>
    {/if}
  {/snippet}
</Modal>

<style>
  .my-unsigs-page {
    min-height: 100vh;
    background: var(--bg-void);
    padding: var(--space-lg);
  }

  .empty-message {
    color: var(--text-secondary);
    padding: var(--space-xl) 0;
    text-align: center;
  }

  .error-message {
    color: #ef4444;
    padding: var(--space-md) 0;
    text-align: center;
  }

  .grid-container {
    width: 100%;
    max-width: min(90vw, calc(90vh * 1));
    aspect-ratio: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    margin: 0 auto;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .grid-container {
      max-width: 95vw;
      max-height: 95vw;
    }
  }

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

  .download-all-container {
    display: flex;
    justify-content: center;
    margin-top: var(--space-md);
  }

  .download-all-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-default);
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--text-sm);
    transition: color 0.15s, border-color 0.15s;
  }

  .download-all-btn:hover {
    color: var(--accent);
    border-color: var(--border-focus);
  }

  .modal-title {
    font-size: var(--text-lg);
    font-weight: 400;
    color: var(--text-primary);
  }

  .modal-text {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.6;
    margin-bottom: var(--space-md);
  }

  .modal-actions {
    display: flex;
    gap: var(--space-sm);
    justify-content: flex-end;
    margin-top: var(--space-md);
  }

  .modal-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-default);
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--text-sm);
    transition: color 0.15s, border-color 0.15s;
  }

  .modal-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-focus);
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--bg-raised);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s ease-out;
  }

  .modal-progress-label {
    text-align: center;
    color: var(--text-dim);
    font-size: var(--text-xs);
    margin-top: var(--space-sm);
  }
</style> 