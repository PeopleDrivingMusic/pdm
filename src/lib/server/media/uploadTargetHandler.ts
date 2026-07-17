import { MusicApplicationService } from '$lib/server/music';
import { MediaUploadService } from './index';

type Body = Record<string, unknown>;
type Ok = { upload: unknown };
type Err = { error: string; status: number };

function intent(body: Body) {
	return {
		fileName: typeof body.fileName === 'string' ? body.fileName : '',
		contentType: typeof body.contentType === 'string' ? body.contentType : '',
		size: typeof body.size === 'number' ? body.size : Number(body.size ?? 0)
	};
}

export async function resolveUploadTarget(artistId: string, body: Body): Promise<Ok | Err> {
	const kind = typeof body.kind === 'string' ? body.kind : '';
	const i = intent(body);
	if (!i.fileName || !i.contentType || !Number.isFinite(i.size) || i.size <= 0) {
		return { error: 'File metadata is required', status: 400 };
	}
	try {
		switch (kind) {
			case 'content-photo':
				return { upload: await MediaUploadService.createContentPhotoUpload({ artistId, ...i }) };
			case 'album-cover': {
				const albumId = typeof body.albumId === 'string' ? body.albumId : '';
				if (!albumId) return { error: 'albumId is required', status: 400 };
				const { uploadTarget } = await MusicApplicationService.createAlbumCover(
					artistId,
					albumId,
					i
				);
				return { upload: uploadTarget };
			}
			case 'track-cover': {
				const trackId = typeof body.trackId === 'string' ? body.trackId : '';
				if (!trackId) return { error: 'trackId is required', status: 400 };
				const { uploadTarget } = await MusicApplicationService.replaceTrackImage(
					artistId,
					trackId,
					i
				);
				return { upload: uploadTarget };
			}
			case 'track-audio': {
				const trackId = typeof body.trackId === 'string' ? body.trackId : '';
				if (!trackId) return { error: 'trackId is required', status: 400 };
				const { uploadTargets } = await MusicApplicationService.replaceTrackAudio(
					artistId,
					trackId,
					i
				);
				return { upload: uploadTargets.audio };
			}
			default:
				return { error: 'Unsupported upload kind', status: 400 };
		}
	} catch (err) {
		const status = (err as { status?: number }).status ?? 400;
		return { error: err instanceof Error ? err.message : 'Upload could not be prepared', status };
	}
}
