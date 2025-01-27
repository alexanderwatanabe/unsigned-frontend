<script lang="ts">
  import { onMount } from 'svelte';
  import type { UnsigMetadata } from '$lib/types';
  
  interface UnsigItem extends UnsigMetadata {
    imageUrl: string;
  }

  interface FilterOption {
    property: string;
    label: string;
  }

  interface Filter {
    color: string;
    distribution: string;
    multiplier: string;
    rotation: string;
  }

  let items: UnsigItem[] = [];
  let currentPage = 1;
  let itemsPerPage = 16;
  let totalItems = 31119;
  let totalPages = Math.ceil(totalItems / itemsPerPage);
  let randomMode = false;
  
  // Add filter-related state
  let availableProperties: string[] = [];
  let propertyValues: Record<string, Set<string>> = {};
  let activeFilters: Filter[] = [];
  let filteredTotalItems = totalItems;
  let pendingFilters: Filter[] = [];

  // Update page sizes to go up to 10000
  const pageSizes = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256];

  // Update property labels to be more generic
  const propertyLabels: Record<string, string> = {
    colors: 'Color',
    distributions: 'Distribution',
    rotations: 'Rotation',
    multipliers: 'Multiplier'
  };

  // Calculate grid size (square root of items per page)
  $: gridSize = Math.sqrt(itemsPerPage);

  const filterOptions: FilterOption[] = [
    { property: 'colors', label: 'Color' },
    { property: 'distributions', label: 'Distribution' },
    { property: 'multipliers', label: 'Multiplier' },
    { property: 'rotations', label: 'Rotation' }
  ];

  const defaultFilter: Filter = {
    color: 'ANY',
    distribution: 'ANY',
    multiplier: 'ANY',
    rotation: 'ANY'
  };

  const MAX_FILTERS = 6;

  let displayItemsPerPage = itemsPerPage;

  onMount(async () => {
    await loadMetadata();
  });

  async function loadMetadata() {
    try {
      const response = await fetch('/api/metadata');
      const metadata: UnsigMetadata[] = await response.json();
      
      // Extract unique values for each property type
      const properties = new Map<string, Set<string>>();
      
      metadata.forEach(item => {
        Object.entries(item.properties).forEach(([key, values]) => {
          if (!properties.has(key)) {
            properties.set(key, new Set());
          }
          values.forEach(value => {
            properties.get(key)?.add(value);
          });
        });
      });

      // Convert to reactive variables
      availableProperties = Array.from(properties.keys()).sort();
      propertyValues = Object.fromEntries(
        Array.from(properties.entries()).map(([key, value]) => [key, value])
      );
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  }

  function getImageUrl(index: number): string {
    const paddedIndex = index.toString().padStart(5, '0');
    // Use smaller images when displaying more items
    const imageSize = itemsPerPage >= 25 ? 128 : 256;
    return `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/${imageSize}/${paddedIndex}.png`;
  }

  async function loadPage(page: number) {
    const start = (page - 1) * itemsPerPage;
    const remainingItems = Math.max(0, filteredTotalItems - start);
    const pageLength = Math.min(itemsPerPage, remainingItems);
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      queryParams.set('limit', itemsPerPage.toString());
      
      activeFilters.forEach(filter => {
        if (filter.color !== 'ANY') queryParams.append('filters', `colors:${filter.color}`);
        if (filter.distribution !== 'ANY') queryParams.append('filters', `distributions:${filter.distribution}`);
        if (filter.multiplier !== 'ANY') queryParams.append('filters', `multipliers:${filter.multiplier}`);
        if (filter.rotation !== 'ANY') queryParams.append('filters', `rotations:${filter.rotation}`);
      });

      const response = await fetch(`/api/items?${queryParams}`);
      const data = await response.json();
      
      items = data.items.map((item: any) => ({
        id: item.id,
        imageUrl: getImageUrl(item.id),
        properties: item.properties
      }));
      
      filteredTotalItems = data.total;
      totalPages = Math.ceil(filteredTotalItems / itemsPerPage);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  }

  function addFilter() {
    if (pendingFilters.length >= MAX_FILTERS) return;
    pendingFilters = [...pendingFilters, { ...defaultFilter }];
  }

  function removeFilter(index: number) {
    pendingFilters = pendingFilters.filter((_, i) => i !== index);
  }

  function getValuesForProperty(property: string): string[] {
    const values = Array.from(propertyValues[property] || []);
    return ['ANY', ...values];
  }

  function applyFilters() {
    activeFilters = [...pendingFilters];
    currentPage = 1;
    loadPage(currentPage);
  }

  function clearFilters() {
    pendingFilters = [];
    activeFilters = [];
    currentPage = 1;
    loadPage(currentPage);
  }

  function getFriendlyName(property: string): string {
    return propertyLabels[property] || property;
  }

  function updateItemsPerPage(newSize: number) {
    itemsPerPage = newSize;
    // Adjust current page to maintain approximate scroll position
    const currentFirstItem = (currentPage - 1) * itemsPerPage;
    currentPage = Math.floor(currentFirstItem / newSize) + 1;
    totalPages = Math.ceil(filteredTotalItems / itemsPerPage);
    loadPage(currentPage);
  }

  function getRandomIndexes(count: number, max: number): number[] {
    const indexes = new Set<number>();
    while (indexes.size < count) {
      indexes.add(Math.floor(Math.random() * max));
    }
    return Array.from(indexes);
  }
  
  async function loadRandomItems() {
    randomMode = true;
    const randomIndexes = getRandomIndexes(itemsPerPage, totalItems);
    items = randomIndexes.map(index => ({
      id: index,
      imageUrl: getImageUrl(index),
      properties: {} as UnsigMetadata['properties']
    }));
  }
  
  function exitRandomMode() {
    randomMode = false;
    loadPage(currentPage);
  }

  $: {
    // Only load the page when currentPage changes
    if (currentPage) {
      loadPage(currentPage);
    }
  }
</script>

<div class="grid" style="--grid-size: {gridSize}">
  {#each items as item}
    <a href="/nft/{item.id}" class="grid-item">
      <img src={item.imageUrl} alt={`NFT ${item.id}`} loading="lazy" />
      <div class="overlay">
        <span class="index">#{item.id.toString().padStart(5, '0')}</span>
      </div>
    </a>
  {/each}
</div>

<hr class="separator" />

<div class="filters">
  <h3>Filters</h3>
  
  <button 
    on:click={addFilter} 
    disabled={pendingFilters.length >= MAX_FILTERS}
  >
    Add Filter {pendingFilters.length}/{MAX_FILTERS}
  </button>

  <div class="filter-list">
    {#each pendingFilters as filter, index}
      <div class="filter-row">
        <div class="filter-content">
          <div class="filter-grid">
            {#each filterOptions as option}
              <div class="filter-field">
                <label>{option.label}:</label>
                <select 
                  bind:value={filter[option.property.slice(0, -1)]}
                >
                  {#each getValuesForProperty(option.property) as value}
                    <option value={value}>{value}</option>
                  {/each}
                </select>
              </div>
            {/each}
          </div>
        </div>

        <button class="remove-button" on:click={() => removeFilter(index)}>×</button>
      </div>
    {/each}
  </div>

  {#if pendingFilters.length > 0}
    <div class="filter-actions">
      <button 
        on:click={applyFilters} 
        disabled={pendingFilters.every(f => 
          f.color === 'ANY' && 
          f.distribution === 'ANY' && 
          f.multiplier === 'ANY' && 
          f.rotation === 'ANY'
        )}
        class="primary"
      >
        Apply Filters
      </button>
      <button 
        on:click={clearFilters}
      >
        Clear All
      </button>
    </div>
  {/if}

  <div class="filter-results">
    {#if activeFilters.length > 0}
      <p>Found {filteredTotalItems.toLocaleString()} items</p>
    {/if}
  </div>
</div>

<hr class="separator" />

<div class="view-controls">
  <div class="random-section">
    {#if !randomMode}
      <button 
        class="random-button" 
        on:click={loadRandomItems}
      >
        Show {itemsPerPage} Random Unsigs
      </button>
    {:else}
      <div class="random-buttons">
        <button 
          class="random-button" 
          on:click={loadRandomItems}
        >
          New Random Set
        </button>
        <button 
          class="random-button secondary" 
          on:click={exitRandomMode}
        >
          Exit Random Mode
        </button>
      </div>
    {/if}
  </div>

  <hr class="separator small" />

  <div class="items-per-page">
    <span>Items per page: {displayItemsPerPage}</span>
    <input 
      type="range"
      min="0"
      max={pageSizes.length - 1}
      step="1"
      value={pageSizes.indexOf(itemsPerPage)}
      on:input={(e) => displayItemsPerPage = pageSizes[parseInt(e.target.value)]}
      on:change={(e) => updateItemsPerPage(pageSizes[parseInt(e.target.value)])}
    />
  </div>

  <div class="pagination" class:hidden={randomMode}>
    <button disabled={currentPage === 1} on:click={() => currentPage--}>Previous</button>
    <span>Page </span>
    <input
      type="number"
      min="1"
      max={totalPages}
      bind:value={currentPage}
      on:change={(e: Event) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (value < 1) currentPage = 1;
        else if (value > totalPages) currentPage = totalPages;
      }}
    />
    <span>of {totalPages}</span>
    <button disabled={currentPage === totalPages} on:click={() => currentPage++}>Next</button>
  </div>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--grid-size), 1fr);
    gap: 0.5rem;
    width: min(100%, calc(var(--grid-size) * 150px));
    margin: 0 auto;
  }

  .grid-item {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    width: 100%;
  }

  .grid-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .index {
    color: white;
    font-size: 1rem;
    font-weight: 500;
    font-family: monospace;
  }

  .grid-item:hover .overlay {
    opacity: 1;
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

  .filters {
    margin-top: 2rem;
    margin-bottom: 2rem;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .filter-list {
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 120px;
  }

  .filter-field label {
    font-size: 0.875rem;
    color: #666;
  }

  .filter-field select {
    width: 100%;
  }

  .remove-button {
    padding: 0.25rem 0.5rem;
    border-radius: 50%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    line-height: 1;
    background-color: var(--error-color, #d3d3d3);
    color: white;
    border: none;
  }

  .remove-button:hover {
    background-color: var(--error-color-hover, #a9a9a9);
  }

  .view-controls {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .random-section {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .random-buttons {
    display: flex;
    gap: 1rem;
  }

  .random-button {
    background-color: var(--primary-color, #4a90e2);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .random-button:hover {
    background-color: var(--primary-color-hover, #357abd);
  }

  .random-button.secondary {
    background-color: #6c757d;
  }
  
  .random-button.secondary:hover {
    background-color: #5a6268;
  }

  .hidden {
    display: none;
  }

  .items-per-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    max-width: 400px;
  }

  .items-per-page input[type="range"] {
    width: 100%;
    margin: 0.5rem 0;
  }

  .separator {
    border: none;
    border-top: 1px solid #e5e5e5;
    margin: 2rem auto;
    width: 100%;
    max-width: 400px;
  }

  .separator.small {
    margin: 1rem auto;
  }

  .filter-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  .filter-actions button.primary {
    background-color: var(--primary-color, #4a90e2);
    color: white;
  }

  .filter-actions button.primary:hover:not(:disabled) {
    background-color: var(--primary-color-hover, #357abd);
  }

  .filter-results {
    text-align: center;
    color: var(--text-color-secondary, #666);
  }

  .filter-results p {
    margin: 0;
  }
</style> 