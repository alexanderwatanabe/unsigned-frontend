<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './$types';
  import { injectAnalytics } from '@vercel/analytics/sveltekit'
  export let data: LayoutData;
</script>

<nav>
  <a href="/">unsigned_algorithms</a>
  <a href="/gallery">gallery</a>
  <a href="/about">about</a>
</nav>

<main class="container">
  <slot />
</main> 