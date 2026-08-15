import { and, count, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { db, withDbLogging } from '../index';
import { comments, users, type Comment } from '../schema';

// Single declaration lives in the dependency-free shared module so the browser
// can use the same type without importing anything under `$lib/server`.
export type { CommentTargetType } from '$lib/messages/types';
import type { CommentTargetType } from '$lib/messages/types';

export interface CommentWithAuthor {
	id: string;
	body: string;
	createdAt: Date;
	editedAt: Date | null;
	authorId: string;
	authorName: string | null;
	authorUsername: string | null;
	authorAvatar: string | null;
}

/**
 * Thin Drizzle repository over `messages.comments`. Behavior (keyset ordering,
 * soft-delete filtering, grouped counts) is pinned by the comments E2E against a
 * real DB; the boundary (`CommentService`) is unit-tested with this mocked.
 */
export class CommentRepository {
	static async create(input: {
		targetType: CommentTargetType;
		targetId: string;
		authorId: string;
		body: string;
		parentId?: string | null;
	}): Promise<Comment> {
		return withDbLogging('CommentRepository.create', async () => {
			const [row] = await db
				.insert(comments)
				.values({
					targetType: input.targetType,
					targetId: input.targetId,
					authorId: input.authorId,
					body: input.body,
					parentId: input.parentId ?? null
				})
				.returning();
			return row;
		});
	}

	static async getById(id: string): Promise<Comment | undefined> {
		return withDbLogging('CommentRepository.getById', async () => {
			const [row] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
			return row;
		});
	}

	static async listForTarget(input: {
		targetType: CommentTargetType;
		targetId: string;
		limit?: number;
		before?: Date;
	}): Promise<CommentWithAuthor[]> {
		return withDbLogging('CommentRepository.listForTarget', async () => {
			const conditions = [
				eq(comments.targetType, input.targetType),
				eq(comments.targetId, input.targetId),
				isNull(comments.deletedAt)
			];
			if (input.before) conditions.push(lt(comments.createdAt, input.before));

			return (
				db
					.select({
						id: comments.id,
						body: comments.body,
						createdAt: comments.createdAt,
						editedAt: comments.editedAt,
						authorId: comments.authorId,
						authorName: users.displayName,
						authorUsername: users.username,
						authorAvatar: users.avatarUrl
					})
					.from(comments)
					.innerJoin(users, eq(comments.authorId, users.id))
					.where(and(...conditions))
					.orderBy(desc(comments.createdAt))
					// Floor at 1: a 0 or negative caller value would yield an empty page or a
					// Postgres `LIMIT -n` error. Cap at 100 to bound the read.
					.limit(Math.max(1, Math.min(input.limit ?? 50, 100)))
			);
		});
	}

	static async countForTargets(
		targetType: CommentTargetType,
		targetIds: string[]
	): Promise<Map<string, number>> {
		return withDbLogging('CommentRepository.countForTargets', async () => {
			if (targetIds.length === 0) return new Map();
			const rows = await db
				.select({ targetId: comments.targetId, count: count() })
				.from(comments)
				.where(
					and(
						eq(comments.targetType, targetType),
						inArray(comments.targetId, targetIds),
						isNull(comments.deletedAt)
					)
				)
				.groupBy(comments.targetId);
			return new Map(rows.map((r) => [r.targetId, r.count]));
		});
	}

	/** Replace a comment's body and stamp `edited_at`. Returns the updated row, or
	 *  `undefined` if it's gone — including a delete that raced this same edit. */
	static async updateBody(id: string, body: string): Promise<Comment | undefined> {
		return withDbLogging('CommentRepository.updateBody', async () => {
			const [row] = await db
				.update(comments)
				.set({ body, editedAt: new Date() })
				.where(and(eq(comments.id, id), isNull(comments.deletedAt)))
				.returning();
			return row;
		});
	}

	static async softDelete(id: string): Promise<void> {
		await withDbLogging('CommentRepository.softDelete', async () => {
			await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, id));
		});
	}

	static async deleteForTarget(targetType: CommentTargetType, targetId: string): Promise<void> {
		await withDbLogging('CommentRepository.deleteForTarget', async () => {
			await db
				.delete(comments)
				.where(and(eq(comments.targetType, targetType), eq(comments.targetId, targetId)));
		});
	}
}
