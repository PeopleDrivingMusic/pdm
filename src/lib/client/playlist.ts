// import { fetch } from '';

interface CreatePlaylistPayload {
	name: string;
	description?: string;
	isPublic?: boolean;
}

interface Playlist {
	id: string;
	name: string;
	description?: string;
	trackCount: number;
}

export class PlaylistClient {
	static async createPlaylist(data: CreatePlaylistPayload): Promise<Playlist | null> {
		try {
			const response = await fetch('/api/playlist', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-action': 'create'
				},
				body: JSON.stringify(data)
			});

			if (!response.ok) {
				return null;
			}

			const result = await response.json();
			return result.success ? result.data : null;
		} catch (error) {
			console.error('Failed to create playlist:', error);
			return null;
		}
	}

	static async getUserPlaylists(limit = 50, offset = 0): Promise<Playlist[] | null> {
		try {
			const params = new URLSearchParams({
				action: 'list',
				limit: limit.toString(),
				offset: offset.toString()
			});

			const response = await fetch(`/api/playlist?${params.toString()}`);

			if (!response.ok) {
				return null;
			}

			const result = await response.json();
			return result.success ? result.data : null;
		} catch (error) {
			console.error('Failed to get user playlists:', error);
			return null;
		}
	}

	static async getPlaylist(playlistId: string): Promise<Playlist | null> {
		try {
			const params = new URLSearchParams({
				action: 'get',
				id: playlistId
			});

			const response = await fetch(`/api/playlist?${params.toString()}`);

			if (!response.ok) {
				return null;
			}

			const result = await response.json();
			return result.success ? result.data : null;
		} catch (error) {
			console.error('Failed to get playlist:', error);
			return null;
		}
	}

	static async getPlaylistTracks(
		playlistId: string,
		limit = 50,
		offset = 0
	): Promise<unknown[] | null> {
		try {
			const params = new URLSearchParams({
				action: 'tracks',
				id: playlistId,
				limit: limit.toString(),
				offset: offset.toString()
			});

			const response = await fetch(`/api/playlist?${params.toString()}`);

			if (!response.ok) {
				return null;
			}

			const result = await response.json();
			return result.success ? result.data : null;
		} catch (error) {
			console.error('Failed to get playlist tracks:', error);
			return null;
		}
	}

	static async addTrackToPlaylist(
		playlistId: string,
		trackId: string
	): Promise<{ success: boolean; playlist?: Playlist }> {
		try {
			const response = await fetch('/api/playlist', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-action': 'add-track'
				},
				body: JSON.stringify({ playlistId, trackId })
			});

			if (!response.ok) {
				return { success: false };
			}

			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Failed to add track to playlist:', error);
			return { success: false };
		}
	}

	static async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<boolean> {
		try {
			const params = new URLSearchParams({
				action: 'remove-track'
			});

			const response = await fetch(`/api/playlist?${params.toString()}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ playlistId, trackId })
			});

			if (!response.ok) {
				return false;
			}

			const result = await response.json();
			return result.success;
		} catch (error) {
			console.error('Failed to remove track from playlist:', error);
			return false;
		}
	}

	static async deletePlaylist(playlistId: string): Promise<boolean> {
		try {
			const params = new URLSearchParams({
				action: 'delete-playlist',
				id: playlistId
			});

			const response = await fetch(`/api/playlist?${params.toString()}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				return false;
			}

			const result = await response.json();
			return result.success;
		} catch (error) {
			console.error('Failed to delete playlist:', error);
			return false;
		}
	}

	static async getPlaylistStats(
		playlistId: string
	): Promise<{ trackCount: number; totalDuration: number } | null> {
		try {
			const params = new URLSearchParams({
				action: 'stats',
				id: playlistId
			});

			const response = await fetch(`/api/playlist?${params.toString()}`);

			if (!response.ok) {
				return null;
			}

			const result = await response.json();
			return result.success ? result.data : null;
		} catch (error) {
			console.error('Failed to get playlist stats:', error);
			return null;
		}
	}
}
