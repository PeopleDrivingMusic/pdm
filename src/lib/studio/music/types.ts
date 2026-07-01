import type { ClientMediaUploadTarget } from '$lib/utils/helpers';

export type JobState = 'queued' | 'uploading' | 'finalizing' | 'uploaded' | 'failed';

export interface TrackUploadJob {
	trackId: string;
	title: string;
	audioFile: File;
	coverFile: File | null;
	uploadTargets: { audio: ClientMediaUploadTarget; cover: ClientMediaUploadTarget | null };
	coverPreviewUrl: string | null;
	state: JobState;
	progress: number;
	error: string;
	attempt: number;
}

export interface EnqueueInput {
	trackId: string;
	title: string;
	audioFile: File;
	coverFile: File | null;
	uploadTargets: { audio: ClientMediaUploadTarget; cover: ClientMediaUploadTarget | null };
}
