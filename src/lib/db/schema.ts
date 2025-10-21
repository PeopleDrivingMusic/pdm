import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }),
  displayName: varchar('display_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  walletAddress: varchar('wallet_address', { length: 100 }),
  isVerified: boolean('is_verified').default(false),
  // OAuth fields
  googleId: varchar('google_id', { length: 255 }),
  // Password-based auth (optional)
  hashedPassword: text('hashed_password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sessions table for Lucia auth
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Artists table
export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  stageName: varchar('stage_name', { length: 100 }).notNull(),
  genre: varchar('genre', { length: 50 }),
  description: text('description'),
  socialLinks: jsonb('social_links'), // JSON object for social media links
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Albums table
export const albums = pgTable('albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  releaseDate: timestamp('release_date'),
  price: integer('price'), // Price in cents or smallest currency unit
  isPublished: boolean('is_published').default(false),
  metadata: jsonb('metadata'), // Additional metadata (blockchain info, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tracks table
export const tracks = pgTable('tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  albumId: uuid('album_id').references(() => albums.id),
  artistId: uuid('artist_id').notNull().references(() => artists.id),
  title: varchar('title', { length: 200 }).notNull(),
  duration: integer('duration'), // Duration in seconds
  audioUrl: text('audio_url'),
  lyrics: text('lyrics'),
  trackNumber: integer('track_number'),
  genre: varchar('genre', { length: 50 }),
  price: integer('price'), // Price in cents
  isPublished: boolean('is_published').default(false),
  playCount: integer('play_count').default(0),
  metadata: jsonb('metadata'), // Blockchain info, IPFS hash, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Playlists table
export const playlists = pgTable('playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Playlist tracks junction table
export const playlistTracks = pgTable('playlist_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  playlistId: uuid('playlist_id').notNull().references(() => playlists.id),
  trackId: uuid('track_id').notNull().references(() => tracks.id),
  position: integer('position').notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
});

// User favorites
export const userFavorites = pgTable('user_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  trackId: uuid('track_id').notNull().references(() => tracks.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Purchase history
export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  trackId: uuid('track_id').references(() => tracks.id),
  albumId: uuid('album_id').references(() => albums.id),
  price: integer('price').notNull(),
  currency: varchar('currency', { length: 10 }).default('USD'),
  transactionHash: varchar('transaction_hash', { length: 100 }), // Blockchain transaction hash
  status: varchar('status', { length: 20 }).default('pending'), // pending, completed, failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  artist: one(artists),
  playlists: many(playlists),
  favorites: many(userFavorites),
  purchases: many(purchases),
}));

export const artistsRelations = relations(artists, ({ one, many }) => ({
  user: one(users, {
    fields: [artists.userId],
    references: [users.id],
  }),
  albums: many(albums),
  tracks: many(tracks),
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
  artist: one(artists, {
    fields: [albums.artistId],
    references: [artists.id],
  }),
  tracks: many(tracks),
  purchases: many(purchases),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  artist: one(artists, {
    fields: [tracks.artistId],
    references: [artists.id],
  }),
  album: one(albums, {
    fields: [tracks.albumId],
    references: [albums.id],
  }),
  playlistTracks: many(playlistTracks),
  favorites: many(userFavorites),
  purchases: many(purchases),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  user: one(users, {
    fields: [playlists.userId],
    references: [users.id],
  }),
  tracks: many(playlistTracks),
}));

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistTracks.playlistId],
    references: [playlists.id],
  }),
  track: one(tracks, {
    fields: [playlistTracks.trackId],
    references: [tracks.id],
  }),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [userFavorites.trackId],
    references: [tracks.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [purchases.trackId],
    references: [tracks.id],
  }),
  album: one(albums, {
    fields: [purchases.albumId],
    references: [albums.id],
  }),
}));

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// User type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Export all tables for migrations
export const schema = {
  users,
  sessions,
  artists,
  albums,
  tracks,
  playlists,
  playlistTracks,
  userFavorites,
  purchases,
};
