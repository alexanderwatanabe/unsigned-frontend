<script lang="ts">
import type { UnsigMetadata, OwnedUnsig } from '$lib/types';
import { BrowserWalletState } from '@meshsdk/svelte';
import Modal from '$lib/components/Modal.svelte';

// At the top of the script, add console log to verify imports
console.log('CompositionBuilder: BrowserWalletState imported:', typeof BrowserWalletState);

const UNSIGS_POLICY_ID = '0e14267a8020229adc0184dd25fa3174c3f7d6caadcb4425c70e7c04';

// Props
let { 
    mode = 'owned'
} = $props<{
    mode: 'creative' | 'owned';
}>();

// Types
type GridPosition = {
    unsigId: number | null;
    hexAssetName?: string;
    rotation?: number;
    metadata?: UnsigMetadata;
};

type CompositionGrid = GridPosition[][];

// State
let rows = $state(2);
let cols = $state(2);
let grid = $state<CompositionGrid>([]);
let ownedUnsigs = $state<OwnedUnsig[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);
let draggingUnsig = $state<number | null>(null);
let draggingUnsigHex = $state<string | null>(null);
let previewMode = $state(false);
let showTxModal = $state(false);
let txResult = $state<{ hash: string } | null>(null);
let txError = $state<string | null>(null);
let buildingTx = $state(false);

// Initialize grid
$effect(() => {
    grid = Array(rows).fill(null).map(() => 
        Array(cols).fill(null).map(() => ({ 
            unsigId: null, 
            hexAssetName: undefined,
            rotation: 0 
        }))
    );
});

// Add a new effect to log grid changes
$effect(() => {
    console.log('Grid state changed:');
    console.log('Rows:', grid.length);
    console.log('Cols:', grid[0]?.length || 0);
    
    let unsigCount = 0;
    
    // Count and log all Unsigs in the grid
    grid.forEach((row, rowIndex) => {
        if (!row) return;
        
        row.forEach((cell, colIndex) => {
            if (cell && cell.unsigId !== null && cell.unsigId !== undefined) {
                unsigCount++;
                console.log(`  Unsig at [${rowIndex},${colIndex}]: ID=${cell.unsigId}, Rotation=${cell.rotation}, HexName=${cell.hexAssetName || 'undefined'}`);
            }
        });
    });
    
    console.log(`Total Unsigs in grid: ${unsigCount}`);
});

// Define interface for arrangement items
interface ArrangementItem {
    unsigId: number;
    hexAssetName: string;
    row: number;
    col: number;
    rotation: number;
}

