import { json, error } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { requireAuth, logUserAction } from '$lib/utils/auth';
import { UserService } from '$lib/db/queries';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
  try {
    // User authentication
    await requireAuth()(event);
    
    // Log user action
    logUserAction('view_profile')(event);
    
    logger.info('User profile requested', {
      component: 'api',
      requestId: event.locals.requestId,
      userId: event.locals.user?.id,
      metadata: {
        endpoint: '/api/users/profile'
      }
    });

    // Get user profile
    const user = await UserService.getUserById(event.locals.user!.id);
    
    if (!user) {
      logger.warn('User profile not found', {
        component: 'api',
        requestId: event.locals.requestId,
        userId: event.locals.user?.id
      });
      
      throw error(404, 'User not found');
    }

    // Return user profile (no password in schema)
    const userProfile = user;

    logger.info('User profile retrieved successfully', {
      component: 'api',
      requestId: event.locals.requestId,
      userId: user.id,
      metadata: {
        endpoint: '/api/users/profile',
        profileFields: Object.keys(userProfile)
      }
    });

    return json(userProfile);

  } catch (err: any) {
    if (err?.status) {
      // This is already a handled error from error()
      throw err;
    }

    logger.error('Failed to retrieve user profile', {
      component: 'api',
      requestId: event.locals.requestId,
      userId: event.locals.user?.id,
      metadata: {
        error: err,
        endpoint: '/api/users/profile'
      }
    });

    throw error(500, 'Internal server error');
  }
};

export const PUT: RequestHandler = async (event) => {
  try {
    // User authentication
    await requireAuth()(event);
    
    // Log user action
    logUserAction('update_profile')(event);

    const requestData = await event.request.json();
    
    logger.info('User profile update requested', {
      component: 'api',
      requestId: event.locals.requestId,
      userId: event.locals.user?.id,
      metadata: {
        endpoint: '/api/users/profile',
        updateFields: Object.keys(requestData)
      }
    });

    // Data validation
    const allowedFields = ['username', 'email', 'bio', 'avatar'];
    const updateData = Object.keys(requestData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = requestData[key];
        return obj;
      }, {} as any);

    if (Object.keys(updateData).length === 0) {
      logger.warn('No valid fields provided for profile update', {
        component: 'api',
        requestId: event.locals.requestId,
        userId: event.locals.user?.id,
        metadata: {
          providedFields: Object.keys(requestData),
          allowedFields
        }
      });
      
      throw error(400, 'No valid fields provided');
    }

    // Update profile
    const updatedUser = await UserService.updateUser(event.locals.user!.id, updateData);
    
    if (!updatedUser) {
      logger.error('Failed to update user profile - user not found', {
        component: 'api',
        requestId: event.locals.requestId,
        userId: event.locals.user?.id
      });
      
      throw error(404, 'User not found');
    }

    // Return updated user profile
    const userProfile = updatedUser;

    logger.info('User profile updated successfully', {
      component: 'api',
      requestId: event.locals.requestId,
      userId: updatedUser.id,
      metadata: {
        endpoint: '/api/users/profile',
        updatedFields: Object.keys(updateData)
      }
    });

    return json(userProfile);

  } catch (err: any) {
    if (err?.status) {
      // This is already a handled error from error()
      throw err;
    }

    logger.error('Failed to update user profile', {
      component: 'api',
      requestId: event.locals.requestId,
      userId: event.locals.user?.id,
      metadata: {
        error: err,
        endpoint: '/api/users/profile'
      }
    });

    throw error(500, 'Internal server error');
  }
};
