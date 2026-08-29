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
	| 'unverified'
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
		opts: { allowUnverified?: boolean } = {}
	): Promise<ImportResult> {
		const artist = await AudiusAdapter.getArtist(externalId);
		if (!artist) return { ok: false, reason: 'not_found' };
		if (artist.isDeactivated) return { ok: false, reason: 'deactivated' };

		if (!artist.isVerified) {
			if (!opts.allowUnverified) return { ok: false, reason: 'unverified' };
			logger.warn('Importing an unverified artist by explicit override', {
				component: 'catalog-source',
				metadata: { externalId, handle: artist.handle, source: artist.source }
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
