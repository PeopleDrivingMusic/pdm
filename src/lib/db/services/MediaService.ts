import { getFileUrlFromR2 } from './R2Service';

type TrackWithMedia = {
	audioUrl?: string | null;
	imageUrl?: string | null;
	coverUrl?: string | null;
};

export class MediaService {
	static async enrichTrackUrls<T extends TrackWithMedia>(track: T): Promise<T> {
		const [signedCover, signedAudio] = await Promise.all([
			track.imageUrl || track.coverUrl
				? getFileUrlFromR2({ uniqueKey: track.imageUrl ?? track.coverUrl ?? '', bucket: 'images' })
				: Promise.resolve(null),
			track.audioUrl
				? getFileUrlFromR2({ uniqueKey: track.audioUrl, bucket: 'music' })
				: Promise.resolve(null)
		]);

		return {
			...track,
			imageUrl: signedCover?.streamUrl ?? track.imageUrl,
			coverUrl: signedCover?.streamUrl ?? track.coverUrl,
			audioUrl: signedAudio?.streamUrl ?? track.audioUrl
		};
	}

	static async enrichTrackList<T extends TrackWithMedia>(list: T[]): Promise<T[]> {
		return Promise.all(list.map((item) => this.enrichTrackUrls(item)));
	}

	static async enrichComplexPopularTracks<
		T extends { tracks?: TrackWithMedia; albums?: TrackWithMedia }
	>(result: T[]): Promise<T[]> {
		return Promise.all(
			result.map(async (row) => ({
				...row,
				tracks: row.tracks ? await this.enrichTrackUrls(row.tracks) : row.tracks,
				albums: row.albums ? await this.enrichTrackUrls(row.albums) : row.albums
			}))
		);
	}
}
