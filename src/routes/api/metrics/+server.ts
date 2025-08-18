import { register } from '$lib/utils/metrics.js';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	try {
		const metrics = await register.metrics();
		
		return new Response(metrics, {
			status: 200,
			headers: {
				'Content-Type': register.contentType
			}
		});
	} catch (error) {
		console.error('Error generating metrics:', error);
		return new Response('Error generating metrics', {
			status: 500
		});
	}
};
