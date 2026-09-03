/**
 * A URL past this length is not a real URL. Shared so a server-only sanitizer and a
 * client component re-checking the same value at render time can't drift apart.
 */
export const URL_MAX_LENGTH = 2048;

/**
 * Whether `value` is a safe `https:` URL to use as a link/media target: an absolute
 * `https:` URL within `maxLength`. `http:` is rejected too — mixed content silently
 * fails to load anyway.
 *
 * Pure and dependency-free so it can run on both sides of the client/server boundary
 * from the same import — the one thing it does NOT do is the control-character
 * stripping `$lib/server/catalog-source/sanitize.ts` applies before storing a value;
 * this only re-checks a value that is already stored.
 */
export function isHttpsUrl(
	value: string | null | undefined,
	maxLength: number = URL_MAX_LENGTH
): value is string {
	if (typeof value !== 'string') return false;
	if (value.length === 0 || value.length > maxLength) return false;
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}
