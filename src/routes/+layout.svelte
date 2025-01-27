<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './$types';
  
  export let data: LayoutData;
</script>

<nav>
  <a href="/">unsigned_algorithms</a>
  <a href="/gallery">Gallery</a>
  <a href="/about">About</a>
</nav>

<main class="container">
  <slot />
</main> 