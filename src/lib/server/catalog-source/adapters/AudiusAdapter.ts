import { logger } from '$lib/utils/logger';
import type { ExternalArtist, ExternalTrack } from '../types';

const BASE = 'https://api.audius.co/v1';
const APP_NAME = 'PDM';
const PROFILE_BASE = 'https://audius.co';

/**
 * The ONLY file that knows Audius field names. Everything it returns is our own
 * shape, so replacing this adapter — or adding a second source — touches nothing
 * else. Every endpoint here was verified against the live API on 2026-08-29.
 */
export class AudiusAdapter {
	/** The endpoint's own maximum; `limit=500` is rejected with 400 `limit is invalid`. */
	static readonly PAGE_SIZE = 100;
	/** A backstop against a source that never returns a short page. */
	static readonly MAX_TRACKS = 1000;

	static async searchArtists(query: string): Promise<ExternalArtist[]> {
		const raw = await get<{ data: AudiusUser[] }>(
			`/users/search?query=${encodeURIComponent(query)}`,
			'users/search'
		);
		return raw.data.map(toExternalArtist);
	}

	/**
	 * Resolve one artist by id. This MUST NOT go through search: Audius search matches
	 * names and handles, not ids — `?query=LKdlD` does not return LKdlD. Returns null
	 * rather than a best guess, because a wrong guess here seeds a page under one
	 * artist's name out of another account's uploads.
	 */
	static async getArtist(externalId: string): Promise<ExternalArtist | null> {
		const raw = await getOrNull<{ data: AudiusUser | null }>(
			`/users/${encodeURIComponent(externalId)}`,
			'users/get'
		);
		return raw?.data ? toExternalArtist(raw.data) : null;
	}

	/**
	 * Every playable track, paged. The endpoint defaults to 20 items and caps `limit` at
	 * 100 (`limit=500` is rejected with 400 `limit is invalid`), so an un-paged call
	 * silently truncated any artist with more than 20 tracks — and because import is an
	 * upsert, a re-run never recovered the remainder.
	 *
	 * Paging advances on how many rows the SOURCE returned, not on how many survived the
	 * import gates: a page of 100 gated tracks is still a full page.
	 */
	static async listTracks(externalId: string): Promise<ExternalTrack[]> {
		const id = encodeURIComponent(externalId);
		const found: ExternalTrack[] = [];

		for (let offset = 0; offset < AudiusAdapter.MAX_TRACKS; offset += AudiusAdapter.PAGE_SIZE) {
			const raw = await get<{ data: AudiusTrack[] }>(
				`/users/${id}/tracks?limit=${AudiusAdapter.PAGE_SIZE}&offset=${offset}`,
				'users/tracks'
			);
			const page = raw.data ?? [];
			for (const t of page) {
				const mapped = AudiusAdapter.toExternalTrack(t);
				if (mapped) found.push(mapped);
			}
			// A short page is the last page.
			if (page.length < AudiusAdapter.PAGE_SIZE) return found;
		}

		logger.warn('audius: track listing hit the page cap; artist may have more', {
			component: 'catalog-source',
			metadata: { externalId, cap: AudiusAdapter.MAX_TRACKS }
		});
		return found;
	}

	/** The stable endpoint. It 302s to a signed URL at request time — never store that. */
	static streamUrlFor(externalId: string): string {
		// Encoded like every other id here: this string is stored and later handed to a
		// browser as an audio source, so a `?`, `#` or `..` in an id must not retarget it.
		return `${BASE}/tracks/${encodeURIComponent(externalId)}/stream`;
	}

