/**
 * Single source of truth for content visibility + status values, their derived
 * types, and normalizers. Import these instead of hardcoding the literals in
 * route handlers, services, or components — change a tier in one place and every
 * consumer follows.
 *
 * Pure constants/types only (no server imports), so client components can
 * import the types too.
 */

export const CONTENT_VISIBILITY_VALUES = ['public', 'subscribers'] as const;
export type ContentVisibility = (typeof CONTENT_VISIBILITY_VALUES)[number];

export const CONTENT_STATUS_VALUES = ['draft', 'scheduled', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUS_VALUES)[number];

const STATUS_SET = new Set<string>(CONTENT_STATUS_VALUES);

/**
 * Coerce any incoming value to a valid visibility. Only an explicit
 * `'subscribers'` is restricted; everything else (including `null`/`undefined`
 * and any unknown value) defaults to `'public'`. Kept as one shared helper so
 * the coercion isn't duplicated across every write handler and read mapping.
 */
export function normalizeContentVisibility(value: unknown): ContentVisibility {
	return value === 'subscribers' ? 'subscribers' : 'public';
}

/** Coerce any incoming value to a valid status, falling back to `fallback`. */
export function normalizeContentStatus(
	value: unknown,
	fallback: ContentStatus = 'draft'
): ContentStatus {
	return typeof value === 'string' && STATUS_SET.has(value) ? (value as ContentStatus) : fallback;
}
