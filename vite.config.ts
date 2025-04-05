import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
		sveltekit(),
		nodePolyfills({
			globals: {
				global: true,
				process: true,
				Buffer: true
			}
		})
	],
	resolve: {
		alias: {
			'$assets': fileURLToPath(new URL('./src/assets', import.meta.url))
		}
	}
});
