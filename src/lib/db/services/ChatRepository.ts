import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { db, withDbLogging } from '../index';
import { chat, users, type Chat } from '../schema';

export interface ChatMessageWithAuthor {
	id: string;
	body: string;
	createdAt: Date;
	authorId: string;
	authorName: string | null;
	authorUsername: string | null;
	authorAvatar: string | null;
}

/**
 * Thin Drizzle repository over `messages.chat`. Query-shape correctness (insert
 * keys, limit clamping, soft-delete) is pinned directly by the mocked-chain spec;
 * the real keyset ordering against Postgres is additionally pinned by Task 14's e2e.
 */
export class ChatRepository {
	static async create(input: { artistId: string; authorId: string; body: string }): Promise<Chat> {
		return withDbLogging('ChatRepository.create', async () => {
			const [row] = await db
				.insert(chat)
				.values({ artistId: input.artistId, authorId: input.authorId, body: input.body })
				.returning();
			return row;
		});
	}

	static async getById(id: string): Promise<Chat | undefined> {
		return withDbLogging('ChatRepository.getById', async () => {
			const [row] = await db.select().from(chat).where(eq(chat.id, id)).limit(1);
			return row;
		});
	}

	static async getMessages(input: {
		artistId: string;
		limit?: number;
		before?: Date;
	}): Promise<ChatMessageWithAuthor[]> {
		return withDbLogging('ChatRepository.getMessages', async () => {
			const conditions = [eq(chat.artistId, input.artistId), isNull(chat.deletedAt)];
			if (input.before) conditions.push(lt(chat.createdAt, input.before));

			return db
				.select({
					id: chat.id,
					body: chat.body,
					createdAt: chat.createdAt,
					authorId: chat.authorId,
					authorName: users.displayName,
					authorUsername: users.username,
					authorAvatar: users.avatarUrl
				})
				.from(chat)
				.innerJoin(users, eq(chat.authorId, users.id))
				.where(and(...conditions))
				.orderBy(desc(chat.createdAt))
				.limit(Math.max(1, Math.min(input.limit ?? 50, 100)));
		});
	}

	static async softDelete(id: string): Promise<void> {
		await withDbLogging('ChatRepository.softDelete', async () => {
			await db.update(chat).set({ deletedAt: new Date() }).where(eq(chat.id, id));
		});
	}
}
