import { and, count, eq, inArray } from 'drizzle-orm';
import { db, withDbLogging } from '../index';
import { commentLikes, postLikes } from '../schema';
import type { LikeTargetType } from '$lib/messages/types';

/**
 * Likes live in one table per entity so each keeps a real FK cascade (see
 * `schemas/engagement.ts`). The tables are identical in shape, so this map is the
 * only place that differs — every query below is written once.
 */
const TABLES = {
	comment: { table: commentLikes, targetColumn: commentLikes.commentId },
	post: { table: postLikes, targetColumn: postLikes.postId }
} as const;

export class LikeRepository {
	/** Add or remove the user's like. Returns the resulting liked state. */
	static async toggle(
		targetType: LikeTargetType,
		targetId: string,
		userId: string
	): Promise<boolean> {
		return withDbLogging('LikeRepository.toggle', async () => {
			// Written per table on purpose: `values()` takes the TS property name
			// (`commentId`), not the column name, so a computed key silently produced an
			// invalid row. Explicit branches keep it type-checked instead of casting.
			if (targetType === 'comment') {
				const deleted = await db
					.delete(commentLikes)
					.where(and(eq(commentLikes.commentId, targetId), eq(commentLikes.userId, userId)))
					.returning({ id: commentLikes.id });
				if (deleted.length > 0) return false;

				// The unique constraint makes a double-click a no-op, not a duplicate.
				await db.insert(commentLikes).values({ commentId: targetId, userId }).onConflictDoNothing();
				return true;
			}

			const deleted = await db
				.delete(postLikes)
				.where(and(eq(postLikes.postId, targetId), eq(postLikes.userId, userId)))
				.returning({ id: postLikes.id });
			if (deleted.length > 0) return false;

			await db.insert(postLikes).values({ postId: targetId, userId }).onConflictDoNothing();
			return true;
		});
	}

	/** Like counts per target id; ids with no likes are absent from the map. */
	static async countForTargets(
		targetType: LikeTargetType,
		targetIds: string[]
	): Promise<Map<string, number>> {
		return withDbLogging('LikeRepository.countForTargets', async () => {
			if (targetIds.length === 0) return new Map();
			const { table, targetColumn } = TABLES[targetType];

			const rows = await db
				.select({ targetId: targetColumn, count: count() })
				.from(table)
				.where(inArray(targetColumn, targetIds))
				.groupBy(targetColumn);
			return new Map(rows.map((r) => [r.targetId, r.count]));
		});
	}

	/** The subset of `targetIds` this user has liked. */
	static async likedByUser(
		userId: string,
		targetType: LikeTargetType,
		targetIds: string[]
	): Promise<Set<string>> {
		return withDbLogging('LikeRepository.likedByUser', async () => {
			if (targetIds.length === 0) return new Set();
			const { table, targetColumn } = TABLES[targetType];

			const rows = await db
				.select({ targetId: targetColumn })
				.from(table)
				.where(and(eq(table.userId, userId), inArray(targetColumn, targetIds)));
			return new Set(rows.map((r) => r.targetId));
		});
	}
}
