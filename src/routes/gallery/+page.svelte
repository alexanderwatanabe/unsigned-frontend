<script lang="ts">
// very first line of code
globalThis.console.log('🖼️ [gallery] file loaded');

import { onMount } from 'svelte';
import type { UnsigMetadata } from '$lib/types';
import type { PageData } from './$types';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

// add logging right after imports
globalThis.console.log('🖼️ [gallery] imports loaded');

let { data } = $props<{data: PageData}>();
globalThis.console.log('🖼️ [gallery] initial data:', { hasData: !!data, data });

const TOTAL_ITEMS = 31119;
const PAGE_SIZES = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100];

// state
let currentPage = $state(1);
let itemsPerPage = $state(25);
let totalPages = $state(Math.ceil(TOTAL_ITEMS / itemsPerPage));
let gridSize = $state(Math.sqrt(itemsPerPage));
let indexes = $state<number[]>([]);
let isLoading = $state(false);
let isNavigating = $state(false);
let lastUrl = $state('');

// update derived values
$effect(() => {
  totalPages = Math.ceil(TOTAL_ITEMS / itemsPerPage);
  gridSize = Math.sqrt(itemsPerPage);
});

// update indexes
$effect(() => {
  const start = (currentPage - 1) * itemsPerPage;
  const remainingItems = Math.max(0, TOTAL_ITEMS - start);
  const pageLength = Math.min(itemsPerPage, remainingItems);
  indexes = Array.from({ length: pageLength }, (_, i) => start + i);
});

// handle url updates
$effect(() => {
  if (!browser) return;
  
  const url = new URL(window.location.href);
  const currentPageParam = url.searchParams.get('page');
  const currentLimitParam = url.searchParams.get('limit');
  
  // only update url if params changed
  if (currentPageParam === currentPage.toString() && 
      currentLimitParam === itemsPerPage.toString()) {
    return;
  }

  url.searchParams.set('page', currentPage.toString());
  url.searchParams.set('limit', itemsPerPage.toString());
  
  goto(url.toString(), { replaceState: true });
});

function getImageUrl(index: number): string {
  const paddedIndex = index.toString().padStart(5, '0');
  const imageSize = itemsPerPage < 16 ? 1024 : itemsPerPage >= 144 ? 128 : 256;
  return `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/${imageSize}/${paddedIndex}.png`;
}

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

// add logging for initial state
globalThis.console.log('🖼️ [gallery] initial state:', { currentPage, itemsPerPage });
let randomMode = $state(false);
let searchTimeout: NodeJS.Timeout;
let idSearch = $state('');
let searchInput: HTMLInputElement;

// Add filter-related state
let availableProperties = $state<string[]>([]);
let propertyValues = $state<Record<string, Set<string>>>({});
let activeFilters = $state<Filter[]>([]);
let filteredTotalItems = $state(0);
let pendingFilters = $state<Filter[]>([]);
let displayItemsPerPage = $state(25);
let gridScale = $state(1);
let isDrawerOpen = $state(false);

// Update property labels to be more generic
const propertyLabels: Record<string, string> = {
  colors: 'Color',
  distributions: 'Distribution',
  rotations: 'Rotation',
  multipliers: 'Multiplier'
};

const propertyToFilterKey: Record<string, keyof Filter> = {
  colors: 'color',
  distributions: 'distribution',
  multipliers: 'multiplier',
  rotations: 'rotation'
};

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

// Update image urls when itemsPerPage changes
$effect(() => {
  if (indexes.length > 0) {
    indexes = indexes.map((index: number) => index);
  }
});

$effect(() => {
  displayItemsPerPage = itemsPerPage;
});

onMount(() => {
  globalThis.console.log('🖼️ [gallery] component mounted');
});

async function processMetadata(metadata: UnsigMetadata[]) {
  globalThis.console.log('🖼️ [gallery] processing metadata:', { count: metadata.length });
  
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

  globalThis.console.log('🖼️ [gallery] metadata processed:', { 
    properties: availableProperties,
    values: Object.keys(propertyValues).length
  });
}

function filterByIdSearch(index: number): boolean {
  if (!idSearch) return true;
  const paddedIndex = index.toString().padStart(5, '0');
  return paddedIndex.includes(idSearch);
}

