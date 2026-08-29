/**
 * Stand-in for SvelteKit's generated `$env/static/private`, used only by
 * `vite.config.script.ts`.
 *
 * That module is produced by the `sveltekit()` plugin, which admin scripts do not load
 * (see the stub for `$app/environment`). The names below are the ones the import chain
 * pulls in — `R2Service` and `ContentService` sit behind `$lib/db/queries`, so they are
 * loaded even by a script that never touches R2.
 *
 * Values are forwarded from `process.env`, which `dotenv/config` has already populated,
 * so anything that genuinely does reach R2 still works. Nothing is hardcoded and no
 * secret is stored here.
 */
export const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? '';
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? '';
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
export const PUBLIC_R2_IMAGES_BUCKET = process.env.PUBLIC_R2_IMAGES_BUCKET ?? '';
