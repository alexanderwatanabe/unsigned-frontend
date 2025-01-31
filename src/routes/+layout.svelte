<script lang="ts">
  import '../app.css';
  import '$lib/polyfills';
  import type { LayoutData } from './$types';
  import { injectAnalytics } from '@vercel/analytics/sveltekit'
  import WalletConnect from '$lib/components/WalletConnect.svelte'
  export let data: LayoutData;

</script>

<nav class="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 z-50">
  <div class="absolute inset-0 bg-white"></div>
  <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="h-16">
      <div class="flex flex-row items-center justify-between h-full">
        <div class="flex items-center gap-6">
          <a href="/" class="text-xl font-bold text-gray-900">unsigned_algorithms</a>
          <a href="/gallery" class="text-gray-600 hover:text-gray-900 font-medium">gallery</a>
          <a href="/about" class="text-gray-600 hover:text-gray-900 font-medium">about</a>
          <WalletConnect />
        </div>
      </div>
    </div>
  </div>
</nav>

<div class="pt-16">
  <main class="container mx-auto px-4 py-8">
    <slot />
  </main>
</div>

<style>
  /* Add any custom styles here if needed */
  nav {
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    position: fixed;
    width: 100%;
    isolation: isolate;
  }
  
  /* Ensure proper spacing for mobile */
  @media (max-width: 768px) {
    nav a {
      font-size: 0.9rem;
    }
  }

  .nav-button.disabled {
    display: none;
  }
</style> 