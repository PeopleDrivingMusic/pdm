import { logger } from '$lib/utils/logger';
import { MetricsCollector } from '$lib/utils/metrics';

export async function withMediaLogging<T>(
	op: string,
	fn: () => Promise<T>,
	ctx: Record<string, unknown> = {}
): Promise<T> {
	const start = Date.now();
	try {
		const result = await fn();
		logger.debug(`media.${op}`, {
			component: 'media',
			metadata: { ...ctx, durationMs: Date.now() - start }
		});
		return result;
	} catch (error) {
		MetricsCollector.recordR2Error(op);
		logger.error(`media.${op} failed`, { component: 'media', metadata: { ...ctx, error } });
		throw error;
	}
}
