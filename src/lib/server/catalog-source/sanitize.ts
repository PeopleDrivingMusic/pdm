/**
 * Ingest guards for third-party catalog data.
 *
 * Everything an adapter returns was chosen by someone outside PDM — a display name, a
 * bio, and image URLs served by community-run discovery nodes. Two things follow:
 *
 * 1. Nothing may reach the database unbounded. Our columns are `varchar`, and an
 *    over-long value is a Postgres 22001 that crashes an import rather than refusing it.
 * 2. Nothing may reach the database as a URL we have not checked. S2b renders the source
 *    profile as an `href` and the social handles as links, so a `javascript:` value or a
 *    full URL smuggled in where a handle belongs becomes stored XSS or an open redirect.
 *    Validating at ingest means it is impossible for such a value to be stored at all,
 *    which is a stronger guarantee than escaping correctly at every render site later.
 *
 * These live outside the adapters so a second source inherits them.
 */

/** Mirrors the column widths in `schemas/artist.ts` and `schemas/catalog.ts`. */
export const LIMITS = {
	name: 100,
	slug: 100,
	externalId: 64,
	title: 200,
	genre: 50,
	/** `description` is `text`; bounded anyway so one hostile bio cannot bloat a row. */
	description: 5000,
	/** `avatar`/`cover_img`/`audio_url` are `text`; a URL past this is not a real URL. */
	url: 2048,
	socialHandle: 100
} as const;

// Control characters and the Unicode line/paragraph separators. Stripped rather than
// rejected: they carry no meaning in a name, and left in they corrupt logs and layout.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

/** A bare handle: word characters, dot and dash. No scheme, path, query or space. */
const HANDLE = /^[\w.-]+$/;

/**
 * A trimmed, control-stripped string capped at `max`, or null if nothing is left.
 * Display strings are truncated rather than refused — losing the tail of a bio is a
 * far smaller harm than failing the whole import, or than an unhandled 22001.
 */
export function bounded(value: string | null | undefined, max: number): string | null {
	if (typeof value !== 'string') return null;
	const clean = value.replace(CONTROL, '').trim();
	return clean.length === 0 ? null : clean.slice(0, max);
}

/**
 * The value if it is an absolute `https:` URL within `LIMITS.url`, else null.
 * `http:` is rejected too: a mixed-content image silently fails to load anyway, and
 * every source we accept serves TLS.
 */
export function httpsUrl(value: string | null | undefined): string | null {
	if (typeof value !== 'string') return null;
	const clean = value.replace(CONTROL, '').trim();
	if (clean.length === 0 || clean.length > LIMITS.url) return null;
	let parsed: URL;
	try {
		parsed = new URL(clean);
	} catch {
		return null;
	}
	return parsed.protocol === 'https:' ? clean : null;
}

/**
 * An external id, never truncated: a shortened id silently names a different record,
 * which would attach one artist's tracks to another. Refuse instead.
 */
export function externalIdOrNull(value: string | null | undefined): string | null {
	if (typeof value !== 'string') return null;
	const clean = value.trim();
	if (clean.length === 0 || clean.length > LIMITS.externalId) return null;
	return HANDLE.test(clean) ? clean : null;
}

/**
 * A bare social handle with any leading `@` removed, or null.
 *
 * Sources store these as handles, and S2b turns them into links by prefixing a known
 * network base. A value that is itself a URL would therefore escape that base entirely,
 * so anything that is not a plain handle is dropped rather than repaired.
 */
export function socialHandle(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const clean = value.replace(CONTROL, '').trim().replace(/^@/, '');
	if (clean.length === 0 || clean.length > LIMITS.socialHandle) return null;
	return HANDLE.test(clean) ? clean : null;
}
