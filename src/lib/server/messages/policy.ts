import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { posts } from '$lib/db/schema';
import { ArtistService, TrackService } from '$lib/db/queries';

export type MessageTargetType = 'post' | 'track' | 'artist';

/** Max stored message length (comments + chat share this default). */
export const MAX_MESSAGE_LENGTH = 2000;

// URL sniffing for the link policy (only the artist-owner may post links). Flags an
// explicit signal — a scheme, a `www.` host, or any `domain.tld/path` — plus a bare
// `domain.tld` whose TLD is a common one. Deliberately biased AWAY from false-positiving
// on ordinary prose: the "missing space after a period" typo (`amazing.Keep it up`,
// `Node.js`) must not read as a link, since the rule blocks the very fans writing those.
// Blatant obfuscation (`example[.]com`, `h t t p`) is out of scope for this soft control.
const COMMON_TLDS =
	'com|net|org|io|dev|app|xyz|info|biz|link|site|online|store|shop|blog|tv|fm|gg|ru|ua|uk|de|fr|es|pl|nl|cn|jp|br|eu' +
	'|co|me|to|ai|cc|ly|ca|us|club|icu|top|pw|win';
const URL_PATTERN = new RegExp(
	`(?:https?:\\/\\/|www\\.)\\S+` + // scheme or www. host
		`|[a-z0-9-]+\\.[a-z]{2,}\\/\\S*` + // any domain WITH a path (bit.ly/abc, evil.test/promo)
		`|\\b[a-z0-9-]+\\.(${COMMON_TLDS})\\b(?![a-z])`, // bare common-TLD domain (scam.com) — captured
	'gi'
);

/** First letter upper, rest lower — `To`, `Me`, `Co`. Never how a real domain is
 *  written (lowercase, or SHOUTED all-caps); exactly how a sentence starts. */
function isTitleCase(word: string): boolean {
	return word[0] !== word[0].toLowerCase() && word.slice(1) === word.slice(1).toLowerCase();
}

export function containsUrl(body: string): boolean {
	for (const match of body.matchAll(URL_PATTERN)) {
		// Only the bare-domain branch (capture group 1) can come from ordinary prose:
		// a "missing space after a period" typo reads as `word.NextSentence`, and
		// English sentences start Title-case, never SHOUTED or lowercase. Domains
		// are written either way — `grabit.me`, `GRABIT.ME` — so only the Title-case
		// shape is a false-positive signal; anything else (including `scam.COM`) is
		// a real link. The scheme/www/path branches carry an unambiguous signal
		// regardless of case, so only this branch needs the check. Reject-and-continue
		// rather than reject-and-stop, so a rejected candidate earlier in the message
		// can't hide a real link later in the same message.
		if (!match[1] || !isTitleCase(match[1])) return true;
	}
	return false;
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
