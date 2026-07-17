import { text, varchar, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core';
import { tracks } from './catalog';
import { users, usersDbSchema } from './users';

export const playlists = usersDbSchema.table('playlists', {
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

export const playlistTracks = usersDbSchema.table('playlist_tracks', {
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

export const userFavorites = usersDbSchema.table('user_favorites', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	trackId: uuid('track_id')
		.notNull()
		.references(() => tracks.id),
	createdAt: timestamp('created_at').defaultNow().notNull()
});
