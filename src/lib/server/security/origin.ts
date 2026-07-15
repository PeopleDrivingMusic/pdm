import type { RequestEvent } from '@sveltejs/kit';

// Same-origin check for JSON endpoints (SvelteKit's built-in checkOrigin only
// covers form/multipart/text content types, not application/json).
export function isSameOrigin(event: Pick<RequestEvent, 'request' | 'url'>): boolean {
	const origin = event.request.headers.get('origin');
	if (origin) return origin === event.url.origin;
	// No Origin header (some same-origin navigations/proxies): fall back to the
	// Fetch Metadata signal, accepting same-origin and same-site requests.
	const site = event.request.headers.get('sec-fetch-site');
	return site === 'same-origin' || site === 'same-site';
}
