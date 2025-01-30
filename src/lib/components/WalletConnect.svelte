<script lang="ts">
    import { onMount } from 'svelte';
    import { walletService } from '$lib/services/wallet';
    import { getWalletState } from '$lib/state/WalletState.svelte';
    import type { WalletInfo } from '$lib/services/wallet';

    const walletState = getWalletState();
    let isDropdownOpen = $state(false);
    let loading = $state(false);
    let error = $state('');

    $effect(() => {
        console.log('Dropdown state changed:', isDropdownOpen);
    });

    onMount(async () => {
        try {
            console.log('Fetching available wallets...');
            const wallets = await walletService.getAvailableWallets();
            console.log('Available wallets:', wallets);
            walletState.updateWallets(wallets);
        } catch (e) {
            console.error('Error fetching wallets:', e);
            error = 'Failed to load wallets';
        }
    });

    async function connectWallet(walletName: string) {
        console.log('Attempting to connect to wallet:', walletName);
        loading = true;
        error = '';
        try {
            console.log('Connecting to wallet:', walletName);
            const info = await walletService.connectWallet(walletName);
            console.log('Wallet connected:', info);
            walletState.updateInfo(info);
            const balance = await walletService.getBalance();
            console.log('Wallet balance:', balance);
            walletState.updateBalance(balance);
            isDropdownOpen = false;
        } catch (e) {
            console.error('Error connecting wallet:', e);
            error = 'Failed to connect wallet';
        } finally {
            loading = false;
        }
    }

    async function disconnectWallet() {
        try {
            console.log('Disconnecting wallet...');
            await walletService.disconnectWallet();
            walletState.reset();
            console.log('Wallet disconnected');
        } catch (e) {
            console.error('Error disconnecting wallet:', e);
            error = 'Failed to disconnect wallet';
        }
    }

    $effect(() => {
        console.log('Wallet state updated:', {
            info: walletState.info,
            wallets: walletState.wallets,
            balance: walletState.balance
        });
    });

    const formattedBalance = $derived(
        walletState.balance ? (Number(walletState.balance) / 1_000_000).toFixed(2) : '0.00'
    );

    function handleConnectClick() {
        console.log('Connect button clicked, current dropdown state:', isDropdownOpen);
        isDropdownOpen = !isDropdownOpen;
        console.log('New dropdown state:', isDropdownOpen);
    }

    function handleWalletSelect(wallet: WalletInfo) {
        console.log('Wallet selected:', wallet);
        connectWallet(wallet.name);
    }

    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (isDropdownOpen && !target.closest('.wallet-dropdown-container')) {
            isDropdownOpen = false;
        }
    }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="wallet-dropdown-container relative inline-block text-left">
    {#if walletState.info}
        <div class="flex items-center space-x-4 bg-gray-50 rounded-lg px-4 py-2">
            <div class="flex items-center space-x-2">
                <img src={walletState.info.icon} alt={walletState.info.name} class="w-5 h-5" />
                <span class="text-sm font-medium text-gray-700">{walletState.info.name}</span>
            </div>
            <div class="text-sm font-medium text-blue-600">
                {formattedBalance} ₳
            </div>
            <button
                on:click={disconnectWallet}
                class="text-sm text-red-600 hover:text-red-700 font-medium"
            >
                Disconnect
            </button>
        </div>
    {:else}
        <div class="relative">
            <button
                on:click={handleConnectClick}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                disabled={loading}
            >
                {#if loading}
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                {:else}
                    Connect Wallet
                {/if}
            </button>

            {#if isDropdownOpen}
                <!-- Debug info -->
                <div class="fixed top-0 left-0 bg-black text-white p-2 text-xs">
                    Dropdown is open
                </div>

                <div 
                    class="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="wallet-menu-button"
                    tabindex="-1"
                >
                    <div class="py-1" role="none">
                        {#each walletState.wallets as wallet}
                            <button
                                type="button"
                                class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                role="menuitem"
                                tabindex="-1"
                                on:click={() => handleWalletSelect(wallet)}
                            >
                                <img src={wallet.icon} alt={wallet.name} class="w-5 h-5 mr-2" />
                                {wallet.name}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {/if}

    {#if error}
        <div class="absolute top-full right-0 mt-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
            {error}
        </div>
    {/if}
</div>

<style>
    .wallet-dropdown-container {
        position: relative;
        display: inline-block;
    }

    /* Ensure the dropdown is visible */
    .origin-top-right {
        transform-origin: top right;
    }
</style> 
