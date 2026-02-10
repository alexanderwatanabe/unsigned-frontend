<script lang="ts">
  import { onMount } from 'svelte';
  import type { UnsigMetadata, RawUnsigMetadata } from '$lib/types';
  import { convertRawMetadata } from '$lib/types';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import noLinersData from '$assets/noliners.json';
  import monochromesData from '$assets/monochromes.json';
  import UnsigGrid from '$lib/components/UnsigGrid.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { getUnsigMetadata, unsigs } from '$lib/unsigs';
  import { createWorkerPool } from '$lib/unsig/worker-pool';
  
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
  let monochromeIndices = $state<number[]>([]);

  // Add state to track current view
  let currentView = $state<'all' | 'random' | 'noliners' | 'monochromes'>('all');

  // Random seed for reproducible random views
  let randomSeed = $state<number | null>(null);

  // Add animation state
  let activeAnimation = $state<string | null>(null);

  // Worker pool for client-side image generation
  let workerPool: ReturnType<typeof createWorkerPool> | null = null;

  function getWorkerPool() {
    if (!workerPool) {
      workerPool = createWorkerPool();
    }
    return workerPool;
  }

  function generateImages(pageIndexes: number[], dim: number) {
    if (!browser) return;
    const pool = getWorkerPool();
    const unsigData = pageIndexes
      .map(i => unsigs[i.toString()])
      .filter(Boolean);

    pool.generateBatch(unsigData, dim, (index, url) => {
      items = items.map(item =>
        item.id === index ? { ...item, imageUrl: url } : item
      );
    });
  }

  // Update loadMetadata to use imported no-liners data
  async function loadMetadata() {
    if (!browser) return;
    
    try {
      // Get metadata directly from the imported function
      const metadata = getUnsigMetadata();
      noLinerIndices = noLinersData;
      monochromeIndices = monochromesData;
      
      // Convert metadata to proper types
      allMetadata = metadata;
      
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
      isInitialized = false;
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
      
      // Update items with empty imageUrl (shows black), then generate
      const dim = getImageResolution();
      items = pageIndexes.map(index => ({
        id: index,
        imageUrl: '',
        properties: allMetadata[index]?.properties || {
          colors: [],
          distributions: [],
          multipliers: [],
          rotations: []
        }
      }));

      // Use queueMicrotask to run generation outside the $effect tracking scope
      queueMicrotask(() => generateImages(pageIndexes, dim));
    } catch (error) {
      console.error('Error in filter effect:', error);
    } finally {
      isLoading = false;
    }
  });

  // Functions
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
    syncUrlParams();
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
      syncUrlParams();
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
    syncUrlParams();
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
    // loadPage already calls syncUrlParams
    loadPage(currentPage);
  }

  // Add this function to reset manual page size flag
  function resetPageSizeFlag() {
    manuallySetPageSize = false;
  }

  // Add near the top with other state variables
  let nextRandomIndexes = $state<number[]>([]);

  // Update getRandomIndexes to be more efficient
  function getRandomIndexes(count: number, max: number, seed?: number): number[] {
    const rng = seed !== undefined ? mulberry32(seed) : Math.random;
    const indexes = new Set<number>();
    while (indexes.size < count) {
      indexes.add(Math.floor(rng() * max));
    }
    return Array.from(indexes);
  }

  // Prefetch next random batch (indexes only, images are generated client-side)
  function prefetchNextRandomBatch() {
    nextRandomIndexes = getRandomIndexes(itemsPerPage, TOTAL_ITEMS);
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
    syncUrlParams();
  }

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

      // Generate a new seed for this random view
      const seed = Math.floor(Math.random() * 2147483647);
      randomSeed = seed;

      // Use prefetched batch if available and requested
      let randomIndexes: number[];
      if (useNextBatch && nextRandomIndexes.length === itemsPerPage) {
        randomIndexes = nextRandomIndexes;
      } else {
        randomIndexes = getRandomIndexes(itemsPerPage, TOTAL_ITEMS, seed);
      }

      const dim = getImageResolution();
      items = randomIndexes.map(index => ({
        id: index,
        imageUrl: '',
        properties: {
          colors: [],
          distributions: [],
          multipliers: [],
          rotations: []
        }
      }));

      generateImages(randomIndexes, dim);
      syncUrlParams();
    } finally {
      isLoading = false;
    }
  }

  // Update exitRandomMode to reset view
  function exitRandomMode() {
    currentView = 'all';
    randomMode = false;
    randomSeed = null;
    currentPage = 1;
    // loadPage calls syncUrlParams
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
    syncUrlParams();
  }

  // Add drawer state
  let isDrawerOpen = $state(false);

  // Add derived state for image resolution
  function getImageResolution(): number {
    if (itemsPerPage === 1) return 1024;
    if (itemsPerPage <= 25) return 512;
    return 128;
  }

  // Seeded PRNG (mulberry32) for reproducible random views
  function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Serialize a filter to URL-friendly string: color.distribution.multiplier.rotation
  function serializeFilter(f: Filter): string {
    return [f.color, f.distribution, f.multiplier, f.rotation].join('.');
  }

  // Deserialize a filter string back to a Filter object
  function deserializeFilter(str: string): Filter {
    const parts = str.split('.');
    const [color, distribution, multiplierStr, rotationStr] = parts;
    return {
      color: color || 'ANY',
      distribution: distribution || 'ANY',
      multiplier: !multiplierStr || multiplierStr === 'ANY' ? 'ANY' : (multiplierStr.includes('.') ? parseFloat(multiplierStr) : parseInt(multiplierStr, 10)),
      rotation: !rotationStr || rotationStr === 'ANY' ? 'ANY' : parseInt(rotationStr, 10)
    };
  }

  // Sync current gallery state to URL search params
  function syncUrlParams() {
    if (!browser) return;
    const params = new URLSearchParams();

    if (currentView !== 'all') params.set('view', currentView);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (itemsPerPage !== 25) params.set('size', String(itemsPerPage));
    if (idSearch) params.set('search', idSearch);
    if (currentView === 'random' && randomSeed !== null) params.set('seed', String(randomSeed));

    activeFilters.forEach(f => {
      params.append('f', serializeFilter(f));
    });

    const qs = params.toString();
    goto(`/gallery${qs ? '?' + qs : ''}`, { replaceState: true, keepFocus: true, noScroll: true });
  }

  // Initialize gallery state from URL search params
  function initFromUrlParams() {
    if (!browser) return;
    const params = new URL(window.location.href).searchParams;

    // Check if there are any params to parse
    if (params.toString() === '') return;

    // Parse size
    const sizeParam = params.get('size');
    if (sizeParam) {
      const size = parseInt(sizeParam, 10);
      if (PAGE_SIZES.includes(size)) {
        itemsPerPage = size;
        displayItemsPerPage = size;
        manuallySetPageSize = true;
      }
    }

    // Parse filters
    const filterParams = params.getAll('f');
    if (filterParams.length > 0) {
      const filters = filterParams.slice(0, MAX_FILTERS).map(deserializeFilter);
      pendingFilters = filters;
      activeFilters = filters.filter(f => !Object.values(f).every(v => v === 'ANY'));
    }

    // Parse search
    const searchParam = params.get('search');
    if (searchParam) {
      idSearch = searchParam;
    }

    // Parse view
    const viewParam = params.get('view');
    if (viewParam === 'random') {
      const seed = params.get('seed') ? parseInt(params.get('seed')!, 10) : Math.floor(Math.random() * 2147483647);
      randomSeed = seed;
      randomMode = true;
      currentView = 'random';
      activeFilters = [];
      pendingFilters = [];

      const randomIndexes = getRandomIndexes(itemsPerPage, TOTAL_ITEMS, seed);
      const dim = getImageResolution();
      items = randomIndexes.map(index => ({
        id: index,
        imageUrl: '',
        properties: { colors: [], distributions: [], multipliers: [], rotations: [] }
      }));
      queueMicrotask(() => generateImages(randomIndexes, dim));
    } else if (viewParam === 'noliners') {
      currentView = 'noliners';
      filteredTotalItems = noLinerIndices.length;
    } else if (viewParam === 'monochromes') {
      currentView = 'monochromes';
      filteredTotalItems = monochromeIndices.length;
    }

    // Parse page (after view so context is set)
    const pageParam = params.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (page > 0) {
        currentPage = page;
      }
    }
  }

  // Update keyboard handler to include vim keys and animations
  function handleKeydown(event: KeyboardEvent) {
    // Only handle if not in an input field
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement || 
        event.target instanceof HTMLSelectElement) {
      return;
    }

    // Handle arrow keys and vim navigation
    switch (event.key.toLowerCase()) {
      case 'arrowleft':
      case 'h':
        event.preventDefault();
        if (!randomMode && currentPage > 1) {
          activeAnimation = 'slide-left';
          currentPage--;
          syncUrlParams();
          setTimeout(() => activeAnimation = null, 300);
        }
        break;

      case 'arrowright':
      case 'l':
        event.preventDefault();
        if (!randomMode && currentPage < totalPages) {
          activeAnimation = 'slide-right';
          currentPage++;
          syncUrlParams();
          setTimeout(() => activeAnimation = null, 300);
        }
        break;
      
      case 'j':
        event.preventDefault();
        const currentIndex = PAGE_SIZES.indexOf(itemsPerPage);
        if (currentIndex > 0) {
          activeAnimation = 'grid-shrink';
          const newSize = PAGE_SIZES[currentIndex - 1];
          displayItemsPerPage = newSize;
          updateItemsPerPage(newSize);
          setTimeout(() => activeAnimation = null, 300);
        }
        break;
      
      case 'k':
        event.preventDefault();
        const nextIndex = PAGE_SIZES.indexOf(itemsPerPage) + 1;
        if (nextIndex < PAGE_SIZES.length) {
          activeAnimation = 'grid-grow';
          const newSize = PAGE_SIZES[nextIndex];
          displayItemsPerPage = newSize;
          updateItemsPerPage(newSize);
          setTimeout(() => activeAnimation = null, 300);
        }
        break;

      // Keep existing shortcuts
      case 'escape':
        if (isDrawerOpen) {
          isDrawerOpen = false;
        } else {
          currentView = 'all';
          randomMode = false;
          randomSeed = null;
          currentPage = 1;
          idSearch = '';
          activeFilters = [];
          pendingFilters = [];
          syncUrlParams();
        }
        break;

      case 'r':
        if (!randomMode) {
          loadRandomItems(false);
        } else {
          loadRandomItems(true);
        }
        break;

      case 'n':
        showNoLiners();
        break;

      case 'm':
        showMonochromes();
        break;

      case 'e':
        isDrawerOpen = !isDrawerOpen;
        break;
    }
  }

  // Add showMonochromes function
  function showMonochromes() {
    currentView = 'monochromes';
    randomMode = false;
    currentPage = 1;
    filteredTotalItems = monochromeIndices.length;
    // Clear filters when entering monochrome mode
    activeFilters = [];
    pendingFilters = [];
    syncUrlParams();
  }

  // Update effect to handle page changes for monochromes
  $effect(() => {
    if ((currentView === 'noliners' || currentView === 'monochromes') && !isLoading) {
      const indices = currentView === 'noliners' ? noLinerIndices : monochromeIndices;
      const start = (currentPage - 1) * itemsPerPage;
      const end = Math.min(start + itemsPerPage, indices.length);
      const pageIndexes = indices.slice(start, end);
      const dim = getImageResolution();

      filteredTotalItems = indices.length;
      items = pageIndexes.map(index => ({
        id: index,
        imageUrl: '',
        properties: allMetadata[index]?.properties || {
          colors: [],
          distributions: [],
          multipliers: [],
          rotations: []
        }
      }));

      queueMicrotask(() => generateImages(pageIndexes, dim));
    }
  });

  onMount(() => {
    loadMetadata().then(() => {
      initFromUrlParams();
    });
    // Set initial page size to 25
    itemsPerPage = 25;
    displayItemsPerPage = 25;
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      workerPool?.destroy();
      workerPool = null;
    };
  });
