import { json, type RequestHandler } from '@sveltejs/kit';
import { PlaylistService } from '$lib/db/services/PlaylistService';
import { logger } from '$lib/utils/logger';

interface CreatePlaylistRequest {
	name: string;
	description?: string;
	isPublic?: boolean;
}

interface AddTrackRequest {
	trackId: string;
	playlistId: string;
}

interface RemoveTrackRequest {
	playlistId: string;
	trackId: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;

		if (!userId) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const action = request.headers.get('x-action');
		const body = await request.json();

		switch (action) {
			case 'create': {
				const { name, description, isPublic } = body as CreatePlaylistRequest;

				if (!name?.trim()) {
					return json({ success: false, error: 'Playlist name is required' }, { status: 400 });
				}

				const playlist = await PlaylistService.createPlaylist({
					userId,
					name: name.trim(),
					description: description?.trim() || undefined,
					isPublic: isPublic ?? true
				});

				logger.info('Playlist created via API', {
					component: 'api',
					metadata: { userId, playlistId: playlist.id }
				});

				return json({
					success: true,
					data: playlist
				});
			}

			case 'add-track': {
				const { trackId, playlistId } = body as AddTrackRequest;

				if (!trackId || !playlistId) {
					return json(
						{ success: false, error: 'Track ID and Playlist ID are required' },
						{ status: 400 }
					);
				}

				const result = await PlaylistService.addTrackToPlaylist(playlistId, trackId, userId);

				if (!result) {
					return json(
						{ success: false, error: 'Failed to add track to playlist' },
						{ status: 400 }
					);
				}

				logger.info('Track added to playlist via API', {
					component: 'api',
					metadata: { userId, playlistId, trackId }
				});

				return json({ playlist: result, success: true });
			}

			default:
				return json({ success: false, error: 'Unknown action' }, { status: 400 });
		}
	} catch (error) {
		logger.error('Playlist API POST error', {
			component: 'api',
			metadata: { error }
		});

		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ request, locals, url }) => {
	try {
		const userId = locals.user?.id;

		if (!userId) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const action = url.searchParams.get('action');

		switch (action) {
			case 'list': {
				const limit = parseInt(url.searchParams.get('limit') ?? '50');
				const offset = parseInt(url.searchParams.get('offset') ?? '0');

				const playlists = await PlaylistService.getUserPlaylists(userId, limit, offset);

				return json({
					success: true,
					data: playlists
				});
			}

			case 'get': {
				const playlistId = url.searchParams.get('id');

				if (!playlistId) {
					return json({ success: false, error: 'Playlist ID is required' }, { status: 400 });
				}

				const playlist = await PlaylistService.getPlaylistById(playlistId);

				if (!playlist) {
					return json({ success: false, error: 'Playlist not found' }, { status: 404 });
				}

				return json({
					success: true,
					data: playlist
				});
			}

			case 'tracks': {
				const playlistId = url.searchParams.get('id');
				const limit = parseInt(url.searchParams.get('limit') ?? '50');
				const offset = parseInt(url.searchParams.get('offset') ?? '0');

				if (!playlistId) {
					return json({ success: false, error: 'Playlist ID is required' }, { status: 400 });
				}

				const tracks = await PlaylistService.getPlaylistTracks(playlistId, limit, offset);

				return json({
					success: true,
					data: tracks
				});
			}

			case 'stats': {
				const playlistId = url.searchParams.get('id');

				if (!playlistId) {
					return json({ success: false, error: 'Playlist ID is required' }, { status: 400 });
				}

				const stats = await PlaylistService.getPlaylistStats(playlistId);

				return json({
					success: true,
					data: stats
				});
			}

			default:
				return json({ success: false, error: 'Unknown action' }, { status: 400 });
		}
	} catch (error) {
		logger.error('Playlist API GET error', {
			component: 'api',
			metadata: { error }
		});

		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals, url }) => {
	try {
		const userId = locals.user?.id;

		if (!userId) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const action = url.searchParams.get('action');

		switch (action) {
			case 'remove-track': {
				const body = (await request.json()) as RemoveTrackRequest;
				const { trackId, playlistId } = body;

				if (!trackId || !playlistId) {
					return json(
						{ success: false, error: 'Track ID and Playlist ID are required' },
						{ status: 400 }
					);
				}

				const result = await PlaylistService.removeTrackFromPlaylist(playlistId, trackId, userId);

				if (!result) {
					return json(
						{ success: false, error: 'Failed to remove track from playlist' },
						{ status: 400 }
					);
				}

				logger.info('Track removed from playlist via API', {
					component: 'api',
					metadata: { userId, playlistId, trackId }
				});

				return json({ success: true });
			}

			case 'delete-playlist': {
				const playlistId = url.searchParams.get('id');

				if (!playlistId) {
					return json({ success: false, error: 'Playlist ID is required' }, { status: 400 });
				}

				const result = await PlaylistService.deletePlaylist(playlistId, userId);

				if (!result) {
					return json({ success: false, error: 'Failed to delete playlist' }, { status: 400 });
				}

				logger.info('Playlist deleted via API', {
					component: 'api',
					metadata: { userId, playlistId }
				});

				return json({ success: true });
			}

			default:
				return json({ success: false, error: 'Unknown action' }, { status: 400 });
		}
	} catch (error) {
		logger.error('Playlist API DELETE error', {
			component: 'api',
			metadata: { error }
		});

		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