// Extract unsig index and hex asset name from asset unit
function extractAssetInfo(unit: string): OwnedUnsig | null {
    try {
        const hexAssetName = unit.slice(UNSIGS_POLICY_ID.length);
        const bytes = new Uint8Array(hexAssetName.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
        const assetName = new TextDecoder().decode(bytes);
        const match = assetName.match(/\d+/);
        if (!match) return null;
        const id = parseInt(match[0], 10);
        return {
            id,
            hexAssetName
        };
    } catch (err) {
        console.error('Error extracting index:', err);
        return null;
    }
}

// Load owned unsigs
$effect(() => {
    if (mode === 'owned' && BrowserWalletState.connected && BrowserWalletState.wallet) {
        loading = true;
        error = null;
        
        interface Asset {
            unit: string;
            quantity: string;
        }
        
        BrowserWalletState.wallet.getAssets()
            .then((assets: Asset[]) => {
                const unsigAssets = assets.filter((asset: Asset) => asset.unit.startsWith(UNSIGS_POLICY_ID));
                ownedUnsigs = unsigAssets
                    .map((asset: Asset) => extractAssetInfo(asset.unit))
                    .filter((unsig): unsig is OwnedUnsig => unsig !== null)
                    .sort((a: OwnedUnsig, b: OwnedUnsig) => a.id - b.id);
            })
            .catch((err: Error) => {
                console.error('Failed to fetch assets:', err);
                error = err.message || 'failed to fetch assets';
                ownedUnsigs = [];
            })
            .finally(() => {
                loading = false;
            });
    }
});

// Update handlers
function addRow() {
    rows++;
    grid = [
        ...grid,
        Array(cols).fill(null).map(() => ({ 
            unsigId: null, 
            hexAssetName: undefined,
            rotation: 0 
        }))
    ];
}

function removeRow() {
    if (rows > 1) {
        rows--;
        grid = grid.slice(0, rows);
    }
}

function addColumn() {
    cols++;
    grid = grid.map(row => [
        ...row, 
        { 
            unsigId: null, 
            hexAssetName: undefined,
            rotation: 0 
        }
    ]);
}

function removeColumn() {
    if (cols > 1) {
        cols--;
        grid = grid.map(row => row.slice(0, cols));
    }
}

function openTxModal() {
    console.log('openTxModal called, mode:', mode);
    console.log('This function is deprecated and will be removed');
}

function clearCell(row: number, col: number) {
    grid[row][col] = { 
        unsigId: null, 
        hexAssetName: undefined,
        rotation: 0 
    };
}

function rotateCell(row: number, col: number) {
    if (grid[row][col].unsigId !== null) {
        const currentRotation = grid[row][col].rotation || 0;
        grid[row][col].rotation = (currentRotation + 90) % 360;
    }
}

// Drag and drop handlers
function startDrag(unsigId: number, hexAssetName: string) {
    draggingUnsig = unsigId;
    draggingUnsigHex = hexAssetName;
}

function onDragOver(event: DragEvent) {
    event.preventDefault();
}

function onDrop(event: DragEvent, row: number, col: number) {
    event.preventDefault();
    if (draggingUnsig !== null) {
        grid[row][col] = { 
            unsigId: draggingUnsig, 
            hexAssetName: draggingUnsigHex || draggingUnsig.toString(16).padStart(4, '0'),
            rotation: 0 
        };
        draggingUnsig = null;
        draggingUnsigHex = null;
    }
}

function resetGrid() {
    grid = Array(rows).fill(null).map(() => 
        Array(cols).fill(null).map(() => ({ 
            unsigId: null, 
            hexAssetName: undefined,
            rotation: 0 
        }))
    );
}

// Handle keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
    // Ignore keyboard shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
        return;
    }
    
    // Ignore if modifier keys are pressed
    if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
    }
    
    // 'p' key to toggle preview mode
    if (event.key === 'p') {
        togglePreview();
    }
}

function togglePreview() {
    previewMode = !previewMode;
}

// Process arrangement data to create the metadata for transaction
function getArrangementData(): ArrangementItem[] {
    // Check if grid exists and has at least one row
    if (!grid || grid.length === 0) {
        console.log('getArrangementData: Grid is empty');
        return [];
    }
    
    console.log('getArrangementData: Processing grid:', grid);
    
    // Get all non-null unsigs with their positions and rotations
    const arrangement: ArrangementItem[] = [];
    
    grid.forEach((row, rowIndex) => {
        if (!row) return;
        
        row.forEach((cell, colIndex) => {
            // More explicit logging and checking
            console.log(`Checking cell [${rowIndex},${colIndex}]:`, cell);
            
            // Only consider cells with a valid unsigId (not null or undefined)
            if (cell && cell.unsigId !== null && cell.unsigId !== undefined) {
                // Use either stored hexAssetName or generate it from the ID
                const hexAssetName = cell.hexAssetName || cell.unsigId.toString(16).padStart(4, '0');
                
                const item = {
                    unsigId: cell.unsigId,
                    hexAssetName,
                    row: rowIndex,
                    col: colIndex,
                    rotation: cell?.rotation || 0
                };
                
                console.log(`Found valid Unsig at [${rowIndex},${colIndex}]:`, item);
                arrangement.push(item);
            }
        });
    });
    
    console.log('getArrangementData: Finished with', arrangement.length, 'items');
    return arrangement;
}

