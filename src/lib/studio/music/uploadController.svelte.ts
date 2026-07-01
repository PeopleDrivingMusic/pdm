import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { notificationStore } from '$lib/stores/notification.svelte';
import {
	uploadR2Target,
	clearUploadResumeState,
	type ClientMediaUploadTarget
} from '$lib/utils/helpers';
import type { TrackUploadJob, EnqueueInput } from './types';

const MAX_ACTIVE = 3;

function getActionError(data: unknown, fallback: string) {
	if (data && typeof data === 'object' && 'error' in data) {
		const error = (data as { error?: unknown }).error;
		if (typeof error === 'string' && error.trim()) return error;
	}
	return fallback;
}

// Factory (not a singleton): jobs hold File handles + object URLs that must be revoked
// on teardown; a singleton would leak across Studio navigations / artist switches.
export function createUploadController() {
	let jobs = $state<Record<string, TrackUploadJob>>({});

	function list() {
		return Object.values(jobs);
	}

	function storageKey(trackId: string, kind: 'audio' | 'cover') {
		return `pdm:track-upload:${trackId}:${kind}`;
	}

	function wait(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function createCoverPreviewUrl(file: File | null) {
		return file?.type.startsWith('image/') ? URL.createObjectURL(file) : null;
	}

	function revokeCoverPreviewUrl(job?: TrackUploadJob | null) {
		if (job?.coverPreviewUrl) URL.revokeObjectURL(job.coverPreviewUrl);
	}

	function updateJob(trackId: string, patch: Partial<TrackUploadJob>) {
		const current = jobs[trackId];
		if (!current) return;
		jobs[trackId] = { ...current, ...patch };
	}

	function removeJob(trackId: string) {
		revokeCoverPreviewUrl(jobs[trackId]);
		const next = { ...jobs };
		delete next[trackId];
		jobs = next;
	}

	async function postAction(action: string, formData: FormData) {
		const response = await fetch(action, { method: 'POST', body: formData });
		const result = deserialize(await response.text());
		if (result.type === 'success') return (result.data ?? {}) as Record<string, unknown>;
		if (result.type === 'failure') {
			throw new Error(getActionError(result.data, 'Upload could not be completed'));
		}
		throw new Error('Upload could not be completed');
	}

	async function renewTrackUploadTargets(trackId: string) {
		const formData = new FormData();
		formData.set('trackId', trackId);
		const data = await postAction('?/resumeTrackUpload', formData);
		const uploadTargets = data.uploadTargets as {
			audio: ClientMediaUploadTarget;
			cover: ClientMediaUploadTarget | null;
		};
		updateJob(trackId, { uploadTargets });
		return uploadTargets;
	}

	async function runTrackUpload(trackId: string, attempt = 1): Promise<void> {
		const job = jobs[trackId];
		if (!job) return;

		updateJob(trackId, { state: 'uploading', error: '', attempt });

		try {
			const [audioResult, coverResult] = await Promise.all([
				uploadR2Target({
					file: job.audioFile,
					upload: job.uploadTargets.audio,
					storageKey: storageKey(trackId, 'audio'),
					onProgress: (p) => updateJob(trackId, { progress: p })
				}),
				job.coverFile && job.uploadTargets.cover
					? uploadR2Target({
							file: job.coverFile,
							upload: job.uploadTargets.cover,
							storageKey: storageKey(trackId, 'cover')
						})
					: Promise.resolve(null)
			]);

			updateJob(trackId, { state: 'finalizing' });
			const finalizeData = new FormData();
			finalizeData.set('trackId', trackId);
			finalizeData.set('audioParts', JSON.stringify(audioResult.parts));
			finalizeData.set('coverUploaded', coverResult || !job.uploadTargets.cover ? 'true' : 'false');
			await postAction('?/finalizeTrackUpload', finalizeData);

			clearUploadResumeState(storageKey(trackId, 'audio'));
			clearUploadResumeState(storageKey(trackId, 'cover'));
			removeJob(trackId);
			await invalidateAll();
			notificationStore.success('Track uploaded successfully');
		} catch (err) {
			if (attempt < 3) {
				await wait(750 * attempt);
				try {
					await renewTrackUploadTargets(trackId);
					await runTrackUpload(trackId, attempt + 1);
					return;
				} catch {
					// Fall through to the visible failed state with the original upload error.
				}
			}
			const error = err instanceof Error ? err.message : 'Upload failed. Try again.';
			updateJob(trackId, { state: 'failed', error, attempt });
			notificationStore.error(error);
		} finally {
			pump();
		}
	}

	async function retryTrackUpload(trackId: string) {
		const job = jobs[trackId];
		if (!job) return;
		try {
			await renewTrackUploadTargets(trackId);
			await runTrackUpload(trackId);
		} catch (err) {
			const error = err instanceof Error ? err.message : 'Could not resume upload.';
			updateJob(trackId, { state: 'failed', error });
			notificationStore.error(error);
		}
	}

	function activeCount() {
		return list().filter((j) => j.state === 'uploading' || j.state === 'finalizing').length;
	}

	function pump() {
		for (const job of list()) {
			if (activeCount() >= MAX_ACTIVE) break;
			if (job.state === 'queued') void runTrackUpload(job.trackId);
		}
	}

	function enqueue(input: EnqueueInput) {
		revokeCoverPreviewUrl(jobs[input.trackId]);
		jobs[input.trackId] = {
			trackId: input.trackId,
			title: input.title,
			audioFile: input.audioFile,
			coverFile: input.coverFile,
			uploadTargets: input.uploadTargets,
			coverPreviewUrl: createCoverPreviewUrl(input.coverFile),
			state: 'queued',
			progress: 0,
			error: '',
			attempt: 1
		};
		pump();
	}

	function destroy() {
		list().forEach(revokeCoverPreviewUrl);
		jobs = {};
	}

	return { list, enqueue, runTrackUpload, retryTrackUpload, dismiss: removeJob, destroy };
}

export type UploadController = ReturnType<typeof createUploadController>;
