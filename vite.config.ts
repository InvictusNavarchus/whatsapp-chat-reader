import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import { cfHeaders } from '@navarchus/cf-headers/vite';
import { securityHeadersPreset } from '@navarchus/cf-headers';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(() => {
	return {
		plugins: [
			react(),
			tailwindcss(),
			cloudflare(),
			cfHeaders({
				rules: [
					securityHeadersPreset('/*', {
						hsts: {
							preload: true,
						},
					}),
				],
			}),
		],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
	};
});
