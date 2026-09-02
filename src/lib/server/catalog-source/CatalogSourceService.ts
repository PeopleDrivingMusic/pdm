import { AudiusAdapter } from './adapters/AudiusAdapter';
import {
	CatalogImportRepository,
	type ImportedArtistRow,
	type ImportedTrackRow
} from '$lib/db/services/CatalogImportRepository';
import { ArtistService } from '$lib/db/queries';
import { logger } from '$lib/utils/logger';
import type { ExternalArtist, ExternalTrack } from './types';

/** What a human needs in order to tell a real artist from a same-named impostor. */
export interface ArtistCandidate {
	externalId: string;
	handle: string;
	name: string;
	followerCount: number;
	trackCount: number;
	isVerified: boolean;
	externalUrl: string;
}

export type ImportRefusal =
	| 'not_found'
	| 'name_conflict'
	| 'deactivated'
	| 'no_tracks'
	| 'slug_taken'
	| 'already_claimed';

export type ImportResult =
	| { ok: true; artistId: string; slug: string; tracksImported: number }
	| { ok: false; reason: ImportRefusal };

/**
 * Application boundary for importing catalog from an external source. Returns only
 * primitives — no Drizzle row and no adapter type crosses this seam, so the
 * in-process implementation can become a remote Catalog client later.
 *
 * `lookupArtist` is deliberately separate from `importArtist`, and `importArtist`
 * takes an id resolved through the source's id endpoint: a search for a well-known
 * name returns several accounts using it, and picking one automatically would
 * eventually seed a page under a real artist's name from an impostor's uploads.
 */
export class CatalogSourceService {
	static async lookupArtist(query: string): Promise<ArtistCandidate[]> {
		const found = await AudiusAdapter.searchArtists(query);
		return found.map(toCandidate);
	}

	static async importArtist(
		externalId: string,
		opts: { allowNameConflict?: boolean } = {}
	): Promise<ImportResult> {
		const artist = await AudiusAdapter.getArtist(externalId);
		if (!artist) return { ok: false, reason: 'not_found' };
		if (artist.isDeactivated) return { ok: false, reason: 'deactivated' };

		if (await hasVerifiedNamesake(artist)) {
			if (!opts.allowNameConflict) return { ok: false, reason: 'name_conflict' };
			logger.warn('Importing over a verified namesake by explicit override', {
				component: 'catalog-source',
				metadata: { externalId, handle: artist.handle, name: artist.name, source: artist.source }
			});
		}

		// Gate on what is actually playable, not the source's own track_count: gated,
		// unlisted and deleted tracks are filtered out by the adapter.
		const tracks = await AudiusAdapter.listTracks(artist.externalId);
		if (tracks.length === 0) return { ok: false, reason: 'no_tracks' };

		// `artists.slug` is globally unique, so a handle colliding with an existing PDM
		// artist would otherwise surface as an unhandled unique_violation on first import.
		const slug = artist.handle.toLowerCase();
		const existing = await ArtistService.getArtistBySlug(slug);
		const sameArtist =
			existing?.origin === artist.source && existing?.externalId === artist.externalId;
		if (existing && !sameArtist) return { ok: false, reason: 'slug_taken' };

		const written = await CatalogImportRepository.upsertArtist(toArtistRow(artist, slug));
		// null means the row exists but is claimed, so `setWhere` suppressed the update.
		if (!written) return { ok: false, reason: 'already_claimed' };

		const { imported } = await CatalogImportRepository.upsertTracks(
			written.id,
			tracks.map(toTrackRow)
		);

		return { ok: true, artistId: written.id, slug, tracksImported: imported };
	}
}

/**
 * True when someone else, verified by the source, publishes under the same display name.
 *
 * This replaced a blanket `is_verified === true` requirement. That default refused three
 * quarters of the source's catalog — 353 of 1288 trending artists were verified when
 * sampled on 2026-09-02 — and the quarter it admitted is precisely the wrong quarter:
 * established names who will never claim a PDM page, while the unverified long tail is
 * the segment a $1-per-artist subscription exists for.
 *
 * The risk `is_verified` was standing in for is impersonation, and follower count is the
 * wrong axis for it. Probed live on 2026-09-02: the impostor `deadmau54321` has 704
 * followers against the real `deadmau5`'s 94,922, so any floor on account size lets it
 * straight through — it is small *because* it is fake. What actually gives it away is
 * that it publishes under the display name `deadmau5`, byte for byte.
 *
 * So the gate asks the only question that matters: does this name already belong to
 * someone the source has confirmed? Only a verified account can establish that; two
 * unverified namesakes tell us nothing about which is real.
 *
 * Comparison is on the normalised display name, not the handle: handles must be unique on
 * the source, so an impostor's handle is always different by construction, while the name
 * is the part a listener actually reads.
 *
 * Deliberately exact rather than fuzzy. A substring or edit-distance rule would refuse
 * every artist whose short name happens to sit inside a bigger one, and the cost of a
 * false refusal is a real indie artist silently missing from the platform.
 */
async function hasVerifiedNamesake(artist: ExternalArtist): Promise<boolean> {
	// The source already vouched for this account; nothing left to disambiguate.
	if (artist.isVerified) return false;

	const name = normaliseName(artist.name);
	if (!name) return true;

	let namesakes: ExternalArtist[];
	try {
		namesakes = await AudiusAdapter.searchArtists(artist.name);
	} catch (err) {
		// Fail closed. An unreachable source is not evidence that a name is free, and an
		// import wrongly waved through puts a real person's name and photo on our page.
		logger.warn('Namesake check failed; refusing the import rather than assuming', {
			component: 'catalog-source',
			metadata: { externalId: artist.externalId, error: String(err) }
		});
		return true;
	}

	// No `externalId` self-comparison: this line is only reached for an unverified
	// artist, so a verified match is by definition a different account.
	return namesakes.some((other) => other.isVerified && normaliseName(other.name) === name);
}

/** Case- and punctuation-insensitive, so `Dead Mau5!` and `deadmau5` are one name. */
function normaliseName(value: string): string {
	return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function toCandidate(a: ExternalArtist): ArtistCandidate {
	return {
		externalId: a.externalId,
		handle: a.handle,
		name: a.name,
		followerCount: a.followerCount,
		trackCount: a.trackCount,
		isVerified: a.isVerified,
		externalUrl: a.externalUrl
	};
}

/** DTO → plain row. Mapping lives here so the DB layer never imports from `$lib/server`. */
function toArtistRow(a: ExternalArtist, slug: string): ImportedArtistRow {
	return {
		name: a.name,
		slug,
		avatar: a.avatarUrl,
		coverImg: a.bannerUrl,
		description: a.bio,
		socialLinks: Object.keys(a.socials).length > 0 ? a.socials : null,
		origin: a.source,
		externalId: a.externalId,
		externalUrl: a.externalUrl
	};
}

function toTrackRow(t: ExternalTrack): ImportedTrackRow {
	return {
		title: t.title,
		duration: t.durationSeconds,
		audioUrl: t.streamUrl,
		imageUrl: t.imageUrl,
		genre: t.genre ? [t.genre] : null,
		audioSource: t.source,
		externalId: t.externalId,
		metadata: { license: t.license, isrc: t.isrc }
	};
}
