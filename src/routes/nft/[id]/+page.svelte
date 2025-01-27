<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
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
  
  $: imageUrls = {
    standard: `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/1024ds/${paddedId}.png`,
    high: `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/4096/${paddedId}.png`,
    ultra: `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/16384/${paddedId}.png`
  };
</script>

<div class="nft-detail" class:fullscreen={isFullscreen}>
  <h1 class:hidden={isFullscreen}>unsigned_algorithm #{paddedId}</h1>
  
  <div class="image-container" class:fullscreen={isFullscreen}>
    <img src={isFullscreen ? imageUrls.high : imageUrls.standard} alt={`NFT ${id}`} />
  </div>

  <div class="metadata" class:hidden={isFullscreen}>
    <h2>Properties</h2>
    <!-- Add properties from your JSON file here -->
    
    <h2>Download Options</h2>
    <div class="download-links">
      <a href={imageUrls.high} target="_blank">4K Version</a>
      <a href={imageUrls.ultra} target="_blank">16K Version</a>
    </div>
  </div>
</div>

<style>
  .nft-detail {
    max-width: 800px;
    margin: 0 auto;
  }

  .image-container {
    margin: 2rem 0;
  }

  .image-container img {
    width: 100%;
    height: auto;
  }

  .metadata {
    padding: 2rem 0;
  }

  .download-links {
    display: flex;
    gap: 1rem;
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
</style> 