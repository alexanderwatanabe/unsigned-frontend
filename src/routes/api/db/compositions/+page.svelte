<script lang="ts">
  import { onMount } from 'svelte';
  
  // Types for our composition data
  type GridPosition = {
    unsigIndex: number;
    row: number;
    column: number;
  };
  
  type Composition = {
    id: number;
    transactionId: string;
    createdAt: string;
    positions?: GridPosition[];
  };
  
  // Form state
  let transactionId = $state('');
  let gridPositions = $state<GridPosition[]>([
    { unsigIndex: 1, row: 0, column: 0 },
    { unsigIndex: 2, row: 0, column: 1 },
    { unsigIndex: 3, row: 1, column: 0 }
  ]);
  
  // UI state
  let savingState = $state({
    loading: false,
    success: false,
    error: null as string | null
  });
  
  let fetchState = $state({
    loading: false,
    error: null as string | null
  });
  
  let compositions = $state<Composition[]>([]);
  let selectedComposition = $state<Composition | null>(null);
  
  // Add a new position to the grid
  function addGridPosition() {
    gridPositions = [
      ...gridPositions, 
      { 
        unsigIndex: 0, 
        row: 0, 
        column: 0 
      }
    ];
  }
  
  // Remove a position from the grid
  function removeGridPosition(index: number) {
    gridPositions = gridPositions.filter((_, i) => i !== index);
  }
  
  // Update a position value
  function updatePosition(index: number, field: keyof GridPosition, value: number) {
    const updatedPositions = [...gridPositions];
    updatedPositions[index] = {
      ...updatedPositions[index],
      [field]: parseInt(value.toString())
    };
    gridPositions = updatedPositions;
  }
  
  // Save a composition to the database
  async function saveComposition() {
    if (!transactionId.trim()) {
      savingState.error = 'transaction id is required';
      return;
    }
    
    savingState.loading = true;
    savingState.error = null;
    savingState.success = false;
    
    try {
      const response = await fetch('/api/db/compositions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionId,
          positions: gridPositions
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        savingState.success = true;
        // Reset form after successful save
        transactionId = '';
        // Refresh the compositions list
        fetchCompositions();
      } else {
        savingState.error = result.message || 'failed to save composition';
      }
    } catch (error) {
      savingState.error = error instanceof Error ? error.message : 'an error occurred';
    } finally {
      savingState.loading = false;
    }
  }
  
  // Fetch all compositions
  async function fetchCompositions() {
    fetchState.loading = true;
    fetchState.error = null;
    
    try {
      const response = await fetch('/api/db/compositions');
      const result = await response.json();
      
      if (result.success) {
        compositions = result.compositions;
      } else {
        fetchState.error = result.message || 'failed to fetch compositions';
      }
    } catch (error) {
      fetchState.error = error instanceof Error ? error.message : 'an error occurred';
    } finally {
      fetchState.loading = false;
    }
  }
  
  // Fetch a specific composition by transaction ID
  async function fetchComposition(transactionId: string) {
    fetchState.loading = true;
    fetchState.error = null;
    selectedComposition = null;
    
    try {
      const response = await fetch(`/api/db/compositions?transactionId=${transactionId}`);
      const result = await response.json();
      
      if (result.success) {
        selectedComposition = result.composition;
      } else {
        fetchState.error = result.message || 'failed to fetch composition';
      }
    } catch (error) {
      fetchState.error = error instanceof Error ? error.message : 'an error occurred';
    } finally {
      fetchState.loading = false;
    }
  }
  
  // Create the database schema on first load
  async function createSchema() {
    try {
      const response = await fetch('/api/db/schema', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        console.log('schema created successfully');
        // Fetch compositions after schema is created
        fetchCompositions();
      } else {
        console.error('schema creation failed:', result.message);
      }
    } catch (error) {
      console.error('schema creation error:', error);
    }
  }
  
  onMount(() => {
    createSchema();
  });
</script>

