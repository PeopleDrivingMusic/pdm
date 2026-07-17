import { logger } from '$lib/utils/logger';
import type { DomainEvent, EventPublisher } from './types';

export class LogEventPublisher implements EventPublisher {
	async publish(event: DomainEvent): Promise<void> {
		logger.info('domain.event', { component: 'events', metadata: { event } });
	}
}
