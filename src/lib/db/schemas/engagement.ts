import { pgSchema, timestamp, integer, uuid } from 'drizzle-orm/pg-core';
import { tracks } from './catalog';

export const engagementDbSchema = pgSchema('engagement');

export const trackStats = engagementDbSchema.table('track_stats', {
	id: uuid('id').primaryKey().defaultRandom(),
	trackId: uuid('track_id')
		.notNull()
		.unique()
		.references(() => tracks.id, { onDelete: 'cascade' }),
	likeCount: integer('like_count').default(0).notNull(),
	playCount: integer('play_count').default(0).notNull(),
	saveCount: integer('save_count').default(0).notNull(),
	commentCount: integer('comment_count').default(0).notNull(),
	lastUpdated: timestamp('last_updated').defaultNow().notNull()
});
