import { json } from '@sveltejs/kit';
import { testDatabaseConnection, AnalyticsService } from '$lib/db/queries';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Test database connection
    const isConnected = await testDatabaseConnection();
    
    if (!isConnected) {
      return json(
        { 
          status: 'error', 
          message: 'Database connection failed',
          connected: false,
          timestamp: new Date().toISOString()
        }, 
        { status: 500 }
      );
    }

    // Get basic statistics
    const stats = {
      totalUsers: await AnalyticsService.getTotalUsers(),
      totalArtists: await AnalyticsService.getTotalArtists(),
      totalTracks: await AnalyticsService.getTotalTracks(),
      activeArtists: await AnalyticsService.getActiveArtistsCount(),
      publishedTracks: await AnalyticsService.getPublishedTracksCount(),
    };

    return json({
      status: 'success',
      message: 'Database connection successful',
      connected: true,
      timestamp: new Date().toISOString(),
      statistics: stats
    });

  } catch (error) {
    console.error('Database health check failed:', error);
    
    return json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown database error',
        connected: false,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
};
