<script lang="ts">
  export let currentPage = 1;
  export let totalPages = 1;
  export let itemsPerPage = 25;
  export let displayItemsPerPage = 25;
  export let onPageChange = (page: number) => {};
  export let onItemsPerPageChange = (size: number) => {};

  const PAGE_SIZES = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256];
</script>

<div class="pagination-controls">
  <div class="pagination">
    <button
      disabled={currentPage === 1}
      onclick={() => {
        if (currentPage > 1) {
          onPageChange(currentPage - 1);
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
          onPageChange(value);
        }
      }}
    />
    <span>of {totalPages}</span>
    <button
      disabled={currentPage === totalPages}
      onclick={() => {
        if (currentPage < totalPages) {
          onPageChange(currentPage + 1);
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
          onItemsPerPageChange(PAGE_SIZES[value]);
          displayItemsPerPage = PAGE_SIZES[value];
        }
      }}
    />
  </div>
</div>

<style>
  .pagination-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    margin: var(--space-md) auto;
    width: 100%;
    max-width: 800px;
    padding: var(--space-sm);
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
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
    border: 1px solid var(--border-default);
    background: var(--bg-raised);
    color: var(--text-primary);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .pagination button:hover:not(:disabled) {
    background: var(--bg-overlay);
    border-color: var(--border-focus);
  }

  .pagination button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .pagination span {
    display: flex;
    align-items: center;
    height: 32px;
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

  .pagination input[type="number"] {
    height: 32px;
    width: 70px;
    text-align: center;
    padding: 0 var(--space-sm);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    background: var(--bg-raised);
    color: var(--text-primary);
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--text-sm);
  }

  .pagination input[type="number"]:focus {
    outline: none;
    border-color: var(--border-focus);
  }

  .items-per-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .items-per-page input[type="range"] {
    width: 100px;
    accent-color: var(--accent);
  }

  .items-per-page span {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type="number"] {
    -moz-appearance: textfield;
  }
</style>
