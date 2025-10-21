import { db, withDbLogging } from './index';
import { users, artists, albums, tracks, playlists } from './schema';
import { eq, like, and, or, desc, count, sql } from 'drizzle-orm';
import type { User, NewUser, Artist, NewArtist, Track, NewTrack } from './index';
import { logger } from '$lib/utils/logger';

// User operations
export class UserService {
  static async createUser(data: NewUser): Promise<User> {
    return await withDbLogging('UserService.createUser', async () => {
      // Generate username if not provided
      let username = data.username;
      if (!username) {
        const emailPrefix = data.email.split('@')[0];
        username = `${emailPrefix}_${Date.now()}`;
      }

      const newUser: NewUser = {
        email: data.email,
        username,
        displayName: data.displayName || data.email.split('@')[0],
        googleId: data.googleId,
        avatarUrl: data.avatarUrl,
        hashedPassword: data.hashedPassword,
      };

      const [user] = await db.insert(users).values(newUser).returning();
      
      logger.info('User created successfully', {
        component: 'database',
        metadata: {
          userId: user.id,
          email: user.email,
          provider: data.googleId ? 'google' : 'email'
        }
      });
      
      return user;
    });
  }

  static async getUserById(id: string): Promise<User | undefined> {
    return await withDbLogging('UserService.getUserById', async () => {
      try {
        const result = await db.select().from(users).where(eq(users.id, id));
        const user = result[0] ?? null;
        
        logger.debug('User retrieved by ID', {
          component: 'database',
          metadata: {
            id,
            found: !!user
          }
        });
        
        return user;
      } catch (error) {
        logger.error("Failed to get user by ID", {
          component: "database",
          userId: id,
          metadata: { error }
        });
        return null;
      }
    });
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    return await withDbLogging('UserService.getUserByEmail', async () => {
      try {
        const result = await db.select().from(users).where(eq(users.email, email));
        const user = result[0] ?? null;
        
        logger.debug('User retrieved by email', {
          component: 'database',
          metadata: {
            email,
            found: !!user
          }
        });
        
        return user;
      } catch (error) {
        logger.error("Failed to get user by email", {
          component: "database",
          metadata: { error, email }
        });
        return null;
      }
    });
  }

  static async getUserFromGoogleId(googleId: string): Promise<User | null> {
    return await withDbLogging('UserService.getUserFromGoogleId', async () => {
      try {
        const result = await db.select().from(users).where(eq(users.googleId, googleId));
        const user = result[0] ?? null;
        
        logger.debug('User retrieved by Google ID', {
          component: 'database',
          metadata: {
            googleId,
            found: !!user
          }
        });
        
        return user;
      } catch (error) {
        logger.error("Failed to get user by Google ID", {
          component: "database",
          metadata: { error, googleId }
        });
        return null;
      }
    });
  }

  static async getUserByUsername(username: string): Promise<User | null> {
    return await withDbLogging('UserService.getUserByUsername', async () => {
      try {
        const result = await db.select().from(users).where(eq(users.username, username));
        const user = result[0] ?? null;
        
        logger.debug('User retrieved by username', {
          component: 'database',
          metadata: {
            username,
            found: !!user
          }
        });
        
        return user;
      } catch (error) {
        logger.error("Failed to get user by username", {
          component: "database",
          metadata: { error, username }
        });
        return null;
      }
    });
  }

  static async updateUser(userId: string, data: Partial<NewUser>): Promise<User | null> {
    return await withDbLogging('UserService.updateUser', async () => {
      try {
        const result = await db
          .update(users)
          .set({
            ...data,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId))
          .returning();

        const user = result[0] ?? null;

        if (user) {
          logger.info("User updated successfully", {
            component: "database",
            userId: user.id,
            metadata: {
              updatedFields: Object.keys(data)
            }
          });
        }

        return user;
      } catch (error) {
        logger.error("Failed to update user", {
          component: "database",
          userId,
          metadata: { error }
        });
        throw error;
      }
    });
  }

  static async deleteUser(id: string): Promise<boolean> {
    return await withDbLogging('UserService.deleteUser', async () => {
      try {
        const result = await db.delete(users).where(eq(users.id, id));
        const deleted = result.length > 0;
        
        logger.info("User deletion attempt", {
          component: "database",
          metadata: {
            userId: id,
            deleted
          }
        });
        
        return deleted;
      } catch (error) {
        logger.error("Failed to delete user", {
          component: "database",
          metadata: { error, userId: id }
        });
        return false;
      }
    });
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
