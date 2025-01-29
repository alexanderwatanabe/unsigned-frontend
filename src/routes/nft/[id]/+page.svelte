<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { unsigs, getUnsig } from '$lib/unsigs';
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
  }
  
  let state: State = {
    isFullscreen: false,
    imageLoading: true
  };

  // Add constants for better maintainability
  const IMAGE_BASE_URL = 'https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images';
  
  // Improve the image URLs construction
  function constructImageUrls(paddedId: string, id: string): ImageUrls {
    return {
      low: `${IMAGE_BASE_URL}/128/${paddedId}.png?v=${id}`,
      standard: `${IMAGE_BASE_URL}/1024ds/${paddedId}.png?v=${id}`,
      high: `${IMAGE_BASE_URL}/4096/${paddedId}.png?v=${id}`,
      ultra: `${IMAGE_BASE_URL}/16384/${paddedId}.png?v=${id}`
    };
  }

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

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
  
  // Use more descriptive names for reactive declarations
  $: currentId = $page.params.id;
  $: paddedId = currentId.padStart(5, '0');
  $: currentUnsig = getUnsig(currentId);
  $: imageUrls = constructImageUrls(paddedId, currentId);
  
  async function navigateToNft(newId: number) {
    if (isValidNftId(newId)) {
      await goto(`/nft/${newId}`, { invalidateAll: true });
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
        {#if state.imageLoading}
          <div class="spinner"></div>
        {/if}
        <img 
          src={state.isFullscreen ? imageUrls.high : imageUrls.standard} 
          alt={`NFT ${currentId}`}
          data-key={currentId}
          on:load={handleImageLoad}
          class:loading={state.imageLoading} />
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
            {#each Object.entries(currentUnsig.properties)[0][1] as property, i}
              <tr>
                <td>{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}</td>
                <td>{currentUnsig.properties.colors[i] ?? ''}</td>
                <td>{currentUnsig.properties.distributions[i] ?? ''}</td>
                <td>{currentUnsig.properties.multipliers[i] ?? ''}</td>
                <td>{currentUnsig.properties.rotations[i] ?? ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <h2>Download</h2>
      <div class="download-links">
        <a href={imageUrls.high} target="_blank">4,096 px</a>
        <a href={imageUrls.ultra} target="_blank">16,384 px</a>
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
  }

  .image-container img {
    width: 100%;
    height: auto;
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
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }

  img.loading {
    opacity: 0.5;
    transition: opacity 0.3s;
  }

  img {
    opacity: 1;
    transition: opacity 0.3s;
  }
</style> 