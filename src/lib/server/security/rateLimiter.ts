// In-memory per-instance stopgap. Documented for a Redis token-bucket upgrade later.
interface Window {
	count: number;
	resetAt: number;
}

const DEFAULT_PRUNE_THRESHOLD = 1024;

export function createRateLimiter(opts: {
	limit: number;
	windowMs: number;
	pruneThreshold?: number;
}) {
	const windows = new Map<string, Window>();
	const pruneThreshold = opts.pruneThreshold ?? DEFAULT_PRUNE_THRESHOLD;

	function prune(now: number) {
		for (const [key, win] of windows) {
			if (now >= win.resetAt) windows.delete(key);
		}
	}

	function check(key: string, now: number = Date.now()): boolean {
		// Opportunistically evict expired windows so the map cannot grow unbounded.
		if (windows.size >= pruneThreshold) prune(now);

		const existing = windows.get(key);
		if (!existing || now >= existing.resetAt) {
			windows.set(key, { count: 1, resetAt: now + opts.windowMs });
			return true;
		}
		if (existing.count >= opts.limit) {
			return false;
		}
		existing.count += 1;
		return true;
	}

	return { check, size: () => windows.size, reset: () => windows.clear() };
}
