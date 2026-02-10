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

      <div
        class="wallet-inline"
        onmouseenter={() => hoveredNav = 'wallet'}
        onmouseleave={() => hoveredNav = null}
      >
        <CardanoWallet
          label={BrowserWalletState.connected ? 'wallet' : 'cw'}
        />
        {#if hoveredNav === 'wallet' && !(browser && BrowserWalletState.connected)}
          <span class="nav-tooltip">connect wallet</span>
        {/if}
      </div>
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
    <div class="wallet-inline-mobile">
      <CardanoWallet
        label={BrowserWalletState.connected ? 'wallet' : 'cw'}
      />
    </div>
  </nav>

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

  .wallet-inline {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* All mesh buttons in the rail: strip SDK styling */
  .wallet-inline :global(.mesh-inline-flex) {
    background: none !important;
    color: var(--text-primary) !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: var(--text-xs) !important;
    min-width: auto !important;
    min-height: auto !important;
    height: auto !important;
    padding: 4px !important;
    cursor: pointer !important;
  }

  .wallet-inline :global(.mesh-inline-flex:hover) {
    color: var(--accent) !important;
    background: none !important;
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
      position: relative;
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

    .wallet-inline-mobile {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 48px;
    }

    .wallet-inline-mobile :global(.mesh-inline-flex) {
      background: none !important;
      color: var(--text-primary) !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: var(--text-xs) !important;
      min-width: auto !important;
      min-height: auto !important;
      height: auto !important;
      padding: 4px 8px !important;
    }

    .wallet-inline-mobile :global(.mesh-inline-flex:hover) {
      color: var(--accent) !important;
      background: none !important;
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

  /* Connected state: hide ADA balance text, show wallet icon only */
  .wallet-inline :global(.mesh-inline-flex:has(img)) {
    font-size: 0 !important;
  }
  .wallet-inline :global(.mesh-inline-flex img) {
    width: 20px !important;
    height: 20px !important;
    margin: 0 !important;
  }
  .wallet-inline :global(.mesh-inline-flex span) {
    display: none !important;
  }

  .wallet-inline-mobile :global(.mesh-inline-flex:has(img)) {
    font-size: 0 !important;
  }
  .wallet-inline-mobile :global(.mesh-inline-flex img) {
    width: 20px !important;
    height: 20px !important;
    margin: 0 !important;
  }
  .wallet-inline-mobile :global(.mesh-inline-flex span) {
    display: none !important;
  }
</style>
