<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import { CardanoWallet } from '@meshsdk/svelte';
  import '@meshsdk/svelte/styles.css';
  import { page } from '$app/stores';
  import { BrowserWalletState } from '@meshsdk/svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  const { data, children } = $props<{data: LayoutData; children: Snippet}>();
  let currentPath = $state($page.url.pathname);
  let unsigCount = $state(0);
  let walletExpanded = $state(false);
  let hoveredNav = $state<string | null>(null);

  $effect(() => {
    currentPath = $page.url.pathname;
  });

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

  const navItems = [
    { path: '/gallery', abbr: 'g', label: 'gallery' },
    { path: '/arrangements', abbr: 'a', label: 'arrangements' },
    { path: '/about', abbr: 'ab', label: 'about' },
  ];

  const walletNavItems = $derived(browser && BrowserWalletState.connected ? [
    { path: '/compose', abbr: 'c', label: 'compose' },
    { path: '/my-unsigs', abbr: 'u', label: `${unsigCount} unsigs` },
  ] : []);

  function isActive(path: string): boolean {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }

  function toggleWalletPanel() {
    walletExpanded = !walletExpanded;
  }

  // Close wallet panel after connecting
  $effect(() => {
    if (browser && BrowserWalletState.connected) {
      walletExpanded = false;
    }
  });
</script>

