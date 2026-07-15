import { LogEventPublisher } from './LogEventPublisher';
import type { EventPublisher } from './types';

export type { DomainEvent, EventPublisher, Visibility } from './types';
export { LogEventPublisher } from './LogEventPublisher';

// Swap point: replace with OutboxEventPublisher / RabbitMqEventPublisher later.
export const eventPublisher: EventPublisher = new LogEventPublisher();
