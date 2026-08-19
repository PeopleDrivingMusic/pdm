import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import * as schema from './schema';
import { logger } from '$lib/utils/logger';

// Load environment variables
config();

// Create connection with proper configuration
const client = postgres(process.env.DATABASE_URL!, {
	max: Number(process.env.DATABASE_POOL_MAX ?? 10),
	// Required against Supabase's transaction-mode pooler (port 6543), which does
	// not support prepared statements — see database-hosting.md / the Supabase
	// migration plan. Harmless against a direct/session connection too, so this is
	// set unconditionally rather than branched by environment.
	prepare: false,
	onnotice: (notice) => {
		logger.info(`PostgreSQL notice: ${notice.message}`, {
			component: 'database',
			metadata: {
				severity: notice.severity,
				code: notice.code
			}
		});
	},
	debug: (connection, query, parameters) => {
		if (process.env.NODE_ENV === 'development') {
			logger.debug('SQL Query executed', {
				component: 'database',
				metadata: {
					query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
					parameters,
					connection
				}
			});
		}
	}
});

// Create a wrapper for database operations with logging
function createDbWithLogging() {
	const baseDb = drizzle(client);

	// Log successful connections
	logger.info('Database connection established', {
		component: 'database',
		metadata: {
			database: process.env.DATABASE_URL?.split('@')[1] || 'unknown'
		}
	});

	return baseDb;
}

// Initialize Drizzle with schema for relational queries
export const db = createDbWithLogging();

// Helper function to log database operations
export async function withDbLogging<T>(
	operation: string,
	dbOperation: () => Promise<T>
): Promise<T> {
	const start = Date.now();

	try {
		logger.debug(`Starting DB operation: ${operation}`, {
			component: 'database',
			metadata: { operation }
		});

		const result = await dbOperation();
		const duration = Date.now() - start;

		logger.dbQuery(`${operation} completed`, duration, {
			metadata: {
				operation,
				success: true
			}
		});

		return result;
	} catch (error) {
		const duration = Date.now() - start;

		logger.error(`DB operation failed: ${operation}`, {
			component: 'database',
			metadata: {
				operation,
				duration,
				error,
				success: false
			}
		});

		throw error;
	}
}

// Export the client for manual operations if needed
// export { client };

// Type exports for better TypeScript support
export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;

export type Artist = typeof schema.artists.$inferSelect;
export type NewArtist = typeof schema.artists.$inferInsert;
export type ArtistOnboardingRequest = typeof schema.artistOnboardingRequests.$inferSelect;
export type NewArtistOnboardingRequest = typeof schema.artistOnboardingRequests.$inferInsert;
export type ArtistAccount = typeof schema.artistAccounts.$inferSelect;
export type NewArtistAccount = typeof schema.artistAccounts.$inferInsert;
export type ArtistSession = typeof schema.artistSessions.$inferSelect;
export type NewArtistSession = typeof schema.artistSessions.$inferInsert;

export type Album = typeof schema.albums.$inferSelect;
export type NewAlbum = typeof schema.albums.$inferInsert;

export type Track = typeof schema.tracks.$inferSelect;
export type NewTrack = typeof schema.tracks.$inferInsert;

export type TrackStats = typeof schema.trackStats.$inferSelect;
export type Genre = typeof schema.genres.$inferSelect;
export type NewGenre = typeof schema.genres.$inferInsert;
export type AlbumTrack = typeof schema.albumTracks.$inferSelect;
export type NewAlbumTrack = typeof schema.albumTracks.$inferInsert;

export type Playlist = typeof schema.playlists.$inferSelect;
export type NewPlaylist = typeof schema.playlists.$inferInsert;

export type Purchase = typeof schema.purchases.$inferSelect;
export type NewPurchase = typeof schema.purchases.$inferInsert;

export type Post = typeof schema.posts.$inferSelect;
export type NewPost = typeof schema.posts.$inferInsert;
export type ContentMedia = typeof schema.contentMedia.$inferSelect;
export type NewContentMedia = typeof schema.contentMedia.$inferInsert;
export type PostMedia = typeof schema.postMedia.$inferSelect;
export type NewPostMedia = typeof schema.postMedia.$inferInsert;
export type PostMusicAttachment = typeof schema.postMusicAttachments.$inferSelect;
export type NewPostMusicAttachment = typeof schema.postMusicAttachments.$inferInsert;
export type PostPoll = typeof schema.postPolls.$inferSelect;
export type NewPostPoll = typeof schema.postPolls.$inferInsert;
export type PostPollOption = typeof schema.postPollOptions.$inferSelect;
export type NewPostPollOption = typeof schema.postPollOptions.$inferInsert;
export type PostPollVote = typeof schema.postPollVotes.$inferSelect;
export type NewPostPollVote = typeof schema.postPollVotes.$inferInsert;
export type PhotoAlbum = typeof schema.photoAlbums.$inferSelect;
export type NewPhotoAlbum = typeof schema.photoAlbums.$inferInsert;
export type Photo = typeof schema.photos.$inferSelect;
export type NewPhoto = typeof schema.photos.$inferInsert;
export type Video = typeof schema.videos.$inferSelect;
export type NewVideo = typeof schema.videos.$inferInsert;
export type VideoCollection = typeof schema.videoCollections.$inferSelect;
export type NewVideoCollection = typeof schema.videoCollections.$inferInsert;
export type VideoCollectionItem = typeof schema.videoCollectionItems.$inferSelect;
export type NewVideoCollectionItem = typeof schema.videoCollectionItems.$inferInsert;
export type ArtistFeedItem = typeof schema.artistFeedItems.$inferSelect;
export type NewArtistFeedItem = typeof schema.artistFeedItems.$inferInsert;
