import {
	pgSchema,
	text,
	varchar,
	timestamp,
	boolean,
	integer,
	jsonb,
	uuid,
	decimal,
	foreignKey,
	unique
} from 'drizzle-orm/pg-core';
import { users } from './core';

export const artistDbSchema = pgSchema('artist');

export const artists = artistDbSchema.table('artists', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	name: varchar('name', { length: 100 }).notNull(),
	slug: varchar('slug', { length: 100 }).notNull().unique(),
	coverImg: text('cover_img'),
	avatar: text('avatar'),
	genre: varchar('genre', { length: 50 }),
	description: text('description'),
	socialLinks: jsonb('social_links'),
	trust_score: decimal('trust_score', { precision: 3, scale: 2 }).default('3.00').notNull(),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const artistOnboardingRequests = artistDbSchema.table('artist_onboarding_requests', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 100 }).notNull(),
	listenersCount: integer('listeners_count').default(0).notNull(),
	socialLinks: jsonb('social_links'),
	status: varchar('status', { length: 20 }).default('pending').notNull(),
	reviewedAt: timestamp('reviewed_at'),
	reviewerNote: text('reviewer_note'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const artistAccounts = artistDbSchema.table('artist_accounts', {
	id: uuid('id').primaryKey().defaultRandom(),
	artistId: uuid('artist_id')
		.notNull()
		.references(() => artists.id, { onDelete: 'cascade' }),
	login: varchar('login', { length: 100 }).notNull().unique(),
	hashedPassword: text('hashed_password').notNull(),
	isActive: boolean('is_active').default(true).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const artistSessions = artistDbSchema.table('artist_sessions', {
	id: text('id').primaryKey(),
	artistAccountId: uuid('artist_account_id')
		.notNull()
		.references(() => artistAccounts.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const artistVideos = artistDbSchema.table(
	'artist_videos',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		fileUrl: text('file_url').notNull(),
		tags: jsonb('tags'),
		date: timestamp('date', { mode: 'string' }),
		location: varchar({ length: 100 }),
		description: text(),
		stats: jsonb('stats'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'artist_videos_artist_id_artists_id_fk'
		})
	]
);

export const artistPhotos = artistDbSchema.table(
	'artist_photos',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		fileUrl: text('file_url').notNull(),
		tags: jsonb('tags'),
		date: timestamp('date', { mode: 'string' }),
		description: text(),
		stats: jsonb('stats'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'artist_photos_artist_id_artists_id_fk'
		})
	]
);

export const artistPosts = artistDbSchema.table(
	'artist_posts',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		content: text().notNull(),
		images: jsonb('images'),
		widgets: jsonb('widgets'),
		tags: jsonb('tags'),
		date: timestamp('date', { mode: 'string' }),
		stats: jsonb('stats'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'artist_posts_artist_id_artists_id_fk'
		})
	]
);

export const artistTags = artistDbSchema.table(
	'artist_tags',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		tag: varchar({ length: 50 }).notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'artist_tags_artist_id_artists_id_fk'
		}),
		unique('artist_tags_artist_id_tag_unique').on(table.artistId, table.tag)
	]
);
