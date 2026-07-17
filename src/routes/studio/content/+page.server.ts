import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { type ContentStatus, type ContentVisibility } from '$lib/db/services/ContentService';
import { getArtistByCookie } from '$lib/server/artist-session';
import { ContentApplicationService } from '$lib/server/content';
import { uploadFile, uploadImage } from '$lib/server/upload';
import { headR2Object } from '$lib/db/services/R2Service';

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

function getCommaList(value: string) {
	return value
		.split(',')
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);
}

function getNumber(data: FormData, key: string) {
	const value = data.get(key);
	if (typeof value !== 'string') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
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

	const { content, attachableMusic } = await ContentApplicationService.getStudioContent(artist.id);

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
		const pollEnabled = getString(data, 'pollEnabled') === 'true';
		const imageFile = data.get('coverImage') as File | null;

		if (!title) return fail(400, { error: 'Title is required' });
		if (status === 'scheduled' && !scheduledAt) {
			return fail(400, { error: 'Scheduled posts need a valid date' });
		}
		if (pollEnabled && pollOptions.length < 2) {
			return fail(400, { error: 'Poll needs at least two options' });
		}

		const canAttachMusic = await ContentApplicationService.canAttachMusic({
			artistId: artist.id,
			trackIds,
			albumIds
		});

		if (!canAttachMusic) {
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
			const media = await ContentApplicationService.createMedia({
				artistId: artist.id,
				type: 'image',
				fileUrl: upload.path
			});
			mediaIds.push(media.id);
		}

		const post = await ContentApplicationService.createPost({
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
			poll: pollEnabled
				? {
						question: pollQuestion || null,
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

	updatePost: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });

		const data = await event.request.formData();
		const postId = getString(data, 'postId');
		const title = getString(data, 'title');
		const bodyHtml = sanitizeHtml(getString(data, 'bodyHtml'));
		const bodyJsonRaw = getString(data, 'bodyJson');
		const status = getStatus(data.get('status'));
		const visibility = getVisibility(data.get('visibility'));
		const scheduledAt = parseDate(getString(data, 'scheduledAt'));
		const existingMediaIds = getStringList(data, 'existingMediaIds');
		const trackIds = getStringList(data, 'trackIds');
		const albumIds = getStringList(data, 'albumIds');
		const pollQuestion = getString(data, 'pollQuestion');
		const pollOptions = getStringList(data, 'pollOptions');
		const pollEnabled = getString(data, 'pollEnabled') === 'true';
		const imageFile = data.get('coverImage') as File | null;

		if (!postId) return fail(400, { error: 'Post is required' });
		if (!title) return fail(400, { error: 'Title is required' });
		if (status === 'scheduled' && !scheduledAt) {
			return fail(400, { error: 'Scheduled posts need a valid date' });
		}
		if (pollEnabled && pollOptions.length < 2) {
			return fail(400, { error: 'Poll needs at least two options' });
		}

		const canAttachMusic = await ContentApplicationService.canAttachMusic({
			artistId: artist.id,
			trackIds,
			albumIds
		});

		if (!canAttachMusic) {
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

		let mediaIds = [...existingMediaIds];
		if (imageFile && imageFile.size > 0) {
			const upload = await uploadImage(imageFile, `content/posts/${artist.id}`);
			if (!upload.success || !upload.path) {
				return fail(400, { error: upload.error || 'Failed to upload image' });
			}
			const media = await ContentApplicationService.createMedia({
				artistId: artist.id,
				type: 'image',
				fileUrl: upload.path
			});
			mediaIds = [media.id];
		}

		let post;
		try {
			post = await ContentApplicationService.updatePost({
				artistId: artist.id,
				postId,
				title,
				bodyJson,
				bodyHtml,
				visibility,
				status,
				scheduledAt,
				mediaIds,
				trackIds,
				albumIds,
				pollEnabled,
				poll: pollEnabled
					? {
							question: pollQuestion || null,
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
		} catch (error) {
			if (error instanceof Error && error.message.startsWith('Poll already has votes')) {
				return fail(400, { error: error.message });
			}
			throw error;
		}

		if (!post) return fail(404, { error: 'Post not found' });

		return { success: true, post };
	},

	deletePost: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });

		const data = await event.request.formData();
		const postId = getString(data, 'postId');
		if (!postId) return fail(400, { error: 'Post is required' });

		const deleted = await ContentApplicationService.deletePost({
			artistId: artist.id,
			postId
		});

		if (!deleted) return fail(404, { error: 'Post not found' });

		return { success: true };
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
		const uploadedPhotoKey = getString(data, 'uploadedPhotoKey');
		const photoFileType = getString(data, 'photoFileType');
		const photoFileSize = getNumber(data, 'photoFileSize');
		const photoTags = getCommaList(getString(data, 'photoTags'));
		const collectionMode = getString(data, 'collectionMode') || 'new';
		const existingAlbumId = getString(data, 'existingPhotoAlbumId');
		const newAlbumTitle = getString(data, 'newPhotoAlbumTitle') || title;

		if (collectionMode === 'new' && !newAlbumTitle) {
			return fail(400, { error: 'Gallery title is required' });
		}
		if (collectionMode === 'existing' && !existingAlbumId) {
			return fail(400, { error: 'Choose a gallery' });
		}
		let photoKey = uploadedPhotoKey;
		let metadata: Record<string, unknown> = {
			tags: photoTags,
			uploadStatus: uploadedPhotoKey ? 'uploaded' : 'server_uploaded'
		};

		if (!photoKey) {
			if (!photoFile || photoFile.size === 0) return fail(400, { error: 'Photo is required' });

			const upload = await uploadImage(photoFile, `content/galleries/${artist.id}`);
			if (!upload.success || !upload.path) {
				return fail(400, { error: upload.error || 'Failed to upload photo' });
			}
			photoKey = upload.path;
			metadata = {
				...metadata,
				contentType: photoFile.type,
				size: photoFile.size
			};
		} else {
			const object = await headR2Object({ bucket: 'images', key: photoKey });
			if (!object.exists) {
				return fail(400, { error: 'Uploaded photo was not found in storage' });
			}
			if (photoFileSize && typeof object.contentLength === 'number' && object.contentLength !== photoFileSize) {
				return fail(400, { error: 'Uploaded photo size does not match metadata' });
			}
			metadata = {
				...metadata,
				contentType: photoFileType || null,
				size: photoFileSize
			};
		}

		const media = await ContentApplicationService.createMedia({
			artistId: artist.id,
			type: 'image',
			fileUrl: photoKey,
			metadata
		});

		const album =
			collectionMode === 'existing'
				? await ContentApplicationService.addPhotoToAlbum({
						artistId: artist.id,
						albumId: existingAlbumId,
						mediaId: media.id
					})
				: await ContentApplicationService.createPhotoAlbumWithMedia({
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

		const media = await ContentApplicationService.createMedia({
			artistId: artist.id,
			type: 'video',
			fileUrl: upload.path
		});

		const video = await ContentApplicationService.createVideo({
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
