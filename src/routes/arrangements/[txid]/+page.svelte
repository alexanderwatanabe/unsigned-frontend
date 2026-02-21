<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import { getUnsig } from '$lib/unsigs';
  import { generateUnsigAsync } from '$lib/unsig/worker-api';
  import { createUnsig, unsigToImageData } from '$lib/unsig/generator';
  import type { PageData } from './$types';

  const { data } = $props<{ data: PageData }>();

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

  let composition: Composition = $derived(data.composition);

  // Grid helpers
  function getGridDimensions(positions: GridPosition[]) {
    if (!positions || positions.length === 0) return { rows: 0, cols: 0 };
    const maxRow = Math.max(...positions.map(p => p.row)) + 1;
    const maxCol = Math.max(...positions.map(p => p.column)) + 1;
    return { rows: maxRow, cols: maxCol };
  }

  function getCellContent(row: number, col: number) {
    return composition.positions?.find(p => p.row === row && p.column === col) || null;
  }

  let dimensions = $derived(getGridDimensions(composition.positions));

  // Copy txid
  let copied = $state(false);
  function copyTxid() {
    navigator.clipboard.writeText(composition.transactionId);
    copied = true;
    setTimeout(() => { copied = false; }, 1500);
  }

  // Download state
  let showDownloadModal = $state(false);
  let downloadProgress = $state(0);
  let downloadTotal = $state(0);
  let downloadStatus = $state('');
  let abortController: AbortController | null = null;

  const TILE_SIZE = 4096;

  async function downloadComposition() {
    const { rows, cols } = dimensions;
    const totalTiles = composition.positions.length;

    const abort = new AbortController();
    abortController = abort;

    showDownloadModal = true;
    downloadProgress = 0;
    downloadTotal = totalTiles;
    downloadStatus = 'generating tiles...';

    try {
      const canvas = document.createElement('canvas');
      canvas.width = cols * TILE_SIZE;
      canvas.height = rows * TILE_SIZE;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        downloadStatus = 'canvas too large for this browser';
        return;
      }

      // Black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Generate and draw each tile
      for (const pos of composition.positions) {
        if (abort.signal.aborted) return;

        const unsigData = getUnsig(String(pos.unsigIndex));

        if (!unsigData || unsigData.num_props === 0) {
          // Unsig #00000 or missing — black tile (already filled)
          downloadProgress++;
          continue;
        }

        const formattedUnsig = createUnsig(pos.unsigIndex, {
          multipliers: unsigData.properties.multipliers.map(Number),
          colors: unsigData.properties.colors,
          distributions: unsigData.properties.distributions,
          rotations: unsigData.properties.rotations.map(Number),
        });

        const { imageData } = await generateUnsigAsync(formattedUnsig, TILE_SIZE, {
          signal: abort.signal,
        });

        if (abort.signal.aborted) return;

        const imgData = unsigToImageData(imageData, TILE_SIZE);
        ctx.putImageData(imgData, pos.column * TILE_SIZE, pos.row * TILE_SIZE);
        downloadProgress++;
      }

      downloadStatus = 'generating png...';

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (abort.signal.aborted || !blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `composition-${composition.transactionId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showDownloadModal = false;
    } catch (err: any) {
      if (err?.name === 'AbortError' || abort.signal.aborted) {
        showDownloadModal = false;
        return;
      }
      downloadStatus = 'download failed';
      console.error('Download error:', err);
    } finally {
      abortController = null;
    }
  }

  function cancelDownload() {
    abortController?.abort();
    showDownloadModal = false;
  }
</script>

<div class="detail-page">
  <a href="/arrangements" class="back-link">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 12H5"></path>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
    arrangements
  </a>

  <div class="composition-wrapper">
    {#if composition.positions && composition.positions.length > 0}
      <div class="composition-grid"
           style="--rows: {dimensions.rows}; --cols: {dimensions.cols}; grid-template-rows: repeat({dimensions.rows}, 256px); grid-template-columns: repeat({dimensions.cols}, 256px);">
        {#each Array(dimensions.rows) as _, rowIndex}
          {#each Array(dimensions.cols) as _, colIndex}
            {@const cell = getCellContent(rowIndex, colIndex)}
            <div class="grid-cell">
              {#if cell}
                <div class="relative group">
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
    {/if}
  </div>

  <div class="metadata">
    <div class="txid-row">
      <span class="txid-label">tx</span>
      <span class="txid-value">{composition.transactionId}</span>
      <button class="copy-button" onclick={copyTxid} title="copy transaction id">
        {#if copied}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        {/if}
      </button>
    </div>

    <div class="date-row">
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

    <button class="download-button" onclick={downloadComposition}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      download png ({dimensions.cols * TILE_SIZE} x {dimensions.rows * TILE_SIZE})
    </button>
  </div>
</div>

<Modal bind:showModal={showDownloadModal}>
  {#snippet header()}
    <h3 class="modal-title">generating image</h3>
  {/snippet}
  {#snippet content()}
    <div class="download-modal-content">
      <p class="download-modal-status">{downloadStatus}</p>
      {#if downloadTotal > 0}
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: {(downloadProgress / downloadTotal) * 100}%"></div>
        </div>
        <p class="progress-text">{downloadProgress} / {downloadTotal} tiles</p>
      {/if}
      <button class="cancel-button" onclick={cancelDownload}>cancel</button>
    </div>
  {/snippet}
</Modal>

<style>
  .detail-page {
    min-height: 100vh;
    background: var(--bg-void);
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .back-link {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    text-decoration: none;
    margin-bottom: var(--space-lg);
  }

  .back-link:hover {
    color: var(--text-primary);
  }

  .composition-wrapper {
    display: flex;
    justify-content: center;
  }

  .composition-grid {
    display: grid;
    gap: 0;
    background-color: var(--bg-void);
    border: 1px solid var(--border-subtle);
    overflow: hidden;
  }

  .grid-cell {
    width: 256px;
    height: 256px;
    background-color: var(--bg-raised);
    position: relative;
  }

  .grid-cell .group {
    width: 100%;
    height: 100%;
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

  .metadata {
    margin-top: var(--space-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    max-width: 100%;
  }

  .txid-row {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
  }

  .txid-label {
    font-size: var(--text-xs);
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .txid-value {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    word-break: break-all;
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
    flex-shrink: 0;
  }

  .copy-button:hover {
    color: var(--text-primary);
    background-color: var(--accent-dim);
  }

  .date-row {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .download-button {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    cursor: pointer;
    font-family: inherit;
  }

  .download-button:hover {
    background: var(--bg-raised);
    border-color: var(--text-dim);
  }

  .modal-title {
    font-size: var(--text-base);
    color: var(--text-primary);
    margin: 0;
  }

  .download-modal-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .download-modal-status {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin: 0;
  }

  .progress-bar-track {
    width: 100%;
    height: 4px;
    background: var(--bg-raised);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--text-primary);
    transition: width 0.2s;
  }

  .progress-text {
    font-size: var(--text-xs);
    color: var(--text-dim);
    margin: 0;
  }

  .cancel-button {
    padding: 6px 16px;
    background: none;
    border: 1px solid var(--border-default);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
    font-family: inherit;
  }

  .cancel-button:hover {
    color: var(--text-primary);
    border-color: var(--text-dim);
  }

  @media (max-width: 768px) {
    .grid-cell {
      width: 128px;
      height: 128px;
    }

    .composition-grid {
      grid-template-rows: repeat(var(--rows), 128px) !important;
      grid-template-columns: repeat(var(--cols), 128px) !important;
    }

    .txid-value {
      font-size: 10px;
    }
  }
</style>