<div class="app-shell">
  <!-- Side Rail — Desktop -->
  <nav class="side-rail" aria-label="main navigation">
    <!-- Site Mark -->
    <a href="/" class="site-mark" class:active={isActive('/')}>
      <span class="font-serif italic">ua</span>
    </a>

    <!-- Main Nav -->
    <div class="nav-items">
      {#each navItems as item}
        <a
          href={item.path}
          class="nav-item"
          class:active={isActive(item.path)}
          onmouseenter={() => hoveredNav = item.path}
          onmouseleave={() => hoveredNav = null}
          aria-label={item.label}
        >
          <span class="nav-abbr">{item.abbr}</span>
          {#if hoveredNav === item.path}
            <span class="nav-tooltip">{item.label}</span>
          {/if}
        </a>
      {/each}
    </div>

    <!-- Wallet Section at Bottom -->
    <div class="rail-bottom">
      {#each walletNavItems as item}
        <a
          href={item.path}
          class="nav-item"
          class:active={isActive(item.path)}
          onmouseenter={() => hoveredNav = item.path}
          onmouseleave={() => hoveredNav = null}
          aria-label={item.label}
        >
          <span class="nav-abbr">{item.abbr}</span>
          {#if hoveredNav === item.path}
            <span class="nav-tooltip">{item.label}</span>
          {/if}
        </a>
      {/each}

      <button
        class="wallet-dot"
        onclick={toggleWalletPanel}
        onmouseenter={() => hoveredNav = 'wallet'}
        onmouseleave={() => hoveredNav = null}
        aria-label="wallet"
      >
        <span class="dot" class:connected={browser && BrowserWalletState.connected}></span>
        {#if hoveredNav === 'wallet'}
          <span class="nav-tooltip">wallet</span>
        {/if}
      </button>

      {#if walletExpanded}
        <div class="wallet-panel">
          <div class="wallet-panel-content">
            <CardanoWallet
              label={BrowserWalletState.connected ? 'wallet' : 'connect'}
            />
          </div>
        </div>
      {/if}
    </div>
  </nav>

  <!-- Bottom Tab Bar — Mobile -->
  <nav class="bottom-bar" aria-label="mobile navigation">
    <a href="/" class="tab-item" class:active={isActive('/')}>
      <span class="font-serif italic tab-label">ua</span>
    </a>
    {#each navItems as item}
      <a href={item.path} class="tab-item" class:active={isActive(item.path)}>
        <span class="tab-label">{item.abbr}</span>
      </a>
    {/each}
    <button class="tab-item" onclick={toggleWalletPanel} aria-label="wallet">
      <span class="dot-mobile" class:connected={browser && BrowserWalletState.connected}></span>
    </button>
  </nav>

  {#if walletExpanded}
    <!-- Mobile wallet overlay -->
    <div class="wallet-overlay-mobile">
      <div class="wallet-overlay-content">
        <button class="wallet-close" onclick={() => walletExpanded = false}>x</button>
        {#if browser && BrowserWalletState.connected}
          <div class="wallet-links">
            <a href="/compose" onclick={() => walletExpanded = false}>compose</a>
            <a href="/my-unsigs" onclick={() => walletExpanded = false}>{unsigCount} unsigs</a>
          </div>
        {/if}
        <div class="wallet-connect-mobile">
          <CardanoWallet
            label={BrowserWalletState.connected ? 'wallet' : 'connect'}
          />
        </div>
      </div>
    </div>
  {/if}

  <main class="main-content">
    {@render children()}
  </main>
</div>

<style lang="postcss">
  .app-shell {
    min-height: 100vh;
    display: flex;
  }

  /* ── Side Rail (Desktop) ── */
  .side-rail {
    position: fixed;
    top: 0;
    left: 0;
    width: 48px;
    height: 100vh;
    background: var(--bg-void);
    border-right: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-sm) 0;
    z-index: 100;
  }

  .site-mark {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    text-decoration: none;
    font-size: 1.25rem;
    border-left: 2px solid transparent;
    transition: color 0.15s;
  }

  .site-mark.active {
    border-left-color: var(--accent);
  }

  .site-mark:hover {
    color: var(--accent);
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: var(--space-lg);
    gap: var(--space-xs);
  }

  .nav-item {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: var(--text-sm);
    border-left: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .nav-item:hover {
    color: var(--text-primary);
  }

  .nav-item.active {
    color: var(--accent);
    border-left-color: var(--accent);
  }

  .nav-abbr {
    pointer-events: none;
  }

  .nav-tooltip {
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 4px;
    padding: 4px 10px;
    background: var(--bg-overlay);
    color: var(--text-primary);
    font-size: var(--text-xs);
    white-space: nowrap;
    border-radius: 4px;
    border: 1px solid var(--border-default);
    pointer-events: none;
    animation: tooltipSlideIn 0.15s ease-out;
    z-index: 200;
  }

  @keyframes tooltipSlideIn {
    from { opacity: 0; transform: translateY(-50%) translateX(-4px); }
    to { opacity: 1; transform: translateY(-50%) translateX(0); }
  }

  .rail-bottom {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    padding-bottom: var(--space-sm);
    position: relative;
  }

  .wallet-dot {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-dim);
    transition: background 0.3s;
  }

  .dot.connected {
    background: #4ade80;
  }

  .wallet-panel {
    position: absolute;
    bottom: 48px;
    left: 52px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    padding: var(--space-md);
    z-index: 200;
    min-width: 200px;
  }

  .wallet-panel-content :global(.mesh-wallet-button) {
    background: var(--bg-raised) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-default) !important;
    border-radius: 6px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: var(--text-sm) !important;
    min-width: auto !important;
    min-height: auto !important;
    padding: 8px 16px !important;
    transition: background 0.15s !important;
  }

  .wallet-panel-content :global(.mesh-wallet-button:hover) {
    background: var(--bg-overlay) !important;
  }

  .wallet-panel-content :global(.mesh-wallet-button span) {
    color: var(--text-primary) !important;
  }

  /* ── Main Content ── */
  .main-content {
    margin-left: 48px;
    flex: 1;
    min-height: 100vh;
  }

  /* ── Bottom Bar (Mobile) ── */
  .bottom-bar {
    display: none;
  }

  .wallet-overlay-mobile {
    display: none;
  }

  @media (max-width: 768px) {
    .side-rail {
      display: none;
    }

    .main-content {
      margin-left: 0;
      padding-bottom: 56px;
    }

    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 56px;
      background: var(--bg-void);
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-around;
      z-index: 100;
    }

    .tab-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: var(--text-sm);
      background: none;
      border: none;
      border-top: 2px solid transparent;
      cursor: pointer;
      transition: color 0.15s;
    }

    .tab-item.active {
      color: var(--accent);
      border-top-color: var(--accent);
    }

    .tab-item:hover {
      color: var(--text-primary);
    }

    .tab-label {
      pointer-events: none;
    }

    .dot-mobile {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-dim);
      transition: background 0.3s;
    }

    .dot-mobile.connected {
      background: #4ade80;
    }

    .wallet-overlay-mobile {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 200;
    }

    .wallet-overlay-content {
      position: absolute;
      bottom: 56px;
      left: 0;
      right: 0;
      background: var(--bg-surface);
      border-top: 1px solid var(--border-default);
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .wallet-close {
      position: absolute;
      top: var(--space-md);
      right: var(--space-md);
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: var(--text-base);
      cursor: pointer;
    }

    .wallet-links {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .wallet-links a {
      color: var(--text-primary);
      text-decoration: none;
      padding: var(--space-sm) 0;
      font-size: var(--text-sm);
    }

    .wallet-links a:hover {
      color: var(--accent);
    }

    .wallet-connect-mobile :global(.mesh-wallet-button) {
      background: var(--bg-raised) !important;
      color: var(--text-primary) !important;
      border: 1px solid var(--border-default) !important;
      border-radius: 6px !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: var(--text-sm) !important;
      min-width: auto !important;
      min-height: auto !important;
      padding: 8px 16px !important;
      width: 100% !important;
    }

    .wallet-connect-mobile :global(.mesh-wallet-button span) {
      color: var(--text-primary) !important;
    }
  }

  /* ── Mesh SDK overrides ── */

  /* Replace "Create API key" dialog title with "connect wallet" */
  :global(.mesh-text-lg.mesh-font-semibold.mesh-tracking-tight) {
    font-size: 0 !important;
  }
  :global(.mesh-text-lg.mesh-font-semibold.mesh-tracking-tight)::after {
    content: 'connect wallet';
    font-size: 1.125rem;
  }

  /* Hide ADA balance, show wallet icon only */
  .wallet-panel-content :global(button.mesh-inline-flex) {
    font-size: 0 !important;
    padding: 0.25rem 0.5rem !important;
  }
  .wallet-panel-content :global(button.mesh-inline-flex img) {
    margin: 0.25rem !important;
  }
  .wallet-panel-content :global(button.mesh-inline-flex span) {
    display: none !important;
  }

  .wallet-connect-mobile :global(button.mesh-inline-flex) {
    font-size: 0 !important;
    padding: 0.25rem 0.5rem !important;
  }
  .wallet-connect-mobile :global(button.mesh-inline-flex img) {
    margin: 0.25rem !important;
  }
  .wallet-connect-mobile :global(button.mesh-inline-flex span) {
    display: none !important;
  }
</style>
