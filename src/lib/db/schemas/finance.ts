import { pgSchema, varchar, timestamp, integer, uuid, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { albums, tracks } from './catalog';
import { artists } from './artist';

export const financeDbSchema = pgSchema('finance');

export const purchases = financeDbSchema.table('purchases', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	trackId: uuid('track_id').references(() => tracks.id),
	albumId: uuid('album_id').references(() => albums.id),
	price: integer('price').notNull(),
	currency: varchar('currency', { length: 10 }).default('USD'),
	transactionHash: varchar('transaction_hash', { length: 100 }),
	status: varchar('status', { length: 20 }).default('pending'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const subscriptions = financeDbSchema.table(
	'subscriptions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id),
		artistId: uuid('artist_id')
			.notNull()
			.references(() => artists.id),
		status: varchar('status', { length: 20 }).default('active').notNull(),
		startedAt: timestamp('started_at').defaultNow().notNull(),
		canceledAt: timestamp('canceled_at')
	},
	(t) => ({
		userArtistUnique: unique('subscriptions_user_artist_unique').on(t.userId, t.artistId)
	})
);
