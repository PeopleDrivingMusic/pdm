import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Dev-only preview harness — 404 in production builds.
export const load = () => {
	if (!dev) throw error(404, 'Not found');
};