	/**
	 * Returns null for any track we must not import. Six independent flags can make a
	 * track unplayable or private; a token-gated one would import cleanly and only fail
	 * when a listener pressed play, and an unlisted one was deliberately taken out of
	 * public view by its artist.
	 */
	static toExternalTrack(raw: AudiusTrack): ExternalTrack | null {
		const playable =
			raw.is_streamable === true &&
			raw.is_available === true &&
			raw.access?.stream === true &&
			raw.is_stream_gated !== true &&
			raw.is_unlisted !== true &&
			raw.is_delete !== true;
		if (!playable) return null;

		return {
			source: 'audius',
			externalId: raw.id,
			title: raw.title,
			durationSeconds: raw.duration ?? null,
			genre: raw.field_visibility?.genre === false ? null : (raw.genre ?? null),
			imageUrl: pick(raw.artwork, '1000x1000'),
			streamUrl: AudiusAdapter.streamUrlFor(raw.id),
			releaseDate: raw.release_date ? new Date(raw.release_date) : null,
			playCount: raw.field_visibility?.play_count === false ? null : (raw.play_count ?? null),
			license: raw.license ?? null,
			isrc: raw.isrc ?? null
		};
	}
}

function toExternalArtist(raw: AudiusUser): ExternalArtist {
	const socials: Record<string, string> = {};
	if (raw.twitter_handle) socials.twitter = raw.twitter_handle;
	if (raw.instagram_handle) socials.instagram = raw.instagram_handle;

	return {
		source: 'audius',
		externalId: raw.id,
		handle: raw.handle,
		name: raw.name,
		bio: raw.bio ?? null,
		avatarUrl: pick(raw.profile_picture, '1000x1000'),
		bannerUrl: pick(raw.cover_photo, '2000x'),
		externalUrl: `${PROFILE_BASE}/${raw.handle}`,
		socials,
		followerCount: raw.follower_count ?? 0,
		trackCount: raw.track_count ?? 0,
		isVerified: raw.is_verified === true,
		isDeactivated: raw.is_deactivated === true,
		walletAddress: raw.erc_wallet ?? null
	};
}

/**
 * Image maps carry a `mirrors: string[]` key alongside the size keys, so a size is
 * read by name and the value is type-checked before use.
 */
function pick(image: AudiusImage | null | undefined, size: string): string | null {
	const value = image?.[size];
	return typeof value === 'string' ? value : null;
}

async function get<T>(path: string, label: string): Promise<T> {
	const res = await fetch(url(path));
	if (!res.ok) throw new Error(`audius: ${label} failed with ${res.status}`);
	return (await res.json()) as T;
}

/**
 * Like `get`, but "no such artist" is null rather than a throw.
 *
 * Audius answers an unknown OR malformed id with 400 `invalid userId`, never 404
 * (probed live 2026-08-30) — so a 404-only guard turned every mistyped id into a thrown
 * stack trace instead of the `not_found` refusal the import script explains. Both codes
 * are treated as absence; this helper is only ever used for by-id lookups, where a 400
 * is definitionally "that id does not name anything". Anything else still throws,
 * because an outage must not be mistaken for a missing artist.
 */
async function getOrNull<T>(path: string, label: string): Promise<T | null> {
	const res = await fetch(url(path));
	if (res.status === 404 || res.status === 400) return null;
	if (!res.ok) throw new Error(`audius: ${label} failed with ${res.status}`);
	return (await res.json()) as T;
}

function url(path: string): string {
	return `${BASE}${path}${path.includes('?') ? '&' : '?'}app_name=${APP_NAME}`;
}

/** Size keys plus a `mirrors` array — hence the union value type. */
type AudiusImage = Record<string, string | string[] | undefined>;

// Only the fields we read. Audius returns far more; deliberately not modelled.
interface AudiusUser {
	id: string;
	handle: string;
	name: string;
	bio?: string | null;
	follower_count?: number;
	track_count?: number;
	is_verified?: boolean;
	is_deactivated?: boolean;
	erc_wallet?: string | null;
	twitter_handle?: string | null;
	instagram_handle?: string | null;
	profile_picture?: AudiusImage | null;
	cover_photo?: AudiusImage | null;
}

interface AudiusTrack {
	id: string;
	title: string;
	duration?: number | null;
	genre?: string | null;
	release_date?: string | null;
	play_count?: number | null;
	license?: string | null;
	isrc?: string | null;
	is_streamable?: boolean;
	is_available?: boolean;
	is_stream_gated?: boolean;
	is_unlisted?: boolean;
	is_delete?: boolean;
	access?: { stream?: boolean; download?: boolean };
	field_visibility?: Record<string, boolean>;
	artwork?: AudiusImage | null;
}
