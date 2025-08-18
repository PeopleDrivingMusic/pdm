import { createLoggingMiddleware, logger } from '$lib/utils/logger';
import { MetricsCollector } from '$lib/utils/metrics';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Middleware for http logs
const loggingHandle: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const requestId = crypto.randomUUID();
	
	// Add requestId to locals for use in handlers
	event.locals.requestId = requestId;

	// Define route for metrics (simplified)
	const route = event.url.pathname.split('/').slice(0, 3).join('/') || '/';
	
	logger.info(`Incoming request: ${event.request.method} ${event.url.pathname}`, {
		component: 'http',
		requestId,
		metadata: {
			method: event.request.method,
			path: event.url.pathname,
			userAgent: event.request.headers.get('user-agent'),
			ip: event.getClientAddress()
		}
	});

	let response;
	let error;
	
	try {
		response = await resolve(event);

		// Record metrics for successful request
		const duration = Date.now() - start;
		MetricsCollector.recordHttpRequest(
			event.request.method,
			route,
			response.status,
			duration
		);
		
		logger.info(`Request completed: ${event.request.method} ${event.url.pathname} - ${response.status} (${duration}ms)`, {
			component: 'http',
			requestId,
			metadata: {
				method: event.request.method,
				path: event.url.pathname,
				statusCode: response.status,
				duration
			}
		});
		
	} catch (e) {
		error = e;
		const duration = Date.now() - start;

		// Record metrics for error
		MetricsCollector.recordHttpRequest(
			event.request.method,
			route,
			500,
			duration
		);
		
		MetricsCollector.recordError('http_error', 'server');
		
		logger.error(`Request failed: ${event.request.method} ${event.url.pathname}`, {
			component: 'http',
			requestId,
			metadata: {
				error: e,
				method: event.request.method,
				path: event.url.pathname,
				duration
			}
		});
		throw e;
	}

	return response;
};

// Main handle
const mainHandle: Handle = async ({ event, resolve }) => {
	// Additional middleware logic can be added here

	return await resolve(event);
};

// Combine middleware
export const handle: Handle = sequence(loggingHandle, mainHandle);

// Server error handler
export const handleError: HandleServerError = ({ error, event }) => {
	const errorId = crypto.randomUUID();
	
	logger.error('Unhandled server error', {
		component: 'server',
		requestId: event.locals.requestId,
		metadata: {
			errorId,
			error,
			path: event.url.pathname,
			method: event.request.method,
			userAgent: event.request.headers.get('user-agent'),
			ip: event.getClientAddress()
		}
	});

	return {
		message: 'Internal server error',
		errorId
	};
};
