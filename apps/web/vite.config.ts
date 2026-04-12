import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	envPrefix: ['VITE_', 'PUBLIC_'],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
		},
	},
	preview: {
		allowedHosts: ['tools.cuny.qzz.io'],
	},
});
