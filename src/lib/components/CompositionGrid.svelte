<script lang="ts">
  import { browser } from '$app/environment';
  import { unsigs } from '$lib/unsigs';
  import { createWorkerPool } from '$lib/unsig/worker-pool';
  import type { UnsigData } from '$lib/types';

  type GridPosition = {
    unsigId: number | null;
    hexAssetName?: string;
  };

  type CompositionGrid = GridPosition[][];

  let {
    grid = $bindable<CompositionGrid>([]),
    rows = $bindable(2),
    cols = $bindable(2),
    previewMode = false,
    onswap,
    onexternaldrop,
    onclear,
    onaddrow,
    onremoverow,
    onaddcol,
    onremovecol,
  }: {
    grid: CompositionGrid;
    rows: number;
    cols: number;
    previewMode?: boolean;
    onswap?: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
    onexternaldrop?: (row: number, col: number) => void;
    onclear?: (row: number, col: number) => void;
    onaddrow?: () => void;
    onremoverow?: () => void;
    onaddcol?: () => void;
    onremovecol?: () => void;
  } = $props();

  let maxDim = $derived(Math.max(rows, cols));

  // --- Local image generation ---
  const IMAGE_DIM = 512;
  let imageCache = $state<Map<number, string>>(new Map());
  let workerPool: ReturnType<typeof createWorkerPool> | null = null;
  let generatedIds = new Set<number>();

  function getWorkerPool() {
    if (!workerPool) workerPool = createWorkerPool();
    return workerPool;
  }

  // Collect all unsig IDs that need generation and batch them in one call
  $effect(() => {
    if (!browser) return;
    const needed: UnsigData[] = [];
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell.unsigId !== null && !imageCache.has(cell.unsigId) && !generatedIds.has(cell.unsigId)) {
          const data = unsigs[cell.unsigId.toString()];
          if (data) {
            generatedIds.add(cell.unsigId);
            needed.push(data);
          }
        }
      });
    });
    if (needed.length > 0) {
      const pool = getWorkerPool();
      pool.generateBatch(needed, IMAGE_DIM, (index, url) => {
        imageCache = new Map(imageCache).set(index, url);
      });
    }
  });

  // --- Internal drag state ---
  let draggingRow = $state<number | null>(null);
  let draggingCol = $state<number | null>(null);
  let dragOverRow = $state<number | null>(null);
  let dragOverCol = $state<number | null>(null);
  let animatingRow = $state<number | null>(null);
  let animatingCol = $state<number | null>(null);

  let dragClone: HTMLElement | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragSourceRect: DOMRect | null = null;
  let previewClone: HTMLElement | null = null;
  let previewAnim: Animation | null = null;

  // Persistent 1×1 canvas for suppressing native drag ghost.
  // Canvas works with setDragImage without needing to be in the DOM.
  let ghostCanvas: HTMLCanvasElement | null = null;
  function getGhostCanvas(): HTMLCanvasElement {
    if (!ghostCanvas) {
      ghostCanvas = document.createElement('canvas');
      ghostCanvas.width = 1;
      ghostCanvas.height = 1;
    }
    return ghostCanvas;
  }

  function handleDragMove(e: DragEvent) {
    if (dragClone && e.clientX !== 0 && e.clientY !== 0) {
      dragClone.style.left = `${e.clientX - dragOffsetX}px`;
      dragClone.style.top = `${e.clientY - dragOffsetY}px`;
    }
  }

  function createTileClone(el: HTMLElement, rect: DOMRect): HTMLElement {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      margin: 0;
      opacity: 1;
      transform: none;
      pointer-events: none;
      z-index: 9999;
      transition: none;
      overflow: hidden;
      background: black;
    `;
    const img = clone.querySelector('img');
    if (img) img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    // Hide cell controls in clone
    clone.querySelectorAll('.cell-controls').forEach(c => (c as HTMLElement).style.display = 'none');
    return clone;
  }

  function startPreview(el: HTMLElement) {
    if (!dragSourceRect) return;
    if (previewClone && previewAnim) {
      const oldClone = previewClone;
      const oldAnim = previewAnim;
      oldAnim.reverse();
      oldAnim.onfinish = () => oldClone.remove();
    }
    previewClone = null;
    previewAnim = null;

    const rect = el.getBoundingClientRect();
    const clone = createTileClone(el, rect);
    clone.style.zIndex = '9998';
    document.body.appendChild(clone);
    previewClone = clone;

    const dx = dragSourceRect.left - rect.left;
    const dy = dragSourceRect.top - rect.top;
    previewAnim = clone.animate([
      { transform: 'translate(0, 0)', easing: 'cubic-bezier(0.2, 0, 0.2, 1)' },
      { transform: `translate(${dx}px, ${dy}px)` }
    ], { duration: 500, fill: 'forwards' });
  }

  function reversePreview() {
    if (previewClone && previewAnim) {
      const clone = previewClone;
      const anim = previewAnim;
      anim.reverse();
      anim.onfinish = () => clone.remove();
    }
    previewClone = null;
    previewAnim = null;
  }

  function cleanupDragClone() {
    if (dragClone) {
      dragClone.remove();
      dragClone = null;
    }
    dragSourceRect = null;
    document.removeEventListener('dragover', handleDragMove);
  }

  function cellDragStart(e: DragEvent, rowIndex: number, colIndex: number) {
    const cell = grid[rowIndex][colIndex];
    if (cell.unsigId === null) return;

    draggingRow = rowIndex;
    draggingCol = colIndex;

    if (!e.dataTransfer) return;
    e.dataTransfer.setData('application/x-grid-swap', JSON.stringify({ row: rowIndex, col: colIndex }));
    e.dataTransfer.effectAllowed = 'move';

    // Hide native drag ghost using a 1×1 canvas (works without being in the DOM)
    e.dataTransfer.setDragImage(getGhostCanvas(), 0, 0);

    // Create visual clone
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    dragSourceRect = rect;
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    const clone = createTileClone(el, rect);
    document.body.appendChild(clone);
    dragClone = clone;
    document.addEventListener('dragover', handleDragMove);
  }

  function cellDragOver(e: DragEvent, rowIndex: number, colIndex: number) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (dragOverRow !== rowIndex || dragOverCol !== colIndex) {
      dragOverRow = rowIndex;
      dragOverCol = colIndex;
      if (draggingRow !== null && draggingCol !== null &&
          !(draggingRow === rowIndex && draggingCol === colIndex) &&
          grid[rowIndex][colIndex].unsigId !== null) {
        startPreview(e.currentTarget as HTMLElement);
      }
    }
  }

  function cellDragLeave(e: DragEvent, rowIndex: number, colIndex: number) {
    const related = e.relatedTarget as HTMLElement | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    if (dragOverRow === rowIndex && dragOverCol === colIndex) {
      dragOverRow = null;
      dragOverCol = null;
      reversePreview();
    }
  }

  function cellDrop(e: DragEvent, rowIndex: number, colIndex: number) {
    e.preventDefault();

    const swapData = e.dataTransfer?.getData('application/x-grid-swap');
    if (swapData && draggingRow !== null && draggingCol !== null) {
      const from = JSON.parse(swapData);
      if (from.row !== rowIndex || from.col !== colIndex) {
        animatingRow = from.row;
        animatingCol = from.col;
        onswap?.(from.row, from.col, rowIndex, colIndex);

        if (previewClone && previewAnim) {
          const clone = previewClone;
          const anim = previewAnim;
          const finish = () => { clone.remove(); animatingRow = null; animatingCol = null; };
          if (anim.playState === 'finished') finish();
          else anim.onfinish = finish;
          previewClone = null;
          previewAnim = null;
        } else {
          animatingRow = null;
          animatingCol = null;
        }
      }
    } else {
      onexternaldrop?.(rowIndex, colIndex);
    }

    draggingRow = null;
    draggingCol = null;
    dragOverRow = null;
    dragOverCol = null;
    cleanupDragClone();
  }

  function cellDragEnd() {
    reversePreview();
    draggingRow = null;
    draggingCol = null;
    dragOverRow = null;
    dragOverCol = null;
    cleanupDragClone();
  }
</script>

<div class="grid-workspace" class:preview-mode={previewMode}>
  <div class="composition-grid" class:preview-grid={previewMode}>
    <div
      class="inner-grid"
      class:preview-cells={previewMode}
      style="grid-template-rows: repeat({rows}, 1fr); grid-template-columns: repeat({cols}, 1fr); width: {cols / maxDim * 100}%; height: {rows / maxDim * 100}%;">
      {#each grid as row, rowIndex}
        {#each row as cell, colIndex}
          <div
            class="grid-cell"
            class:preview-cell={previewMode}
            class:dragging={draggingRow === rowIndex && draggingCol === colIndex}
            class:drag-over={dragOverRow === rowIndex && dragOverCol === colIndex && !(draggingRow === rowIndex && draggingCol === colIndex)}
            class:animating={animatingRow === rowIndex && animatingCol === colIndex}
            draggable={cell.unsigId !== null ? 'true' : undefined}
            ondragstart={(e) => cellDragStart(e, rowIndex, colIndex)}
            ondragover={(e) => cellDragOver(e, rowIndex, colIndex)}
            ondragleave={(e) => cellDragLeave(e, rowIndex, colIndex)}
            ondrop={(e) => cellDrop(e, rowIndex, colIndex)}
            ondragend={cellDragEnd}
            role="gridcell"
            tabindex="0">
            {#if cell.unsigId !== null}
              {@const cachedUrl = imageCache.get(cell.unsigId)}
              <div class="cell-image">
                <img
                  src={cachedUrl || `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/128/${cell.unsigId.toString().padStart(5, '0')}.png`}
                  alt="unsig {cell.unsigId}"
                  draggable="false"
                />
              </div>
            {:else}
              <div class="cell-empty"></div>
            {/if}

            {#if cell.unsigId !== null && !previewMode}
              <div class="cell-controls">
                <button
                  class="control-btn"
                  onclick={() => onclear?.(rowIndex, colIndex)}
                  aria-label="clear">
                  ×
                </button>
              </div>
            {/if}
          </div>
        {/each}
      {/each}
    </div>

    {#if !previewMode}
      <div class="column-controls-group">
        <button class="dim-btn" onclick={onremovecol} disabled={cols <= 1} aria-label="remove column">-</button>
        <span class="dim-sep">|</span>
        <button class="dim-btn" onclick={onaddcol} aria-label="add column">+</button>
      </div>
    {/if}
  </div>
</div>

{#if !previewMode}
  <div class="grid-bottom-controls">
    <div class="row-controls-group">
      <button class="dim-btn" onclick={onremoverow} disabled={rows <= 1} aria-label="remove row">-</button>
      <span class="dim-sep-v">|</span>
      <button class="dim-btn" onclick={onaddrow} aria-label="add row">+</button>
    </div>
  </div>
{/if}

<style>
  .grid-workspace {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  .composition-grid {
    width: min(calc(100vh - 480px), calc(100vw - 160px));
    height: min(calc(100vh - 480px), calc(100vw - 160px));
    aspect-ratio: 1;
    position: relative;
    z-index: 5;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-default);
    padding: 2px;
    border-radius: 2px;
  }

  .inner-grid {
    display: grid;
    gap: 2px;
    margin: auto;
    overflow: hidden;
  }

  .grid-cell {
    position: relative;
    aspect-ratio: 1/1;
    border: 1px solid var(--border-default);
    background-color: var(--bg-raised);
    cursor: pointer;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    transition: box-shadow 0.2s ease, opacity 0.2s ease;
  }

  .grid-cell:hover {
    border-color: var(--accent);
  }

  /* Source cell while dragging: outline only, image hidden (clone represents it) */
  .grid-cell.dragging {
    box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.8);
    z-index: 1;
  }

  .grid-cell.dragging .cell-image {
    visibility: hidden;
  }

  /* Target cell while hovered during drag */
  .grid-cell.drag-over {
    opacity: 0.4;
  }

  /* Cell hidden while swap animation plays */
  .grid-cell.animating {
    visibility: hidden;
  }

  /* Force grid cells to be square via absolute positioning trick */
  .grid-cell::before {
    content: "";
    display: block;
    padding-bottom: 100%;
    position: absolute;
  }

  .cell-image, .cell-empty {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }


  .cell-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
    -webkit-user-drag: none;
    user-select: none;
  }

  .cell-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--bg-surface);
    border: 1px solid var(--border-default);
    padding: 0 4px;
    border-radius: 12px;
    z-index: 20;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .grid-cell:hover .cell-controls {
    opacity: 1;
  }

  .control-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: none;
    font-size: 16px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .control-btn:hover {
    color: var(--text-primary);
  }

  .grid-bottom-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 0.75rem;
  }

  .row-controls-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-default);
    padding: 6px 2px;
    border-radius: 20px;
  }

  .column-controls-group {
    display: flex;
    align-items: center;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-default);
    padding: 2px 6px;
    border-radius: 20px;
    position: absolute;
    left: calc(100% + 0.75rem);
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
  }

  .dim-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: none;
    font-size: 16px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .dim-btn:hover:not(:disabled) {
    color: var(--text-primary);
  }

  .dim-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .dim-sep {
    color: var(--text-dim);
    font-size: 14px;
    line-height: 1;
    margin: 0 4px;
  }

  .dim-sep-v {
    transform: rotate(90deg);
    margin: 4px 0;
    color: var(--text-dim);
    font-size: 14px;
    line-height: 1;
  }

  /* Preview mode */
  .preview-mode {
    margin: 0 auto;
  }

  .preview-grid {
    border: none !important;
    padding: 0 !important;
    background: transparent !important;
  }

  .preview-cells {
    gap: 0 !important;
  }

  .preview-cell {
    border: none !important;
    background-color: transparent !important;
  }
</style>
