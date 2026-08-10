import { createRateLimiter } from '$lib/server/security/rateLimiter';

// In-memory, per-instance (see rateLimiter.ts — a Redis token bucket replaces this
// once there is more than one app instance). Shared by the comment endpoints so the
// read and write surfaces are metered independently.

/** Writes are keyed per user: create/delete a comment. */
export const commentWriteLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

/** Reads are public, so they are keyed per client address rather than per user. */
export const commentReadLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
