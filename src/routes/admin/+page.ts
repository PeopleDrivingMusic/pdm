export const load = async ({ fetch }: { fetch: any }) => {
  try {
    const response = await fetch('/api/db/health');
    const dbHealth = await response.json();
    
    return {
      dbHealth
    };
  } catch (error) {
    return {
      dbHealth: {
        status: 'error',
        message: 'Failed to fetch database health',
        connected: false,
        timestamp: new Date().toISOString()
      }
    };
  }
};
