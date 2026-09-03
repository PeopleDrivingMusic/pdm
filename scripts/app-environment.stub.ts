/**
 * Stand-in for SvelteKit's `$app/environment`, used only by `vite.config.script.ts`.
 *
 * Admin scripts run outside any SvelteKit build, and the `sveltekit()` plugin throws
 * "An impossible situation occurred" when asked to resolve `$app/*` there. The single
 * thing the import chain actually needs is `dev` (read by `src/lib/utils/logger.ts`),
 * so the script config aliases this file in instead of loading the plugin.
 */
export const dev = false;
export const browser = false;
export const building = false;
export const version = 'script';
