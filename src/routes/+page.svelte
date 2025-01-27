<script lang="ts">
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  // Access the unsigs data
  const unsigs = data.unsigs;

  let heroImage = "https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/1024/00000.png";
</script>

<div class="hero">
  <h1>unsigned_algorithms</h1>
  <p>An exploration of generative art and blockchain technology</p>
  <img src={heroImage} alt="Hero NFT" />
  <a href="/gallery" class="cta">Explore Collection</a>
</div>

<style>
  .hero {
    text-align: center;
    padding: 4rem 0;
  }

  h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  img {
    max-width: 100%;
    height: auto;
    margin: 2rem 0;
  }

  .cta {
    display: inline-block;
    padding: 1rem 2rem;
    background: var(--primary-color);
    color: white;
    text-decoration: none;
    border-radius: 4px;
  }
</style> 