<div class="container mx-auto py-8 px-4">
  <h1 class="text-2xl font-bold mb-6">compositions database</h1>
  
  <div class="grid md:grid-cols-2 gap-8">
    <!-- Create Composition Form -->
    <div class="bg-white shadow-md rounded p-6">
      <h2 class="text-xl font-semibold mb-4">create new composition</h2>
      
      <div class="space-y-4 mb-6">
        <div>
          <label class="block text-sm font-medium mb-1">transaction id</label>
          <input 
            type="text" 
            bind:value={transactionId}
            class="w-full p-2 border rounded"
            placeholder="enter transaction id"
          />
        </div>
        
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium">grid positions</label>
            <button 
              onclick={addGridPosition}
              class="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
            >
              + add position
            </button>
          </div>
          
          {#each gridPositions as position, i}
            <div class="flex gap-2 mb-2 p-2 bg-gray-50 rounded">
              <div class="flex-1">
                <label class="block text-xs mb-1">unsig index</label>
                <input 
                  type="number" 
                  min="0"
                  value={position.unsigIndex}
                  oninput={(e) => updatePosition(i, 'unsigIndex', parseInt(e.currentTarget.value || '0'))}
                  class="w-full p-1 border rounded text-sm"
                />
              </div>
              <div class="flex-1">
                <label class="block text-xs mb-1">row</label>
                <input 
                  type="number" 
                  min="0"
                  value={position.row}
                  oninput={(e) => updatePosition(i, 'row', parseInt(e.currentTarget.value || '0'))}
                  class="w-full p-1 border rounded text-sm"
                />
              </div>
              <div class="flex-1">
                <label class="block text-xs mb-1">column</label>
                <input 
                  type="number" 
                  min="0"
                  value={position.column}
                  oninput={(e) => updatePosition(i, 'column', parseInt(e.currentTarget.value || '0'))}
                  class="w-full p-1 border rounded text-sm"
                />
              </div>
              <button 
                onclick={() => removeGridPosition(i)}
                class="mt-5 text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          {/each}
        </div>
      </div>
      
      {#if savingState.error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{savingState.error}</p>
        </div>
      {/if}
      
      {#if savingState.success}
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>composition saved successfully</p>
        </div>
      {/if}
      
      <button 
        onclick={saveComposition}
        disabled={savingState.loading}
        class="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 px-4 rounded disabled:opacity-50"
      >
        {savingState.loading ? 'saving...' : 'save composition'}
      </button>
    </div>
    
    <!-- View Compositions -->
    <div class="bg-white shadow-md rounded p-6">
      <h2 class="text-xl font-semibold mb-4">saved compositions</h2>
      
      {#if fetchState.loading}
        <div class="flex justify-center py-4">
          <div class="animate-pulse">loading compositions...</div>
        </div>
      {:else if fetchState.error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{fetchState.error}</p>
        </div>
      {:else if compositions.length === 0}
        <div class="text-center py-8 text-gray-500">
          <p>no compositions found</p>
          <p class="text-sm mt-2">create a new composition to see it here</p>
        </div>
      {:else}
        <div class="mb-6">
          <h3 class="text-lg font-medium mb-2">all compositions</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse">
              <thead>
                <tr class="bg-gray-100">
                  <th class="py-2 px-3 text-left border-b text-xs">id</th>
                  <th class="py-2 px-3 text-left border-b text-xs">transaction id</th>
                  <th class="py-2 px-3 text-left border-b text-xs">created</th>
                  <th class="py-2 px-3 text-left border-b text-xs">action</th>
                </tr>
              </thead>
              <tbody>
                {#each compositions as comp}
                  <tr class="hover:bg-gray-50">
                    <td class="py-2 px-3 border-b font-mono text-xs">{comp.id}</td>
                    <td class="py-2 px-3 border-b font-mono text-xs truncate max-w-[150px]">{comp.transactionId}</td>
                    <td class="py-2 px-3 border-b font-mono text-xs">{new Date(comp.createdAt).toLocaleString()}</td>
                    <td class="py-2 px-3 border-b">
                      <button 
                        onclick={() => fetchComposition(comp.transactionId)}
                        class="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                      >
                        view
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
        
        {#if selectedComposition}
          <div>
            <h3 class="text-lg font-medium mb-2">composition details</h3>
            <div class="bg-gray-50 p-3 rounded">
              <p class="text-sm mb-1">
                <span class="font-medium">transaction id:</span> 
                <span class="font-mono">{selectedComposition.transactionId}</span>
              </p>
              <p class="text-sm mb-3">
                <span class="font-medium">created:</span> 
                <span class="font-mono">{new Date(selectedComposition.createdAt).toLocaleString()}</span>
              </p>
              
              <h4 class="font-medium text-sm mb-2">positions:</h4>
              {#if selectedComposition.positions && selectedComposition.positions.length > 0}
                <div class="grid grid-cols-3 gap-2">
                  {#each selectedComposition.positions as pos}
                    <div class="bg-white p-2 rounded border text-xs">
                      <div><span class="font-medium">unsig:</span> {pos.unsigIndex}</div>
                      <div><span class="font-medium">position:</span> ({pos.row}, {pos.column})</div>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-sm text-gray-500">no positions found</p>
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div> 