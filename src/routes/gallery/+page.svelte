<script lang="ts">
  import { onMount } from 'svelte';
  import type { UnsigMetadata, RawUnsigMetadata } from '$lib/types';
  import { convertRawMetadata } from '$lib/types';
  import { browser } from '$app/environment';
  import noLinersData from '$assets/noliners.json';
  
  // Constants - declare these first
  const TOTAL_ITEMS = 31119;
  const PAGE_SIZES = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256];
  const MAX_FILTERS = 6;

  // Interfaces and types
  interface UnsigItem extends UnsigMetadata {
    imageUrl: string;
  }

  interface FilterOption {
    property: string;
    label: string;
  }

  // Property key type
  type PropertyKey = 'color' | 'distribution' | 'multiplier' | 'rotation';

  interface Filter {
    color: string;
    distribution: string;
    multiplier: string | number;  // Can be 'ANY' or number
    rotation: string | number;    // Can be 'ANY' or number
  }

  type FilterProperty = keyof Filter;
  type FilterValue = string | number;

  // Core state with runes
  let currentPage = $state(1);
  let itemsPerPage = $state(25);
  let displayItemsPerPage = $state(25);  // New state for display
  let manuallySetPageSize = $state(false);  // Add this to track manual changes
  let items = $state<UnsigItem[]>([]);
  let randomMode = $state(false);
  let idSearch = $state('');
  let isLoading = $state(false);
  let filteredTotalItems = $state(TOTAL_ITEMS);
  let isInitialized = $state(false);

  // Filter state
  let availableProperties = $state<string[]>([]);
  let propertyValues = $state<Record<string, Set<string | number>>>({});
  let activeFilters = $state<Filter[]>([]);
  let pendingFilters = $state<Filter[]>([]);

  // Derived values
  let totalPages = $derived(Math.ceil(filteredTotalItems / itemsPerPage));
  let gridSize = $derived(Math.sqrt(itemsPerPage));

  // Add this near the top with other state variables
  let isApplyingFilters = $state(false);

  // Update property labels to be more generic
  const propertyLabels: Record<string, PropertyKey> = {
    colors: 'color',
    distributions: 'distribution',
    rotations: 'rotation',
    multipliers: 'multiplier'
  };

  const filterOptions: FilterOption[] = [
    { property: 'colors', label: 'col' },
    { property: 'distributions', label: 'dist' },
    { property: 'multipliers', label: 'mult' },
    { property: 'rotations', label: 'rot' }
  ];

  const defaultFilter: Filter = {
    color: 'ANY',
    distribution: 'ANY',
    multiplier: 'ANY',
    rotation: 'ANY'
  };

  const propertyToFilterKey: Record<string, FilterProperty> = {
    colors: 'color',
    distributions: 'distribution',
    rotations: 'rotation',
    multipliers: 'multiplier'
  };

  function getFilterValue(filter: Filter, property: string): string {
    const key = propertyToFilterKey[property];
    if (!key) return 'ANY';
    const value = filter[key];
    return value === undefined ? 'ANY' : String(value);
  }

  function setFilterValue(filter: Filter, property: string, value: string): Filter {
    const key = propertyToFilterKey[property];
    if (!key) return filter;
    
    // Convert string values to numbers for numeric properties
    let convertedValue: string | number = value;
    if (value !== 'ANY') {
      if (key === 'rotation') {
        convertedValue = parseInt(value, 10);
      } else if (key === 'multiplier') {
        convertedValue = parseFloat(value);
      }
    }
    
    return { ...filter, [key]: convertedValue };
  }

  // Add metadata cache
  let metadataCache = $state<Record<number, UnsigMetadata>>({});

  // Add metadata state
  let allMetadata = $state<UnsigMetadata[]>([]);

  // Add near the top with other state variables
  let noLinerIndices = $state<number[]>([]);

  // Add state to track current view
  let currentView = $state<'all' | 'random' | 'noliners'>('all');

  // Update loadMetadata to use imported no-liners data
  async function loadMetadata() {
    if (!browser) return;
    
    try {
      const metadataResponse = await fetch('/api/metadata');
      const rawMetadata: RawUnsigMetadata[] = await metadataResponse.json();
      noLinerIndices = noLinersData;
      
      // Convert raw metadata to proper types
      allMetadata = rawMetadata.map(convertRawMetadata);
      
      // Extract unique values for each property type
      const properties = new Map<string, Set<string | number>>();
      
      allMetadata.forEach(item => {
        // Handle string properties
        item.properties.colors.forEach(value => {
          if (!properties.has('colors')) properties.set('colors', new Set());
          properties.get('colors')?.add(value);
        });
        item.properties.distributions.forEach(value => {
          if (!properties.has('distributions')) properties.set('distributions', new Set());
          properties.get('distributions')?.add(value);
        });
        
        // Handle numeric properties
        item.properties.rotations.forEach(value => {
          if (!properties.has('rotations')) properties.set('rotations', new Set());
          properties.get('rotations')?.add(value);
        });
        item.properties.multipliers.forEach(value => {
          if (!properties.has('multipliers')) properties.set('multipliers', new Set());
          properties.get('multipliers')?.add(value);
        });
      });

      // Update state
      availableProperties = Array.from(properties.keys()).sort();
      propertyValues = Object.fromEntries(
        Array.from(properties.entries()).map(([key, value]) => [key, value])
      );
      
      isInitialized = true;
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  }

  // Update matchesFilter to handle numeric comparisons
  function matchesFilter(index: number, filter: Filter): boolean {
    // Skip if all filter values are 'ANY'
    if (Object.values(filter).every(value => value === 'ANY')) {
      return true;
    }

    // Get metadata for this index
    const metadata = allMetadata[index];
    if (!metadata) return false;

    // Get the properties we need to check
    const properties = metadata.properties;
    
    // Get the length of any property array (they should all be the same length)
    const propertyLength = properties.colors.length;
    
    // For each position in the property arrays
    for (let pos = 0; pos < propertyLength; pos++) {
      let matchesAtPosition = true;
      
      // Check each filter condition at this position
      if (filter.color !== 'ANY' && properties.colors[pos] !== filter.color) {
        matchesAtPosition = false;
      }
      if (filter.distribution !== 'ANY' && properties.distributions[pos] !== filter.distribution) {
        matchesAtPosition = false;
      }
      if (filter.multiplier !== 'ANY') {
        const filterMultiplier = typeof filter.multiplier === 'string' ? 
          parseFloat(filter.multiplier) : filter.multiplier;
        if (Math.abs(properties.multipliers[pos] - filterMultiplier) > 0.0001) { // Use small epsilon for float comparison
          matchesAtPosition = false;
        }
      }
      if (filter.rotation !== 'ANY') {
        const filterRotation = typeof filter.rotation === 'string' ? 
          parseInt(filter.rotation, 10) : filter.rotation;
        if (properties.rotations[pos] !== filterRotation) {
          matchesAtPosition = false;
        }
      }
      
      // If all conditions matched at this position, this unsig is a match
      if (matchesAtPosition) {
        return true;
      }
    }
    
    // No matching position found
    return false;
  }

  // Add a function to clear the cache when needed
  function clearMetadataCache() {
    metadataCache = {};
  }

  // Clear cache when filters change
  $effect(() => {
    if (activeFilters.length === 0) {
      clearMetadataCache();
    }
  });

  // Add this function to apply all active filters
  function applyAllFilters(index: number): boolean {
    if (activeFilters.length === 0) return true;
    return activeFilters.every(filter => matchesFilter(index, filter));
  }

  // Update the findBestPageSize function to prefer 25 as default
  function findBestPageSize(totalItems: number): number {
    // If total items is greater than 25, return 25 as default
    if (totalItems >= 25) {
      return 25;
    }
    // For smaller sets, find the largest page size that's smaller than or equal to totalItems
    for (let i = PAGE_SIZES.length - 1; i >= 0; i--) {
      if (PAGE_SIZES[i] <= totalItems) {
        return PAGE_SIZES[i];
      }
    }
    // If no page size is small enough, return the smallest
    return PAGE_SIZES[0];
  }

  // Update isMoreRestrictive to handle both string and number types
  function isMoreRestrictive(newValue: string | number, oldValue: string | number): boolean {
    // ANY is always less restrictive
    if (newValue === 'ANY') return false;
    if (oldValue === 'ANY') return true;
    // Otherwise, just check if they're different
    return newValue !== oldValue;
  }

  // Add this function to compare filters
  function areFiltersMoreRestrictive(newFilters: Filter[], oldFilters: Filter[]): boolean {
    // More filters is more restrictive
    if (newFilters.length > oldFilters.length) return true;
    // Less filters is less restrictive
    if (newFilters.length < oldFilters.length) return false;
    
    // Compare each filter
    return newFilters.some((newFilter, index) => {
      const oldFilter = oldFilters[index];
      return Object.entries(newFilter).some(([key, value]) => 
        isMoreRestrictive(value, oldFilter[key as keyof Filter])
      );
    });
  }

  // Update the effect to handle the mutual exclusivity
  $effect(() => {
    if (!browser || !propertyValues || Object.keys(propertyValues).length === 0) return;
    if (currentView !== 'all') return;
    
    try {
      isLoading = true;

      // Create a stable copy of the current state
      const currentFilters = [...activeFilters];
      const searchTerm = idSearch;
      const page = currentPage;
      
      // Generate all possible indexes
      const allIndexes = Array.from({ length: TOTAL_ITEMS }, (_, i) => i);
      
      // Apply either search OR filters, not both
      let filteredIndexes: number[];
      
      if (searchTerm) {
        // If there's a search term, use that
        filteredIndexes = allIndexes.filter(filterByIdSearch);
      } else if (currentFilters.length > 0) {
        // Otherwise, if there are filters, use those
        filteredIndexes = allIndexes.filter(index => 
          currentFilters.every(filter => matchesFilter(index, filter))
        );
      } else {
        // If neither, show all
        filteredIndexes = allIndexes;
      }

      // Update filtered total for pagination
      filteredTotalItems = filteredIndexes.length;

      // Only adjust page size if not manually set
      if (!manuallySetPageSize) {
        const newPageSize = findBestPageSize(filteredIndexes.length);
        if (newPageSize !== itemsPerPage) {
          itemsPerPage = newPageSize;
          displayItemsPerPage = newPageSize;
        }
      }
      
      // Get current page of results
      const start = (page - 1) * itemsPerPage;
      const end = Math.min(start + itemsPerPage, filteredIndexes.length);
      const pageIndexes = filteredIndexes.slice(start, end);
      
      // Update items
      items = pageIndexes.map(index => ({
        id: index,
        imageUrl: getImageUrl(index),
        properties: allMetadata[index]?.properties || {
          colors: [],
          distributions: [],
          multipliers: [],
          rotations: []
        }
      }));

      // Prefetch adjacent pages
      prefetchAdjacentPages(filteredIndexes);
    } catch (error) {
      console.error('Error in filter effect:', error);
    } finally {
      isLoading = false;
    }
  });

  // Functions
  function getImageUrl(index: number): string {
    const paddedIndex = index.toString().padStart(5, '0');
    // Use different image sizes based on items per page
    let imageSize = 128;  // default for 25+ items
    if (itemsPerPage === 1) {
      imageSize = 1024;  // highest quality for single item view
    } else if (itemsPerPage <= 16) {
      imageSize = 256;   // medium quality for 4-16 items
    }
    return `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/${imageSize}/${paddedIndex}.png`;
  }

  function filterByIdSearch(index: number): boolean {
    if (!idSearch) return true;
    
    // Get both padded and unpadded versions of the index
    const paddedIndex = index.toString().padStart(5, '0');
    const unpadded = index.toString();
    
    // Clean up search term and handle edge cases
    const searchTerm = idSearch.trim().toLowerCase();
    
    // Check if the search term appears in either version of the number
    return paddedIndex.includes(searchTerm) || unpadded.includes(searchTerm);
  }

  // Update loadPage to handle different views
  function loadPage(page: number) {
    if (isLoading) return;
    currentPage = page;
  }

  function addFilter() {
    if (pendingFilters.length >= MAX_FILTERS) return;
    pendingFilters = [...pendingFilters, { ...defaultFilter }];
  }

  function removeFilter(index: number) {
    pendingFilters = pendingFilters.filter((_, i) => i !== index);
  }

  // Update getValuesForProperty to convert numbers to strings for display
  function getValuesForProperty(property: string): string[] {
    const values = Array.from(propertyValues[property] || []);
    return ['ANY', ...values.map(value => String(value))];
  }

  // Update applyFilters to handle mode transitions
  function applyFilters() {
    if (isApplyingFilters) return;
    
    isApplyingFilters = true;
    try {
      // Clear any active search first
      idSearch = '';
      
      // Exit other modes
      randomMode = false;
      currentView = 'all';
      
      // Create a new array for active filters
      const newActiveFilters = pendingFilters
        .filter(filter => !Object.values(filter).every(v => v === 'ANY'))
        .map(filter => ({ ...filter }));
      
      // Update state with new arrays
      activeFilters = [...newActiveFilters];
      currentPage = 1;
      resetPageSizeFlag();
    } finally {
      isApplyingFilters = false;
    }
  }

  // Update clearFilters to reset view
  function clearFilters() {
    currentView = 'all';
    pendingFilters = [];
    activeFilters = [];
    currentPage = 1;
    resetPageSizeFlag();
  }

  function getFriendlyName(property: string): string {
    return propertyLabels[property] || property;
  }

  function updateItemsPerPage(newSize: number) {
    if (newSize === itemsPerPage) return;
    
    manuallySetPageSize = true;  // Mark that size was manually set
    const currentFirstItem = (currentPage - 1) * itemsPerPage;
    currentPage = Math.floor(currentFirstItem / newSize) + 1;
    itemsPerPage = newSize;
    loadPage(currentPage);
  }

  // Add this function to reset manual page size flag
  function resetPageSizeFlag() {
    manuallySetPageSize = false;
  }

  // Add near the top with other state variables
  let nextRandomIndexes = $state<number[]>([]);

  // Update getRandomIndexes to be more efficient
  function getRandomIndexes(count: number, max: number): number[] {
    const indexes = new Set<number>();
    while (indexes.size < count) {
      indexes.add(Math.floor(Math.random() * max));
    }
    return Array.from(indexes);
  }

  // Add function to prefetch next random batch
  function prefetchNextRandomBatch() {
    nextRandomIndexes = getRandomIndexes(itemsPerPage, TOTAL_ITEMS);
    // Prefetch the images
    nextRandomIndexes.forEach(index => {
      const img = new Image();
      img.src = getImageUrl(index);
    });
  }
  
  // Update showNoLiners to clear filters
  function showNoLiners() {
    currentView = 'noliners';
    randomMode = false;
    currentPage = 1;
    filteredTotalItems = noLinerIndices.length;
    // Clear filters when entering no-liner mode
    activeFilters = [];
    pendingFilters = [];
  }

  // Add effect to handle page changes for no-liners
  $effect(() => {
    if (currentView === 'noliners' && !isLoading) {
      const start = (currentPage - 1) * itemsPerPage;
      const end = Math.min(start + itemsPerPage, noLinerIndices.length);
      const pageIndexes = noLinerIndices.slice(start, end);
      
      filteredTotalItems = noLinerIndices.length;
      items = pageIndexes.map(index => ({
        id: index,
        imageUrl: getImageUrl(index),
        properties: allMetadata[index]?.properties || {
          colors: [],
          distributions: [],
          multipliers: [],
          rotations: []
        }
      }));

      // Prefetch adjacent pages
      prefetchAdjacentPages(noLinerIndices);
    }
  });

  // Update loadRandomItems to clear filters
  async function loadRandomItems(useNextBatch: boolean = false) {
    if (isLoading) return;
    
    try {
      isLoading = true;
      currentView = 'random';
      randomMode = true;
      // Clear filters when entering random mode
      activeFilters = [];
      pendingFilters = [];
      
      // Use prefetched batch if available and requested
      let randomIndexes: number[];
      if (useNextBatch && nextRandomIndexes.length === itemsPerPage) {
        randomIndexes = nextRandomIndexes;
      } else {
        randomIndexes = getRandomIndexes(itemsPerPage, TOTAL_ITEMS);
      }

      items = randomIndexes.map(index => ({
        id: index,
        imageUrl: getImageUrl(index),
        properties: {
          colors: [],
          distributions: [],
          multipliers: [],
          rotations: []
        }
      }));

      // Prefetch next batch
      prefetchNextRandomBatch();
    } finally {
      isLoading = false;
    }
  }

  // Update exitRandomMode to reset view
  function exitRandomMode() {
    currentView = 'all';
    randomMode = false;
    currentPage = 1;
    loadPage(1);
  }

  // Update handleIdSearch to reset view
  function handleIdSearch(value: string) {
    currentView = 'all';
    pendingFilters = [];
    activeFilters = [];
    idSearch = value.trim();
    currentPage = 1;
    resetPageSizeFlag();
  }

  async function prefetchAdjacentPages(sourceIndexes?: number[]) {
    if (!browser) return;

    // Calculate ranges for prev and next pages
    const prevStart = Math.max(0, (currentPage - 2) * itemsPerPage);
    const nextEnd = Math.min(
      sourceIndexes ? sourceIndexes.length : TOTAL_ITEMS, 
      (currentPage + 1) * itemsPerPage
    );

    // Get indexes to prefetch
    let indexesToPrefetch: number[];
    if (sourceIndexes) {
      // If we have source indexes (from search), use those
      indexesToPrefetch = sourceIndexes.slice(prevStart, nextEnd);
    } else {
      // Otherwise generate sequence
      indexesToPrefetch = Array.from(
        { length: nextEnd - prevStart },
        (_, i) => prevStart + i
      );
    }

    // Filter out current page indexes
    const currentStart = (currentPage - 1) * itemsPerPage;
    const currentEnd = currentStart + itemsPerPage;
    indexesToPrefetch = indexesToPrefetch.filter(i => 
      i < currentStart || i >= currentEnd
    );

    // Prefetch images
    indexesToPrefetch.forEach(index => {
      const img = new Image();
      img.src = getImageUrl(index);
    });
  }

  // Add drawer state
  let isDrawerOpen = $state(false);

  // Add derived state for image resolution
  let imageResolution = $derived(() => {
    if (itemsPerPage === 1) return 1024;
    if (itemsPerPage <= 16) return 256;
    return 128;
  });

  // Add keyboard handler
  function handleKeydown(event: KeyboardEvent) {
    // Only handle if not in an input field
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement || 
        event.target instanceof HTMLSelectElement) {
      return;
    }

    if (event.key.toLowerCase() === 'r') {
      if (!randomMode) {
        loadRandomItems(false);
      } else {
        loadRandomItems(true);
      }
    } else if (event.key.toLowerCase() === 'n') {
      showNoLiners();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // Don't handle arrow keys in random mode since it doesn't use pagination
      if (randomMode) return;
      
      if (event.key === 'ArrowLeft' && currentPage > 1) {
        currentPage = currentPage - 1;
      } else if (event.key === 'ArrowRight' && currentPage < totalPages) {
        currentPage = currentPage + 1;
      }
    } else if (event.key.toLowerCase() === 'e') {
      isDrawerOpen = !isDrawerOpen;
    }
  }

  onMount(() => {
    loadMetadata();
    // Set initial page size to 25
    itemsPerPage = 25;
    displayItemsPerPage = 25;
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeydown);
    // Prefetch first random batch
    prefetchNextRandomBatch();

    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</svelte:head>

<div class="page-container">
  {#if !isDrawerOpen}
    <button 
      class="drawer-toggle" 
      onclick={() => isDrawerOpen = !isDrawerOpen}
      aria-label="open controls"
    >
      <span class="shortcut">e</span>xtras →
    </button>
  {/if}

  <div class="drawer" class:open={isDrawerOpen}>
    <div class="drawer-content">
      <button 
        class="drawer-close" 
        onclick={() => isDrawerOpen = false}
        aria-label="close controls"
      >
        ×
      </button>
      
      <div class="drawer-section">
        <h3>search</h3>
        <div class="id-search">
          <input
            type="text"
            placeholder="search by id"
            bind:value={idSearch}
            oninput={(e) => handleIdSearch(e.currentTarget.value)}
          />
        </div>
      </div>

      <div class="drawer-section">
        <h3>filters</h3>
        <div class="filters">
          {#if pendingFilters.length > 0}
            <div class="filter-table">
              <div class="filter-headers">
                {#each filterOptions as option}
                  <div class="filter-header">{option.label}</div>
                {/each}
                <div class="filter-header"> </div>
              </div>
              
              {#each pendingFilters as filter, index}
                <div class="filter-row">
                  {#each filterOptions as option}
                    <div class="filter-cell">
                      <select 
                        value={getFilterValue(filter, option.property)}
                        onchange={(e) => {
                          const newValue = e.currentTarget.value;
                          const updatedFilter = setFilterValue(filter, option.property, newValue);
                          pendingFilters = pendingFilters.map((f, i) => 
                            i === index ? updatedFilter : f
                          );
                        }}
                      >
                        {#each getValuesForProperty(option.property) as value}
                          <option value={value}>{value}</option>
                        {/each}
                      </select>
                    </div>
                  {/each}
                  <div class="filter-cell">
                    <button class="remove-button" onclick={() => removeFilter(index)}>×</button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <div class="add-filter-container">
            <button 
              class="add-filter-button" 
              onclick={addFilter}
              disabled={pendingFilters.length >= MAX_FILTERS}
              aria-label="add filter"
            >
              +
            </button>
            <span class="filter-count">{pendingFilters.length}/{MAX_FILTERS}</span>
          </div>

          {#if pendingFilters.length > 0}
            <div class="filter-actions">
              <button 
                onclick={applyFilters}
                disabled={isApplyingFilters || pendingFilters.every(f => 
                  f.color === 'ANY' && 
                  f.distribution === 'ANY' && 
                  f.multiplier === 'ANY' && 
                  f.rotation === 'ANY'
                )}
                class="primary"
              >
                {isApplyingFilters ? 'applying...' : 'apply filters'}
              </button>
              <button onclick={clearFilters}>
                clear all
              </button>
            </div>
          {/if}

          <div class="filter-results">
            {#if activeFilters.length > 0}
              <p>Found {filteredTotalItems.toLocaleString()} items</p>
            {/if}
          </div>
        </div>
      </div>

      <div class="drawer-section">
        <h3>random</h3>
        <div class="random-section">
          {#if !randomMode}
            <button 
              class="random-button" 
              onclick={() => loadRandomItems(false)}
            >
              show {itemsPerPage} <span class="shortcut">r</span>andom unsigs
            </button>
          {:else}
            <div class="random-buttons">
              <button 
                class="random-button" 
                onclick={() => loadRandomItems(true)}
              >
                new <span class="shortcut">r</span>andom set
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

      <div class="drawer-section">
        <h3>no-liners</h3>
        <div class="no-liner-section">
          <button 
            class="no-liner-button" 
            onclick={showNoLiners}
          >
            show <span class="shortcut">n</span>o-liners
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="main-content">
    <div class="grid" style="--grid-size: {gridSize}" data-resolution={imageResolution}>
      {#if isLoading}
        <div class="loading-overlay">
          <div class="loading-dialog">
            loading...
          </div>
        </div>
      {/if}
      
      {#if items.length > 0}
        {#each items as item}
          <a href="/nft/{item.id}" class="grid-item">
            <img src={item.imageUrl} alt={`NFT ${item.id}`} loading="lazy" />
            <div class="overlay">
              <span class="index">#{item.id.toString().padStart(5, '0')}</span>
            </div>
          </a>
        {/each}
      {:else if !isLoading}
        <div class="empty-state">
          <p>no items found</p>
        </div>
      {/if}
    </div>

    <div class="pagination-controls" class:hidden={randomMode}>
      <div class="pagination">
        <button 
          disabled={currentPage === 1} 
          onclick={() => {
            if (currentPage > 1) {
              currentPage = currentPage - 1;
            }
          }}
        >
          ←
        </button>
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
        <button 
          disabled={currentPage === totalPages} 
          onclick={() => {
            if (currentPage < totalPages) {
              currentPage = currentPage + 1;
            }
          }}
        >
          →
        </button>
      </div>

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
            const value = parseInt(target.value);
            if (!isNaN(value)) {
              displayItemsPerPage = PAGE_SIZES[value];
            }
          }}
          onchange={(e) => {
            const target = e.target as HTMLInputElement;
            const value = parseInt(target.value);
            if (!isNaN(value)) {
              updateItemsPerPage(PAGE_SIZES[value]);
              displayItemsPerPage = PAGE_SIZES[value];
            }
          }}
        />
      </div>
    </div>
  </div>
</div>

<style>
  :global(*) {
    font-family: 'JetBrains Mono', monospace;
  }

  .grid {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--grid-size), 1fr);
    gap: 0.5rem;
    width: 70vh;
    height: 70vh;
    margin: 0 auto;
    min-height: 200px;
    min-width: 200px;
    max-width: 100%;
  }

  .grid-item {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    width: 100%;
    height: auto;
  }

  /* Scale grid items based on resolution and container size */
  .grid[data-resolution="1024"] {
    --item-base-size: calc(70vh / var(--grid-size));
  }

  .grid[data-resolution="256"] {
    --item-base-size: calc(70vh / var(--grid-size));
  }

  .grid[data-resolution="128"] {
    --item-base-size: calc(70vh / var(--grid-size));
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

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  input[type="number"] {
    -moz-appearance: textfield;
  }

  .filters {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .filter-table {
    width: 85%;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .filter-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) 32px;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border-color);
  }

  .filter-headers {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) 32px;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #f5f5f5;
    border-bottom: 1px solid var(--border-color);
  }

  .filter-header {
    text-align: center;
  }

  .filter-cell select {
    width: 100%;
    padding: 0.25rem;
    font-size: 0.75rem;
    text-align: center;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: white;
  }

  .remove-button {
    padding: 0;
    width: 20px;
    height: 20px;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: white;
    cursor: pointer;
    margin: 0 auto;
    transition: all 0.2s ease;
  }

  .remove-button:hover {
    background: #e6a5a5;  /* desaturated red */
    border-color: #e6a5a5;
    color: white;
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

  .pagination-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin: 0.75rem auto;
    width: 100%;
    max-width: 800px;
  }

  .items-per-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .items-per-page input[type="range"] {
    width: 100px;
  }

  .items-per-page span {
    font-size: 0.875rem;
    color: #666;
  }

  .filter-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 0.25rem auto;
    width: 100%;
    max-width: 800px;
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
    margin-top: 0.125rem;
  }

  .filter-results p {
    margin: 0;
  }

  .add-filter-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    margin: 0.125rem 0;
    width: 100%;
  }

  .add-filter-button {
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 50%;
    background: white;
    border: 1px solid var(--border-color);
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-filter-button:hover:not(:disabled) {
    background: #a5e6b7;  /* desaturated green */
    border-color: #a5e6b7;
    color: white;
    transform: scale(1.1);
  }

  .add-filter-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .filter-count {
    font-size: 0.75rem;
    color: #666;
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

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(2px);
  }

  .loading-dialog {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    font-size: 1rem;
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: #666;
  }

  .page-container {
    position: relative;
    min-height: 100vh;
  }

  .drawer-toggle {
    position: fixed;
    top: 50%;
    left: 1rem;
    transform: translateY(-50%);
    z-index: 1000;
    padding: 0.75rem 1.25rem;
    border-radius: 2rem;
    background: white;
    border: 1px solid var(--border-color);
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    width: auto;
    height: auto;
  }

  .drawer-toggle:hover {
    background: #f5f5f5;
  }

  .drawer {
    position: fixed;
    top: 50%;
    left: 0;
    transform: translate(-100%, -50%);
    height: auto;
    max-height: 90vh;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 0 8px 8px 0;
    transition: all 0.3s ease;
    z-index: 999;
    overflow-y: auto;
  }

  .drawer.open {
    transform: translate(0, -50%);
  }

  .drawer-close {
    position: absolute;
    right: -24px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    border: 1px solid var(--border-color);
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;
    color: #666;
    z-index: 1000;
  }

  .drawer-close:hover {
    background: #f5f5f5;
    color: #333;
  }

  .drawer-content {
    position: relative;
    padding: 1.5rem;
    width: 400px;
  }

  .drawer-section {
    margin-bottom: 2rem;
  }

  .drawer-section h3 {
    font-size: 0.875rem;
    text-transform: lowercase;
    color: #666;
    margin-bottom: 1rem;
  }

  .main-content {
    padding-left: 4rem;
    transition: padding-left 0.3s ease;
  }

  .drawer.open + .main-content {
    padding-left: calc(440px + 4rem);
  }

  @media (max-width: 768px) {
    .drawer {
      width: 100%;
      top: 0;
      transform: translateX(-100%);
      height: 100vh;
      max-height: 100vh;
      border-radius: 0;
    }

    .drawer.open {
      transform: translateX(0);
    }

    .drawer-content {
      width: 100%;
    }

    .drawer-close {
      position: fixed;
      right: 1rem;
      top: 1rem;
      transform: none;
    }

    .drawer.open + .main-content {
      padding-left: 4rem;
    }
  }

  .no-liner-section {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .no-liner-button {
    background-color: var(--primary-color, #4a90e2);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .no-liner-button:hover {
    background-color: var(--primary-color-hover, #357abd);
  }

  .shortcut {
    position: relative;
    display: inline-block;
    font-weight: 500;
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
    animation: rainbow-pulse 6s infinite;
    color: inherit;
  }

  .shortcut.animating {
    background: linear-gradient(
      var(--gradient-angle, 0deg),
      #ff0000,
      #ff8000,
      #ffff00,
      #00ff00,
      #00ffff,
      #0000ff,
      #8000ff,
      #ff0080,
      #ff0000
    );
    background-size: 200% 200%;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }

  @property --gradient-angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }

  @keyframes rainbow-pulse {
    0%, 45%, 100% {
      background: none;
      color: inherit;
    }
    50%, 95% {
      animation: gradient-rotate 3s linear;
      background: linear-gradient(
        var(--gradient-angle, 0deg),
        #ff3d3d,    /* Bright red */
        #ff9f1a,    /* Bright orange */
        #ffff00,    /* Bright yellow */
        #4dff4d,    /* Bright green */
        #00ffff,    /* Bright cyan */
        #4d4dff,    /* Bright blue */
        #ff1aff,    /* Bright magenta */
        #ff3d3d     /* Back to bright red */
      );
      background-size: 200% 200%;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      text-shadow: 0 0 2px rgba(255, 255, 255, 0.2);
    }
  }

  @keyframes gradient-rotate {
    0% {
      --gradient-angle: 0deg;
    }
    100% {
      --gradient-angle: 360deg;
    }
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .pagination button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    font-size: 1.25rem;
    border-radius: 4px;
  }

  .pagination span {
    display: flex;
    align-items: center;
    height: 32px;
  }

  .pagination input[type="number"] {
    height: 32px;
    text-align: center;
    padding: 0 0.5rem;
  }
</style> 