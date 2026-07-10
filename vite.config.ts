import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
			},
			adapter: adapter(),
		}),
		tailwindcss(),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, '.'),
		},
	},
	server: {
		// HMR is disabled in AI Studio via DISABLE_HMR env var.
		// Do not modify—file watching is disabled to prevent flickering during agent edits.
		hmr: process.env.DISABLE_HMR !== 'true',
		// Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
		watch: process.env.DISABLE_HMR === 'true' ? null : {},
	},
});
