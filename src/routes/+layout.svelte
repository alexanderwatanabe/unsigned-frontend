<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './$types';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
</script>

<nav>
  <a href="/">unsigned_algorithms</a>
  <a href="/gallery">gallery</a>
  <a href="/about">about</a>
</nav>

<main class="container">
  <slot />
</main> 