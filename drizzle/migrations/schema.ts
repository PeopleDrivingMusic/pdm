import { pgTable, foreignKey, unique, uuid, varchar, text, jsonb, boolean, timestamp, numeric, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const artists = pgTable("artists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	coverImg: text("cover_img"),
	avatar: text(),
	genre: varchar({ length: 50 }),
	description: text(),
	socialLinks: jsonb("social_links"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	trustScore: numeric("trust_score", { precision: 3, scale:  2 }).default('3.00').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "artists_user_id_users_id_fk"
		}),
	unique("artists_slug_unique").on(table.slug),
]);

export const tracks = pgTable("tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	albumId: uuid("album_id"),
	artistId: uuid("artist_id").notNull(),
	title: varchar({ length: 200 }).notNull(),
	duration: integer(),
	audioUrl: text("audio_url"),
	lyrics: text(),
	clipUrl: text("clip_url"),
	imageUrl: text("image_url"),
	trackNumber: integer("track_number"),
	genres: jsonb(),
	isPublished: boolean("is_published").default(false),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.albumId],
			foreignColumns: [albums.id],
			name: "tracks_album_id_albums_id_fk"
		}),
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "tracks_artist_id_artists_id_fk"
		}),
]);

export const trackStats = pgTable("track_stats", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	trackId: uuid("track_id").notNull(),
	likeCount: integer("like_count").default(0).notNull(),
	playCount: integer("play_count").default(0).notNull(),
	saveCount: integer("save_count").default(0).notNull(),
	commentCount: integer("comment_count").default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "track_stats_track_id_tracks_id_fk"
		}).onDelete("cascade"),
	unique("track_stats_track_id_unique").on(table.trackId),
]);

export const purchases = pgTable("purchases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	trackId: uuid("track_id"),
	albumId: uuid("album_id"),
	price: integer().notNull(),
	currency: varchar({ length: 10 }).default('USD'),
	transactionHash: varchar("transaction_hash", { length: 100 }),
	status: varchar({ length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "purchases_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "purchases_track_id_tracks_id_fk"
		}),
	foreignKey({
			columns: [table.albumId],
			foreignColumns: [albums.id],
			name: "purchases_album_id_albums_id_fk"
		}),
]);

export const playlists = pgTable("playlists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	coverImageUrl: text("cover_image_url"),
	isPublic: boolean("is_public").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "playlists_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	username: varchar({ length: 50 }),
	displayName: varchar("display_name", { length: 100 }),
	avatarUrl: text("avatar_url"),
	bio: text(),
	walletAddress: varchar("wallet_address", { length: 100 }),
	isVerified: boolean("is_verified").default(false),
	googleId: varchar("google_id", { length: 255 }),
	hashedPassword: text("hashed_password"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	trustScore: numeric("trust_score", { precision: 3, scale:  2 }).default('0.00').notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
	unique("users_username_unique").on(table.username),
]);

export const playlistTracks = pgTable("playlist_tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playlistId: uuid("playlist_id").notNull(),
	trackId: uuid("track_id").notNull(),
	position: integer().notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.playlistId],
			foreignColumns: [playlists.id],
			name: "playlist_tracks_playlist_id_playlists_id_fk"
		}),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "playlist_tracks_track_id_tracks_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userFavorites = pgTable("user_favorites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	trackId: uuid("track_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_favorites_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "user_favorites_track_id_tracks_id_fk"
		}),
]);

export const albums = pgTable("albums", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	artistId: uuid("artist_id").notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	coverImageUrl: text("cover_image_url"),
	releaseDate: timestamp("release_date", { mode: 'string' }),
	price: integer(),
	isPublished: boolean("is_published").default(false),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	genres: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "albums_artist_id_artists_id_fk"
		}),
]);

export const artistAccounts = pgTable("artist_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	artistId: uuid("artist_id").notNull(),
	login: varchar({ length: 100 }).notNull(),
	hashedPassword: text("hashed_password").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "artist_accounts_artist_id_artists_id_fk"
		}).onDelete("cascade"),
	unique("artist_accounts_login_unique").on(table.login),
]);

export const artistOnboardingRequests = pgTable("artist_onboarding_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	listenersCount: integer("listeners_count").default(0).notNull(),
	socialLinks: jsonb("social_links"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewerNote: text("reviewer_note"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "artist_onboarding_requests_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const artistSessions = pgTable("artist_sessions", {
	id: text().primaryKey().notNull(),
	artistAccountId: uuid("artist_account_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.artistAccountId],
			foreignColumns: [artistAccounts.id],
			name: "artist_sessions_artist_account_id_artist_accounts_id_fk"
		}).onDelete("cascade"),
]);

export const genres = pgTable("genres", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	displayName: varchar("display_name", { length: 50 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("genres_name_unique").on(table.name),
]);

export const albumTracks = pgTable("album_tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	albumId: uuid("album_id").notNull(),
	trackId: uuid("track_id").notNull(),
	trackNumber: integer("track_number").notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.albumId],
			foreignColumns: [albums.id],
			name: "album_tracks_album_id_albums_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "album_tracks_track_id_tracks_id_fk"
		}).onDelete("cascade"),
]);
