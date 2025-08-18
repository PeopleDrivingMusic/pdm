import { json } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		logger.info('Health check requested', {
			component: 'api',
			requestId: locals.requestId
		});

		// Here we can add system health checks
		const healthStatus = {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			services: {
				database: 'healthy', // Here will be real DB check
				application: 'healthy'
			}
		};

		logger.info('Health check completed successfully', {
			component: 'api',
			requestId: locals.requestId,
			metadata: {
				status: healthStatus.status
			}
		});

		return json(healthStatus);
	} catch (error) {
		logger.error('Health check failed', {
			component: 'api',
			requestId: locals.requestId,
			metadata: {
				error
			}
		});

		return json(
			{
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				error: 'Health check failed'
			},
			{ status: 500 }
		);
	}
};
