import { mdiImageMultipleOutline, mdiPostOutline, mdiVideoOutline } from '@mdi/js';

export function formatDate(value: Date | string | null) {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

export function contentIcon(type: string) {
	if (type === 'photo_album') return mdiImageMultipleOutline;
	if (type === 'video' || type === 'video_collection') return mdiVideoOutline;
	return mdiPostOutline;
}

export function contentLabel(type: string) {
	if (type === 'photo_album') return 'Gallery';
	if (type === 'video_collection') return 'Video playlist';
	if (type === 'video') return 'Video';
	return 'Post';
}
