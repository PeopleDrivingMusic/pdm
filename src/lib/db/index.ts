import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import * as schema from './schema';
import { logger } from '$lib/utils/logger';

// Load environment variables
config();

// Create connection with proper configuration
const client = postgres(process.env.DATABASE_URL!, {
  max: 1,
  onnotice: (notice) => {
    logger.info(`PostgreSQL notice: ${notice.message}`, {
      component: 'database',
      metadata: {
        severity: notice.severity,
        code: notice.code
      }
    });
  },
  debug: (connection, query, parameters) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('SQL Query executed', {
        component: 'database',
        metadata: {
          query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
          parameters,
          connection
        }
      });
    }
  }
});

// Create a wrapper for database operations with logging
function createDbWithLogging() {
  const baseDb = drizzle(client);
  
  // Log successful connections
  logger.info('Database connection established', {
    component: 'database',
    metadata: {
      database: process.env.DATABASE_URL?.split('@')[1] || 'unknown'
    }
  });
  
  return baseDb;
}

// Initialize Drizzle with schema for relational queries
export const db = createDbWithLogging();

// Helper function to log database operations
export async function withDbLogging<T>(
  operation: string,
  dbOperation: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    logger.debug(`Starting DB operation: ${operation}`, {
      component: 'database',
      metadata: { operation }
    });
    
    const result = await dbOperation();
    const duration = Date.now() - start;
    
    logger.dbQuery(`${operation} completed`, duration, {
      metadata: { 
        operation,
        success: true
      }
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error(`DB operation failed: ${operation}`, {
      component: 'database',
      metadata: {
        operation,
        duration,
        error,
        success: false
      }
    });
    
    throw error;
  }
}

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
