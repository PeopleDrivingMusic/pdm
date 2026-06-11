import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	ContentMediaService,
	GalleryService,
	PostService,
	StudioContentService,
	VideoService,
	type ContentStatus,
	type ContentVisibility
} from '$lib/db/services/ContentService';
import { getArtistByCookie } from '$lib/server/artist-session';
import { uploadFile, uploadImage } from '$lib/server/upload';

const STATUS_VALUES = new Set(['draft', 'scheduled', 'published', 'archived']);
const VISIBILITY_VALUES = new Set(['public', 'followers', 'subscribers', 'investors']);

function getStatus(value: FormDataEntryValue | null): ContentStatus {
	const status = typeof value === 'string' ? value : 'draft';
	return STATUS_VALUES.has(status) ? (status as ContentStatus) : 'draft';
}

function getVisibility(value: FormDataEntryValue | null): ContentVisibility {
	const visibility = typeof value === 'string' ? value : 'public';
	return VISIBILITY_VALUES.has(visibility) ? (visibility as ContentVisibility) : 'public';
}

function getString(data: FormData, key: string) {
	const value = data.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

function getStringList(data: FormData, key: string) {
	return data
		.getAll(key)
		.filter((value): value is string => typeof value === 'string')
		.map((value) => value.trim())
		.filter(Boolean);
}

function parseDate(value: string) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function sanitizeHtml(value: string) {
	return value
		.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
		.replace(/\son\w+="[^"]*"/gi, '')
		.replace(/\son\w+='[^']*'/gi, '')
		.trim();
}

export const load: PageServerLoad = async ({ parent }) => {
	const { artist } = await parent();

	if (!artist) {
		throw error(401, 'Unauthorized');
	}

	const [content, attachableMusic] = await Promise.all([
		StudioContentService.getOverview(artist.id),
		StudioContentService.getAttachableMusic(artist.id)
	]);

	return {
		content,
		attachableMusic
	};
};

export const actions: Actions = {
	createPost: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });

		const data = await event.request.formData();
		const title = getString(data, 'title');
		const bodyHtml = sanitizeHtml(getString(data, 'bodyHtml'));
		const bodyJsonRaw = getString(data, 'bodyJson');
		const status = getStatus(data.get('status'));
		const visibility = getVisibility(data.get('visibility'));
		const scheduledAt = parseDate(getString(data, 'scheduledAt'));
		const trackIds = getStringList(data, 'trackIds');
		const albumIds = getStringList(data, 'albumIds');
		const pollQuestion = getString(data, 'pollQuestion');
		const pollOptions = getStringList(data, 'pollOptions');
		const imageFile = data.get('coverImage') as File | null;

		if (!title) return fail(400, { error: 'Title is required' });
		if (status === 'scheduled' && !scheduledAt) {
			return fail(400, { error: 'Scheduled posts need a valid date' });
		}
		if (pollQuestion && pollOptions.length < 2) {
			return fail(400, { error: 'Poll needs at least two options' });
		}

		const [tracksOwned, albumsOwned] = await Promise.all([
			StudioContentService.assertTrackOwnership(artist.id, trackIds),
			StudioContentService.assertAlbumOwnership(artist.id, albumIds)
		]);

		if (!tracksOwned || !albumsOwned) {
			return fail(403, { error: 'Attached music does not belong to this artist' });
		}

		let bodyJson: Record<string, unknown> | null = null;
		if (bodyJsonRaw) {
			try {
				bodyJson = JSON.parse(bodyJsonRaw);
			} catch {
				return fail(400, { error: 'Invalid editor document' });
			}
		}

		const mediaIds: string[] = [];
		if (imageFile && imageFile.size > 0) {
			const upload = await uploadImage(imageFile, `content/posts/${artist.id}`);
			if (!upload.success || !upload.path) {
				return fail(400, { error: upload.error || 'Failed to upload image' });
			}
			const media = await ContentMediaService.createMedia({
				artistId: artist.id,
				type: 'image',
				fileUrl: upload.path
			});
			mediaIds.push(media.id);
		}

		const post = await PostService.createPost({
			artistId: artist.id,
			title,
			bodyJson,
			bodyHtml,
			visibility,
			status,
			scheduledAt,
			mediaIds,
			trackIds,
			albumIds,
			poll: pollQuestion
				? {
						question: pollQuestion,
						mode: getString(data, 'pollMode') === 'multiple' ? 'multiple' : 'single',
						options: pollOptions,
						closesAt: parseDate(getString(data, 'pollClosesAt')),
						showResults:
							getString(data, 'pollShowResults') === 'always'
								? 'always'
								: getString(data, 'pollShowResults') === 'after_close'
									? 'after_close'
									: 'after_vote'
					}
				: null
		});

		return { success: true, post };
	},

	createGallery: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });

		const data = await event.request.formData();
		const title = getString(data, 'title');
		const description = getString(data, 'description');
		const status = getStatus(data.get('status'));
		const visibility = getVisibility(data.get('visibility'));
		const scheduledAt = parseDate(getString(data, 'scheduledAt'));
		const photoFile = data.get('photo') as File | null;
		const collectionMode = getString(data, 'collectionMode') || 'new';
		const existingAlbumId = getString(data, 'existingPhotoAlbumId');
		const newAlbumTitle = getString(data, 'newPhotoAlbumTitle') || title;

		if (collectionMode === 'new' && !newAlbumTitle) {
			return fail(400, { error: 'Gallery title is required' });
		}
		if (collectionMode === 'existing' && !existingAlbumId) {
			return fail(400, { error: 'Choose a gallery' });
		}
		if (!photoFile || photoFile.size === 0) return fail(400, { error: 'Photo is required' });

		const upload = await uploadImage(photoFile, `content/galleries/${artist.id}`);
		if (!upload.success || !upload.path) {
			return fail(400, { error: upload.error || 'Failed to upload photo' });
		}

		const media = await ContentMediaService.createMedia({
			artistId: artist.id,
			type: 'image',
			fileUrl: upload.path
		});

		const album =
			collectionMode === 'existing'
				? await GalleryService.addPhotoToAlbum({
						artistId: artist.id,
						albumId: existingAlbumId,
						mediaId: media.id
					})
				: await GalleryService.createAlbum({
						artistId: artist.id,
						title: newAlbumTitle,
						description,
						visibility,
						status,
						scheduledAt,
						mediaIds: [media.id]
					});

		if (!album) return fail(404, { error: 'Gallery not found' });

		return { success: true, album };
	},

	createVideo: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });

		const data = await event.request.formData();
		const title = getString(data, 'title');
		const description = getString(data, 'description');
		const status = getStatus(data.get('status'));
		const visibility = getVisibility(data.get('visibility'));
		const scheduledAt = parseDate(getString(data, 'scheduledAt'));
		const videoFile = data.get('video') as File | null;
		const collectionMode = getString(data, 'collectionMode') || 'none';
		const existingCollectionId = getString(data, 'existingVideoCollectionId');
		const newCollectionTitle = getString(data, 'newVideoCollectionTitle');
		const newCollectionDescription = getString(data, 'newVideoCollectionDescription');

		if (!title) return fail(400, { error: 'Title is required' });
		if (collectionMode === 'existing' && !existingCollectionId) {
			return fail(400, { error: 'Choose a video collection' });
		}
		if (collectionMode === 'new' && !newCollectionTitle) {
			return fail(400, { error: 'Collection title is required' });
		}
		if (!videoFile || videoFile.size === 0) return fail(400, { error: 'Video is required' });

		const upload = await uploadFile(videoFile, {
			subDir: `content/videos/${artist.id}`,
			allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
			maxSize: 250 * 1024 * 1024
		});

		if (!upload.success || !upload.path) {
			return fail(400, { error: upload.error || 'Failed to upload video' });
		}

		const media = await ContentMediaService.createMedia({
			artistId: artist.id,
			type: 'video',
			fileUrl: upload.path
		});

		const video = await VideoService.createVideo({
			artistId: artist.id,
			title,
			description,
			videoMediaId: media.id,
			visibility,
			status,
			scheduledAt,
			collectionId: collectionMode === 'existing' ? existingCollectionId : null,
			newCollectionTitle: collectionMode === 'new' ? newCollectionTitle : null,
			newCollectionDescription: collectionMode === 'new' ? newCollectionDescription : null
		});

		return { success: true, video };
	}
};
