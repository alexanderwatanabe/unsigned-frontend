<script lang="ts">
import type { UnsigMetadata, OwnedUnsig } from '$lib/types';
import { BrowserWalletState } from '@meshsdk/svelte';
import Modal from '$lib/components/Modal.svelte';
import CompositionGrid from '$lib/components/CompositionGrid.svelte';

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
        }))
    );
});

// Define interface for arrangement items
interface ArrangementItem {
    unsigId: number;
    hexAssetName: string;
    row: number;
    col: number;
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
        return { id, hexAssetName };
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

// Grid dimension handlers
function addRow() {
    rows++;
    grid = [...grid, Array(cols).fill(null).map(() => ({ unsigId: null, hexAssetName: undefined }))];
}

function removeRow() {
    if (rows > 1) {
        rows--;
        grid = grid.slice(0, rows);
    }
}

function addColumn() {
    cols++;
    grid = grid.map(row => [...row, { unsigId: null, hexAssetName: undefined }]);
}

function removeColumn() {
    if (cols > 1) {
        cols--;
        grid = grid.map(row => row.slice(0, cols));
    }
}

// Cell actions
function clearCell(row: number, col: number) {
    grid[row][col] = { unsigId: null, hexAssetName: undefined };
}

// Swap two grid cells
function swapCells(fromRow: number, fromCol: number, toRow: number, toCol: number) {
    const temp = grid[fromRow][fromCol];
    grid[fromRow][fromCol] = grid[toRow][toCol];
    grid[toRow][toCol] = temp;
}

// Handle external drop from carousel
function handleExternalDrop(row: number, col: number) {
    if (draggingUnsig !== null) {
        grid[row][col] = {
            unsigId: draggingUnsig,
            hexAssetName: draggingUnsigHex || draggingUnsig.toString(16).padStart(4, '0'),
        };
        draggingUnsig = null;
        draggingUnsigHex = null;
    }
}

// Carousel drag start
function startDrag(unsigId: number, hexAssetName: string) {
    draggingUnsig = unsigId;
    draggingUnsigHex = hexAssetName;
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (event.key === 'p') previewMode = !previewMode;
    if (event.key === 'r') randomFill();
}

function randomFill() {
    if (ownedUnsigs.length === 0) return;
    const totalCells = rows * cols;
    const shuffled = [...ownedUnsigs].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, totalCells);

    grid = Array(rows).fill(null).map((_, rowIndex) =>
        Array(cols).fill(null).map((_, colIndex) => {
            const unsig = selected[rowIndex * cols + colIndex];
            if (unsig) return { unsigId: unsig.id, hexAssetName: unsig.hexAssetName };
            return { unsigId: null, hexAssetName: undefined };
        })
    );
}

// Transaction helpers
function getArrangementData(): ArrangementItem[] {
    if (!grid || grid.length === 0) return [];
    const arrangement: ArrangementItem[] = [];
    grid.forEach((row, rowIndex) => {
        if (!row) return;
        row.forEach((cell, colIndex) => {
            if (cell && cell.unsigId !== null && cell.unsigId !== undefined) {
                arrangement.push({
                    unsigId: cell.unsigId,
                    hexAssetName: cell.hexAssetName || cell.unsigId.toString(16).padStart(4, '0'),
                    row: rowIndex,
                    col: colIndex,
                });
            }
        });
    });
    return arrangement;
}

function createMetadata() {
    if (!grid || grid.length === 0) {
        return { 674: { msg: ["unsigned_composition"], arrangement: { rows: 0, cols: 0, positions: [] } } };
    }
    const positions: { id: number; row: number; col: number }[] = [];
    for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        const row = grid[rowIndex];
        if (!row) continue;
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cell = row[colIndex];
            if (cell && cell.unsigId !== null && cell.unsigId !== undefined) {
                positions.push({ id: cell.unsigId, row: rowIndex, col: colIndex });
            }
        }
    }
    return { 674: { msg: ["unsigned_composition"], arrangement: { rows: grid.length, cols: grid[0]?.length || 0, positions } } };
}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="composition-builder h-full flex flex-col">
    <div class="flex-1 flex flex-col items-center p-6">
        <CompositionGrid
            bind:grid
            bind:rows
            bind:cols
            {previewMode}
            onswap={swapCells}
            onexternaldrop={handleExternalDrop}
            onclear={clearCell}
            onaddrow={addRow}
            onremoverow={removeRow}
            onaddcol={addColumn}
            onremovecol={removeColumn}
        />

        <div class="button-group">
            <button
                class="action-button"
                onclick={() => previewMode = !previewMode}
                aria-label="toggle preview">
                <span class="shortcut">p</span>review
            </button>

            {#if mode === 'owned'}
                <button
                    class="action-button"
                    disabled={buildingTx}
                    onclick={async () => {
                        txResult = null;
                        txError = null;

                        try {
                            if (!BrowserWalletState.connected || !BrowserWalletState.wallet) {
                                txError = 'wallet not connected';
                                showTxModal = true;
                                return;
                            }

                            const wallet = BrowserWalletState.wallet;
                            buildingTx = true;

                            const arrangementData = getArrangementData();
                            if (arrangementData.length === 0) {
                                txError = 'no assets to send';
                                showTxModal = true;
                                return;
                            }

                            const assets = arrangementData.map(item => ({
                                unit: `${UNSIGS_POLICY_ID}${item.hexAssetName}`,
                                quantity: '1'
                            }));

                            const changeAddress = await wallet.getChangeAddress();
                            const metadata = createMetadata();

                            // @ts-ignore - Mesh SDK import
                            const { Transaction } = await import('@meshsdk/core');
                            const tx = new Transaction({ initiator: wallet });
                            tx.sendAssets(changeAddress, assets);
                            tx.setMetadata(674, metadata[674]);

                            const unsignedTx = await tx.build();
                            const signedTx = await wallet.signTx(unsignedTx);
                            const hash = await wallet.submitTx(signedTx);

                            // Save composition to database
                            try {
                                const positionsData = arrangementData.map(item => ({
                                    unsigIndex: item.unsigId,
                                    row: item.row,
                                    column: item.col
                                }));
                                const response = await fetch('/api/db/compositions', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ transactionId: hash, positions: positionsData })
                                });
                                const result = await response.json();
                                if (!result.success) console.error('Failed to save composition:', result.error);
                            } catch (dbErr) {
                                console.error('Error saving composition:', dbErr);
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
                                    <span class="carousel-item-label">#{unsig.id}</span>
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
            {#if txResult}transaction submitted{:else}transaction failed{/if}
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

    .button-group {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 1rem;
    }

    .action-button {
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

    .action-button:hover {
        border-color: var(--accent);
        background-color: var(--accent-dim);
    }

    .shortcut {
        text-decoration: underline;
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

    @media (max-width: 768px) {
        .unsigs-carousel {
            left: 0;
        }
    }

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
