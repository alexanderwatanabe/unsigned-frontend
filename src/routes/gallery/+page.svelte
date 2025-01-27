<script>
  import { onMount } from 'svelte';
  
  let items = [];
  let currentPage = 1;
  let itemsPerPage = 16;
  let totalPages = Math.ceil(31119 / itemsPerPage);
 

  function getImageUrl(index) {
    const paddedIndex = index.toString().padStart(5, '0');
    return `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/256/${paddedIndex}.png`;
  }

  function loadPage(page) {
    const start = (page - 1) * itemsPerPage;
    const totalItems = 31119; // Total number of NFTs in collection
    const remainingItems = Math.max(0, totalItems - start);
    const pageLength = Math.min(itemsPerPage, remainingItems);
    
    items = Array.from({ length: pageLength }, (_, i) => ({
      id: start + i,
      imageUrl: getImageUrl(start + i)
    }));
  }

  $: {
    loadPage(currentPage);
  }
</script>



<div class="grid">
  {#each items as item}
    <a href="/nft/{item.id}" class="grid-item">
      <img src={item.imageUrl} alt={`NFT ${item.id}`} loading="lazy" />
    </a>
  {/each}
</div>

<div class="pagination">
  <button disabled={currentPage === 1} on:click={() => currentPage--}>Previous</button>
  <span>Page </span>
  <input
    type="number"
    min="1"
    max={totalPages}
    bind:value={currentPage}
    on:change={(e) => {
      const value = parseInt(e.target.value);
      if (value < 1) currentPage = 1;
      else if (value > totalPages) currentPage = totalPages;
    }}
  />

  <span>of {totalPages}</span>
  <button disabled={currentPage === totalPages} on:click={() => currentPage++}>Next</button>
</div>

<style>
  .grid-item {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
  }

  .grid-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .grid-item:hover img {
    transform: scale(1.05);
  }

  select {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    background: white;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input[type="number"] {
    width: 70px;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    margin: 0 0.5rem;
  }

  /* Hide number input spinners */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  input[type="number"] {
    -moz-appearance: textfield;
  }
</style> 