/** Every catalog source we can import from. One today; the seam exists for a second. */
export type CatalogSource = 'audius';

/**
 * An artist as it exists in an external source, already normalised. Nothing
 * source-shaped survives past this type — callers never see Audius field names.
 */
export interface ExternalArtist {
	source: CatalogSource;
	externalId: string;
	handle: string;
	name: string;
	bio: string | null;
	avatarUrl: string | null;
	/** The page banner. */
	bannerUrl: string | null;
	/** Attribution link back to the source profile. */
	externalUrl: string;
	/** Handles the artist published on the source, keyed by network. */
	socials: Record<string, string>;
	followerCount: number;
	trackCount: number;
	isVerified: boolean;
	isDeactivated: boolean;
	/** Bound to the source profile; the basis for cheap claim verification later. */
	walletAddress: string | null;
}

export interface ExternalTrack {
	source: CatalogSource;
	externalId: string;
	title: string;
	durationSeconds: number | null;
	genre: string | null;
	imageUrl: string | null;
	/** The STABLE stream endpoint. Never a resolved, signed URL — those expire. */
	streamUrl: string;
	releaseDate: Date | null;
	/** null when the artist hid it via field_visibility. */
	playCount: number | null;
	/** The terms the artist chose. Travels with music that is not ours. */
	license: string | null;
	isrc: string | null;
}
