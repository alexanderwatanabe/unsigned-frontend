<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { BrowserWalletState } from '@meshsdk/svelte';
  import CompositionBuilder from '$lib/components/CompositionBuilder.svelte';

  // Redirect to home if wallet is not connected
  $effect(() => {
    if (browser && !BrowserWalletState.connected) {
      goto('/');
    }
  });
</script>

<svelte:head>
  <title>composition builder | unsigned algorithms</title>
</svelte:head>

<div class="composition-page">
  <CompositionBuilder mode="owned"/>
</div>

<style>
  .composition-page {
    height: calc(100vh - 64px);
    margin-top: -16px;
  }
</style> 