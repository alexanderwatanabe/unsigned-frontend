<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { unsigs, getUnsig } from '$lib/unsigs';
  import type { PageData } from './$types';
  import { invalidate, goto } from '$app/navigation';
  
  let isFullscreen = false;
  
  function handleKeydown(event) {
    if (event.key.toLowerCase() === 'f') {
      isFullscreen = !isFullscreen;
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
  
  $: id = $page.params.id;
  $: paddedId = id.padStart(5, '0');
  $: unsig = getUnsig(Number(id));
  
  $: imageUrls = {
    standard: `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/1024ds/${paddedId}.png?v=${id}`,
    high: `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/4096/${paddedId}.png?v=${id}`,
    ultra: `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/16384/${paddedId}.png?v=${id}`
  };


  async function navigateToNft(newId: number) {
    if (newId >= 0 && newId < Object.keys(unsigs).length) {
      await goto(`/nft/${newId}`, { invalidateAll: true });
    }
  }
</script>

<div class="nft-detail" class:fullscreen={isFullscreen}>
  <div class="content-wrapper">
    <h1 class:hidden={isFullscreen}>unsigned_algorithm #{paddedId}</h1>
    
    <div class="image-section" class:fullscreen={isFullscreen}>
      <a href="/nft/{Number(id) - 1}" 
         class="nav-button prev" 
         class:hidden={isFullscreen}
         on:click|preventDefault={() => navigateToNft(Number(id) - 1)}>←</a>
         
      <div class="image-container">
        <img 
          src={isFullscreen ? imageUrls.high : imageUrls.standard} 
          alt={`NFT ${id}`}
          key={id} />
      </div>
      
      <a href="/nft/{Number(id) + 1}" 
         class="nav-button next" 
         class:hidden={isFullscreen}
         on:click|preventDefault={() => navigateToNft(Number(id) + 1)}>→</a>
    </div>

    <div class="metadata" class:hidden={isFullscreen}>
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
            {#each Object.entries(unsig.properties)[0][1] as property, i}
              <tr>
                <td>{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}</td>
                <td>{unsig.properties.colors[i] ?? ''}</td>
                <td>{unsig.properties.distributions[i] ?? ''}</td>
                <td>{unsig.properties.multipliers[i] ?? ''}</td>
                <td>{unsig.properties.rotations[i] ?? ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <h2>Download</h2>
      <div class="download-links">
        <a href={imageUrls.high} target="_blank">4K Version</a>
        <a href={imageUrls.ultra} target="_blank">16K Version</a>
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
</style> 