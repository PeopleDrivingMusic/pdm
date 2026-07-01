import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$styles: path.resolve('./src/styles')
		}
	},
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@use '$styles/variables' as *;`
			}
		}
	},
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			include: [
				'src/lib/server/music/**',
				'src/lib/server/events/**',
				'src/lib/server/media/validation.ts',
				'src/lib/server/security/**'
			],
			// Barrel re-exports and type-only modules carry no testable logic.
			exclude: ['**/index.ts', '**/types.ts'],
			thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 }
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
