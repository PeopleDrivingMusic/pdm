import { eq, inArray } from 'drizzle-orm';
import { db, withDbLogging } from '$lib/db';
import { posts } from '$lib/db/schema';

export interface PostDocument {
	postId: string;
	bodyJson: Record<string, unknown> | null;
	bodyHtml: string | null;
	updatedAt?: Date | null;
}

export interface SavePostDocumentInput {
	postId: string;
	bodyJson?: Record<string, unknown> | null;
	bodyHtml?: string | null;
}

export interface PostDocumentRepository {
	getPostDocument(postId: string): Promise<PostDocument | null>;
	getPostDocuments(postIds: string[]): Promise<Map<string, PostDocument>>;
	savePostDocument(input: SavePostDocumentInput): Promise<void>;
	deletePostDocument(postId: string): Promise<void>;
}

export class PostgresPostDocumentRepository implements PostDocumentRepository {
	async getPostDocument(postId: string): Promise<PostDocument | null> {
		return await withDbLogging('PostgresPostDocumentRepository.getPostDocument', async () => {
			const [post] = await db
				.select({
					postId: posts.id,
					bodyJson: posts.bodyJson,
					bodyHtml: posts.bodyHtml,
					updatedAt: posts.updatedAt
				})
				.from(posts)
				.where(eq(posts.id, postId))
				.limit(1);

			return post ?? null;
		});
	}

	async getPostDocuments(postIds: string[]): Promise<Map<string, PostDocument>> {
		if (postIds.length === 0) return new Map();

		return await withDbLogging('PostgresPostDocumentRepository.getPostDocuments', async () => {
			const rows = await db
				.select({
					postId: posts.id,
					bodyJson: posts.bodyJson,
					bodyHtml: posts.bodyHtml,
					updatedAt: posts.updatedAt
				})
				.from(posts)
				.where(inArray(posts.id, postIds));

			return new Map(rows.map((row) => [row.postId, row]));
		});
	}

	async savePostDocument(input: SavePostDocumentInput): Promise<void> {
		await withDbLogging('PostgresPostDocumentRepository.savePostDocument', async () => {
			await db
				.update(posts)
				.set({
					bodyJson: input.bodyJson ?? null,
					bodyHtml: input.bodyHtml ?? null,
					updatedAt: new Date()
				})
				.where(eq(posts.id, input.postId));
		});
	}

	async deletePostDocument(postId: string): Promise<void> {
		await withDbLogging('PostgresPostDocumentRepository.deletePostDocument', async () => {
			await db
				.update(posts)
				.set({
					bodyJson: null,
					bodyHtml: null,
					updatedAt: new Date()
				})
				.where(eq(posts.id, postId));
		});
	}
}

// This is the single switch point for the future Mongo/document-store adapter.
export const postDocumentRepository: PostDocumentRepository = new PostgresPostDocumentRepository();
