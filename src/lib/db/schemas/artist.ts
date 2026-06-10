import {
	pgSchema,
	text,
	varchar,
	timestamp,
	boolean,
	integer,
	jsonb,
	uuid,
	decimal
} from 'drizzle-orm/pg-core';
import { users } from './users';

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
