import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

declare global {
	var __pdmMetricsMemoryInterval: NodeJS.Timeout | undefined;
}

function getMetric<T>(name: string, create: () => T): T {
	const existing = register.getSingleMetric(name);
	return (existing as T | undefined) ?? create();
}

// Initialize default metrics collector once. Vite SSR can re-evaluate this module during HMR.
if (!register.getSingleMetric('process_cpu_user_seconds_total')) {
	collectDefaultMetrics({ register });
}

// HTTP metrics
export const httpRequestsTotal = getMetric(
	'http_requests_total',
	() =>
		new Counter({
			name: 'http_requests_total',
			help: 'Total number of HTTP requests',
			labelNames: ['method', 'route', 'status_code'],
			registers: [register]
		})
);

export const httpRequestDuration = getMetric(
	'http_request_duration_seconds',
	() =>
		new Histogram({
			name: 'http_request_duration_seconds',
			help: 'Duration of HTTP requests in seconds',
			labelNames: ['method', 'route', 'status_code'],
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
			registers: [register]
		})
);

// Database metrics
export const dbConnectionsActive = getMetric(
	'db_connections_active',
	() =>
		new Gauge({
			name: 'db_connections_active',
			help: 'Number of active database connections',
			registers: [register]
		})
);

export const dbQueryDuration = getMetric(
	'db_query_duration_seconds',
	() =>
		new Histogram({
			name: 'db_query_duration_seconds',
			help: 'Duration of database queries in seconds',
			labelNames: ['operation', 'table'],
			buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
			registers: [register]
		})
);

export const dbQueriesTotal = getMetric(
	'db_queries_total',
	() =>
		new Counter({
			name: 'db_queries_total',
			help: 'Total number of database queries',
			labelNames: ['operation', 'table', 'status'],
			registers: [register]
		})
);

// User metrics
export const activeUsers = getMetric(
	'active_users',
	() =>
		new Gauge({
			name: 'active_users',
			help: 'Number of currently active users',
			registers: [register]
		})
);

export const userSessions = getMetric(
	'user_sessions_total',
	() =>
		new Gauge({
			name: 'user_sessions_total',
			help: 'Total number of user sessions',
			registers: [register]
		})
);

export const userActions = getMetric(
	'user_actions_total',
	() =>
		new Counter({
			name: 'user_actions_total',
			help: 'Total number of user actions',
			labelNames: ['action', 'user_type'],
			registers: [register]
		})
);

// Business metrics for PDM
export const songsPlayedTotal = getMetric(
	'songs_played_total',
	() =>
		new Counter({
			name: 'songs_played_total',
			help: 'Total number of songs played',
			labelNames: ['genre', 'source'],
			registers: [register]
		})
);

export const playlistsCreated = getMetric(
	'playlists_created_total',
	() =>
		new Counter({
			name: 'playlists_created_total',
			help: 'Total number of playlists created',
			labelNames: ['user_type'],
			registers: [register]
		})
);

export const musicUploads = getMetric(
	'music_uploads_total',
	() =>
		new Counter({
			name: 'music_uploads_total',
			help: 'Total number of music uploads',
			labelNames: ['format', 'status'],
			registers: [register]
		})
);

export const streamingDuration = getMetric(
	'streaming_duration_seconds',
	() =>
		new Histogram({
			name: 'streaming_duration_seconds',
			help: 'Duration of music streaming sessions',
			labelNames: ['quality', 'device_type'],
			buckets: [10, 30, 60, 300, 600, 1800, 3600, 7200, 14400], // 10s to 4h
			registers: [register]
		})
);

// System metrics
export const memoryUsage = getMetric(
	'app_memory_usage_bytes',
	() =>
		new Gauge({
			name: 'app_memory_usage_bytes',
			help: 'Application memory usage in bytes',
			registers: [register]
		})
);

export const cacheHits = getMetric(
	'cache_hits_total',
	() =>
		new Counter({
			name: 'cache_hits_total',
			help: 'Total number of cache hits',
			labelNames: ['cache_type'],
			registers: [register]
		})
);

export const cacheMisses = getMetric(
	'cache_misses_total',
	() =>
		new Counter({
			name: 'cache_misses_total',
			help: 'Total number of cache misses',
			labelNames: ['cache_type'],
			registers: [register]
		})
);

// Error metrics
export const errorsTotal = getMetric(
	'errors_total',
	() =>
		new Counter({
			name: 'errors_total',
			help: 'Total number of errors',
			labelNames: ['error_type', 'component'],
			registers: [register]
		})
);

// Functions for updating metrics
export class MetricsCollector {
	static recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
		const labels = { method, route, status_code: statusCode.toString() };
		httpRequestsTotal.inc(labels);
		httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
	}

	static recordDbQuery(operation: string, table: string, duration: number, success: boolean) {
		const labels = { operation, table, status: success ? 'success' : 'error' };
		dbQueriesTotal.inc(labels);
		dbQueryDuration.observe({ operation, table }, duration / 1000);
	}

	static setActiveUsers(count: number) {
		activeUsers.set(count);
	}

	static setDbConnections(count: number) {
		dbConnectionsActive.set(count);
	}

	static recordUserAction(action: string, userType: string = 'standard') {
		userActions.inc({ action, user_type: userType });
	}

	static recordSongPlayed(genre: string = 'unknown', source: string = 'library') {
		songsPlayedTotal.inc({ genre, source });
	}

	static recordPlaylistCreated(userType: string = 'standard') {
		playlistsCreated.inc({ user_type: userType });
	}

	static recordMusicUpload(format: string, success: boolean) {
		musicUploads.inc({ format, status: success ? 'success' : 'failure' });
	}

	static recordStreamingSession(
		duration: number,
		quality: string = 'standard',
		deviceType: string = 'web'
	) {
		streamingDuration.observe({ quality, device_type: deviceType }, duration);
	}

	static recordCacheHit(cacheType: string) {
		cacheHits.inc({ cache_type: cacheType });
	}

	static recordCacheMiss(cacheType: string) {
		cacheMisses.inc({ cache_type: cacheType });
	}

	static recordError(errorType: string, component: string) {
		errorsTotal.inc({ error_type: errorType, component });
	}

	static updateMemoryUsage() {
		const usage = process.memoryUsage();
		memoryUsage.set(usage.rss);
	}
}

// Periodic system metrics updates
globalThis.__pdmMetricsMemoryInterval ??= setInterval(() => {
	MetricsCollector.updateMemoryUsage();
}, 10000); // Every 10 seconds

export { register };

export default MetricsCollector;
