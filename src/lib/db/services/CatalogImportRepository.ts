import { isNull, ne } from 'drizzle-orm';
import { db, withDbLogging } from '$lib/db';
import { artists, tracks } from '$lib/db/schema';

/**
 * Plain row shapes owned by the DB layer. They deliberately do NOT reuse the
 * catalog-source DTOs: `src/lib/server/*` is layer 3 and this file is layer 4, and
 * layer 4 importing from layer 3 would make the Catalog seam un-extractable.
 */
export interface ImportedArtistRow {
	name: string;
	slug: string;
	avatar: string | null;
	coverImg: string | null;
	description: string | null;
	socialLinks: Record<string, string> | null;
	origin: string;
	externalId: string;
	externalUrl: string;
}

export interface ImportedTrackRow {
	title: string;
	duration: number | null;
	audioUrl: string;
	imageUrl: string | null;
	genre: string[] | null;
	audioSource: string;
	externalId: string;
	metadata: Record<string, unknown>;
}

/**
 * The only writer of imported catalog rows. Both methods are idempotent: re-running
 * an import updates the same rows rather than duplicating them, and neither ever
 * touches PDM-side data (chat, comments, likes, subscriptions).
 *
 * Two things here are load-bearing and must not be "simplified" away:
 *
 * 1. `isActive: true` / `isPublished: true`, reconciled on every re-import too (in the
 *    `set` of both `onConflictDoUpdate`s), not only on first insert. Through S2a these
 *    were `false` — the page 404ed regardless (slice S2b), and the audio endpoint had
 *    no working URL for a source-hosted track (slice S2a) — so publishing on import
 *    would have put a real person's name, photo and banner on a page that reads as
 *    their official PDM presence, unofficial notice and all, with no `origin` gate
 *    protecting it either way. Both gates now exist, and the page renders the moment
 *    an artist row exists, so import IS the publish action.
 * 2. `setWhere`. Without it, re-importing an artist who has since claimed their page
 *    overwrites the name, bio and avatar they wrote themselves. `isActive` is inside
 *    that same guard (an artist row's own `set`), so a claimed artist's active/inactive
 *    state stays theirs to manage. Tracks carry no equivalent claimed-guard on their
 *    `onConflictDoUpdate` — a pre-existing gap, unchanged here.
 */
export class CatalogImportRepository {
	/** Returns null when the row exists but is claimed, so nothing was updated. */
	static async upsertArtist(row: ImportedArtistRow): Promise<{ id: string } | null> {
		return withDbLogging('CatalogImportRepository.upsertArtist', async () => {
			const written = await db
				.insert(artists)
				.values({
					userId: null,
					name: row.name,
					slug: row.slug,
					avatar: row.avatar,
					coverImg: row.coverImg,
					description: row.description,
					socialLinks: row.socialLinks,
					origin: row.origin,
					externalId: row.externalId,
					externalUrl: row.externalUrl,
					isActive: true
				})
				// `targetWhere` must repeat the partial index predicate from
				// schemas/artist.ts, or Postgres cannot infer the index and raises 42P10.
				// `ne`/`isNull` are safe here (unlike in the index definition): these run
				// inside a normal statement, so bind params bind.
				.onConflictDoUpdate({
					target: [artists.origin, artists.externalId],
					targetWhere: ne(artists.origin, 'native'),
					setWhere: isNull(artists.claimedAt),
					set: {
						name: row.name,
						avatar: row.avatar,
						coverImg: row.coverImg,
						description: row.description,
						socialLinks: row.socialLinks,
						isActive: true,
						updatedAt: new Date()
					}
				})
				.returning({ id: artists.id });
			return written[0] ? { id: written[0].id } : null;
		});
	}

	static async upsertTracks(
		artistId: string,
		rows: ImportedTrackRow[]
	): Promise<{ imported: number }> {
		if (rows.length === 0) return { imported: 0 };

		return withDbLogging('CatalogImportRepository.upsertTracks', async () => {
			// One statement per track rather than one multi-row insert. A multi-row upsert
			// would have to say `excluded.*` to give each conflicting row its own new value,
			// and Drizzle 0.45 ships no typed helper for that — it would mean hand-written
			// SQL column names no compiler checks. Import is an admin batch over tens of
			// tracks, so N statements is a fair price for zero raw SQL.
			for (const row of rows) {
				await db
					.insert(tracks)
					.values({
						artistId,
						title: row.title,
						duration: row.duration,
						audioUrl: row.audioUrl,
						imageUrl: row.imageUrl,
						genre: row.genre,
						audioSource: row.audioSource,
						externalId: row.externalId,
						// Imported audio skips the R2 upload lifecycle: it is already live.
						status: 'ready',
						isPublished: true,
						visibility: 'public',
						metadata: row.metadata
					})
					.onConflictDoUpdate({
						target: [tracks.audioSource, tracks.externalId],
						targetWhere: ne(tracks.audioSource, 'r2'),
						set: {
							title: row.title,
							duration: row.duration,
							audioUrl: row.audioUrl,
							imageUrl: row.imageUrl,
							isPublished: true,
							updatedAt: new Date()
						}
					});
			}
			return { imported: rows.length };
		});
	}
}
