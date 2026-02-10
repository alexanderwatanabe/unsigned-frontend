<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { unsigs, getUnsig } from '$lib/unsigs';
  import { generateUnsig, unsigToImageData, createUnsig } from '$lib/unsig/generator';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Modal from '$lib/components/Modal.svelte';

  interface ImageUrls {
    low: string;
    standard: string;
    high: string;
    ultra: string;
  }

  interface LayerState {
    imageUrl: string;
    opacity: number;
    zIndex: number;
    id: string;
    transitioning: boolean;
  }

  // State
  let isFullscreen = $state(false);
  let imageLoading = $state(true);
  let currentLayer = $state(0);
  let isRendering = $state(false);
  let isComplete = $state(false);
  let layers = $state<LayerState[]>([]);
  let activeLayerIndices = $state<Set<number>>(new Set());
  let showDownloadModal = $state(false);
  let downloadModalState = $state<'confirm' | 'generating' | 'error'>('generating');
  let generationProgress = $state(0);
  let pendingDownloadSize = $state(0);
  let downloadError = $state('');
  let cursorX = $state(0);
  let cursorY = $state(0);
  let showCursorLight = $state(false);

  let canvas: HTMLCanvasElement;
  let imageContainerEl: HTMLElement;

  function generateLayerId(): string {
    return `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Derived
  let currentId = $derived($page.params.id);
  let paddedId = $derived(currentId.padStart(5, '0'));
  let currentUnsig = $derived(getUnsig(currentId));

  function isValidNftId(id: number): boolean {
    return id >= 0 && id < Object.keys(unsigs).length;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'f') {
      isFullscreen = !isFullscreen;
    } else if (event.key === 'ArrowLeft') {
      navigateToNft(Number(currentId) - 1);
    } else if (event.key === 'ArrowRight') {
      navigateToNft(Number(currentId) + 1);
    } else if (event.key === 'Escape' && isFullscreen) {
      isFullscreen = false;
    }
  }

  function handleImageLoad() {
    imageLoading = false;
  }

  function handleMouseMove(event: MouseEvent) {
    if (!imageContainerEl || !isComplete) return;
    const rect = imageContainerEl.getBoundingClientRect();
    cursorX = event.clientX - rect.left;
    cursorY = event.clientY - rect.top;
    showCursorLight = true;
  }

  function handleMouseLeave() {
    showCursorLight = false;
  }

  // Initialize active layers when unsig changes
  $effect(() => {
    if (currentUnsig) {
      activeLayerIndices = new Set(Array.from({ length: currentUnsig.num_props }, (_, i) => i));
    }
  });

  async function toggleLayer(index: number) {
    if (isRendering) return;

    const newActive = new Set(activeLayerIndices);
    if (newActive.has(index)) {
      newActive.delete(index);
    } else {
      newActive.add(index);
    }

    activeLayerIndices = newActive;
    await transitionToNewState();
  }

  async function transitionToNewState() {
    if (!currentUnsig || !canvas) return;

    try {
      isRendering = true;
      const newImageUrl = await generateImage(currentUnsig, isFullscreen ? 4096 : 2048);
      if (!newImageUrl) return;

      const newLayerId = generateLayerId();
      layers = [...layers, { imageUrl: newImageUrl, opacity: 0, zIndex: 1, id: newLayerId, transitioning: true }];

      await new Promise(resolve => setTimeout(resolve, 50));
      const newIdx = layers.length - 1;
      layers[newIdx].opacity = 1;

      await new Promise(resolve => setTimeout(resolve, 1000));

      layers = layers.map((layer, i) =>
        i !== newIdx ? { ...layer, opacity: 0, transitioning: true } : layer
      );

      await new Promise(resolve => setTimeout(resolve, 1000));
      layers = [{ ...layers[newIdx], transitioning: false }];
      isComplete = true;
    } finally {
      isRendering = false;
    }
  }

  async function generateImage(unsig: any, size: number = 2048, layersToRender?: number) {
    if (!unsig || !canvas) return;

    try {
      const numLayers = layersToRender ?? unsig.num_props;
      const activeIndices = Array.from(activeLayerIndices).sort((a, b) => a - b);
      const activeLayersUpTo = activeIndices.filter(i => i < numLayers);

      const formattedUnsig = createUnsig(Number(unsig.index), {
        multipliers: activeLayersUpTo.map(i => Number(unsig.properties.multipliers[i])),
        colors: activeLayersUpTo.map(i => unsig.properties.colors[i]),
        distributions: activeLayersUpTo.map(i => unsig.properties.distributions[i]),
        rotations: activeLayersUpTo.map(i => Number(unsig.properties.rotations[i]))
      });

      const { imageData } = generateUnsig(formattedUnsig, size);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = size;
      canvas.height = size;
      const imgData = unsigToImageData(imageData, size);
      ctx.putImageData(imgData, 0, 0);

      const newImageUrl = canvas.toDataURL('image/png');
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = newImageUrl;
      });

      return newImageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
    }
  }

  async function renderProgressively(unsig: any, size: number) {
    if (!unsig || isRendering) return;

    try {
      isRendering = true;
      isComplete = false;
      currentLayer = 0;
      layers = [];

      const backgroundId = generateLayerId();
      layers = [{ imageUrl: '', opacity: 1, zIndex: 999, id: backgroundId, transitioning: false }];

      for (let i = 1; i <= unsig.num_props; i++) {
        currentLayer = i;
        const newImageUrl = await generateImage(unsig, size, i);
        if (!newImageUrl) continue;

        const newLayerId = generateLayerId();
        layers = [...layers, { imageUrl: newImageUrl, opacity: 0, zIndex: i, id: newLayerId, transitioning: true }];

        await new Promise(resolve => setTimeout(resolve, 50));
        const newLayerIndex = layers.length - 1;
        layers[newLayerIndex].opacity = 1;

        await new Promise(resolve => setTimeout(resolve, 1200));

        if (i > 1) {
          const prevIdx = layers.findIndex(l => l.opacity === 1 && l.zIndex < layers[newLayerIndex].zIndex && l.zIndex > 0);
          if (prevIdx >= 0) {
            layers[prevIdx].opacity = 0;
            layers[prevIdx].transitioning = true;
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
        }

        if (i === 1) {
          const bgIdx = layers.findIndex(l => l.id === backgroundId);
          if (bgIdx >= 0) {
            layers[bgIdx].opacity = 0;
            layers[bgIdx].transitioning = true;
            await new Promise(resolve => setTimeout(resolve, 800));
            layers = layers.filter(l => l.id !== backgroundId);
          }
        }
      }

      const finalIdx = layers.findIndex(l => l.opacity === 1 && l.zIndex === unsig.num_props);
      if (finalIdx >= 0) {
        layers = layers.filter((_, i) => i === finalIdx);
      }

      isComplete = true;
    } finally {
      isRendering = false;
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    if (currentUnsig && !isRendering && !isComplete) {
      renderProgressively(currentUnsig, isFullscreen ? 4096 : 2048);
    }
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      isRendering = false;
      isComplete = false;
    };
  });

  // Watch for unsig changes
  $effect(() => {
    if (currentUnsig && canvas && !isRendering && !isComplete) {
      if (currentUnsig.index === 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const size = isFullscreen ? 4096 : 2048;
          canvas.width = size;
          canvas.height = size;
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, size, size);
          isComplete = true;
        }
      } else if (layers.length === 0) {
        renderProgressively(currentUnsig, isFullscreen ? 4096 : 2048);
      } else {
        transitionToNewState();
      }
    }
  });

  // Resolution change on fullscreen toggle
  $effect(() => {
    if (currentUnsig && currentUnsig.index !== 0 && canvas && !isRendering && isComplete && layers.length > 0) {
      const targetSize = isFullscreen ? 4096 : 2048;
      if (canvas.width !== targetSize) {
        isComplete = false;
        renderProgressively(currentUnsig, targetSize);
      }
    }
  });

  // Special case for 00000 fullscreen
  $effect(() => {
    if (currentUnsig && currentUnsig.index === 0 && canvas && !isRendering) {
      const size = isFullscreen ? 4096 : 2048;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
      }
    }
  });

  async function navigateToNft(newId: number) {
    if (isValidNftId(newId)) {
      isComplete = false;
      isRendering = false;
      layers = [];
      currentLayer = 0;
      await goto(`/nft/${newId}`);
      if (currentUnsig) {
        renderProgressively(currentUnsig, isFullscreen ? 4096 : 2048);
      }
    }
  }

  function requestDownload(size: number) {
    if (!currentUnsig) return;
    pendingDownloadSize = size;
    generationProgress = 0;
    downloadError = '';

    if (size > 4096) {
      downloadModalState = 'confirm';
      showDownloadModal = true;
    } else {
      startDownload(size);
    }
  }

  async function startDownload(size: number) {
    if (!currentUnsig) return;

    downloadModalState = 'generating';
    showDownloadModal = true;
    generationProgress = 0;

    // Yield to browser so the modal paints before heavy computation
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    try {
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      tempCanvas.width = size;
      tempCanvas.height = size;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, size, size);

      const formattedUnsig = createUnsig(Number(currentUnsig.index), {
        multipliers: currentUnsig.properties.multipliers.map(Number),
        colors: currentUnsig.properties.colors,
        distributions: currentUnsig.properties.distributions,
        rotations: currentUnsig.properties.rotations.map(Number)
      });

      if (currentUnsig.index === 0) {
        generationProgress = 100;
      } else {
        const { imageData } = generateUnsig(formattedUnsig, size);
        const fullData = unsigToImageData(imageData, size);
        ctx.putImageData(fullData, 0, 0);
        generationProgress = 100;
      }

      const link = document.createElement('a');
      link.download = `unsig_${paddedId}_${size}px.png`;
      const blob = await new Promise<Blob>(resolve => {
        tempCanvas.toBlob(blob => { if (blob) resolve(blob); }, 'image/png');
      });
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      showDownloadModal = false;
    } catch (error) {
      console.error('Error generating high-res image:', error);
      downloadError = 'failed to generate image. try a smaller size or refresh the page.';
      downloadModalState = 'error';
    }
  }
</script>

<div class="nft-detail" class:fullscreen={isFullscreen}>
  <div class="content-wrapper">
    <h1 class="page-title font-serif" class:hidden={isFullscreen}>unsigned_algorithm #{paddedId}</h1>

    <div class="image-section" class:fullscreen={isFullscreen}>
      <!-- Nav arrows within image bounds -->
      <a href="/nft/{Number(currentId) - 1}"
         class="nav-button prev"
         class:hidden={isFullscreen}
         onclick={(e) => { e.preventDefault(); navigateToNft(Number(currentId) - 1); }}>←</a>

      <div class="image-container"
           bind:this={imageContainerEl}
           onmousemove={handleMouseMove}
           onmouseleave={handleMouseLeave}>
        <canvas bind:this={canvas} style="display: none;"></canvas>

        {#if imageLoading && layers.length === 0 && currentUnsig?.index !== 0}
          <div class="spinner"></div>
        {/if}

        {#if currentUnsig?.index !== 0}
          {#each layers as layer (layer.id)}
            {#if layer.imageUrl}
              <img
                src={layer.imageUrl}
                alt={`NFT ${currentId} layer`}
                class="layer"
                style="opacity: {layer.opacity}; z-index: {layer.zIndex};"
                onload={handleImageLoad} />
            {:else}
              <div
                class="layer"
                style="opacity: {layer.opacity}; z-index: {layer.zIndex}; background: black;"
              ></div>
            {/if}
          {/each}
        {/if}

        <!-- Cursor light overlay -->
        {#if showCursorLight && isComplete}
          <div
            class="cursor-light"
            style="background: radial-gradient(circle 200px at {cursorX}px {cursorY}px, rgba(255,255,255,0.12), transparent);"
          ></div>
        {/if}
      </div>

      <a href="/nft/{Number(currentId) + 1}"
         class="nav-button next"
         class:hidden={isFullscreen}
         onclick={(e) => { e.preventDefault(); navigateToNft(Number(currentId) + 1); }}>→</a>
    </div>

    <div class="metadata" class:hidden={isFullscreen}>
      {#if currentUnsig?.index !== 0}
        <h2 class="font-serif">properties</h2>
        <div class="properties">
          <table>
            <thead>
              <tr>
                <th> </th>
                <th>colors</th>
                <th>distributions</th>
                <th>multipliers</th>
                <th>rotations</th>
              </tr>
            </thead>
            <tbody>
              {#each Array(currentUnsig?.num_props || 0) as _, i}
                <tr
                  class:inactive={!activeLayerIndices.has(i)}
                  onclick={() => toggleLayer(i)}
                  role="button"
                  tabindex="0"
                  onkeydown={e => e.key === 'Enter' && toggleLayer(i)}
                >
                  <td class="layer-num">{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}</td>
                  <td>{currentUnsig?.properties.colors[i]}</td>
                  <td>{currentUnsig?.properties.distributions[i]}</td>
                  <td>{currentUnsig?.properties.multipliers[i]}</td>
                  <td>{currentUnsig?.properties.rotations[i]}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
      <h2 class="font-serif">download</h2>
      <div class="download-links">
        <button onclick={() => requestDownload(4096)}>4,096 px</button>
        <button onclick={() => requestDownload(8192)}>8,192 px</button>
        <button onclick={() => requestDownload(16384)}>16,384 px</button>
      </div>
    </div>
  </div>
</div>

<Modal bind:showModal={showDownloadModal}>
  {#snippet header()}
    {#if downloadModalState === 'confirm'}
      <h3 class="modal-title font-serif">large image warning</h3>
    {:else if downloadModalState === 'generating'}
      <h3 class="modal-title font-serif">generating image</h3>
    {:else}
      <h3 class="modal-title font-serif">error</h3>
    {/if}
  {/snippet}
  {#snippet content()}
    {#if downloadModalState === 'confirm'}
      <p class="modal-text">generating a {pendingDownloadSize.toLocaleString()} x {pendingDownloadSize.toLocaleString()} image requires significant memory and processing power. this might take several minutes.</p>
      <div class="modal-actions">
        <button class="modal-btn" onclick={() => { showDownloadModal = false; }}>cancel</button>
        <button class="modal-btn modal-btn-primary" onclick={() => startDownload(pendingDownloadSize)}>continue</button>
      </div>
    {:else if downloadModalState === 'generating'}
      <p class="modal-text">rendering unsig #{paddedId} at {pendingDownloadSize.toLocaleString()}px</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {generationProgress}%"></div>
      </div>
      <p class="modal-progress-label">{generationProgress}%</p>
    {:else}
      <p class="modal-text">{downloadError}</p>
      <div class="modal-actions">
        <button class="modal-btn" onclick={() => { showDownloadModal = false; }}>close</button>
      </div>
    {/if}
  {/snippet}
</Modal>

<style>
  .nft-detail {
    width: 100%;
    display: flex;
    justify-content: center;
    position: relative;
    background: var(--bg-void);
    min-height: 100vh;
  }

  .content-wrapper {
    max-width: 1200px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
    padding: var(--space-lg) var(--space-xl);
  }

  .page-title {
    font-size: var(--text-xl);
    color: var(--text-primary);
    font-weight: 400;
  }

  .image-section {
    width: 100%;
    display: flex;
    align-items: center;
    position: relative;
  }

  .image-container {
    position: relative;
    flex: 1;
    max-width: 1200px;
    aspect-ratio: 1;
    background: black;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: crosshair;
  }

  .cursor-light {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 50;
  }

  .layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: opacity 3s cubic-bezier(0.4, 0.0, 0.2, 1);
    will-change: opacity;
    backface-visibility: hidden;
    pointer-events: none;
    transform: translateZ(0);
  }

  .layer:not([src]) {
    background: black;
    transition: opacity 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .metadata {
    width: 100%;
    max-width: 1200px;
  }

  .metadata h2 {
    font-size: var(--text-lg);
    color: var(--text-primary);
    margin-top: var(--space-lg);
    margin-bottom: var(--space-md);
    font-weight: 400;
  }

  .download-links {
    display: flex;
    gap: var(--space-md);
    justify-content: center;
  }

  .download-links button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-default);
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--text-sm);
    transition: color 0.15s, border-color 0.15s;
  }

  .download-links button:hover {
    color: var(--accent);
    border-color: var(--border-focus);
  }

  .fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    background: #000;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hidden {
    display: none;
  }

  .nav-button {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-secondary);
    padding: 0.75rem;
    text-decoration: none;
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
    z-index: 10;
  }

  .nav-button:hover {
    background: rgba(255, 255, 255, 0.12);
    color: var(--text-primary);
  }

  .nav-button.prev {
    margin-right: var(--space-sm);
  }

  .nav-button.next {
    margin-left: var(--space-sm);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  td, th {
    padding: var(--space-sm);
    border-right: 1px solid var(--border-subtle);
    text-align: center;
    font-size: var(--text-sm);
  }

  th {
    color: var(--text-secondary);
    font-weight: 400;
    font-size: var(--text-xs);
    padding-bottom: var(--space-md);
  }

  td:last-child, th:last-child {
    border-right: none;
  }

  .properties {
    margin-bottom: var(--space-lg);
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
    background: var(--bg-surface);
    border-radius: 4px;
    padding: var(--space-md);
    border: 1px solid var(--border-subtle);
  }

  tbody tr {
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  tbody tr:nth-child(even) {
    background: rgba(255, 255, 255, 0.02);
  }

  tbody tr:hover {
    background: var(--accent-dim);
  }

  tbody tr.inactive {
    background: var(--bg-raised);
    color: var(--text-dim);
  }

  tbody tr.inactive:hover {
    background: var(--bg-overlay);
  }

  .layer-num {
    color: var(--text-dim);
    font-size: var(--text-xs);
  }

  .spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    border: 2px solid var(--border-default);
    border-top: 2px solid var(--text-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
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

  .modal-btn-primary {
    color: var(--accent);
    border-color: var(--accent);
  }

  .modal-btn-primary:hover {
    color: var(--text-primary);
    background: var(--accent-dim);
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

  @media (max-width: 768px) {
    .content-wrapper {
      padding: var(--space-md);
    }

    .page-title {
      font-size: var(--text-lg);
    }
  }
</style>
