/**
 * Whether a page still gets the seeded-artist treatment: a free pre-claim
 * subscription, an open-to-everyone chat, the unofficial-page banner. All three
 * end the moment the artist claims their page — `origin` never changes (it
 * records where the catalog came from), but `claimedAt` does, and that's the
 * fact that actually matters here.
 *
 * Pure and dependency-free so it can run on both sides of the client/server
 * boundary from the same import.
 */
export function isSeededUnclaimed(artist: {
	origin: string;
	claimedAt: Date | string | null;
}): boolean {
	return artist.origin !== 'native' && !artist.claimedAt;
}
