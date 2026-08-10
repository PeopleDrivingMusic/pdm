import { pgSchema, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const messagesDbSchema = pgSchema('messages');

// Content comments — polymorphic over posts/tracks. Public read, free write.
export const comments = messagesDbSchema.table(
	'comments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		targetType: varchar('target_type', { length: 16 }).notNull(), // 'post' | 'track'
		targetId: uuid('target_id').notNull(),
		authorId: uuid('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		// Plain uuid (no self-FK yet): threading is deferred; the app owns integrity.
		parentId: uuid('parent_id'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		// Set on every author edit; null means never edited (drives the "(edited)" mark).
		editedAt: timestamp('edited_at'),
		deletedAt: timestamp('deleted_at')
	},
	(t) => [
		index('comments_target_idx').on(t.targetType, t.targetId, t.createdAt),
		index('comments_author_idx').on(t.authorId)
	]
);

// NOTE: `messages.chat` (artist_id, author_id, body, created_at, deleted_at) is added
// in Slice 2 as a SEPARATE table in this same schema — distinct shape (no target_type,
// no parent_id) + subscriber-gated policy.