</script>

<svelte:head>
  <title>gallery | unsigned algorithms</title>
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
        <h3>subcollections</h3>
        <div class="unique-unsigs">
          <div class="top-row">
            <button 
              class="monochrome-button" 
              onclick={showMonochromes}
            >
              <span class="shortcut">m</span>onochromes
            </button>
            <button 
              class="no-liner-button" 
              onclick={showNoLiners}
            >
              <span class="shortcut">n</span>o-liners
            </button>
          </div>
          <button 
            class="random-button" 
            onclick={() => loadRandomItems(randomMode)}
          >
            <span class="shortcut">r</span>andom
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="grid-container">
    <div class="main-content">
      <div class="grid-wrapper" 
           class:animate-left={activeAnimation === 'slide-left'} 
           class:animate-right={activeAnimation === 'slide-right'}
           class:animate-shrink={activeAnimation === 'grid-shrink'}
           class:animate-grow={activeAnimation === 'grid-grow'}>
        <UnsigGrid
          items={items}
          loading={isLoading}
          {gridSize}
          imageResolution={getImageResolution()}
        />
      </div>

      {#if !randomMode}
        <Pagination
          {currentPage}
          {totalPages}
          {itemsPerPage}
          {displayItemsPerPage}
          onPageChange={loadPage}
          onItemsPerPageChange={updateItemsPerPage}
        />
      {/if}
    </div>
  </div>
</div>

<style>
  .page-container {
    position: relative;
    min-height: 100vh;
    background: var(--bg-void);
  }

  /* ── Base form elements ── */
  select {
    padding: 0.5rem;
    border: 1px solid var(--border-default);
    border-radius: 4px;
    background: var(--bg-raised);
    color: var(--text-primary);
    font-family: 'JetBrains Mono', monospace;
  }

  button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-default);
    background: var(--bg-raised);
    color: var(--text-primary);
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
    transition: background 0.15s, border-color 0.15s;
  }

  button:hover:not(:disabled) {
    background: var(--bg-overlay);
    border-color: var(--border-focus);
  }

  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* ── Drawer Toggle ── */
  .drawer-toggle {
    position: fixed;
    top: 50%;
    left: 56px;
    transform: translateY(-50%);
    z-index: 90;
    padding: 0.75rem 1.25rem;
    border-radius: 2rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    font-size: var(--text-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    width: auto;
    height: auto;
    color: var(--text-secondary);
  }

  .drawer-toggle:hover {
    background: var(--bg-raised);
    color: var(--text-primary);
  }

  /* ── Drawer ── */
  .drawer {
    position: fixed;
    top: 50%;
    left: 48px;
    transform: translate(-100%, -50%);
    height: auto;
    max-height: 90vh;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 0 8px 8px 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
    z-index: 90;
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
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: all 0.15s ease;
    color: var(--text-dim);
    z-index: 91;
  }

  .drawer-close:hover {
    background: var(--bg-raised);
    color: var(--text-primary);
  }

  .drawer-content {
    position: relative;
    padding: 1.5rem;
    width: 400px;
  }

  .drawer-section {
    margin-bottom: var(--space-lg);
  }

  .drawer-section h3 {
    font-family: 'Instrument Serif', serif;
    font-size: var(--text-lg);
    text-transform: lowercase;
    color: var(--text-primary);
    margin-bottom: var(--space-md);
    font-weight: 400;
  }

  /* ── Search ── */
  .id-search {
    margin: var(--space-md) auto;
    text-align: center;
  }

  .id-search input {
    width: 200px;
    padding: 0.75rem;
    border: 1px solid var(--border-default);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--text-base);
    text-align: center;
    background: var(--bg-raised);
    color: var(--text-primary);
  }

  .id-search input:focus {
    outline: none;
    border-color: var(--border-focus);
  }

  .id-search input::placeholder {
    color: var(--text-dim);
  }

  /* ── Filters ── */
  .filters {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .filter-table {
    width: 85%;
    border: 1px solid var(--border-default);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .filter-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) 32px;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .filter-headers {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) 32px;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-raised);
    border-bottom: 1px solid var(--border-default);
    color: var(--text-secondary);
    font-size: var(--text-xs);
  }

  .filter-header {
    text-align: center;
  }

  .filter-cell select {
    width: 100%;
    padding: 0.25rem;
    font-size: var(--text-xs);
    text-align: center;
    border: 1px solid var(--border-default);
    border-radius: 4px;
    background: var(--bg-raised);
    color: var(--text-primary);
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
    border: 1px solid var(--border-default);
    background: var(--bg-raised);
    color: var(--text-secondary);
    cursor: pointer;
    margin: 0 auto;
    transition: all 0.15s ease;
  }

  .remove-button:hover {
    background: #5a2020;
    border-color: #7a3030;
    color: var(--text-primary);
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
    background: var(--bg-raised);
    border: 1px solid var(--border-default);
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    color: var(--text-secondary);
  }

  .add-filter-button:hover:not(:disabled) {
    background: var(--accent-dim);
    border-color: var(--border-focus);
    color: var(--accent);
    transform: scale(1.1);
  }

  .add-filter-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .filter-count {
    font-size: var(--text-xs);
    color: var(--text-dim);
  }

  .filter-actions {
    display: flex;
    gap: var(--space-md);
    justify-content: center;
    margin: var(--space-xs) auto;
    width: 100%;
  }

  .filter-actions button.primary {
    background: var(--accent);
    color: var(--bg-void);
    border-color: var(--accent);
  }

  .filter-actions button.primary:hover:not(:disabled) {
    background: var(--text-primary);
  }

  .filter-results {
    text-align: center;
    color: var(--text-secondary);
    margin-top: 0.125rem;
    font-size: var(--text-sm);
  }

  .filter-results p {
    margin: 0;
  }

  /* ── Subcollection Buttons ── */
  .unique-unsigs {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    justify-content: center;
  }

  .unique-unsigs .top-row {
    display: flex;
    gap: var(--space-sm);
    justify-content: center;
  }

  .unique-unsigs .top-row button {
    flex: 1;
    min-width: 120px;
    max-width: 160px;
  }

  .random-button,
  .monochrome-button,
  .no-liner-button {
    background: var(--bg-raised);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 500;
    transition: background 0.15s, border-color 0.15s;
  }

  .random-button:hover,
  .monochrome-button:hover,
  .no-liner-button:hover {
    background: var(--accent-dim);
    border-color: var(--border-focus);
  }

  /* ── Main Content & Grid ── */
  .main-content {
    padding: var(--space-md);
    transition: padding-left 0.3s ease;
  }

  .grid-wrapper {
    width: 100%;
    max-width: min(90vw, 90vh);
    aspect-ratio: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    margin: 0 auto;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .grid-wrapper {
      max-width: 95vw;
      max-height: 95vw;
    }

    .drawer {
      width: 100%;
      top: 0;
      left: 0;
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

    .drawer-toggle {
      left: 0.5rem;
    }
  }

  /* ── Navigation Animations ── */
  .animate-left { animation: slideLeft 0.3s ease-in-out; }
  .animate-right { animation: slideRight 0.3s ease-in-out; }
  .animate-shrink { animation: gridShrink 0.3s ease-in-out; }
  .animate-grow { animation: gridGrow 0.3s ease-in-out; }

  @keyframes slideLeft {
    0% { transform: translateX(0); opacity: 1; }
    15% { transform: translateX(-5px); opacity: 0.9; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideRight {
    0% { transform: translateX(0); opacity: 1; }
    15% { transform: translateX(5px); opacity: 0.9; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes gridShrink {
    0% { transform: scale(1); opacity: 1; }
    15% { transform: scale(0.99); opacity: 0.95; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes gridGrow {
    0% { transform: scale(1); opacity: 1; }
    15% { transform: scale(1.01); opacity: 0.95; }
    100% { transform: scale(1); opacity: 1; }
  }
</style> 