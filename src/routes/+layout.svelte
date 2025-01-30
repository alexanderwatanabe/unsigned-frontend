<script lang="ts">
  import '../app.css';
  import '$lib/polyfills';
  import type { LayoutData } from './$types';
  import { injectAnalytics } from '@vercel/analytics/sveltekit'
  import WalletConnect from '$lib/components/WalletConnect.svelte'
  export let data: LayoutData;
</script>

<nav class="fixed top-0 left-0 right-0 bg-white border-b z-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <div class="flex items-center space-x-8">
        <a href="/" class="text-xl font-bold text-gray-900">unsigned_algorithms</a>
        <div class="hidden md:flex items-center space-x-6">
          <a href="/gallery" class="text-gray-600 hover:text-gray-900 font-medium">Gallery</a>
          <a href="/about" class="text-gray-600 hover:text-gray-900 font-medium">About</a>
        </div>
      </div>
      <div class="flex items-center">
        <WalletConnect />
      </div>
    </div>
  </div>
</nav>

<main class="container mx-auto px-4 py-8 mt-16">
  <slot />
</main> 