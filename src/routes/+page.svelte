<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { unsigs } from '$lib/unsigs';
  import { renderProgressively } from '$lib/unsig/render';

  const TOTAL_UNSIGS = 31119;
  const HOLD_DURATION = 6000;
  const FADE_DURATION = 1500;

  let heroCanvas: HTMLCanvasElement;
  let imageA = $state<string | null>(null);
  let imageB = $state<string | null>(null);
  let showA = $state(true);
  let phase = $state<'rendering' | 'holding' | 'fading' | 'idle'>('idle');
  let railVisible = $state(false);
  let showScrollHint = $state(false);
  let abortController: AbortController | null = null;
  let currentUnsigId = $state<number | null>(null);
  let layerProgress = $state({ current: 0, total: 0 });
  let currentProps = $state<{
    colors: string[];
    distributions: string[];
    rotations: number[];
    multipliers: number[];
  } | null>(null);

  // History for back-navigation (up to 10 entries)
  interface HistoryEntry {
    id: number;
    imageUrl: string;
    props: { colors: string[]; distributions: string[]; rotations: number[]; multipliers: number[] };
    numProps: number;
  }
  let historyEntries = $state<HistoryEntry[]>([]);
  let viewIndex = $state<number | null>(null); // null = live, number = browsing history

  function getHeroRenderDim(): number {
    const availH = window.innerHeight * 0.81;   // 100vh minus 5vh top + 14vh bottom
    const availW = window.innerWidth * 0.92;    // 100vw minus 2 × 4vw inset
    const displaySize = Math.min(availH, availW);
    const pixelSize = Math.ceil(displaySize * (window.devicePixelRatio || 1));
    return Math.min(pixelSize, 2048);
  }

  function getRandomUnsigId(): number {
    // Skip 0 (genesis piece with no properties)
    return Math.floor(Math.random() * (TOTAL_UNSIGS - 1)) + 1;
  }

  function getUnsigData(id: number) {
    const raw = unsigs[String(id)];
    if (!raw) return null;
    return {
      index: raw.index,
      num_props: raw.num_props,
      properties: {
        multipliers: raw.properties.multipliers.map(Number),
        colors: raw.properties.colors,
        distributions: raw.properties.distributions,
        rotations: raw.properties.rotations.map(Number),
      }
    };
  }

  function showHistoryEntry(index: number) {
    const entry = historyEntries[index];
    if (!entry) return;
    viewIndex = index;
    currentUnsigId = entry.id;
    currentProps = entry.props;
    layerProgress = { current: entry.numProps, total: entry.numProps };
    phase = 'holding';
    if (showA) {
      imageB = entry.imageUrl;
      showA = false;
    } else {
      imageA = entry.imageUrl;
      showA = true;
    }
  }

  function navigateBack() {
    if (viewIndex === null) {
      // Live mode — abort and go to previous completed unsig
      abortController?.abort();
      const target = phase === 'rendering'
        ? historyEntries.length - 1   // current isn't in history yet
        : historyEntries.length - 2;  // current is the last entry
      if (target < 0) return;
      showHistoryEntry(target);
    } else if (viewIndex > 0) {
      showHistoryEntry(viewIndex - 1);
    }
  }

  function navigateForward() {
    if (viewIndex === null) return;
    if (viewIndex >= historyEntries.length - 1) {
      // Past the newest — resume live loop
      viewIndex = null;
      abortController = null;
      runHeroLoop();
    } else {
      showHistoryEntry(viewIndex + 1);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateBack();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateForward();
    }
  }

  async function runHeroLoop() {
    if (!browser || !heroCanvas) return;

    while (true) {
      if (abortController?.signal.aborted) return;

      const id = getRandomUnsigId();
      const unsigData = getUnsigData(id);
      if (!unsigData) continue;

      currentUnsigId = id;
      currentProps = unsigData.properties;
      phase = 'rendering';
      layerProgress = { current: 0, total: unsigData.num_props };

      abortController = new AbortController();

      const dataUrl = await renderProgressively(heroCanvas, unsigData, getHeroRenderDim(), {
        layerDelay: 1500,
        onLayerComplete: (layer, total) => {
          layerProgress = { current: layer, total };
          const url = heroCanvas.toDataURL('image/png');
          if (showA) {
            imageB = url;
            showA = false;
          } else {
            imageA = url;
            showA = true;
          }
        },
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      // Push completed unsig to history
      if (dataUrl) {
        historyEntries = [...historyEntries.slice(-9), {
          id,
          imageUrl: dataUrl,
          props: unsigData.properties,
          numProps: unsigData.num_props,
        }];
      }

      // Hold
      phase = 'holding';
      await new Promise(resolve => setTimeout(resolve, HOLD_DURATION));
      if (abortController?.signal.aborted) return;

      // Fade to black
      phase = 'fading';
      await new Promise(resolve => setTimeout(resolve, FADE_DURATION));
      if (abortController?.signal.aborted) return;

      imageA = null;
      imageB = null;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Sample grid images
  function getSampleGridUrls(): string[] {
    const indices: number[] = [];
    while (indices.length < 16) {
      const id = Math.floor(Math.random() * TOTAL_UNSIGS);
      if (!indices.includes(id) && id > 0) indices.push(id);
    }
    return indices.map(id =>
      `https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/128/${id.toString().padStart(5, '0')}.png`
    );
  }

  let sampleUrls = $state<string[]>([]);

  onMount(() => {
    sampleUrls = getSampleGridUrls();

    // Fade in side rail
    setTimeout(() => { railVisible = true; }, 200);
    setTimeout(() => { showScrollHint = true; }, 2000);

    runHeroLoop();

    return () => {
      abortController?.abort();
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="hero-page">
  <!-- Full-viewport hero -->
  <section class="hero-viewport">
    <!-- Hidden render canvas -->
    <canvas bind:this={heroCanvas} class="render-canvas"></canvas>

    <!-- Display layers (ping-pong crossfade) -->
    <div
      class="hero-layer"
      class:visible={showA && imageA !== null}
      class:fading={phase === 'fading'}
      style={imageA ? `background-image: url(${imageA})` : ''}
    ></div>
    <div
      class="hero-layer"
      class:visible={!showA && imageB !== null}
      class:fading={phase === 'fading'}
      style={imageB ? `background-image: url(${imageB})` : ''}
    ></div>

    <!-- Click target to detail page -->
    {#if currentUnsigId !== null}
      <a href="/nft/{currentUnsigId}" class="hero-click-target" aria-label="view unsig #{currentUnsigId.toString().padStart(5, '0')}"></a>
    {/if}

    <!-- Title overlay -->
    <div class="hero-overlay">
      <h1 class="hero-title font-serif italic">unsigned_algorithms</h1>
      <p class="hero-subtitle">31,119 generative color fields</p>
    </div>

    <!-- Unsig info (bottom right) -->
    {#if currentUnsigId !== null && currentProps}
      <div class="hero-info" class:fading={phase === 'fading'}>
        <p class="hero-info-id">#{currentUnsigId.toString().padStart(5, '0')}</p>
        <table class="hero-info-table">
          <thead>
            <tr>
              <th></th>
              <th>distribution</th>
              <th>rotation</th>
              <th>multiplier</th>
            </tr>
          </thead>
          <tbody>
            {#each { length: layerProgress.total } as _, i}
              {#if i < layerProgress.current}
                <tr class="hero-info-row" style="animation-delay: {i * 50}ms">
                  <td><span class="hero-info-color" style="background: {currentProps.colors[i]}"></span></td>
                  <td>{currentProps.distributions[i]}</td>
                  <td>{currentProps.rotations[i]}°</td>
                  <td>{currentProps.multipliers[i]}</td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    <!-- History nav (when browsing) -->
    {#if viewIndex !== null}
      <div class="hero-nav">
        <button class="hero-nav-btn" onclick={navigateBack} disabled={viewIndex <= 0} aria-label="previous">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 1L3 6L8 11" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span class="hero-nav-pos">{viewIndex + 1} / {historyEntries.length}</span>
        <button class="hero-nav-btn" onclick={navigateForward} aria-label="next">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 1L9 6L4 11" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    {/if}

    <!-- Scroll indicator -->
    {#if showScrollHint && viewIndex === null}
      <div class="scroll-hint">
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path d="M8 4L8 20M8 20L2 14M8 20L14 14" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    {/if}
  </section>

  <!-- Secondary section -->
  <section class="explore-section">
    <div class="sample-grid">
      {#each sampleUrls as url, i}
        <div class="sample-tile" style="animation-delay: {i * 30}ms">
          <img src={url} alt="" loading="lazy" />
        </div>
      {/each}
    </div>
    <a href="/gallery" class="explore-link">explore the collection</a>
  </section>
</div>

<style>
  .hero-page {
    background: var(--bg-void);
  }

  .hero-viewport {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: black;
  }

  .render-canvas {
    display: none;
  }

  .hero-layer {
    position: absolute;
    inset: 5vh 4vw 14vh;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0;
    transition: opacity 1.2s ease-in-out;
  }

  .hero-layer.visible {
    opacity: 1;
  }

  .hero-layer.fading {
    opacity: 0;
  }

  .hero-click-target {
    position: absolute;
    inset: 0;
    z-index: 5;
    cursor: pointer;
  }

  .hero-overlay {
    position: absolute;
    bottom: var(--space-xl);
    left: var(--space-xl);
    z-index: 10;
    mix-blend-mode: difference;
    color: white;
    pointer-events: none;
  }

  .hero-title {
    font-size: var(--text-2xl);
    line-height: 1;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .hero-subtitle {
    font-size: var(--text-sm);
    margin: var(--space-sm) 0 0 0;
    opacity: 0.7;
  }

  .hero-info {
    position: absolute;
    bottom: var(--space-xl);
    right: var(--space-xl);
    z-index: 10;
    text-align: right;
    mix-blend-mode: difference;
    color: white;
    transition: opacity 1.2s ease-in-out;
    pointer-events: none;
  }

  .hero-info.fading {
    opacity: 0;
  }

  .hero-info-id {
    font-size: var(--text-sm);
    opacity: 0.5;
    margin: 0 0 var(--space-xs) 0;
    text-align: right;
  }

  .hero-info-table {
    border-collapse: collapse;
    font-size: var(--text-xs);
  }

  .hero-info-table th {
    font-weight: 400;
    opacity: 0.25;
    text-align: right;
    padding: 0 0 2px var(--space-sm);
    white-space: nowrap;
  }

  .hero-info-table th:first-child {
    padding-left: 0;
  }

  .hero-info-table td {
    text-align: right;
    padding: 1px 0 1px var(--space-sm);
    opacity: 0.4;
    white-space: nowrap;
  }

  .hero-info-table td:first-child {
    padding-left: 0;
    opacity: 1;
  }

  .hero-info-row {
    opacity: 0;
    animation: layerIn 0.4s ease-out forwards;
  }

  .hero-info-color {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 1px;
    vertical-align: middle;
  }

  @keyframes layerIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hero-nav {
    position: absolute;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: rgba(255, 255, 255, 0.5);
  }

  .hero-nav-btn {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: var(--space-xs);
    opacity: 0.5;
    transition: opacity 0.15s;
  }

  .hero-nav-btn:hover:not(:disabled) {
    opacity: 1;
  }

  .hero-nav-btn:disabled {
    opacity: 0.2;
    cursor: default;
  }

  .hero-nav-pos {
    font-size: var(--text-xs);
    opacity: 0.4;
    min-width: 3em;
    text-align: center;
  }

  .scroll-hint {
    position: absolute;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.3);
    animation: scrollPulse 2s ease-in-out infinite;
    z-index: 10;
  }

  @keyframes scrollPulse {
    0%, 100% { opacity: 0.3; transform: translateX(-50%) translateY(0); }
    50% { opacity: 0.6; transform: translateX(-50%) translateY(4px); }
  }

  .explore-section {
    padding: var(--space-2xl) var(--space-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xl);
  }

  .sample-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    max-width: 512px;
    width: 100%;
  }

  .sample-tile {
    aspect-ratio: 1;
    overflow: hidden;
    opacity: 0;
    animation: tileIn 0.3s ease-out forwards;
  }

  .sample-tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  @keyframes tileIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .explore-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: var(--text-sm);
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--border-default);
    transition: color 0.15s, border-color 0.15s;
  }

  .explore-link:hover {
    color: var(--accent);
    border-color: var(--border-focus);
  }

  @media (max-width: 768px) {
    .hero-title {
      font-size: var(--text-xl);
    }

    .hero-overlay {
      top: var(--space-md);
      bottom: auto;
      left: var(--space-lg);
    }

    .hero-info {
      bottom: var(--space-lg);
      right: var(--space-lg);
    }

    .hero-nav {
      bottom: var(--space-md);
    }

    .sample-grid {
      max-width: 100%;
    }

    .explore-section {
      padding: var(--space-xl) var(--space-md);
    }
  }
</style>
