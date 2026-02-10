<script lang="ts">
let { showModal = $bindable(), header, content } = $props<{
    showModal: boolean;
    header?: () => any;
    content?: () => any;
}>();

function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
        showModal = false;
    }
}

function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        showModal = false;
    }
}
</script>

<svelte:window onkeydown={handleEscape}/>

{#if showModal}
    <div class="modal-overlay">
        <div
            class="modal-container"
            onclick={handleBackdropClick}
            role="dialog"
            aria-modal="true">
            <div
                class="modal-content"
                onclick={(e) => e.stopPropagation()}>
                <div class="mb-4">
                    {@render header?.()}
                </div>
                <div>
                    {@render content?.()}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
    }

    .modal-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .modal-content {
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: 0.5rem;
        width: 100%;
        max-width: 42rem;
        max-height: 90vh;
        overflow: auto;
        padding: 1.5rem;
        position: relative;
        margin: 1rem;
        color: var(--text-primary);
    }
</style>
