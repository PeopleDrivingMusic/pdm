import {
	pgTable,
	text,
	varchar,
	timestamp,
	boolean,
	integer,
	jsonb,
	uuid
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
export { users, sessions } from './schemas/core';
export {
	artists,
	artistOnboardingRequests,
	artistAccounts,
	artistSessions,
	artistVideos,
	artistPhotos,
	artistPosts,
	artistTags
} from './schemas/artist';
import { users, sessions } from './schemas/core';
import {
	artists,
	artistOnboardingRequests,
	artistAccounts,
	artistSessions,
	artistVideos,
	artistPhotos,
	artistPosts,
	artistTags
} from './schemas/artist';

// Genres table (normalized)
export const genres = pgTable('genres', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 50 }).notNull().unique(), // normalized lowercase value
	displayName: varchar('display_name', { length: 50 }).notNull(), // display value
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Albums table
export const albums = pgTable('albums', {
	id: uuid('id').primaryKey().defaultRandom(),
	artistId: uuid('artist_id')
		.notNull()
		.references(() => artists.id),
	title: varchar('title', { length: 200 }).notNull(),
	description: text('description'),
	coverImageUrl: text('cover_image_url'),
	releaseDate: timestamp('release_date'),
	price: integer('price'), // Price in cents or smallest currency unit
	isPublished: boolean('is_published').default(false),
	genres: jsonb('genres').$type<string[]>(), // genres array for search
	metadata: jsonb('metadata'), // Additional metadata (blockchain info, etc.)
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Tracks table
export const tracks = pgTable('tracks', {
	id: uuid('id').primaryKey().defaultRandom(),
	albumId: uuid('album_id').references(() => albums.id),
	artistId: uuid('artist_id')
		.notNull()
		.references(() => artists.id),
	title: varchar('title', { length: 200 }).notNull(),
	duration: integer('duration'), // Duration in seconds
	audioUrl: text('audio_url'),
	lyrics: text('lyrics'),
	clipUrl: text('clip_url'),
	imageUrl: text('image_url'), // Track cover image URL,
	trackNumber: integer('track_number'),
	genre: jsonb('genres').$type<string[]>(),
	isPublished: boolean('is_published').default(false),
	metadata: jsonb('metadata'), // Blockchain info, IPFS hash, etc.
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Track analytics/stats table
export const trackStats = pgTable('track_stats', {
	id: uuid('id').primaryKey().defaultRandom(),
	trackId: uuid('track_id')
		.notNull()
		.unique()
		.references(() => tracks.id, { onDelete: 'cascade' }),
	likeCount: integer('like_count').default(0).notNull(),
	playCount: integer('play_count').default(0).notNull(),
	saveCount: integer('save_count').default(0).notNull(), // Number of times users saved the track to favorites or playlists
	commentCount: integer('comment_count').default(0).notNull(),
	lastUpdated: timestamp('last_updated').defaultNow().notNull()
});

// Playlists table
export const playlists = pgTable('playlists', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	name: varchar('name', { length: 100 }).notNull(),
	description: text('description'),
	coverImageUrl: text('cover_image_url'),
	isPublic: boolean('is_public').default(true),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Playlist tracks junction table
export const playlistTracks = pgTable('playlist_tracks', {
	id: uuid('id').primaryKey().defaultRandom(),
	playlistId: uuid('playlist_id')
		.notNull()
		.references(() => playlists.id),
	trackId: uuid('track_id')
		.notNull()
		.references(() => tracks.id),
	position: integer('position').notNull(),
	addedAt: timestamp('added_at').defaultNow().notNull()
});

// Album tracks junction table (many-to-many)
export const albumTracks = pgTable('album_tracks', {
	id: uuid('id').primaryKey().defaultRandom(),
	albumId: uuid('album_id')
		.notNull()
		.references(() => albums.id, { onDelete: 'cascade' }),
	trackId: uuid('track_id')
		.notNull()
		.references(() => tracks.id, { onDelete: 'cascade' }),
	trackNumber: integer('track_number').notNull(), // position in album
	addedAt: timestamp('added_at').defaultNow().notNull()
});

// User favorites
export const userFavorites = pgTable('user_favorites', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	trackId: uuid('track_id')
		.notNull()
		.references(() => tracks.id),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Purchase history
export const purchases = pgTable('purchases', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	trackId: uuid('track_id').references(() => tracks.id),
	albumId: uuid('album_id').references(() => albums.id),
	price: integer('price').notNull(),
	currency: varchar('currency', { length: 10 }).default('USD'),
	transactionHash: varchar('transaction_hash', { length: 100 }), // Blockchain transaction hash
	status: varchar('status', { length: 20 }).default('pending'), // pending, completed, failed
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
	artist: one(artists),
	artistOnboardingRequests: many(artistOnboardingRequests),
	playlists: many(playlists),
	favorites: many(userFavorites),
	purchases: many(purchases)
}));

export const artistOnboardingRequestsRelations = relations(artistOnboardingRequests, ({ one }) => ({
	user: one(users, {
		fields: [artistOnboardingRequests.userId],
		references: [users.id]
	})
}));

export const artistAccountsRelations = relations(artistAccounts, ({ one, many }) => ({
	artist: one(artists, {
		fields: [artistAccounts.artistId],
		references: [artists.id]
	}),
	sessions: many(artistSessions)
}));

export const artistSessionsRelations = relations(artistSessions, ({ one }) => ({
	artistAccount: one(artistAccounts, {
		fields: [artistSessions.artistAccountId],
		references: [artistAccounts.id]
	})
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
	artist: one(artists, {
		fields: [albums.artistId],
		references: [artists.id]
	}),
	albumTracks: many(albumTracks),
	purchases: many(purchases)
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
	artist: one(artists, {
		fields: [tracks.artistId],
		references: [artists.id]
	}),
	album: one(albums, {
		fields: [tracks.albumId],
		references: [albums.id]
	}),
	albumTracks: many(albumTracks),
	playlistTracks: many(playlistTracks),
	favorites: many(userFavorites),
	purchases: many(purchases),
	stats: one(trackStats)
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
	user: one(users, {
		fields: [playlists.userId],
		references: [users.id]
	}),
	tracks: many(playlistTracks)
}));

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
	playlist: one(playlists, {
		fields: [playlistTracks.playlistId],
		references: [playlists.id]
	}),
	track: one(tracks, {
		fields: [playlistTracks.trackId],
		references: [tracks.id]
	})
}));

export const albumTracksRelations = relations(albumTracks, ({ one }) => ({
	album: one(albums, {
		fields: [albumTracks.albumId],
		references: [albums.id]
	}),
	track: one(tracks, {
		fields: [albumTracks.trackId],
		references: [tracks.id]
	})
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
	user: one(users, {
		fields: [userFavorites.userId],
		references: [users.id]
	}),
	track: one(tracks, {
		fields: [userFavorites.trackId],
		references: [tracks.id]
	})
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
	user: one(users, {
		fields: [purchases.userId],
		references: [users.id]
	}),
	track: one(tracks, {
		fields: [purchases.trackId],
		references: [tracks.id]
	}),
	album: one(albums, {
		fields: [purchases.albumId],
		references: [albums.id]
	})
}));

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const trackStatsRelations = relations(trackStats, ({ one }) => ({
	track: one(tracks, {
		fields: [trackStats.trackId],
		references: [tracks.id]
	})
}));

export const artistsRelations = relations(artists, ({ one, many }) => ({
	user: one(users, {
		fields: [artists.userId],
		references: [users.id]
	}),
	tracks: many(tracks),
	albums: many(albums),
	artistAccounts: many(artistAccounts),
	artistTags: many(artistTags),
	artistVideos: many(artistVideos),
	artistPhotos: many(artistPhotos),
	artistPosts: many(artistPosts)
}));
export const artistTagsRelations = relations(artistTags, ({ one }) => ({
	artist: one(artists, {
		fields: [artistTags.artistId],
		references: [artists.id]
	})
}));

export const artistVideosRelations = relations(artistVideos, ({ one }) => ({
	artist: one(artists, {
		fields: [artistVideos.artistId],
		references: [artists.id]
	})
}));

export const artistPhotosRelations = relations(artistPhotos, ({ one }) => ({
	artist: one(artists, {
		fields: [artistPhotos.artistId],
		references: [artists.id]
	})
}));

export const artistPostsRelations = relations(artistPosts, ({ one }) => ({
	artist: one(artists, {
		fields: [artistPosts.artistId],
		references: [artists.id]
	})
}));

// User type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
export type ArtistOnboardingRequest = typeof artistOnboardingRequests.$inferSelect;
export type NewArtistOnboardingRequest = typeof artistOnboardingRequests.$inferInsert;
export type ArtistAccount = typeof artistAccounts.$inferSelect;
export type NewArtistAccount = typeof artistAccounts.$inferInsert;
export type ArtistSession = typeof artistSessions.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type TrackStats = typeof trackStats.$inferSelect;
export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;
export type AlbumTrack = typeof albumTracks.$inferSelect;
export type NewAlbumTrack = typeof albumTracks.$inferInsert;
export type Playlist = typeof playlists.$inferInsert;
export type PlaylistTrack = typeof playlistTracks.$inferInsert;

// Export all tables for migrations
export const schema = {
	users,
	sessions,
	artists,
	artistOnboardingRequests,
	artistAccounts,
	artistSessions,
	genres,
	albums,
	tracks,
	trackStats,
	albumTracks,
	playlists,
	playlistTracks,
	userFavorites,
	purchases
};
