import { pgTable, text, varchar, timestamp, boolean, uuid, decimal } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	username: varchar('username', { length: 50 }).unique(),
	displayName: varchar('display_name', { length: 100 }),
	avatarUrl: text('avatar_url'),
	bio: text('bio'),
	walletAddress: varchar('wallet_address', { length: 100 }),
	isVerified: boolean('is_verified').default(false),
	googleId: varchar('google_id', { length: 255 }),
	hashedPassword: text('hashed_password'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
	trust_score: decimal('trust_score', { precision: 3, scale: 2 }).default('0.00').notNull()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});
