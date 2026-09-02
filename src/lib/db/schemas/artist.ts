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
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const artistDbSchema = pgSchema('artist');

export const artists = artistDbSchema.table(
	'artists',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		// Nullable: a seeded artist has no PDM user until they claim the page.
		userId: uuid('user_id').references(() => users.id),
		name: varchar('name', { length: 100 }).notNull(),
		slug: varchar('slug', { length: 100 }).notNull().unique(),
		coverImg: text('cover_img'),
		avatar: text('avatar'),
		genre: varchar('genre', { length: 50 }),
		description: text('description'),
		socialLinks: jsonb('social_links'),
		// 'native' = created on PDM. Anything else names the source it was imported from.
		origin: varchar('origin', { length: 16 }).default('native').notNull(),
		externalId: varchar('external_id', { length: 64 }),
		// Attribution link back to the source profile. Required for imported artists.
		externalUrl: text('external_url'),
		// NULL means unclaimed. Import refuses to modify a row where this is set, and a
		// "was here first" badge is later derived from it.
		claimedAt: timestamp('claimed_at'),
		trust_score: decimal('trust_score', { precision: 3, scale: 2 }).default('3.00').notNull(),
		isActive: boolean('is_active').default(true),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(t) => [
		// Partial: native artists have no external id, and many NULLs would collide.
		// Stays a `sql` template on purpose — drizzle-kit drops bind params when it writes
		// the migration, so `ne()` here would emit an unbindable `$1`. The predicate must
		// also be repeated in every ON CONFLICT that targets this index.
		uniqueIndex('artists_origin_external_unique')
			.on(t.origin, t.externalId)
			.where(sql`${t.origin} <> 'native'`)
	]
);

export const artistClaimRequests = artistDbSchema.table(
	'artist_claim_requests',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		artistId: uuid('artist_id')
			.notNull()
			.references(() => artists.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		message: text('message'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [
		// One request per (artist, user) is enough signal for the request-only scope this
		// slice ships. Review/approval, and therefore a status column, is real handover
		// work — out of scope per the design spec (§1: "no verification, no handover").
		uniqueIndex('artist_claim_requests_artist_user_unique').on(t.artistId, t.userId)
	]
);

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
