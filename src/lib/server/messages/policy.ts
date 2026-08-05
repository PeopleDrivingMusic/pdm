import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { posts } from '$lib/db/schema';
import { ArtistService, TrackService } from '$lib/db/queries';

export type MessageTargetType = 'post' | 'track' | 'artist';

/** Max stored message length (comments + chat share this default). */
export const MAX_MESSAGE_LENGTH = 2000;

// Conservative URL sniffing for the link policy. Matches http(s)://, bare www., and
// bare domain.tld(/path). Deliberately broad: a false positive on a non-owner message
// is acceptable (they just can't post links); only the artist-owner may include URLs.
const URL_PATTERN = /(https?:\/\/|www\.)[^\s]+|(?<![\w@.])[a-z0-9-]+(\.[a-z]{2,})+(\/[^\s]*)?/i;

export function containsUrl(body: string): boolean {
	return URL_PATTERN.test(body);
}

/** The userId that owns the artist behind a message target, or null. */
export async function resolveTargetOwnerUserId(
	targetType: MessageTargetType,
	targetId: string
): Promise<string | null> {
	switch (targetType) {
		case 'artist': {
			const artist = await ArtistService.getArtistById(targetId);
			return artist?.userId ?? null;
		}
		case 'track': {
			const track = await TrackService.getTrackById(targetId);
			if (!track) return null;
			const artist = await ArtistService.getArtistById(track.artistId);
			return artist?.userId ?? null;
		}
		case 'post': {
			const [row] = await db
				.select({ artistId: posts.artistId })
				.from(posts)
				.where(eq(posts.id, targetId))
				.limit(1);
			if (!row) return null;
			const artist = await ArtistService.getArtistById(row.artistId);
			return artist?.userId ?? null;
		}
		default:
			return null;
	}
}
