import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import { getArtistByCookie } from '$lib/server/artist-session';
import { MusicApplicationService, MusicAccessError } from '$lib/server/music';
import { createRateLimiter } from '$lib/server/security/rateLimiter';
import { isSameOrigin } from '$lib/server/security/origin';
import type { StudioMusicOverviewDTO, Visibility } from '$lib/server/music';

const createTrackLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

function normalizeGenres(genresString: string | null | undefined) {
	return (genresString ?? '')
		.split(',')
		.map((genre) => genre.trim().toLowerCase())
		.filter(Boolean);
}

function parseVisibility(value: FormDataEntryValue | null): Visibility {
	return value === 'subscribers_only' ? 'subscribers_only' : 'public';
}

function getPositiveNumber(value: FormDataEntryValue | null) {
	if (typeof value !== 'string') return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function fromError(err: unknown) {
	if (err instanceof MusicAccessError) return fail(404, { error: err.message });
	const message = err instanceof Error ? err.message : 'Request failed';
	return fail(400, { error: message });
}

// TEMPORARY compat shim: maps the DTO overview back to the legacy shape the current
// StudioMusicPage.svelte reads. Removed in Plan C (UI redesign) once the UI consumes
// DTO keys (audioKey/imageKey/coverImageKey) directly. It reconstructs albumTracks in
// memory from the overview — no DB access from the route.
function toLegacyShape(overview: StudioMusicOverviewDTO) {
	const albums = overview.albums.map((a) => ({ ...a, coverImageUrl: a.coverImageKey }));
	const tracks = overview.tracks.map(({ track, stats }) => ({
		track: { ...track, audioUrl: track.audioKey, imageUrl: track.imageKey, genre: track.genres },
		stats
	}));
	const albumById = new Map(albums.map((a) => [a.id, a]));
	const trackById = new Map(tracks.map((t) => [t.track.id, t.track]));
	const albumTracks = overview.albumTracks.map((at) => ({
		albumTrack: at,
		album: albumById.get(at.albumId),
		track: trackById.get(at.trackId)
	}));
	return { albums, tracks, albumTracks, genres: overview.genres, stats: overview.stats };
}

export const load: PageServerLoad = async ({ parent }) => {
	const { artist } = await parent();
	if (!artist) throw error(401, 'Unauthorized');
	try {
		const overview = await MusicApplicationService.getStudioOverview(artist.id);
		return toLegacyShape(overview);
	} catch (err) {
		console.error('Failed to load studio music data:', err);
		throw error(500, 'Failed to load music data');
	}
};

export const actions: Actions = {
	createAlbum: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const title = (data.get('title') as string)?.trim();
			if (!title) return fail(400, { error: 'Title is required' });
			const releaseDate = data.get('releaseDate') as string;
			const album = await MusicApplicationService.createAlbum(artist.id, {
				title,
				description: (data.get('description') as string) || null,
				releaseDate: releaseDate ? new Date(releaseDate) : null,
				genres: normalizeGenres(data.get('genres') as string),
				visibility: parseVisibility(data.get('visibility'))
			});
			return { success: true, album };
		} catch (err) {
			return fromError(err);
		}
	},

	updateAlbum: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const albumId = data.get('albumId') as string;
			if (!albumId) return fail(400, { error: 'Album ID is required' });
			const releaseDate = data.get('releaseDate') as string;
			const genres = normalizeGenres(data.get('genres') as string);
			const album = await MusicApplicationService.updateAlbum(artist.id, albumId, {
				title: (data.get('title') as string) || undefined,
				description: data.has('description')
					? (data.get('description') as string) || null
					: undefined,
				releaseDate: releaseDate ? new Date(releaseDate) : undefined,
				genres: genres.length > 0 ? genres : undefined,
				isPublished: data.has('isPublished') ? data.get('isPublished') === 'true' : undefined,
				visibility: data.has('visibility') ? parseVisibility(data.get('visibility')) : undefined
			});
			return { success: true, album };
		} catch (err) {
			return fromError(err);
		}
	},

	deleteAlbum: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const albumId = data.get('albumId') as string;
			if (!albumId) return fail(400, { error: 'Album ID is required' });
			await MusicApplicationService.deleteAlbum(artist.id, albumId);
			return { success: true };
		} catch (err) {
			return fromError(err);
		}
	},

	createTrack: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		if (!isSameOrigin(event)) return fail(403, { error: 'Forbidden' });
		if (!createTrackLimiter.check(artist.id)) return fail(429, { error: 'Too many requests' });
		try {
			const data = await event.request.formData();
			const metaJson = data.get('metadata') as string | null;
			const meta = metaJson ? JSON.parse(metaJson) : null;
			const title = ((data.get('title') as string) || meta?.title || '').trim();
			if (!title) return fail(400, { error: 'Title is required' });

			const cover_title = data.get('cover_title') as string | null;
			const cover_type = data.get('cover_type') as string | null;
			const cover_size = getPositiveNumber(data.get('cover_size'));

			const result = await MusicApplicationService.createTrack(artist.id, {
				title,
				genres: normalizeGenres(data.get('genres') as string),
				visibility: parseVisibility(data.get('visibility')),
				duration: meta?.duration ?? null,
				audio: {
					fileName: data.get('file_name') as string,
					contentType: data.get('type') as string,
					size: getPositiveNumber(data.get('file_size'))
				},
				cover:
					cover_title && cover_type && cover_size > 0
						? { fileName: cover_title, contentType: cover_type, size: cover_size }
						: null
			});
			return { success: true, ...result };
		} catch (err) {
			return fromError(err);
		}
	},

	resumeTrackUpload: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const trackId = data.get('trackId') as string;
			if (!trackId) return fail(400, { error: 'Track ID is required' });
			const result = await MusicApplicationService.resumeTrackUpload(artist.id, trackId);
			return { success: true, ...result };
		} catch (err) {
			return fromError(err);
		}
	},

	finalizeTrackUpload: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const trackId = data.get('trackId') as string;
			if (!trackId) return fail(400, { error: 'Track ID is required' });
			const raw = data.get('audioParts');
			const audioParts =
				typeof raw === 'string' && raw.trim()
					? (JSON.parse(raw) as Array<{ partNumber: number; etag: string }>).filter(
							(p) => Number.isInteger(p.partNumber) && p.partNumber > 0 && p.etag
						)
					: [];
			const result = await MusicApplicationService.finalizeTrackUpload(artist.id, trackId, {
				audioParts,
				coverUploaded: data.get('coverUploaded') === 'true'
			});
			return { success: true, ...result };
		} catch (err) {
			return fromError(err);
		}
	},

	updateTrack: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const trackId = data.get('trackId') as string;
			if (!trackId) return fail(400, { error: 'Track ID is required' });
			const isPublished = data.get('isPublished');
			const durationValue = data.get('duration') as string | null;
			const genres = normalizeGenres(data.get('genres') as string);
			const track = await MusicApplicationService.updateTrackMetadata(artist.id, trackId, {
				title: (data.get('title') as string) || undefined,
				genres: genres.length > 0 ? genres : undefined,
				visibility: data.has('visibility') ? parseVisibility(data.get('visibility')) : undefined,
				isPublished:
					isPublished !== null ? isPublished === 'true' || isPublished === 'on' : undefined,
				duration:
					durationValue && durationValue.trim() !== '' && Number.isFinite(Number(durationValue))
						? Math.round(Number(durationValue))
						: undefined
			});
			return { success: true, track };
		} catch (err) {
			return fromError(err);
		}
	},

	deleteTrack: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const trackId = data.get('trackId') as string;
			if (!trackId) return fail(400, { error: 'Track ID is required' });
			await MusicApplicationService.deleteTrack(artist.id, trackId);
			return { success: true };
		} catch (err) {
			return fromError(err);
		}
	},

	linkTrackToAlbum: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const albumId = data.get('albumId') as string;
			const trackId = data.get('trackId') as string;
			const trackNumber = data.get('trackNumber') as string;
			if (!albumId || !trackId) return fail(400, { error: 'Album ID and Track ID are required' });
			const albumTrack = await MusicApplicationService.linkTrackToAlbum(
				artist.id,
				albumId,
				trackId,
				trackNumber ? parseInt(trackNumber) : 1
			);
			return { success: true, albumTrack };
		} catch (err) {
			return fromError(err);
		}
	},

	unlinkTrackFromAlbum: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const albumId = data.get('albumId') as string;
			const trackId = data.get('trackId') as string;
			if (!albumId || !trackId) return fail(400, { error: 'Album ID and Track ID are required' });
			await MusicApplicationService.unlinkTrackFromAlbum(artist.id, albumId, trackId);
			return { success: true };
		} catch (err) {
			return fromError(err);
		}
	}
};
