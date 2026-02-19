<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  
  // Get the data from the server load function
  const { data } = $props<{data: PageData}>();
  
  // Types
  type GridPosition = {
    unsigIndex: number;
    row: number;
    column: number;
  };
  
  type Composition = {
    id: number;
    transactionId: string;
    positions: GridPosition[];
    createdAt: string;
  };
  
  // State — initial values captured intentionally from server load, then managed client-side
  // svelte-ignore state_referenced_locally
  let compositions = $state<Composition[]>(data.compositions || []);
  let loading = $state(false);
  // svelte-ignore state_referenced_locally
  let error = $state<string | null>(data.error || null);
  let selectedComposition = $state<Composition | null>(null);
  
  // Fetch compositions from API (used for manual refresh)
  async function fetchCompositions() {
    loading = true;
    error = null;
    
    try {
      const response = await fetch('/api/db/compositions');
      const result = await response.json();
      
      if (result.success) {
        compositions = result.compositions;
      } else {
        error = result.message || 'failed to load compositions';
      }
    } catch (err) {
      console.error('Error fetching compositions:', err);
      error = err instanceof Error ? err.message : 'an error occurred';
    } finally {
      loading = false;
    }
  }
  
  // Get the maximum row and column for a composition to determine grid size
  function getGridDimensions(positions: GridPosition[]) {
    if (!positions || positions.length === 0) return { rows: 0, cols: 0 };
    
    const maxRow = Math.max(...positions.map(p => p.row)) + 1;
    const maxCol = Math.max(...positions.map(p => p.column)) + 1;
    
    return { rows: maxRow, cols: maxCol };
  }
  
  // Get a composition's cell content at a specific position
  function getCellContent(composition: Composition, row: number, col: number) {
    if (!composition.positions) return null;
    
    return composition.positions.find(p => p.row === row && p.column === col) || null;
  }
  
  // Format date for display
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
  
  // Get unique unsigs in a composition
  function getUniqueUnsigs(composition: Composition) {
    if (!composition.positions) return [];
    
    // Get unique unsig indices
    const uniqueIndices = [...new Set(composition.positions.map(p => p.unsigIndex))];
    
    return uniqueIndices;
  }
  
  // Format txid for display (truncate with ellipsis)
  function formatTxid(txid: string, truncate: boolean = false) {
    if (truncate) {
      if (txid.length <= 16) return txid;
      return txid.substring(0, 8) + '...' + txid.substring(txid.length - 8);
    } else {
      return txid;
    }
  }
  
  // View composition details
  function viewComposition(composition: Composition) {
    selectedComposition = composition;
  }
  
  // Close composition details
  function closeDetails() {
    selectedComposition = null;
  }
</script>

<div class="arrangements-page">
  
  {#if loading}
    <div class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
    </div>
  {:else if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <p>{error}</p>
      <button 
        class="mt-2 bg-red-700 text-white px-4 py-2 rounded text-sm"
        onclick={fetchCompositions}>
        retry
      </button>
    </div>
  {:else if compositions.length === 0}
    <div class="text-center py-12 text-gray-500">
      <p>no compositions found</p>
      <p class="text-sm mt-2">create a composition in the composer to see it here</p>
    </div>
  {:else}
    <!-- Compositions Feed with Masonry Layout -->
    <div class="masonry-grid">
      {#each compositions as composition}
        <div class="composition-card">
          <!-- Composition Content (Main Image) -->
          {#if composition.positions && composition.positions.length > 0}
            {@const dimensions = getGridDimensions(composition.positions)}
            <div class="composition-grid"
                 style="--rows: {dimensions.rows}; --cols: {dimensions.cols}; grid-template-rows: repeat({dimensions.rows}, 128px); grid-template-columns: repeat({dimensions.cols}, 128px);">
              {#each Array(dimensions.rows) as _, rowIndex}
                {#each Array(dimensions.cols) as _, colIndex}
                  {@const cell = getCellContent(composition, rowIndex, colIndex)}
                  <div class="grid-cell">
                    {#if cell}
                      <div class="cell-content">
                        <img
                          src="https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/256/{cell.unsigIndex.toString().padStart(5, '0')}.png"
                          alt="unsig {cell.unsigIndex}"
                          class="w-full h-full object-cover"
                        />
                        <div class="cell-overlay">
                          <a href="/nft/{cell.unsigIndex}" class="cell-link">
                            #{cell.unsigIndex.toString().padStart(5, '0')}
                          </a>
                        </div>
                      </div>
                    {:else}
                      <div class="empty-cell"></div>
                    {/if}
                  </div>
                {/each}
              {/each}
            </div>
          {:else}
            <div class="text-center text-gray-500 py-8">
              empty composition
            </div>
          {/if}
          
          <!-- Creation Time -->
          <div class="creation-time">
            created {new Date(composition.createdAt).toLocaleDateString('en-US', { 
              month: 'numeric', 
              day: 'numeric', 
              year: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              hour12: true
            })}
          </div>
          
          <!-- Transaction ID -->
          <div class="transaction-id-container">
            <a class="transaction-id" href="/arrangements/{composition.transactionId}">{formatTxid(composition.transactionId, true)}</a>
            <button 
              class="copy-button" 
              onclick={() => {
                navigator.clipboard.writeText(composition.transactionId);
                const btn = event?.target as HTMLButtonElement;
                const originalText = btn.innerHTML;
                btn.innerHTML = 'OK';
                setTimeout(() => {
                  btn.innerHTML = originalText;
                }, 200);
              }}
              title="Copy transaction ID">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .arrangements-page {
    min-height: 100vh;
    background: var(--bg-void);
    padding: var(--space-lg);
  }

  .masonry-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 24px;
    width: 100%;
  }

  .composition-card {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    break-inside: avoid;
  }

  .composition-grid {
    display: grid;
    gap: 0;
    width: auto;
    margin: 0 auto;
    background-color: var(--bg-void);
    border: 1px solid var(--border-subtle);
    overflow: hidden;
  }

  .grid-cell {
    width: 128px;
    height: 128px;
    background-color: var(--bg-raised);
    position: relative;
  }

  .cell-content {
    width: 100%;
    height: 100%;
    position: relative;
    cursor: pointer;
  }

  .cell-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.15s;
    z-index: 10;
  }

  .grid-cell:hover .cell-overlay {
    background: rgba(0, 0, 0, 0.5);
    opacity: 1;
  }

  .cell-link {
    color: white;
    font-size: var(--text-sm);
    text-decoration: none;
  }

  .empty-cell {
    width: 100%;
    height: 100%;
    background-color: var(--bg-raised);
  }

  .creation-time {
    margin-top: 12px;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-align: center;
  }

  .transaction-id {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: var(--border-default);
  }

  .transaction-id:hover {
    color: var(--text-primary);
    text-decoration-color: var(--text-primary);
  }

  .transaction-id-container {
    margin-top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .copy-button {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: var(--text-dim);
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .copy-button:hover {
    color: var(--text-primary);
    background-color: var(--accent-dim);
  }

  @media (max-width: 768px) {
    .masonry-grid {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }

    .grid-cell {
      width: 96px;
      height: 96px;
    }

    .composition-grid {
      grid-template-rows: repeat(var(--rows), 96px) !important;
      grid-template-columns: repeat(var(--cols), 96px) !important;
    }

    .cell-link {
      font-size: 10px;
    }
  }

  @media (max-width: 480px) {
    .masonry-grid {
      grid-template-columns: 1fr;
    }
  }
</style> 