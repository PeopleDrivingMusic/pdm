import { json, error } from '@sveltejs/kit';
import { TrackService } from '$lib/db/queries';
import { logger } from '$lib/utils/logger';
import type { RequestHandler } from './$types';

type TrackAction = 'toggle-like' | 'save' | 'remove-from-playlist';

interface ActionHandler {
	handler: (userId: string, trackId: string, data?: Record<string, unknown>) => Promise<boolean>;
	requiresData?: boolean;
}

const actionMap: Record<TrackAction, ActionHandler> = {
	'toggle-like': {
		handler: (userId, trackId) => TrackService.toggleLike(userId, trackId)
	},
	save: {
		handler: (userId, trackId, data) =>
			TrackService.saveTrackToPlaylist(userId, trackId, data?.playlistId as string),
		requiresData: true
	},
	'remove-from-playlist': {
		handler: (userId, trackId, data) =>
			TrackService.removeTrackFromPlaylist(data?.playlistTrackId as string, userId, trackId),
		requiresData: true
	}
};

export const POST: RequestHandler = async ({ request, params, locals }) => {
	const userId = locals.user?.id;

	if (!userId) {
		logger.warn('Unauthorized track action attempt', {
			component: 'api',
			metadata: { action: params.action, trackId: params.id }
		});
		return error(401, 'Unauthorized');
	}

	const { id: trackId, action } = params;

	// Validate action
	if (!action || !(action in actionMap)) {
		logger.warn('Invalid track action', {
			component: 'api',
			metadata: { action, trackId, userId }
		});
		return error(400, `Invalid action: ${action}`);
	}

	try {
		const actionConfig = actionMap[action as TrackAction];
		let requestData: Record<string, unknown> = {};

		// Parse request body if needed
		if (actionConfig.requiresData) {
			try {
				requestData = await request.json();
			} catch {
				logger.warn('Failed to parse request body', {
					component: 'api',
					metadata: { action, trackId, userId }
				});
				return error(400, 'Invalid request body');
			}

			// Validate required data
			if (action === 'save' && !requestData.playlistId) {
				return error(400, 'Missing required field: playlistId');
			}
			if (action === 'remove-from-playlist' && !requestData.playlistTrackId) {
				return error(400, 'Missing required field: playlistTrackId');
			}
		}

		// Execute action
		const result = await actionConfig.handler(userId, trackId, requestData);

		logger.info('Track action completed', {
			component: 'api',
			metadata: {
				action,
				trackId,
				userId,
				success: result
			}
		});

		return json({ success: result, action });
	} catch (err) {
		logger.error('Failed to process track action', {
			component: 'api',
			metadata: {
				error: err instanceof Error ? err.message : String(err),
				action,
				trackId,
				userId
			}
		});
		return error(500, 'Failed to process track action');
	}
};
