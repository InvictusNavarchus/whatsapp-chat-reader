import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(() => {
	return {
		plugins: [react(), tailwindcss(), cloudflare()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, '.'),
			},
		},
	};
});
