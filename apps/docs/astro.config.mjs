import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
	output: 'static',
	integrations: [mdx()],
	markdown: {
		shikiConfig: {
			theme: 'github-light',
		},
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
