import { pgSchema, timestamp, integer, uuid, unique } from 'drizzle-orm/pg-core';
import { tracks } from './catalog';
import { users } from './users';
import { posts } from './content';
import { comments } from './messages';

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

/*
 * Likes are per-entity tables rather than one polymorphic `likes` table so each
 * carries a real FK: deleting a comment or a post takes its likes with it, and
 * deleting a user takes theirs. A polymorphic `target_id` cannot have an FK, so
 * cleanup would depend on application code remembering. The DRY lives one layer
 * up — a single `LikeService` routes both tables — and it mirrors the existing
 * `users.user_favorites` precedent for track likes.
 */

export const commentLikes = engagementDbSchema.table(
	'comment_likes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		commentId: uuid('comment_id')
			.notNull()
			.references(() => comments.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [unique('comment_likes_comment_user_unique').on(t.commentId, t.userId)]
);

export const postLikes = engagementDbSchema.table(
	'post_likes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [unique('post_likes_post_user_unique').on(t.postId, t.userId)]
);