// Create metadata for the transaction
function createMetadata() {
    // Check if grid exists and has at least one row
    if (!grid || grid.length === 0) {
        console.log('Grid is empty');
        return {
            674: {
                msg: ["unsigned_composition"],
                arrangement: {
                    rows: 0,
                    cols: 0,
                    positions: []
                }
            }
        };
    }
    
    // Debug the grid structure
    console.log('Creating metadata from grid:');
    grid.forEach((row, i) => console.log(`Row ${i}:`, JSON.stringify(row)));
    
    // Create a flattened array of positions with explicit row and col
    // This approach is more reliable than nested arrays for blockchain metadata
    const positions = [];
    
    for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        const row = grid[rowIndex];
        if (!row) continue;
        
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cell = row[colIndex];
            if (cell && cell.unsigId !== null && cell.unsigId !== undefined) {
                positions.push({
                    id: cell.unsigId,
                    rotation: cell.rotation || 0,
                    row: rowIndex,
                    col: colIndex
                });
            }
        }
    }
    
    console.log('Flattened positions array:', positions);
    
    // Return the metadata with a flat positions array that includes row and col
    return {
        674: {
            msg: ["unsigned_composition"],
            arrangement: {
                rows: grid.length,
                cols: grid[0]?.length || 0,
                positions: positions
            }
        }
    };
}

</script>

<svelte:window onkeydown={handleKeydown} />

