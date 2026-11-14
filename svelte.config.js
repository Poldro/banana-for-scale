import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Fully static site: levels are a JSON file and images ship in /static.
		adapter: adapter({ fallback: '404.html' }),
		// "#banana"-style hashes are app state handled in JS, not element ids.
		prerender: { handleMissingId: 'ignore' }
	}
};

export default config;
