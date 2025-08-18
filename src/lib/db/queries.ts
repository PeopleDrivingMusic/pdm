import { db, withDbLogging } from './index';
import { users, artists, albums, tracks, playlists } from './schema';
import { eq, like, and, or, desc, count, sql } from 'drizzle-orm';
import type { User, NewUser, Artist, NewArtist, Track, NewTrack } from './index';
import { logger } from '$lib/utils/logger';

// User operations
export class UserService {
  static async createUser(userData: NewUser): Promise<User> {
    return await withDbLogging('UserService.createUser', async () => {
      const [user] = await db.insert(users).values(userData).returning();
      
      logger.info('User created successfully', {
        component: 'database',
        metadata: {
          userId: user.id,
          email: userData.email
        }
      });
      
      return user;
    });
  }

  static async getUserById(id: string): Promise<User | undefined> {
    return await withDbLogging('UserService.getUserById', async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      
      logger.debug('User retrieved by ID', {
        component: 'database',
        metadata: {
          userId: id,
          found: !!user
        }
      });
      
      return user;
    });
  }

  static async getUserByEmail(email: string): Promise<User | undefined> {
    return await withDbLogging('UserService.getUserByEmail', async () => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      logger.debug('User retrieved by email', {
        component: 'database',
        metadata: {
          email,
          found: !!user
        }
      });
      
      return user;
    });
  }

  static async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  static async updateUser(id: string, updates: Partial<NewUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  static async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.length > 0;
  }
}

// Artist operations
export class ArtistService {
  static async createArtist(artistData: NewArtist): Promise<Artist> {
    const [artist] = await db.insert(artists).values(artistData).returning();
    return artist;
  }

  static async getArtistById(id: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist;
  }

  static async getArtistByUserId(userId: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.userId, userId));
    return artist;
  }

  static async searchArtists(query: string, limit = 10) {
    return await db
      .select()
      .from(artists)
      .where(
        or(
          like(artists.stageName, `%${query}%`),
          like(artists.genre, `%${query}%`)
        )
      )
      .limit(limit);
  }

  static async getActiveArtists(limit = 20) {
    return await db
      .select()
      .from(artists)
      .where(eq(artists.isActive, true))
      .orderBy(desc(artists.createdAt))
      .limit(limit);
  }
}

// Track operations
export class TrackService {
  static async createTrack(trackData: NewTrack): Promise<Track> {
    const [track] = await db.insert(tracks).values(trackData).returning();
    return track;
  }

  static async getTrackById(id: string): Promise<Track | undefined> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track;
  }

  static async getTracksByArtist(artistId: string, limit = 50) {
    return await db
      .select()
      .from(tracks)
      .where(and(eq(tracks.artistId, artistId), eq(tracks.isPublished, true)))
      .orderBy(desc(tracks.createdAt))
      .limit(limit);
  }

  static async getTracksByAlbum(albumId: string) {
    return await db
      .select()
      .from(tracks)
      .where(and(eq(tracks.albumId, albumId), eq(tracks.isPublished, true)))
      .orderBy(tracks.trackNumber);
  }

  static async searchTracks(query: string, limit = 20) {
    return await db
      .select()
      .from(tracks)
      .where(
        and(
          eq(tracks.isPublished, true),
          or(
            like(tracks.title, `%${query}%`),
            like(tracks.genre, `%${query}%`)
          )
        )
      )
      .limit(limit);
  }

  static async getPopularTracks(limit = 10) {
    return await db
      .select()
      .from(tracks)
      .where(eq(tracks.isPublished, true))
      .orderBy(desc(tracks.playCount))
      .limit(limit);
  }

  static async incrementPlayCount(trackId: string) {
    await db
      .update(tracks)
      .set({ 
        playCount: sql`${tracks.playCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(tracks.id, trackId));
  }
}

// Analytics utilities
export class AnalyticsService {
  static async getTotalUsers() {
    const [result] = await db.select({ count: count() }).from(users);
    return result.count;
  }

  static async getTotalArtists() {
    const [result] = await db.select({ count: count() }).from(artists);
    return result.count;
  }

  static async getTotalTracks() {
    const [result] = await db.select({ count: count() }).from(tracks);
    return result.count;
  }

  static async getActiveArtistsCount() {
    const [result] = await db
      .select({ count: count() })
      .from(artists)
      .where(eq(artists.isActive, true));
    return result.count;
  }

  static async getPublishedTracksCount() {
    const [result] = await db
      .select({ count: count() })
      .from(tracks)
      .where(eq(tracks.isPublished, true));
    return result.count;
  }
}

// Utility function to test database connection
export async function testDatabaseConnection() {
  try {
    await db.execute('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
