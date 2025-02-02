import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'$assets': fileURLToPath(new URL('./src/assets', import.meta.url))
		}
	}
});
