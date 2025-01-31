<script lang="ts">
    import { onMount } from 'svelte';
    import { walletService } from '$lib/services/wallet';
    import { getWalletState } from '$lib/state/WalletState.svelte';
    import type { WalletInfo } from '$lib/services/wallet';

    const walletState = getWalletState();
    let isDropdownOpen = $state(false);
    let loading = $state(false);
    let error = $state('');

    onMount(async () => {
        try {
            const wallets = await walletService.getAvailableWallets();
            walletState.updateWallets(wallets);
        } catch (e) {
            console.error('Error fetching wallets:', e);
            error = 'failed to load wallets';
        }
    });

    async function connectWallet(walletName: string) {
        loading = true;
        error = '';
        try {
            const info = await walletService.connectWallet(walletName);
            walletState.updateInfo(info);
            const balance = await walletService.getBalance();
            walletState.updateBalance(balance);
            isDropdownOpen = false;
        } catch (e) {
            error = 'failed to connect wallet';
        } finally {
            loading = false;
        }
    }

    async function disconnectWallet() {
        try {
            await walletService.disconnectWallet();
            walletState.reset();
        } catch (e) {
            error = 'failed to disconnect wallet';
        }
    }

    const formattedBalance = $derived(
        walletState.balance ? (Number(walletState.balance) / 1_000_000).toFixed(2) : '0.00'
    );

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (isDropdownOpen && !target.closest('.wallet-btn')) {
            isDropdownOpen = false;
        }
    }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="wallet-container">
    {#if walletState.info}
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
                <img src={walletState.info.icon} alt={walletState.info.name} class="w-5 h-5" />
                <span class="text-sm font-medium text-gray-700">{walletState.info.name}</span>
            </div>
            <div class="text-sm font-medium text-blue-600">
                {formattedBalance} ₳
            </div>
            <button
                onclick={disconnectWallet}
                class="text-sm text-red-600 hover:text-red-700 font-medium"
            >
                disconnect
            </button>
        </div>
    {:else}
        <button
            onclick={() => isDropdownOpen = !isDropdownOpen}
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
        >
            {#if loading}
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                connecting...
            {:else}
                connect wallet
            {/if}
        </button>

        {#if isDropdownOpen}
            <div class="dropdown">
                {#each walletState.wallets as wallet}
                    <button
                        class="wallet-option"
                        onclick={() => connectWallet(wallet.name)}
                    >
                        <img src={wallet.icon} alt={wallet.name} class="wallet-icon" />
                        {wallet.name}
                    </button>
                {/each}
            </div>
        {/if}
    {/if}
</div>

{#if error}
    <div class="error">{error}</div>
{/if}

<style>
    .wallet-connected {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .wallet-btn {
        position: relative;
    }

    .connect-btn {
        padding: 0.5rem 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        background: white;
    }

    .disconnect-btn {
        color: #dc2626;
    }

    .dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 0.5rem;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 50;
    }

    .wallet-option {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 0.5rem 1rem;
        gap: 0.5rem;
    }

    .wallet-icon {
        width: 1.25rem;
        height: 1.25rem;
    }

    .error {
        position: absolute;
        color: #dc2626;
        background: #fef2f2;
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        margin-top: 0.5rem;
    }
</style> 