async function prefetchAdjacentPages() {
  if (!browser) return;

  // calculate adjacent page ranges
  const prevStart = Math.max(0, (currentPage - 2) * itemsPerPage);
  const nextEnd = Math.min(TOTAL_ITEMS, (currentPage + 1) * itemsPerPage);
  
  // create array of all indexes to prefetch
  const indexesToPrefetch = Array.from(
    { length: nextEnd - prevStart }, 
    (_, i) => prevStart + i
  ).filter(i => {
    // exclude current page indexes
    const currentStart = (currentPage - 1) * itemsPerPage;
    const currentEnd = currentStart + itemsPerPage;
    return i < currentStart || i >= currentEnd;
  });

  // prefetch images
  indexesToPrefetch.forEach(index => {
    const imageUrl = getImageUrl(index);
    const img = new Image();
    img.src = imageUrl;
  });
}

async function loadPage(page: number) {
  if (!browser) {
    globalThis.console.log('🖼️ [gallery] loadPage early return: not in browser');
    return;
  }
  
  if (isLoading) {
    globalThis.console.log('🖼️ [gallery] loadPage early return: already loading');
    return;
  }
  
  try {
    globalThis.console.log('🖼️ [gallery] loadPage started:', { page, itemsPerPage });
    isLoading = true;
    
    const start = (page - 1) * itemsPerPage;
    const remainingItems = Math.max(0, TOTAL_ITEMS - start);
    const pageLength = Math.min(itemsPerPage, remainingItems);
    
    // generate array of indexes for this page
    indexes = Array.from({ length: pageLength }, (_, i) => start + i);

    // update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('limit', itemsPerPage.toString());
    
    if (idSearch) {
      url.searchParams.set('idSearch', idSearch);
      url.searchParams.delete('filters');
    } else {
      url.searchParams.delete('idSearch');
      activeFilters.forEach((filter: Filter, rowIndex: number) => {
        if (filter.color !== 'ANY') url.searchParams.append('filters', `colors_${rowIndex}:${filter.color}`);
        if (filter.distribution !== 'ANY') url.searchParams.append('filters', `distributions_${rowIndex}:${filter.distribution}`);
        if (filter.multiplier !== 'ANY') url.searchParams.append('filters', `multipliers_${rowIndex}:${filter.multiplier}`);
        if (filter.rotation !== 'ANY') url.searchParams.append('filters', `rotations_${rowIndex}:${filter.rotation}`);
      });
    }

    globalThis.console.log('🖼️ [gallery] navigating to:', url.toString());
    const result = await goto(url.toString(), { replaceState: true });
    globalThis.console.log('🖼️ [gallery] navigation result:', result);
    
    // prefetch adjacent pages
    await prefetchAdjacentPages();
    
  } catch (error) {
    globalThis.console.error('🖼️ [gallery] error in loadPage:', error);
    // reset loading state but don't change page to avoid loops
    isLoading = false;
  } finally {
    globalThis.console.log('🖼️ [gallery] loadPage completed');
    isLoading = false;
  }
}

function addFilter() {
  if (pendingFilters.length >= MAX_FILTERS) return;
  pendingFilters = [...pendingFilters, { ...defaultFilter }];
}

function removeFilter(index: number) {
  pendingFilters = pendingFilters.filter((_: Filter, i: number) => i !== index);
}

function getValuesForProperty(property: string): string[] {
  const propertySet = propertyValues[property] || new Set<string>();
  const values = Array.from(propertySet).map((value: unknown) => String(value));
  return ['ANY', ...values];
}

function applyFilters() {
  // Clear ID search when applying filters
  idSearch = '';
  if (searchInput) {
    searchInput.value = '';
  }
  activeFilters = [...pendingFilters];
  currentPage = 1;
  loadPage(currentPage);
}

function clearFilters() {
  pendingFilters = [];
  activeFilters = [];
  currentPage = 1;
  // Only reload if not searching by ID
  if (!idSearch) {
    loadPage(currentPage);
  }
}

function getFriendlyName(property: string): string {
  return propertyLabels[property] || property;
}

function updateItemsPerPage(newSize: number) {
  if (!browser) return; // skip during SSR
  
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
  const randomIndexes = getRandomIndexes(itemsPerPage, TOTAL_ITEMS);
  
  indexes = randomIndexes;
}
  
function exitRandomMode() {
  randomMode = false;
  loadPage(currentPage);
}

function handleInputChange(e: Event, type: keyof Filter, filterIndex: number) {
  const target = e.target as HTMLSelectElement;
  if (target) {
    pendingFilters = pendingFilters.map((filter: Filter, index: number) => 
      index === filterIndex 
        ? { ...filter, [type]: target.value }
        : filter
    );
  }
}

function toggleDrawer() {
  isDrawerOpen = !isDrawerOpen;
}

