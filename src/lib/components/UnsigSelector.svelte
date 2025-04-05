<script lang="ts">
let { 
    unsigIndices = [], 
    onSelect, 
    onClose,
    selectedUnsigId = null
} = $props<{
    unsigIndices: number[];
    onSelect: (unsigId: number) => void;
    onClose: () => void;
    selectedUnsigId?: number | null;
}>();

let showDropdown = $state(false);

function handleSelect(unsigId: number) {
    onSelect(unsigId);
    showDropdown = false;
}

function toggleDropdown() {
    showDropdown = !showDropdown;
}
</script>

<div class="relative">
    <!-- Preview/Button -->
    <button 
        class="w-full h-full aspect-square bg-gray-50 border border-gray-200 hover:border-black transition-colors relative"
        onclick={toggleDropdown}>
        {#if selectedUnsigId !== null}
            <img 
                src="https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/128/{selectedUnsigId.toString().padStart(5, '0')}.png"
                alt="unsig {selectedUnsigId}"
                class="w-full h-full object-cover"
            />
        {:else}
            <div class="w-full h-full flex items-center justify-center">
                <div class="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-300 text-2xl hover:border-gray-400 hover:text-gray-400 transition-colors">
                    +
                </div>
            </div>
        {/if}
    </button>

    <!-- Dropdown Menu -->
    {#if showDropdown}
        <div class="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-xl border p-4 w-96 z-[9999]">
            <div class="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                {#each unsigIndices as unsigId}
                    <button
                        class="aspect-square border hover:border-black transition-colors p-1 bg-white relative group"
                        onclick={() => handleSelect(unsigId)}>
                        <img
                            src="https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/128/{unsigId.toString().padStart(5, '0')}.png"
                            alt="unsig {unsigId}"
                            class="w-full h-full object-cover"
                        />
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                            <span class="text-white opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                                #{unsigId.toString().padStart(5, '0')}
                            </span>
                        </div>
                    </button>
                {/each}
            </div>
        </div>

        <!-- Backdrop to close dropdown -->
        <div 
            class="fixed inset-0 z-[9998]"
            onclick={() => showDropdown = false}>
        </div>
    {/if}
</div> 