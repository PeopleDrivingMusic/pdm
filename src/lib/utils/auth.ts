import { logger } from '$lib/utils/logger';
import { UserService } from '$lib/db/queries';
import type { RequestEvent } from '@sveltejs/kit';

export interface AuthContext {
  user?: {
    id: string;
    email: string;
    username: string;
  };
  isAuthenticated: boolean;
}

export async function authenticate(event: RequestEvent): Promise<AuthContext> {
  const startTime = Date.now();
  
  try {
    // Extract token from cookies or headers
    const token = event.cookies.get('auth-token') || 
                  event.request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      logger.debug('No authentication token provided', {
        component: 'auth',
        requestId: event.locals.requestId,
        metadata: {
          path: event.url.pathname,
          userAgent: event.request.headers.get('user-agent')
        }
      });
      
      return { isAuthenticated: false };
    }

    // Here should be the JWT token verification logic
    // For example, we just extract userId from the token
    const userId = await verifyToken(token);
    
    if (!userId) {
      logger.warn('Invalid authentication token', {
        component: 'auth',
        requestId: event.locals.requestId,
        metadata: {
          path: event.url.pathname,
          tokenLength: token.length
        }
      });
      
      return { isAuthenticated: false };
    }

    // Get user from database
    const user = await UserService.getUserById(userId);
    
    if (!user) {
      logger.warn('User not found for valid token', {
        component: 'auth',
        requestId: event.locals.requestId,
        metadata: {
          userId,
          path: event.url.pathname
        }
      });
      
      return { isAuthenticated: false };
    }

    const duration = Date.now() - startTime;
    
    logger.info('User authenticated successfully', {
      component: 'auth',
      requestId: event.locals.requestId,
      userId: user.id,
      metadata: {
        username: user.username,
        email: user.email,
        path: event.url.pathname,
        authDuration: duration
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      isAuthenticated: true
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Authentication failed', {
      component: 'auth',
      requestId: event.locals.requestId,
      metadata: {
        error,
        path: event.url.pathname,
        authDuration: duration
      }
    });

    return { isAuthenticated: false };
  }
}

// Mock function to simulate token verification
async function verifyToken(token: string): Promise<string | null> {
  try {
    // Here should be the real JWT verification logic
    // For example, we just return the decoded userId

    logger.debug('Verifying JWT token', {
      component: 'auth',
      metadata: {
        tokenLength: token.length
      }
    });

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));

    // Return a mock userId for demonstration
    return 'user-123';
    
  } catch (error) {
    logger.error('Token verification failed', {
      component: 'auth',
      metadata: {
        error
      }
    });
    
    return null;
  }
}

// Middleware for protected routes
export function requireAuth() {
  return async (event: RequestEvent) => {
    const auth = await authenticate(event);
    
    if (!auth.isAuthenticated) {
      logger.security('Unauthorized access attempt', 'warn', {
        requestId: event.locals.requestId,
        metadata: {
          path: event.url.pathname,
          method: event.request.method,
          userAgent: event.request.headers.get('user-agent'),
          ip: event.getClientAddress()
        }
      });
      
      throw new Error('Unauthorized');
    }

    // Add user to locals for use in handlers
    event.locals.user = auth.user;
    
    return auth;
  };
}

// Middleware for logging user actions
export function logUserAction(action: string) {
  return (event: RequestEvent) => {
    if (event.locals.user) {
      logger.userAction(action, event.locals.user.id, {
        requestId: event.locals.requestId,
        metadata: {
          username: event.locals.user.username,
          path: event.url.pathname,
          method: event.request.method,
          ip: event.getClientAddress()
        }
      });
    }
  };
}
