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

<svelte:window on:keydown={handleEscape}/>

{#if showModal}
    <!-- Overlay -->
    <div class="modal-overlay">
        <!-- Modal Container -->
        <div 
            class="modal-container"
            onclick={handleBackdropClick}
            role="dialog"
            aria-modal="true">
            <!-- Modal Content -->
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
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
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
        background: white;
        border-radius: 0.5rem;
        width: 100%;
        max-width: 42rem;
        max-height: 90vh;
        overflow: auto;
        padding: 1.5rem;
        position: relative;
        margin: 1rem;
    }
</style> 