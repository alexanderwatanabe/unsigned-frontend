<script lang="ts">
  import type { PageData } from './$types';
  import { unsigMetadata } from '$lib/data/metadata';
  
  export let data: PageData;
  
  const unsigs = data.unsigs;
  const heroImage = "https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/1024/00000.png";
  
  // Format metadata without initial indentation
  const metadata = unsigMetadata.trimStart();

  function handleExploreClick() {
    // Add any click handling logic here
  }
</script>

<main>
  <section class="hero">
    <h1>unsigned_algorithms</h1>
    <p class="subtitle">An exploration of generative art and blockchain technology</p>
    
    <div class="image-container" role="img" aria-label="Hero NFT with metadata overlay">
      <img 
        src={heroImage} 
        alt="unsigned_algorithms NFT" 
        loading="eager"
      />
      <pre class="metadata-overlay" aria-hidden="true">
        <code>{metadata}</code>
      </pre>
    </div>

    <a 
      href="/gallery" 
      class="cta"
      on:click={handleExploreClick}
      role="button"
    >
      Explore Collection
    </a>
  </section>
</main>

<style>
  .hero {
    text-align: center;
    padding: 2rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  .cta {
    display: inline-block;
    padding: 1rem 2rem;
    background: var(--primary-color);
    color: white;
    text-decoration: none;
    border-radius: 4px;
    transition: all 0.3s ease;
  }

  .cta:hover {
    background: #666666;
    transform: translateY(-1px);
  }

  .image-container {
    position: relative;
    display: inline-block;
    margin: 2rem 2rem;
    max-width: 90%;
    width: fit-content;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .image-container img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  .metadata-overlay {
    display: block;
    position: absolute;
    top: 5%;
    left: 5%;
    right: 5%;
    bottom: 5%;
    background: rgba(0, 0, 0, 0.9);
    color: #cccccc;
    overflow: auto;
    padding: 1rem;
    text-align: left;
    font-family: monospace;
    font-size: 0.4rem;
    line-height: 1.0;
    white-space: pre-wrap;
    box-sizing: border-box;
    border-radius: 4px;
    transition: opacity 0.5s ease;
    opacity: 0;
    pointer-events: none;
  }

  .image-container:hover .metadata-overlay {
    opacity: 1;
    pointer-events: auto;
  }

  code {
    white-space: pre;
    font-size: 0.5rem;
  }

  .subtitle {
    font-size: 1.2rem;
    color: var(--text-secondary);
    margin-bottom: 2rem;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }

    code {
      font-size: 0.4rem;
    }
  }
</style> 