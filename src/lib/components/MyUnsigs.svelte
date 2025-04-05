<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { BrowserWalletState } from '@meshsdk/svelte';

  function handleClick() {
    goto('/my-unsigs');
  }
</script>

{#if browser && BrowserWalletState.connected}
  <button
    onclick={handleClick}
    class="text-white font-medium py-2 px-4 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors duration-200 inline-flex items-center"
  >
    my unsigs
  </button>
{/if} 