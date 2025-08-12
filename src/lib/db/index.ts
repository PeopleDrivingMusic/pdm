import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import * as schema from './schema';

// Load environment variables
config();

console.log('Connecting to database...', process.env.DATABASE_URL);
// Create connection with proper configuration
const client = postgres(process.env.DATABASE_URL!, {
  max: 1
});
// Initialize Drizzle with schema for relational queries
export const db = drizzle(client);

// Export the client for manual operations if needed
// export { client };

// Type exports for better TypeScript support
export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;

export type Artist = typeof schema.artists.$inferSelect;
export type NewArtist = typeof schema.artists.$inferInsert;

export type Album = typeof schema.albums.$inferSelect;
export type NewAlbum = typeof schema.albums.$inferInsert;

export type Track = typeof schema.tracks.$inferSelect;
export type NewTrack = typeof schema.tracks.$inferInsert;

export type Playlist = typeof schema.playlists.$inferSelect;
export type NewPlaylist = typeof schema.playlists.$inferInsert;

export type Purchase = typeof schema.purchases.$inferSelect;
export type NewPurchase = typeof schema.purchases.$inferInsert;
