import { createRateLimiter } from '$lib/server/security/rateLimiter';

// In-memory, per-instance — the same stopgap as `comments/rateLimits.ts`, replaced by a
// Redis token bucket once there is more than one app instance. Seeding makes that upgrade
// more urgent, not less: the per-room key below multiplies live windows by users x rooms
// against the limiter's own 1024-entry prune threshold.

/**
 * The ordinary conversational cap, keyed per user per room, so a burst in one artist's
 * room never throttles the same fan in another.
 */
export const chatRoomWriteLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

/**
 * The backstop the per-room limiter cannot be, keyed per user across every room.
 *
 * Seeded pages multiply rooms into the hundreds, and a per-room allowance grants the full
 * quota in each one — so without this a single account posts 10 messages a minute in every
 * room it can reach and never trips a limit.
 */
export const chatGlobalWriteLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

/** Both ids are UUIDs, so a `:` join cannot be ambiguous. */
export function chatWriteKey(userId: string, artistId: string): string {
	return `${userId}:${artistId}`;
}
