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
  export let swappable = false;
  export let onswap: ((fromIndex: number, toIndex: number) => void) | undefined = undefined;

  let gridEl: HTMLElement;
  let draggingIndex: number | null = null;
  let dragOverIndex: number | null = null;
  let dragClone: HTMLElement | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragSourceRect: DOMRect | null = null;
  let animatingIndex: number | null = null;

  // Preview state: the clone of the hovered tile that floats toward the source
  let previewClone: HTMLElement | null = null;
  let previewAnim: Animation | null = null;

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
    const overlay = clone.querySelector('.overlay, [class*="overlay"]');
    if (overlay) (overlay as HTMLElement).style.display = 'none';
    return clone;
  }

  function startPreview(el: HTMLElement) {
    if (!dragSourceRect) return;
    // If there's already an active preview, let it reverse back independently
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
    ], {
      duration: 500,
      fill: 'forwards'
    });
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
    {#each items as item, index (item.id)}
      <a
        href="/nft/{item.id}"
        class="grid-item"
        class:dragging={swappable && draggingIndex === index}
        class:drag-over={swappable && dragOverIndex === index}
        class:animating={swappable && animatingIndex === index}
        data-hex-asset-name={item.hexAssetName}
        data-full-asset-id={item.hexAssetName ? getFullAssetId(item.hexAssetName) : undefined}
        draggable={swappable ? 'true' : undefined}
        ondragstart={swappable ? (e) => {
          draggingIndex = index;
          if (!e.dataTransfer) return;
          e.dataTransfer.setData('text/plain', String(index));
          e.dataTransfer.effectAllowed = 'move';
          // Hide native drag ghost
          const transparent = document.createElement('canvas');
          transparent.width = 1;
          transparent.height = 1;
          e.dataTransfer.setDragImage(transparent, 0, 0);
          // Create visual clone at element's current position
          const el = e.currentTarget as HTMLElement;
          const rect = el.getBoundingClientRect();
          dragSourceRect = rect;
          dragOffsetX = e.clientX - rect.left;
          dragOffsetY = e.clientY - rect.top;
          const clone = createTileClone(el, rect);
          document.body.appendChild(clone);
          dragClone = clone;
          document.addEventListener('dragover', handleDragMove);
        } : undefined}
        ondragover={swappable ? (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          if (dragOverIndex !== index) {
            dragOverIndex = index;
            if (draggingIndex !== null && draggingIndex !== index) {
              startPreview(e.currentTarget as HTMLElement);
            }
          }
        } : undefined}
        ondragleave={swappable ? (e) => {
          const related = e.relatedTarget as HTMLElement | null;
          if (related && (e.currentTarget as HTMLElement).contains(related)) return;
          if (dragOverIndex === index) {
            dragOverIndex = null;
            reversePreview();
          }
        } : undefined}
        ondrop={swappable ? (e) => {
          e.preventDefault();
          if (draggingIndex !== null && draggingIndex !== index && dragSourceRect) {
            // Hide the real displaced tile at its destination during animation
            animatingIndex = draggingIndex;
            onswap?.(draggingIndex, index);
            // The preview clone is already animating toward the source cell
            if (previewClone && previewAnim) {
              const clone = previewClone;
              const anim = previewAnim;
              const finish = () => {
                clone.remove();
                animatingIndex = null;
              };
              if (anim.playState === 'finished') {
                finish();
              } else {
                anim.onfinish = finish;
              }
              previewClone = null;
              previewAnim = null;
            } else {
              animatingIndex = null;
            }
          }
          draggingIndex = null;
          dragOverIndex = null;
          cleanupDragClone();
        } : undefined}
        ondragend={swappable ? () => {
          reversePreview();
          draggingIndex = null;
          dragOverIndex = null;
          cleanupDragClone();
        } : undefined}
      >
        {#if item.imageUrl}
          <img src={item.imageUrl} alt={`unsig #${item.id}`} />
        {/if}
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
    background: black;
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
    animation: imgFadeIn 0.25s ease-out;
  }

  @keyframes imgFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
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

  .grid-item.dragging {
    box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.8);
    z-index: 1;
  }

  .grid-item.dragging img {
    opacity: 0.15;
  }

  .grid-item.animating {
    visibility: hidden;
  }

  .grid-item.drag-over {
    opacity: 0.4;
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
