import { defineConfig } from 'vite';
import path from 'path';

/**
 * Config for admin scripts run through `vite-node` (see `scripts/`).
 *
 * The main `vite.config.ts` loads the `sveltekit()` plugin, which throws
 * "An impossible situation occurred" when it is asked to resolve `$app/*` outside a
 * real build or dev server. Scripts do not need SvelteKit at all — they only need the
 * `$lib` alias and a `dev` flag — so this config skips the plugin and aliases
 * `$app/environment` to a small stub.
 */
export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			$styles: path.resolve('./src/styles'),
			'$app/environment': path.resolve('./scripts/app-environment.stub.ts'),
			'$env/static/private': path.resolve('./scripts/env-static-private.stub.ts')
		}
	}
});
