<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  
  const { data } = $props<{data: PageData}>();
  
  let apiDbInfo = $state({
    version: '',
    loading: true,
    error: null as string | null
  });
  
  let tableInfo = $state({
    tables: [] as any[],
    loading: false,
    error: null as string | null
  });
  
  async function fetchTables() {
    tableInfo.loading = true;
    tableInfo.error = null;
    
    try {
      const response = await fetch('/api/db/tables');
      const result = await response.json();
      
      if (result.success) {
        tableInfo.tables = result.tables;
      } else {
        tableInfo.error = result.message || 'Unknown error';
      }
    } catch (error) {
      tableInfo.error = error instanceof Error ? error.message : 'Failed to fetch table information';
    } finally {
      tableInfo.loading = false;
    }
  }
  
  onMount(async () => {
    try {
      const response = await fetch('/api/db');
      const result = await response.json();
      
      if (result.success) {
        apiDbInfo.version = result.version;
      } else {
        apiDbInfo.error = result.message || 'Unknown error';
      }
    } catch (error) {
      apiDbInfo.error = error instanceof Error ? error.message : 'Failed to fetch database info';
    } finally {
      apiDbInfo.loading = false;
    }
  });
</script>

<div class="container mx-auto py-8 px-4">
  <h1 class="text-2xl font-bold mb-6">database connection</h1>
  
  <div class="grid md:grid-cols-2 gap-6 mb-8">
    <!-- Server Load Data -->
    <div class="bg-white shadow-md rounded p-6">
      <h2 class="text-xl font-semibold mb-4">server load data</h2>
      
      {#if data.success}
        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold mb-2">postgresql version</h3>
            <div class="bg-gray-100 p-3 rounded font-mono text-sm">
              {data.version}
            </div>
          </div>
          
          <div class="pt-4">
            <p class="text-sm text-gray-600">
              successfully loaded via +page.server.ts load function
            </p>
          </div>
        </div>
      {:else}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>error connecting to database: {data.message}</p>
        </div>
      {/if}
    </div>
    
    <!-- API Endpoint Data -->
    <div class="bg-white shadow-md rounded p-6">
      <h2 class="text-xl font-semibold mb-4">api endpoint data</h2>
      
      {#if apiDbInfo.loading}
        <div class="flex justify-center">
          <div class="animate-pulse">loading database information...</div>
        </div>
      {:else if apiDbInfo.error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>error connecting to database: {apiDbInfo.error}</p>
        </div>
      {:else}
        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold mb-2">postgresql version</h3>
            <div class="bg-gray-100 p-3 rounded font-mono text-sm">
              {apiDbInfo.version}
            </div>
          </div>
          
          <div class="pt-4">
            <p class="text-sm text-gray-600">
              successfully fetched via +server.ts api endpoint
            </p>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Table Information Section -->
  <div class="bg-white shadow-md rounded p-6 mb-8">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">database tables</h2>
      <button 
        class="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded"
        onclick={fetchTables}
        disabled={tableInfo.loading}
      >
        {tableInfo.loading ? 'loading...' : 'fetch tables'}
      </button>
    </div>
    
    {#if tableInfo.loading}
      <div class="flex justify-center py-8">
        <div class="animate-pulse">loading table information...</div>
      </div>
    {:else if tableInfo.error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>error fetching tables: {tableInfo.error}</p>
      </div>
    {:else if tableInfo.tables.length === 0}
      <div class="text-center py-8 text-gray-500">
        <p>click the button above to fetch database tables</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse">
          <thead>
            <tr class="bg-gray-100">
              <th class="py-2 px-4 text-left border-b">schema</th>
              <th class="py-2 px-4 text-left border-b">table name</th>
              <th class="py-2 px-4 text-left border-b">columns</th>
            </tr>
          </thead>
          <tbody>
            {#each tableInfo.tables as table}
              <tr class="hover:bg-gray-50">
                <td class="py-2 px-4 border-b font-mono text-sm">{table.table_schema}</td>
                <td class="py-2 px-4 border-b font-mono text-sm">{table.table_name}</td>
                <td class="py-2 px-4 border-b font-mono text-sm">{table.column_count}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div> 