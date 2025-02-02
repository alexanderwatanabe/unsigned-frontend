<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { unsigs, getUnsig } from '$lib/unsigs';
  import { 
    generateUnsig, 
    unsigToImageData, 
    createUnsig, 
    generateAnimationState,
    generateVideo,
    createVideoDownloadLink,
    animationStep,
    createVideo
  } from '$lib/unsig/generator';
  import type { PageData } from './$types';
  import { invalidate, goto } from '$app/navigation';
  
  // Constants
  const DIM = 1024; // Animation dimension reduced to 1024 for better performance

  // Add type safety for the image URLs
  interface ImageUrls {
    low: string;
    standard: string;
    high: string;
    ultra: string;
  }

  // Update State interface to include accumulated frames
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
    activeLayerIndices: Set<number>;
    isGeneratingLargeImage: boolean;
    generationProgress: number;
    animationState: any;
    animationFrameId: number | null;
    accumulatedFrames: { imageData: Uint8Array; timestamp: number }[];
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
    generationProgress: 0,
    animationState: null,
    animationFrameId: null,
    accumulatedFrames: []
  };

  let canvas: HTMLCanvasElement;
  let downloadLink: HTMLAnchorElement | null = null;
  let isRecording: boolean = false;

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
    } else if (event.key.toLowerCase() === 'a') {
      startAnimation(currentUnsig, state.isFullscreen ? 4096 : 2048);
    }
  }

  function handleImageLoad() {
    state.imageLoading = false;
  }

  // Replace reactive statement with $effect
  $effect(() => {
    if (currentUnsig) {
      state.activeLayerIndices = new Set(Array.from({ length: currentUnsig.num_props }, (_, i) => i));
    }
  });

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
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

  // Function to capture a frame
  function captureFrame(imageData: Uint8Array, frameCount: number): void {
    state.accumulatedFrames.push({
      imageData: new Uint8Array(imageData),
      timestamp: frameCount * (1000 / 60) // 60fps timing
    });
  }

  // Animation function with frame accumulation
  function animationFrame() {
    if (!canvas || !state.animationState || state.isComplete) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    // Always use DIM for animation
    const imageData = ctx.getImageData(0, 0, DIM, DIM);
    
    // Convert Uint8ClampedArray to Uint8Array
    const uint8Data = new Uint8Array(imageData.data.buffer);
    
    // Perform animation step
    const isComplete = animationStep(state.animationState, uint8Data, DIM);
    
    // Store frame for video generation
    state.accumulatedFrames.push({
      imageData: new Uint8Array(uint8Data),
      timestamp: state.accumulatedFrames.length * (1000 / 60) // 60fps timing
    });
    
    // Update canvas
    ctx.putImageData(imageData, 0, 0);
    
    if (isComplete) {
      state.isComplete = true;
      state.isRendering = false;
      state.animationFrameId = null;
    } else {
      // Schedule next frame
      state.animationFrameId = requestAnimationFrame(animationFrame);
    }
  }

  // Modified video generation to use accumulated frames
  async function handleRecordAnimation() {
    if (!currentUnsig || isRecording || state.accumulatedFrames.length === 0) return;
    
    isRecording = true;
    state.generationProgress = 0;
    
    try {
      // Create video directly from accumulated frames
      const videoUrl = await createVideo(
        state.accumulatedFrames,
        canvas,
        DIM,
        60, // 60fps
        10000000 // 10Mbps
      );
      
      // Create download link
      if (downloadLink) {
        downloadLink.remove();
      }
      downloadLink = createVideoDownloadLink(videoUrl, `unsig-${currentUnsig.index}.webm`);
      document.body.appendChild(downloadLink);
    } catch (error) {
      console.error('Error generating video:', error);
      alert('Failed to generate video. Please try again.');
    } finally {
      isRecording = false;
      state.generationProgress = 0;
    }
  }

  // Add the handleFullscreenChange function
  function handleFullscreenChange() {
    if (currentUnsig && canvas) {
      transitionToNewState();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    if (currentUnsig && !state.isRendering && !state.isComplete) {
      console.log('Initial render on mount');
      transitionToNewState();
    }
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
      }
      state.isRendering = false;
      state.isComplete = false;
    };
  });
  
  // Convert reactive declarations to derived values
  const currentId = $derived($page.params.id);
  const paddedId = $derived(currentId.padStart(5, '0'));
  const currentUnsig = $derived(getUnsig(currentId));
  
  // Watch for changes that require regenerating the image
  $effect(() => {
    if (currentUnsig && canvas) {
      transitionToNewState();
    }
  });
  
  // Watch for fullscreen changes
  $effect(() => {
    if (currentUnsig?.index !== 0 && canvas) {
      handleFullscreenChange();
    }
  });
  
  // Watch for fullscreen toggle on non-zero unsigs
  $effect(() => {
    if (currentUnsig?.index !== 0 && canvas) {
      const size = state.isFullscreen ? 4096 : 2048;
      canvas.width = size;
      canvas.height = size;
      transitionToNewState();
    }
  });
  
  // Watch for resolution changes on non-zero unsigs
  $effect(() => {
    if (currentUnsig?.index !== 0 && canvas && !state.isRendering && state.isComplete && state.layers.length > 0) {
      const targetSize = state.isFullscreen ? 4096 : 2048;
      const currentSize = canvas.width;
      
      if (currentSize !== targetSize) {
        console.log(`Resolution change needed: ${currentSize} -> ${targetSize}`);
        state.isComplete = false;  // Reset completion state for new render
        animationFrame();
      }
    }
  });

  // Watch for unsig 00000 fullscreen changes
  $effect(() => {
    if (currentUnsig?.index === 0 && canvas && !state.isRendering) {
      const size = state.isFullscreen ? 4096 : 2048;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
      // Reset state before navigation
      state.isComplete = false;
      state.isRendering = false;
      state.layers = [];
      state.currentLayer = 0;
      
      // Navigate to new NFT
      await goto(`/nft/${newId}`);
      
      // Force a new render
      if (currentUnsig) {
        animationFrame();
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

  async function startAnimation(unsig: any, size: number) {
    if (!unsig || !canvas || state.isRendering) return;
    
    try {
      state.isRendering = true;
      state.isComplete = false;
      state.accumulatedFrames = []; // Reset accumulated frames
      
      // Initialize canvas with black background
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      
      // Always use DIM for animation
      canvas.width = DIM;
      canvas.height = DIM;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, DIM, DIM);
      
      // Create formatted unsig object
      const formattedUnsig = createUnsig(
        Number(unsig.index),
        {
          multipliers: unsig.properties.multipliers.map(Number),
          colors: unsig.properties.colors,
          distributions: unsig.properties.distributions,
          rotations: unsig.properties.rotations.map(Number)
        }
      );
      
      // Generate animation state using DIM
      state.animationState = generateAnimationState(formattedUnsig, DIM);
      
      // Store initial frame
      const initialImageData = ctx.getImageData(0, 0, DIM, DIM);
      state.accumulatedFrames.push({
        imageData: new Uint8Array(initialImageData.data.buffer),
        timestamp: 0
      });
      
      // Start animation loop
      if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
      }
      state.animationFrameId = requestAnimationFrame(animationFrame);
      
    } catch (error) {
      console.error('Error starting animation:', error);
      state.isRendering = false;
    }
  }

  $effect(() => {
    if (downloadLink) {
      console.log('Download link updated:', downloadLink);
    }
  });

  $effect(() => {
    if (isRecording) {
      console.log('Recording state changed:', isRecording);
    }
  });
</script>

<div class="nft-detail" class:fullscreen={state.isFullscreen}>
  <div class="content-wrapper">
    <h1 class:hidden={state.isFullscreen}>unsigned_algorithm #{paddedId}</h1>
    
    <div class="image-section" class:fullscreen={state.isFullscreen}>
      <a href="/nft/{Number(currentId) - 1}" 
         class="nav-button prev" 
         class:hidden={state.isFullscreen}
         onclick={(e) => {
           e.preventDefault();
           navigateToNft(Number(currentId) - 1);
         }}>←</a>
         
      <div class="image-container">
        <canvas 
          bind:this={canvas}
          class="nft-canvas"
          style="width: 100%; height: 100%; display: block;"
        ></canvas>
      </div>
      
      <a href="/nft/{Number(currentId) + 1}" 
         class="nav-button next" 
         class:hidden={state.isFullscreen}
         onclick={(e) => {
           e.preventDefault();
           navigateToNft(Number(currentId) + 1);
         }}>→</a>
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
                  onclick={() => toggleLayer(i)}
                  role="button"
                  tabindex="0"
                  onkeydown={e => e.key === 'Enter' && toggleLayer(i)}
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
        
        <h2>Animation</h2>
        <div class="animation-controls">
          <button 
            onclick={() => startAnimation(currentUnsig, state.isFullscreen ? 4096 : 2048)}
            disabled={state.isRendering}
          >
            Animate (A)
          </button>
          
          <button 
            disabled={isRecording || !currentUnsig || state.accumulatedFrames.length === 0} 
            onclick={handleRecordAnimation}
          >
            {#if isRecording}
              Generating Video ({state.generationProgress}%)...
            {:else}
              Generate Animation Video
            {/if}
          </button>
          
          {#if downloadLink}
            <div class="download-section">
              <p>Your video is ready!</p>
              <button onclick={() => downloadLink?.click()}>
                Download Video
              </button>
            </div>
          {/if}
        </div>

        <h2>Download</h2>
        <div class="download-links">
          <button onclick={() => downloadImage(4096)}>4,096 px</button>
          <button onclick={() => downloadImage(8192)}>8,192 px</button>
          <button onclick={() => downloadImage(16384)}>16,384 px</button>
        </div>
      {/if}
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
    transition: all 0.3s ease;
    background: white;
    color: #333;
  }

  tbody tr:hover {
    background: #e0e0e0;
    color: #333;
  }

  tbody tr.inactive {
    background: #333;
    color: #aaa;
  }

  tbody tr.inactive:hover {
    background: #444;
    color: #ccc;
  }

  /* Add table styles */
  .properties table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }

  .properties th {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .properties td {
    padding: 0.5rem;
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

  .nft-canvas {
    image-rendering: pixelated;
    background: black;
  }

  .controls {
    margin-top: 1rem;
    text-align: center;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .download-section {
    margin-top: 1rem;
    text-align: center;
  }

  .animation-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .animation-controls button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    background: none;
    color: var(--text-color);
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .animation-controls button:hover:not(:disabled) {
    background: rgba(128, 128, 128, 0.1);
  }

  .animation-controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style> 