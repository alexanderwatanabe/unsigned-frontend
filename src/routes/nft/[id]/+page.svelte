<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { unsigs, getUnsig } from '$lib/unsigs';
  import { generateUnsig, unsigToImageData, createUnsig } from '$lib/unsig/generator';
  import type { PageData } from './$types';
  import { invalidate, goto } from '$app/navigation';
  
  // Add type safety for the image URLs
  interface ImageUrls {
    low: string;
    standard: string;
    high: string;
    ultra: string;
  }

  // Group related state
  interface State {
    isFullscreen: boolean;
    imageLoading: boolean;
    currentLayer: number;
    isRendering: boolean;
    isComplete: boolean;
    layers: {
      imageUrl: string;
      opacity: number;
      zIndex: number;
    }[];
  }
  
  let state: State = {
    isFullscreen: false,
    imageLoading: true,
    currentLayer: 0,
    isRendering: false,
    isComplete: false,
    layers: []
  };

  let canvas: HTMLCanvasElement;

  // Add validation for navigation
  function isValidNftId(id: number): boolean {
    return id >= 0 && id < Object.keys(unsigs).length;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'f') {
      state.isFullscreen = !state.isFullscreen;
    } else if (event.key === 'ArrowLeft') {
      navigateToNft(Number(currentId) - 1);
    } else if (event.key === 'ArrowRight') {
      navigateToNft(Number(currentId) + 1);
    } else if (event.key === 'Escape' && state.isFullscreen) {
      state.isFullscreen = false;
    }
  }

  function handleImageLoad() {
    state.imageLoading = false;
  }

  async function generateImage(unsig: any, size: number = 2048, layersToRender?: number) {
    if (!unsig || !canvas) return;
    
    try {
      // Create a properly formatted unsig object with limited properties
      const numLayers = layersToRender ?? unsig.num_props;
      console.log(`Rendering ${numLayers} layers of ${unsig.num_props} total`);
      
      const formattedUnsig = createUnsig(
        Number(unsig.index), 
        {
          multipliers: unsig.properties.multipliers.slice(0, numLayers).map(Number),
          colors: unsig.properties.colors.slice(0, numLayers),
          distributions: unsig.properties.distributions.slice(0, numLayers),
          rotations: unsig.properties.rotations.slice(0, numLayers).map(Number)
        }
      );

      // Generate the image data
      const { imageData } = generateUnsig(formattedUnsig, size);
      
      // Convert to ImageData for canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = size;
      canvas.height = size;
      
      // Draw the image data
      const imgData = unsigToImageData(imageData, size);
      ctx.putImageData(imgData, 0, 0);
      
      // Convert canvas to data URL and preload the new image
      const newImageUrl = canvas.toDataURL('image/png');
      
      // Preload the new image before adding it to layers
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = newImageUrl;
      });

      return newImageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      console.error('Unsig data:', unsig);
    }
  }

  async function renderProgressively(unsig: any, size: number) {
    if (!unsig || state.isRendering) return;
    
    try {
      state.isRendering = true;
      state.isComplete = false;
      state.currentLayer = 0;
      state.layers = [];
      
      console.log(`Starting progressive render for unsig ${unsig.index} with ${unsig.num_props} layers`);
      
      // Start with black background at highest z-index
      state.layers = [{
        imageUrl: '',  // Empty black layer
        opacity: 1,
        zIndex: unsig.num_props * 2  // Double the z-index range to ensure proper stacking
      }];

      // Generate each layer
      for (let i = 1; i <= unsig.num_props; i++) {
        state.currentLayer = i;
        console.log(`Rendering layer ${i} of ${unsig.num_props}`);
        
        // Generate current layer
        const newImageUrl = await generateImage(unsig, size, i);
        if (!newImageUrl) continue;

        // Add new layer with z-index matching its layer number
        state.layers = [
          ...state.layers,
          {
            imageUrl: newImageUrl,
            opacity: 0,  // Start invisible
            zIndex: i * 2  // Use even numbers for layer z-indices
          }
        ];

        // Small delay for DOM update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Fade in new layer
        const newLayer = state.layers[state.layers.length - 1];
        newLayer.opacity = 1;
        
        // Find the top-most visible layer (should be the black overlay or previous layer)
        const topLayer = state.layers.find(l => l.opacity === 1 && l.zIndex > i * 2);
        if (topLayer) {
          // For black background, use shorter delay and wait time
          const isBlackBackground = !topLayer.imageUrl;
          const fadeDelay = isBlackBackground ? 100 : 500;
          const transitionWait = isBlackBackground ? 500 : 3000;
          
          // Wait before starting to fade out the top layer
          await new Promise(resolve => setTimeout(resolve, fadeDelay));
          topLayer.opacity = 0;
          
          // Wait for transition to complete
          await new Promise(resolve => setTimeout(resolve, transitionWait));
          
          // Remove the faded out layer
          state.layers = state.layers.filter(layer => layer.opacity > 0);
        }
      }
      
      state.isComplete = true;
    } catch (error) {
      console.error('Error in progressive render:', error);
    } finally {
      state.isRendering = false;
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    // Generate initial image progressively
    if (currentUnsig && !state.isRendering && !state.isComplete) {
      console.log('Initial render on mount');
      renderProgressively(currentUnsig, state.isFullscreen ? 4096 : 2048);
    }
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      state.isRendering = false;
      state.isComplete = false;
    };
  });
  
  // Use more descriptive names for reactive declarations
  $: currentId = $page.params.id;
  $: paddedId = currentId.padStart(5, '0');
  $: currentUnsig = getUnsig(currentId);
  
  // Watch for changes that require regenerating the image
  $: if (currentUnsig && canvas && !state.isRendering && !state.isComplete) {
    console.log('Unsig changed, starting new render');
    renderProgressively(currentUnsig, state.isFullscreen ? 4096 : 2048);
  }
  
  // Only re-render on fullscreen toggle
  $: if (canvas && !state.isRendering && state.isComplete && state.layers.length > 0) {
    const targetSize = state.isFullscreen ? 4096 : 2048;
    const currentSize = canvas.width;
    
    if (currentSize !== targetSize) {
      console.log(`Resolution change needed: ${currentSize} -> ${targetSize}`);
      state.isComplete = false;  // Reset completion state for new render
      renderProgressively(currentUnsig, targetSize);
    }
  }
  
  async function navigateToNft(newId: number) {
    if (isValidNftId(newId)) {
      await goto(`/nft/${newId}`, { invalidateAll: true });
    }
  }

  // Function to download the generated image
  function downloadImage(size: number) {
    if (!currentUnsig) return;
    
    // Create a temporary canvas for the download
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    tempCanvas.width = size;
    tempCanvas.height = size;
    
    // Generate high-res version
    const formattedUnsig = createUnsig(
      Number(currentUnsig.index),
      {
        multipliers: currentUnsig.properties.multipliers.map(Number),
        colors: currentUnsig.properties.colors,
        distributions: currentUnsig.properties.distributions,
        rotations: currentUnsig.properties.rotations.map(Number)
      }
    );
    
    const { imageData } = generateUnsig(formattedUnsig, size);
    const imgData = unsigToImageData(imageData, size);
    ctx.putImageData(imgData, 0, 0);
    
    // Create download link
    const link = document.createElement('a');
    link.download = `unsig_${paddedId}_${size}px.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }
</script>

<div class="nft-detail" class:fullscreen={state.isFullscreen}>
  <div class="content-wrapper">
    <h1 class:hidden={state.isFullscreen}>unsigned_algorithm #{paddedId}</h1>
    
    <div class="image-section" class:fullscreen={state.isFullscreen}>
      <a href="/nft/{Number(currentId) - 1}" 
         class="nav-button prev" 
         class:hidden={state.isFullscreen}
         on:click|preventDefault={() => navigateToNft(Number(currentId) - 1)}>←</a>
         
      <div class="image-container">
        <canvas 
          bind:this={canvas} 
          style="display: none;"
        ></canvas>
        {#if state.imageLoading && state.layers.length === 0}
          <div class="spinner"></div>
        {/if}
        {#each state.layers as layer (layer.imageUrl || 'black-overlay')}
          <img 
            src={layer.imageUrl}
            alt={`NFT ${currentId} layer`}
            class="layer"
            style="opacity: {layer.opacity}; z-index: {layer.zIndex};"
            on:load={handleImageLoad} />
        {/each}
      </div>
      
      <a href="/nft/{Number(currentId) + 1}" 
         class="nav-button next" 
         class:hidden={state.isFullscreen}
         on:click|preventDefault={() => navigateToNft(Number(currentId) + 1)}>→</a>
    </div>

    <div class="metadata" class:hidden={state.isFullscreen}>
      <h2>Properties</h2>
      <div class="properties">
        <table>
          <thead>
            <tr>
              <th> </th>
              <th>Colors</th>
              <th>Distributions</th>
              <th>Multipliers</th>
              <th>Rotations</th>
            </tr>
          </thead>
          <tbody>
            {#each Array(currentUnsig.num_props) as _, i}
              <tr>
                <td>{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}</td>
                <td>{currentUnsig.properties.colors[i]}</td>
                <td>{currentUnsig.properties.distributions[i]}</td>
                <td>{currentUnsig.properties.multipliers[i]}</td>
                <td>{currentUnsig.properties.rotations[i]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <h2>Download</h2>
      <div class="download-links">
        <button on:click={() => downloadImage(4096)}>4,096 px</button>
        <button on:click={() => downloadImage(16384)}>16,384 px</button>
      </div>
    </div>
  </div>
</div>

<style>
  .nft-detail {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .content-wrapper {
    max-width: 1200px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 0 1rem;
  }

  .image-section {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .image-container {
    position: relative;
    flex: 1;
    max-width: 1200px;
    aspect-ratio: 1;
    background: black;
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
  }

  /* Add a subtle fade effect for the black background */
  .layer:not([src]) {
    background: black;
    transition: opacity 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .metadata {
    width: 100%;
    max-width: 1200px;
  }

  .download-links {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .download-links a {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    text-decoration: none;
    color: var(--text-color);
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

  .image-container.fullscreen img {
    max-height: 100vh;
    width: auto;
    max-width: 100vw;
    object-fit: contain;
  }

  .hidden {
    display: none;
  }

  .nav-button {
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 1rem;
    text-decoration: none;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .nav-button:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  td, th {
    padding: 0.5rem;
    border-right: 1px solid rgba(128, 128, 128, 0.2);
    text-align: center;
  }

  td:last-child, th:last-child {
    border-right: none;
  }

  .metadata h2 {
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  .properties {
    margin-bottom: 2rem;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }

  .loading {
    opacity: 0.5;
  }

  .download-links button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    background: none;
    color: var(--text-color);
    cursor: pointer;
  }

  .download-links button:hover {
    background: rgba(128, 128, 128, 0.1);
  }
</style> 