function debouncedSearch(value: string) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    idSearch = value;
    // Clear filters when searching by ID
    if (value) {
      pendingFilters = [];
      activeFilters = [];
    }
    loadPage(1);
  }, 300);
}
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</svelte:head>

<div class="gallery-container" style="--grid-scale: {gridScale}">
  <button 
    class="nav-button prev" 
    class:hidden={currentPage === 1}
    onclick={() => currentPage > 1 && currentPage--}
  >
    ←
  </button>

  <div class="grid" style="--grid-size: {gridSize}">
    {#each indexes as index}
      <a href="/nft/{index}" class="grid-item">
        <img src={getImageUrl(index)} alt={`NFT ${index}`} loading="lazy" />
        <div class="overlay">
          <span class="index">#{index.toString().padStart(5, '0')}</span>
        </div>
      </a>
    {/each}
    
    {#if isLoading}
      <div class="loading-overlay">
        <div class="loading-dialog">
          loading...
        </div>
      </div>
    {/if}
  </div>

  <button 
    class="nav-button next" 
    class:hidden={currentPage === totalPages}
    onclick={() => currentPage < totalPages && currentPage++}
  >
    →
  </button>
</div>

<div class="pagination-controls" class:hidden={randomMode}>
  <div class="items-per-page">
    <span>items per page: {displayItemsPerPage}</span>
    <input 
      type="range"
      min="0"
      max={PAGE_SIZES.length - 1}
      step="1"
      value={PAGE_SIZES.indexOf(itemsPerPage)}
      oninput={(e) => {
        const target = e.target as HTMLInputElement;
        const newSize = PAGE_SIZES[parseInt(target.value)];
        if (newSize !== itemsPerPage) {
          itemsPerPage = newSize;
          const currentFirstItem = (currentPage - 1) * itemsPerPage;
          currentPage = Math.floor(currentFirstItem / newSize) + 1;
        }
      }}
    />
  </div>

  <div class="pagination">
    <button disabled={currentPage === 1} onclick={() => currentPage--}>-</button>
    <span>page </span>
    <input
      type="number"
      min="1"
      max={totalPages}
      value={currentPage}
      oninput={(e) => {
        const target = e.target as HTMLInputElement;
        const value = parseInt(target.value);
        if (!isNaN(value) && value >= 1 && value <= totalPages) {
          currentPage = value;
        }
      }}
    />
    <span>of {totalPages}</span>
    <button disabled={currentPage === totalPages} onclick={() => currentPage++}>+</button>
  </div>
</div>

<button class="drawer-toggle" onclick={toggleDrawer}>
  {isDrawerOpen ? '←' : '→'} filters
</button>

<div class="drawer" class:open={isDrawerOpen}>
  <div class="drawer-content">
    <div class="id-search">
      <input
        type="text"
        placeholder="search by id"
        bind:this={searchInput}
        value={idSearch}
        oninput={(e) => {
          const target = e.target as HTMLInputElement;
          debouncedSearch(target.value);
        }}
      />
    </div>

    <hr class="separator" />

    <div class="filters">
      <div class="filter-list">
        {#each pendingFilters as filter, index}
          <div class="filter-row">
            <div class="filter-content">
              <div class="filter-grid">
                {#each filterOptions as option}
                  <div class="filter-field">
                    <label for={`${option.property}-${index}`}>{option.label}:</label>
                    <select 
                      id={`${option.property}-${index}`}
                      value={filter[propertyToFilterKey[option.property]]}
                      onchange={(e) => handleInputChange(e, propertyToFilterKey[option.property], index)}
                    >
                      {#each getValuesForProperty(option.property) as value}
                        <option value={value}>{value}</option>
                      {/each}
                    </select>
                  </div>
                {/each}
              </div>
            </div>
            <button class="remove-button" onclick={() => removeFilter(index)}>×</button>
          </div>
        {/each}

        <div class="add-filter-container">
          <span class="add-filter-label">(add filter)</span>
          <button 
            class="add-filter-button"
            onclick={addFilter} 
            disabled={pendingFilters.length >= MAX_FILTERS}
          >
            +
          </button>
        </div>
      </div>

      {#if pendingFilters.length > 0}
        <div class="filter-actions">
          <div class="filter-buttons">
            <button 
              onclick={applyFilters} 
              disabled={pendingFilters.every((f: Filter) => 
                f.color === 'ANY' && 
                f.distribution === 'ANY' && 
                f.multiplier === 'ANY' && 
                f.rotation === 'ANY'
              )}
              class="primary"
            >
              apply filters
            </button>
            <button onclick={clearFilters}>
              clear all
            </button>
          </div>
          {#if activeFilters.length > 0}
            <p class="filter-results">found {filteredTotalItems.toLocaleString()} items</p>
          {/if}
        </div>
      {/if}
    </div>

    <hr class="separator" />

    <div class="random-section">
      {#if !randomMode}
        <button 
          class="random-button" 
          onclick={loadRandomItems}
        >
          show {itemsPerPage} random unsigs
        </button>
      {:else}
        <div class="random-buttons">
          <button 
            class="random-button" 
            onclick={loadRandomItems}
          >
            new random set
          </button>
          <button 
            class="random-button secondary" 
            onclick={exitRandomMode}
          >
            exit random mode
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(*) {
    font-family: 'JetBrains Mono', monospace;
  }

  .gallery-container {
    position: sticky;
    top: 4rem; /* 64px navbar height */
    margin: 0 auto;
    padding: 1rem 10rem;
    width: fit-content;
    height: 80vh;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    z-index: 1;
    background: white;
    position: relative;
    margin-bottom: 4rem;  /* Add space for the drawer toggle button */
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(var(--grid-size), 1fr);
    gap: 0.5rem;
    width: 100%;
    height: 100%;
    aspect-ratio: 1;
    position: relative;
    pointer-events: auto;
  }

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
  }

  .filter-list {
    margin: 0.75rem auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
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
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 100px;
  }

  .filter-field select {
    width: 100%;
    padding: 0.35rem;
    font-size: 0.875rem;
  }

  .filter-field label {
    font-size: 0.75rem;
    color: #666;
  }

  .remove-button {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px dashed var(--border-color);
    background: none;
    color: var(--text-color);
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;
  }

  .remove-button:hover {
    background: rgba(220, 53, 69, 0.1);  /* desaturated red */
    transform: scale(1.05);
    border-color: rgba(220, 53, 69, 0.3);
  }

  .view-controls {
    display: none;
  }

  .separator.small {
    display: none;
  }

  h2 {
    display: none;
  }

  .nav-button.disabled {
    display: none;
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
    margin: 1.5rem auto;
    width: 100%;
    max-width: 400px;
  }

  .separator.small {
    margin: 1rem auto;
  }

  .filter-buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .filter-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .filter-actions button {
    min-width: 120px;
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
    margin: 0;
    font-size: 0.875rem;
  }

  .add-filter-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-top: 1rem;
    gap: 0.25rem;
  }

  .add-filter-label {
    color: #999;
    font-size: 0.875rem;
  }

  .add-filter-button {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px dashed var(--border-color);
    background: none;
    color: var(--text-color);
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;
  }

  .add-filter-button:hover:not(:disabled) {
    background: rgba(40, 167, 69, 0.1);  /* desaturated green */
    transform: scale(1.05);
    border-color: rgba(40, 167, 69, 0.3);
  }

  .add-filter-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .id-search {
    margin: 2rem auto;
    max-width: 800px;
    text-align: center;
  }

  .id-search input {
    width: 200px;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    text-align: center;
  }

  .id-search input:focus {
    outline: none;
    border-color: var(--primary-color, #4a90e2);
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }

  .nav-button {
    flex-shrink: 0;
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
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 0;
    border: none;
  }

  .nav-button:hover {
    background: rgba(0, 0, 0, 0.4);
  }

  .nav-button.prev {
    left: -3.5rem;
  }

  .nav-button.next {
    right: -3.5rem;
  }

  .nav-button.hidden {
    visibility: hidden;
  }

  .nav-button:disabled,
  .nav-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    background: rgba(255, 255, 255, 0.8);
  }

  .loading-dialog {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 1rem 2rem;
    border-radius: 1rem;
    font-size: 1.2rem;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .drawer {
    position: fixed;
    top: 4rem; /* match navbar height */
    left: 0;
    bottom: 0;
    width: 480px;
    background: white;
    border-right: 1px solid #e5e5e5;
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    z-index: 1000;
    overflow-y: auto;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  }

  .drawer.open {
    transform: translateX(0);
  }

  .drawer-content {
    padding: 1.5rem;
  }

  .drawer-toggle {
    position: fixed;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1001;
    background: white;
    border: 1px solid #e5e5e5;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }

  .drawer-toggle:hover {
    background: #f5f5f5;
    transform: translateY(-50%) scale(1.05);
  }

  .pagination-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    margin: 2rem auto;
    max-width: 800px;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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
</style> 