<div class="composition-builder h-full flex flex-col">
    <!-- Main Content Area - Grid Workspace -->
    <div class="flex-1 flex flex-col items-center p-6">
        <div class="grid-workspace" class:preview-mode={previewMode}>
            <!-- Column Controls - on right side -->
            <div class="column-controls">
                <div class="column-controls-group">
                    <button
                        class="control-button"
                        onclick={removeColumn}
                        disabled={cols <= 1}
                        aria-label="remove column">
                        -
                    </button>

                    <div class="button-separator mx-4">|</div>

                    <button
                        class="control-button"
                        onclick={addColumn}
                        aria-label="add column">
                        +
                    </button>
                </div>
            </div>

            <!-- Grid Display -->
            <div class="composition-grid" class:preview-grid={previewMode}>
                <div
                    class="grid gap-0.5"
                    class:preview-cells={previewMode}
                    style="grid-template-rows: repeat({rows}, 1fr); grid-template-columns: repeat({cols}, 1fr);">
                    {#each grid as row, rowIndex}
                        {#each row as cell, colIndex}
                            <div
                                class="grid-cell"
                                class:preview-cell={previewMode}
                                ondragover={onDragOver}
                                ondrop={(e) => onDrop(e, rowIndex, colIndex)}
                                role="button"
                                tabindex="0">
                                <!-- Grid Cell Content -->
                                {#if cell.unsigId !== null}
                                    <div class="w-full h-full relative" style="transform: rotate({cell.rotation}deg);">
                                        <img
                                            src="https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/128/{cell.unsigId.toString().padStart(5, '0')}.png"
                                            alt="unsig {cell.unsigId}"
                                            class="w-full h-full object-cover"
                                        />
                                    </div>
                                {:else}
                                    <div class="w-full h-full">
                                        <!-- Empty cell - no text -->
                                    </div>
                                {/if}

                                <!-- Cell Controls - Positioned below cell (only visible when not in preview) -->
                                {#if cell.unsigId !== null && !previewMode}
                                    <div class="cell-controls opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            class="control-button"
                                            onclick={() => rotateCell(rowIndex, colIndex)}
                                            aria-label="rotate">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                                <path d="M3 3v5h5"></path>
                                            </svg>
                                        </button>

                                        <div class="button-separator mx-2">|</div>

                                        <button
                                            class="control-button"
                                            onclick={() => clearCell(rowIndex, colIndex)}
                                            aria-label="clear">
                                            ×
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    {/each}
                </div>
            </div>
        </div>

        <!-- Below-grid controls in normal flow -->
        <div class="grid-bottom-controls">
            <div class="row-controls-group">
                <button
                    class="control-button"
                    onclick={removeRow}
                    disabled={rows <= 1}
                    aria-label="remove row">
                    -
                </button>

                <div class="button-separator-vertical">|</div>

                <button
                    class="control-button"
                    onclick={addRow}
                    aria-label="add row">
                    +
                </button>
            </div>

            <div class="button-group">
                <button
                    class="preview-button"
                    onclick={togglePreview}
                    aria-label="toggle preview">
                    <span class="shortcut">p</span>review
                </button>

                {#if mode === 'owned'}
                    <button
                        class="transaction-button"
                        disabled={buildingTx}
                        onclick={async () => {
                            console.log('Transaction button clicked');
                            txResult = null;
                            txError = null;

                            try {
                                // Get wallet instance
                                if (!BrowserWalletState.connected || !BrowserWalletState.wallet) {
                                    txError = 'wallet not connected';
                                    showTxModal = true;
                                    return;
                                }

                                const wallet = BrowserWalletState.wallet;
                                buildingTx = true;

                                // Dump complete grid state for debugging
                                console.log('Current Grid State:');
                                grid.forEach((row, i) => {
                                    console.log(`Row ${i}:`, row);
                                });

                                // Get the assets data - this is what we'll send
                                const arrangementData = getArrangementData();
                                console.log('Arrangement data for transaction:', arrangementData);

                                if (arrangementData.length === 0) {
                                    txError = 'no assets to send';
                                    showTxModal = true;
                                    return;
                                }

                                // Format assets for transaction
                                const assets = arrangementData.map(item => ({
                                    unit: `${UNSIGS_POLICY_ID}${item.hexAssetName}`,
                                    quantity: '1'
                                }));

                                console.log('Assets to send:', assets);

                                // Get destination address (user's own address)
                                const addresses = await wallet.getUsedAddresses();
                                const changeAddress = await wallet.getChangeAddress();

                                // Create metadata - must match exactly what's being sent
                                const metadata = createMetadata();
                                console.log('Transaction metadata:', metadata);

                                // Verify that assets and metadata match
                                console.log('Verification - asset count:', assets.length, 'metadata positions count:', metadata[674].arrangement.positions.length);
                                if (assets.length !== metadata[674].arrangement.positions.length) {
                                    console.error('Mismatch between assets and metadata position count!');
                                }

                                // Build transaction
                                console.log('Building transaction...');
                                // @ts-ignore - Mesh SDK import
                                const { Transaction } = await import('@meshsdk/core');

                                // Create transaction builder
                                const tx = new Transaction({ initiator: wallet });

                                // Add outputs (assets to send)
                                tx.sendAssets(changeAddress, assets);

                                // Set metadata
                                tx.setMetadata(674, metadata[674]);

                                // Build, sign, and submit
                                console.log('Building unsigned transaction...');
                                const unsignedTx = await tx.build();

                                console.log('Signing transaction...');
                                const signedTx = await wallet.signTx(unsignedTx);

                                console.log('Submitting transaction...');
                                const hash = await wallet.submitTx(signedTx);

                                console.log('Transaction submitted successfully!');
                                console.log('Transaction hash:', hash);

                                // Save composition to database
                                try {
                                    console.log('Saving composition to database...');
                                    const positionsData = arrangementData.map(item => ({
                                        unsigIndex: item.unsigId,
                                        row: item.row,
                                        column: item.col
                                    }));

                                    const response = await fetch('/api/db/compositions', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            transactionId: hash,
                                            positions: positionsData
                                        })
                                    });

                                    const result = await response.json();

                                    if (result.success) {
                                        console.log('Composition saved to database successfully!', result);
                                    } else {
                                        console.error('Failed to save composition to database:', result.error);
                                    }
                                } catch (dbErr) {
                                    console.error('Error saving composition to database:', dbErr);
                                }

                                txResult = { hash };
                                showTxModal = true;

                            } catch (err) {
                                console.error('Transaction error:', err);
                                txError = err instanceof Error ? err.message : String(err);
                                showTxModal = true;
                            } finally {
                                buildingTx = false;
                            }
                        }}
                        aria-label="build transaction">
                        {buildingTx ? 'building transaction...' : 'build transaction'}
                    </button>
                {/if}
            </div>
        </div>
    </div>

    <!-- Unsigs Carousel - Only visible when not in preview mode -->
    {#if !previewMode}
        <div class="unsigs-carousel">
            <div class="carousel-header">
                <h3>my unsigs ({ownedUnsigs.length})</h3>
            </div>

            {#if loading}
                <div class="carousel-loading">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
            {:else if error}
                <div class="carousel-error">{error}</div>
            {:else if ownedUnsigs.length === 0}
                <div class="carousel-empty">no unsigs found</div>
            {:else}
                <div class="carousel-container" onwheel={(e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        e.currentTarget.scrollLeft += e.deltaY;
                    }
                }}>
                    <div class="carousel-track">
                        {#each ownedUnsigs as unsig}
                            <div
                                class="carousel-item"
                                draggable="true"
                                ondragstart={() => startDrag(unsig.id, unsig.hexAssetName)}
                                role="button"
                                tabindex="0">
                                <img
                                    src="https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/128/{unsig.id.toString().padStart(5, '0')}.png"
                                    alt="unsig {unsig.id}"
                                    class="w-full h-full object-cover"
                                />
                                <div class="carousel-item-overlay">
                                    <span class="carousel-item-label">
                                        #{unsig.id}
                                    </span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>

<Modal bind:showModal={showTxModal}>
    {#snippet header()}
        <h3 class="modal-title">
            {#if txResult}
                transaction submitted
            {:else}
                transaction failed
            {/if}
        </h3>
    {/snippet}
    {#snippet content()}
        {#if txResult}
            <p class="modal-text">transaction hash:</p>
            <code class="modal-hash">{txResult.hash}</code>
        {:else if txError}
            <p class="modal-text">{txError}</p>
        {/if}
        <div class="modal-actions">
            <button class="modal-close-button" onclick={() => showTxModal = false}>close</button>
        </div>
    {/snippet}
</Modal>

<style>
    .composition-builder {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        padding-bottom: 260px;
        background: var(--bg-void);
        color: var(--text-primary);
    }

    .grid-workspace {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
    }

    /* Below-grid controls container */
    .grid-bottom-controls {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        margin-top: 0.75rem;
    }

    /* Row Controls - Grouped vertically */
    .row-controls-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: var(--bg-surface);
        border: 1px solid var(--border-default);
        padding: 6px 2px;
        border-radius: 20px;
    }

    .button-separator-vertical {
        transform: rotate(90deg);
        margin: 4px 0;
        color: var(--text-dim);
        font-size: 14px;
        line-height: 1;
    }

    /* Column Controls - Grouped at Right */
    .column-controls-group {
        position: absolute;
        right: -40px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        background-color: var(--bg-surface);
        border: 1px solid var(--border-default);
        padding: 2px 6px;
        border-radius: 20px;
        z-index: 10;
    }

    /* Grid container - sizes itself to fill available space while staying square */
    .composition-grid {
        width: min(calc(100vh - 480px), calc(100vw - 160px));
        height: min(calc(100vh - 480px), calc(100vw - 160px));
        aspect-ratio: 1;
        position: relative;
        z-index: 5;
        background-color: var(--bg-surface);
        border: 1px solid var(--border-default);
        padding: 2px;
        border-radius: 2px;
    }

    .grid-cell {
        transition: all 0.2s ease;
        aspect-ratio: 1/1;
        position: relative;
        border: 1px solid var(--border-default);
        background-color: var(--bg-raised);
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
    }

    .grid-cell:hover {
        border-color: var(--accent);
    }

    /* Cell controls styling */
    .cell-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 8px;
        position: absolute;
        bottom: -14px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--bg-surface);
        border: 1px solid var(--border-default);
        padding: 0 4px;
        border-radius: 12px;
        z-index: 20;
    }

    .button-separator {
        color: var(--text-dim);
        font-size: 14px;
        line-height: 1;
    }

    /* Force grid cells to be square */
    .grid-cell::before {
        content: "";
        display: block;
        padding-bottom: 100%;
        position: absolute;
    }

    .grid-cell > div:first-child {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .grid-cell img {
        transition: transform 0.3s ease;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .unsigs-carousel {
        min-height: 200px;
        max-height: 260px;
        position: fixed;
        bottom: 0;
        left: 48px;
        right: 0;
        z-index: 40;
        background-color: var(--bg-surface);
        border-top: 1px solid var(--border-default);
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
    }

    .carousel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid var(--border-subtle);
    }

    .carousel-header h3 {
        font-family: 'JetBrains Mono', monospace;
        text-transform: lowercase;
        font-size: var(--text-base);
        color: var(--text-primary);
        font-weight: 400;
    }

    .carousel-loading {
        display: flex;
        justify-content: center;
        padding: 1rem;
    }

    .carousel-error {
        color: #ef4444;
        padding: 0.5rem 1rem;
    }

    .carousel-empty {
        color: var(--text-secondary);
        padding: 0.5rem 1rem;
    }

    .carousel-container {
        width: 100%;
        overflow-x: auto;
        padding: 0.5rem 1rem;
        height: 100%;
    }

    .carousel-track {
        display: flex;
        gap: 12px;
        padding-bottom: 8px;
    }

    .carousel-item {
        flex: 0 0 auto;
        width: 100px;
        height: 100px;
        aspect-ratio: 1;
        border: 1px solid var(--border-default);
        cursor: grab;
        position: relative;
        overflow: hidden;
        transition: border-color 0.2s ease;
    }

    .carousel-item:hover {
        border-color: var(--accent);
    }

    .carousel-item-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
    }

    .carousel-item:hover .carousel-item-overlay {
        background: rgba(0, 0, 0, 0.5);
    }

    .carousel-item-label {
        color: white;
        opacity: 0;
        transition: opacity 0.2s ease;
        font-family: 'JetBrains Mono', monospace;
        font-size: var(--text-sm);
    }

    .carousel-item:hover .carousel-item-label {
        opacity: 1;
    }

    /* Preview mode styles */
    .preview-mode {
        margin: 0 auto;
    }

    .preview-grid {
        border: none !important;
        padding: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
    }

    .preview-cells {
        gap: 0 !important;
    }

    .preview-cell {
        border: none !important;
        background-color: transparent !important;
    }

    /* Button group for preview and transaction */
    .button-group {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }

    /* Preview button styling */
    .preview-button {
        background-color: transparent;
        color: var(--text-primary);
        border: 1px solid var(--border-default);
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        font-weight: 400;
        transition: all 0.2s ease;
        font-family: 'JetBrains Mono', monospace;
        text-transform: lowercase;
    }

    .preview-button:hover {
        border-color: var(--accent);
        background-color: var(--accent-dim);
    }

    /* Transaction button styling */
    .transaction-button {
        background-color: transparent;
        color: var(--text-primary);
        border: 1px solid var(--border-default);
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        font-weight: 400;
        transition: all 0.2s ease;
        font-family: 'JetBrains Mono', monospace;
        text-transform: lowercase;
    }

    .transaction-button:hover {
        border-color: var(--accent);
        background-color: var(--accent-dim);
    }

    /* Shared button control style */
    .control-button {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: transparent;
        border: none;
        font-size: 16px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .control-button:hover:not(:disabled) {
        color: var(--text-primary);
    }

    .control-button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }


    @media (max-width: 768px) {
        .unsigs-carousel {
            left: 0;
        }
    }

    /* Transaction modal styles */
    .modal-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: var(--text-lg);
        font-weight: 400;
        color: var(--text-primary);
    }

    .modal-text {
        font-family: 'JetBrains Mono', monospace;
        font-size: var(--text-sm);
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
    }

    .modal-hash {
        display: block;
        font-family: 'JetBrains Mono', monospace;
        font-size: var(--text-sm);
        color: var(--text-primary);
        background-color: var(--bg-raised);
        border: 1px solid var(--border-default);
        padding: 0.75rem;
        border-radius: 4px;
        word-break: break-all;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.5rem;
    }

    .modal-close-button {
        font-family: 'JetBrains Mono', monospace;
        background-color: transparent;
        color: var(--text-primary);
        border: 1px solid var(--border-default);
        padding: 0.5rem 1.5rem;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .modal-close-button:hover {
        border-color: var(--accent);
        background-color: var(--accent-dim);
    }
</style>