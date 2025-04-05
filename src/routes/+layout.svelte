<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './$types';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import { CardanoWallet } from '@meshsdk/svelte';
  import '@meshsdk/svelte/styles.css';
  import { page } from '$app/stores';
  import { BrowserWalletState } from '@meshsdk/svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  
  const { data } = $props<{data: LayoutData}>();
  let currentPath = $state($page.url.pathname);
  let unsigCount = $state(0);
  
  // Update currentPath when page store changes
  $effect(() => {
    currentPath = $page.url.pathname;
  });

  // Update unsig count when wallet state changes
  $effect(() => {
    if (browser && BrowserWalletState.connected && BrowserWalletState.wallet) {
      BrowserWalletState.wallet.getAssets()
        .then((assets: { unit: string; quantity: string }[]) => {
          const unsigAssets = assets.filter((asset: { unit: string; quantity: string }) => 
            asset.unit.startsWith('0e14267a8020229adc0184dd25fa3174c3f7d6caadcb4425c70e7c04')
          );
          unsigCount = unsigAssets.length;
        })
        .catch(console.error);
    } else {
      unsigCount = 0;
    }
  });

  // Update how we handle the navigation items
  const mainNavItems = [
    { path: '/', label: 'unsigned_algorithms' },
    { path: '/gallery', label: 'gallery' },
    { path: '/arrangements', label: 'arrangements' },
    { path: '/about', label: 'about' }
  ];

  // Create a separate array for wallet-related nav items
  const walletNavItems = $derived(browser && BrowserWalletState.connected ? [
    { path: '/compose', label: 'compose' },
    { path: '/my-unsigs', label: `${unsigCount} unsigs` }
  ] : []);

  // Function to check if an item is wallet-related
  function isWalletNavItem(path: string) {
    return walletNavItems.some(item => item.path === path);
  }

  // Function to check if an item is a main nav item
  function isMainNavItem(path: string) {
    return mainNavItems.some(item => item.path === path);
  }

  // Combine all items into one array for the navigation
  let allNavItems = $derived([...mainNavItems, ...walletNavItems]);

  function getSelectedIndex() {
    return mainNavItems.findIndex(item => item.path === currentPath);
  }
</script>

<div class="min-h-screen flex flex-col">
  <nav class="fixed top-0 left-0 right-0 z-50 p-2 pointer-events-none">
    <div class="nav-content pointer-events-auto flex items-center justify-between w-full">
      <div class="flex items-center flex-1">
        <div class="nav-links relative flex items-center w-full">
          {#each allNavItems as item, i}
            <a 
              href={item.path} 
              class="text-black hover:text-gray-600 transition-colors relative"
              class:selected={currentPath === item.path}
              class:wallet-item={isWalletNavItem(item.path)}
              class:main-item={isMainNavItem(item.path)}
            >
              {item.label}
            </a>
          {/each}
          <!-- Only show the indicator for main nav items -->
          {#if isMainNavItem(currentPath)}
            <div 
              class="nav-indicator absolute h-0.5 bg-black rounded-full transition-transform duration-300 ease-in-out z-20"
              style="transform: translateX({getSelectedIndex() * 100}%); bottom: 0;"
            ></div>
          {/if}
        </div>
      </div>
      
      <div class="wallet-wrapper flex items-center ml-4">
        <CardanoWallet
          label={BrowserWalletState.connected ? `wallet` : 'connect wallet'}
        />
      </div>
    </div>
  </nav>

  <main class="container pt-16 flex-grow">
    <slot />
  </main>
</div>

<style lang="postcss">
  .nav-links {
    display: flex;
    align-items: center;
    padding: 0 0.5rem;
    position: relative;
  }
  
  /* Create layout with space between main and wallet items */
  .nav-links a.wallet-item {
    margin-left: auto;
  }
  
  /* Add spacing between wallet items */
  .nav-links a.wallet-item + a.wallet-item {
    margin-left: 1rem;
  }
  
  /* Add border between wallet items and wallet button */
  .nav-links a.wallet-item:last-child {
    margin-right: 0.5rem;
    padding-right: 0.5rem;
    border-right: 1px solid #eaeaea;
  }

  .wallet-wrapper {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .wallet-wrapper :global(.mesh-wallet-button) {
    @apply text-white font-medium py-2 px-4 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors duration-200;
    border: none !important;
    min-width: auto !important;
    min-height: auto !important;
    display: inline-flex !important;
    align-items: center !important;
    white-space: nowrap;
  }

  .wallet-wrapper :global(.mesh-wallet-button:hover) {
    @apply bg-gray-800;
  }

  .wallet-wrapper :global(.mesh-wallet-button span) {
    @apply text-white;
  }

  .nav-content {
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .nav-indicator {
    width: var(--nav-item-width, 160px);
    left: 0;
  }

  .selected {
    color: black;
  }

  /* Style selected wallet items differently */
  .nav-links a.wallet-item.selected {
    font-weight: 500;
    position: relative;
  }

  .nav-links a.wallet-item.selected::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: black;
    border-radius: 2px;
  }

  /* Set fixed widths only for main nav items */
  .nav-links a.main-item {
    width: var(--nav-item-width, 160px);
    text-align: center;
  }

  /* Ensure first main item maintains consistent width */
  .nav-links a.main-item:first-child {
    width: var(--nav-item-width, 200px);
  }

  /* Responsive fixes */
  @media (max-width: 768px) {
    .nav-links a.wallet-item {
      display: none; /* Hide wallet nav links on mobile to save space */
    }

    .wallet-wrapper {
      display: flex;
      flex-direction: row;
      align-items: center;
      margin-left: 0.5rem;
    }
    
    /* Make main nav items narrower on mobile */
    .nav-links a.main-item {
      width: var(--nav-item-width-mobile, 120px);
    }
    
    .nav-links a.main-item:first-child {
      width: var(--nav-item-width-mobile, 150px);
    }
  }
</style> 