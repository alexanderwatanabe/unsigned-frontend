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
    activeLayerIndices: Set<number>;  // Track which layers are active
    isGeneratingLargeImage: boolean;  // Add this to track large image generation
    generationProgress: number;  // Add this to track progress
  }
  
  let state: State = {
    isFullscreen: false,
    imageLoading: true,
    currentLayer: 0,
    isRendering: false,
    isComplete: false,
    layers: [],
    activeLayerIndices: new Set(),
    isGeneratingLargeImage: false,
    generationProgress: 0
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

  // Initialize active layers when unsig changes
  $: if (currentUnsig) {
    state.activeLayerIndices = new Set(Array.from({ length: currentUnsig.num_props }, (_, i) => i));
  }

  // Function to toggle a layer and regenerate the image
  async function toggleLayer(index: number) {
    if (state.isRendering) return;  // Prevent toggling during transitions
    
    const newActiveLayerIndices = new Set(state.activeLayerIndices);
    if (newActiveLayerIndices.has(index)) {
      newActiveLayerIndices.delete(index);
    } else {
      newActiveLayerIndices.add(index);
    }
    
    state.activeLayerIndices = newActiveLayerIndices;
    await transitionToNewState();
  }

  async function transitionToNewState() {
    if (!currentUnsig || !canvas) return;
    
    try {
      state.isRendering = true;
      
      // Generate new image with current active layers
      const newImageUrl = await generateImage(currentUnsig, state.isFullscreen ? 4096 : 2048);
      if (!newImageUrl) {
        console.error('Failed to generate new image');
        return;
      }

      // Preload the image before showing it
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = newImageUrl;
      });

      // Directly set the new state with a single layer
      state.layers = [{
        imageUrl: newImageUrl,
        opacity: 1,
        zIndex: 1
      }];
      
      state.isComplete = true;
    } catch (error) {
      console.error('Error in transition:', error);
    } finally {
      state.isRendering = false;
    }
  }

  // Modified generateImage to respect active layers
  async function generateImage(unsig: any, size: number = 2048, layersToRender?: number) {
    if (!unsig || !canvas) return;
    
    try {
      // Create a properly formatted unsig object with limited properties
      const numLayers = layersToRender ?? unsig.num_props;
      console.log(`Rendering ${numLayers} layers of ${unsig.num_props} total`);
      
      // Filter properties based on active layers
      const activeIndices = Array.from(state.activeLayerIndices).sort((a, b) => a - b);
      const activeLayersUpTo = activeIndices.filter(i => i < numLayers);
      
      const formattedUnsig = createUnsig(
        Number(unsig.index), 
        {
          multipliers: activeLayersUpTo.map(i => Number(unsig.properties.multipliers[i])),
          colors: activeLayersUpTo.map(i => unsig.properties.colors[i]),
          distributions: activeLayersUpTo.map(i => unsig.properties.distributions[i]),
          rotations: activeLayersUpTo.map(i => Number(unsig.properties.rotations[i]))
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
          // For black background or non-final layer, use standard timing
          const isBlackBackground = !topLayer.imageUrl;
          const fadeDelay = isBlackBackground ? 100 : 500;
          
          // Wait before starting to fade out the top layer
          await new Promise(resolve => setTimeout(resolve, fadeDelay));
          topLayer.opacity = 0;
          
          // Wait for transition to complete
          await new Promise(resolve => setTimeout(resolve, isBlackBackground ? 500 : 3000));
          
          // Only remove the black background layer, keep others until the end
          if (isBlackBackground) {
            state.layers = state.layers.filter(layer => layer.opacity > 0 || layer.imageUrl);
          }
        }

        // If this is not the last layer, wait a bit before continuing
        if (i < unsig.num_props) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // After all layers are done, wait for the final transition
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Keep only the final layer
      const finalLayer = state.layers[state.layers.length - 1];
      if (finalLayer) {
        state.layers = [{
          ...finalLayer,
          opacity: 1,
          zIndex: 1
        }];
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
    // Special case for unsig 00000
    if (currentUnsig.index === 0) {
      // Just render a black canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const size = state.isFullscreen ? 4096 : 2048;
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        state.isComplete = true;
      }
    } else {
      // Only do progressive render for initial load or navigation
      if (state.layers.length === 0) {
        renderProgressively(currentUnsig, state.isFullscreen ? 4096 : 2048);
      } else {
        transitionToNewState();
      }
    }
  }
  
  // Only re-render on fullscreen toggle for non-zero unsigs
  $: if (currentUnsig && currentUnsig.index !== 0 && canvas && !state.isRendering && state.isComplete && state.layers.length > 0) {
    const targetSize = state.isFullscreen ? 4096 : 2048;
    const currentSize = canvas.width;
    
    if (currentSize !== targetSize) {
      console.log(`Resolution change needed: ${currentSize} -> ${targetSize}`);
      state.isComplete = false;  // Reset completion state for new render
      renderProgressively(currentUnsig, targetSize);
    }
  }

  // Special case for unsig 00000 fullscreen toggle
  $: if (currentUnsig && currentUnsig.index === 0 && canvas && !state.isRendering) {
    const size = state.isFullscreen ? 4096 : 2048;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, size, size);
    }
  }
  
  async function navigateToNft(newId: number) {
    if (isValidNftId(newId)) {
      // Reset state before navigation
      state.isComplete = false;
      state.isRendering = false;
      state.layers = [];
      state.currentLayer = 0;
      
      // Navigate to new NFT
      await goto(`/nft/${newId}`);
      
      // Force a new render
      if (currentUnsig) {
        renderProgressively(currentUnsig, state.isFullscreen ? 4096 : 2048);
      }
    }
  }

  // Function to download the generated image
  async function downloadImage(size: number) {
    if (!currentUnsig) return;
    
    // Show warning for large downloads
    if (size > 4096) {
      const shouldProceed = confirm(
        `Warning: Generating a ${size}x${size} image requires significant memory and processing power. ` +
        `This might take several minutes. Do you want to continue?`
      );
      if (!shouldProceed) return;
    }
    
    try {
      state.isGeneratingLargeImage = true;
      state.generationProgress = 0;

      // Create a temporary canvas for the download
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      
      // Set canvas size
      tempCanvas.width = size;
      tempCanvas.height = size;
      
      // Fill with black initially
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, size, size);
      
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

      // Special case for unsig 00000
      if (currentUnsig.index === 0) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        state.generationProgress = 100;
      } else {
        // Generate the image at full size without batching
        const { imageData } = generateUnsig(formattedUnsig, size);
        const fullData = unsigToImageData(imageData, size);
        ctx.putImageData(fullData, 0, 0);
        state.generationProgress = 100;
      }
      
      // Create download link
      const link = document.createElement('a');
      link.download = `unsig_${paddedId}_${size}px.png`;
      
      // Use blob to handle large files
      const blob = await new Promise<Blob>(resolve => {
        tempCanvas.toBlob(blob => {
          if (blob) resolve(blob);
        }, 'image/png');
      });
      
      link.href = URL.createObjectURL(blob);
      link.click();
      
      // Clean up
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error generating high-res image:', error);
      alert('Failed to generate high-resolution image. Please try a smaller size or refresh the page.');
    } finally {
      state.isGeneratingLargeImage = false;
      state.generationProgress = 0;
    }
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
        {#if state.imageLoading && state.layers.length === 0 && currentUnsig.index !== 0}
          <div class="spinner"></div>
        {/if}
        {#if currentUnsig.index !== 0}
          {#each state.layers as layer (layer.imageUrl || 'black-overlay')}
            <img 
              src={layer.imageUrl}
              alt={`NFT ${currentId} layer`}
              class="layer"
              style="opacity: {layer.opacity}; z-index: {layer.zIndex};"
              on:load={handleImageLoad} />
          {/each}
        {/if}
      </div>
      
      <a href="/nft/{Number(currentId) + 1}" 
         class="nav-button next" 
         class:hidden={state.isFullscreen}
         on:click|preventDefault={() => navigateToNft(Number(currentId) + 1)}>→</a>
    </div>

    <div class="metadata" class:hidden={state.isFullscreen}>
      {#if currentUnsig.index !== 0}
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
                <tr 
                  class:inactive={!state.activeLayerIndices.has(i)}
                  on:click={() => toggleLayer(i)}
                  role="button"
                  tabindex="0"
                  on:keydown={e => e.key === 'Enter' && toggleLayer(i)}
                >
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
      {/if}
      <h2>Download</h2>
      <div class="download-links">
        <button on:click={() => downloadImage(4096)}>4,096 px</button>
        <button on:click={() => downloadImage(8192)}>8,192 px</button>
        <button on:click={() => downloadImage(16384)}>16,384 px</button>
      </div>
    </div>
  </div>
</div>

{#if state.isGeneratingLargeImage}
  <div class="toast">
    <div class="toast-content">
      <h3>Generating {state.generationProgress}%</h3>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {state.generationProgress}%"></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .nft-detail {
    width: 100%;
    display: flex;
    justify-content: center;
    position: relative;  /* For absolute positioning of nav buttons */
  }

  .content-wrapper {
    max-width: 1200px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 0 5rem;  /* Add padding to make room for nav buttons */
  }

  .image-section {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0;  /* Remove gap between elements */
    position: relative;  /* For absolute positioning of nav buttons */
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
    transform: translateZ(0);  /* Force GPU acceleration */
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
    background: rgba(0, 0, 0, 0.2);
    color: white;
    padding: 0.75rem;
    text-decoration: none;
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    position: fixed;  /* Change to fixed positioning */
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;  /* Ensure buttons are above content */
  }

  .nav-button.prev {
    left: 5rem;  /* Move closer to center from left */
  }

  .nav-button.next {
    right: 5rem;  /* Move closer to center from right */
  }

  .nav-button:hover {
    background: rgba(0, 0, 0, 0.4);
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

  tbody tr {
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  tbody tr:hover {
    background: rgba(128, 128, 128, 0.1);
  }

  tbody tr.inactive {
    background: #333;
    color: #888;
  }

  tbody tr.inactive:hover {
    background: #444;
  }

  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: rgba(0, 0, 0, 0.9);
    border-radius: 8px;
    padding: 1rem;
    color: white;
    z-index: 2000;
    min-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .toast-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toast h3 {
    margin: 0;
    font-size: 1rem;
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #3498db;
    transition: width 0.3s ease-out;
  }
</style> 