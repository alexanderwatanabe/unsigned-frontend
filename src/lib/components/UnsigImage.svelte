<script lang="ts">
	import { browser } from '$app/environment';
	import { generateImage, getCachedUrl } from '$lib/unsig/image-cache';

	interface Props {
		id: number;
		dim?: number;
		alt?: string;
		class?: string;
	}

	let { id, dim = 128, alt = '', class: className = '' }: Props = $props();

	let url = $state<string | null>(null);

	$effect(() => {
		if (!browser) return;

		// Check cache synchronously for instant render
		const cached = getCachedUrl(id, dim);
		if (cached) {
			url = cached;
			return;
		}

		// Reset while generating
		url = null;

		generateImage(id, dim).then((dataUrl) => {
			url = dataUrl;
		});
	});
</script>

{#if url}
	<img src={url} alt={alt || `unsig #${id.toString().padStart(5, '0')}`} class={className} />
{:else}
	<div class="placeholder {className}" aria-label={alt || `unsig #${id.toString().padStart(5, '0')}`}></div>
{/if}

<style>
	.placeholder {
		background: black;
		aspect-ratio: 1;
	}

	img {
		aspect-ratio: 1;
	}
</style>
