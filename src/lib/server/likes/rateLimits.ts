import { createRateLimiter } from '$lib/server/security/rateLimiter';

/**
 * Liking is a cheap, high-frequency action — a browsing session can plausibly
 * fire dozens — so the budget is looser than the comment write limit while still
 * capping a scripted flood. Per-instance and in-memory; see rateLimiter.ts.
 */
export const likeWriteLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
