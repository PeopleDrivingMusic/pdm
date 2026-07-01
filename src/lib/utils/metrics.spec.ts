import { describe, it, expect } from 'vitest';
import { register, MetricsCollector } from './metrics';

describe('upload metrics', () => {
	it('increments the started counter for a kind', async () => {
		MetricsCollector.recordUploadStarted('track-audio');
		const metrics = await register.getSingleMetricAsString('media_upload_started_total');
		expect(metrics).toContain('media_upload_started_total');
		expect(metrics).toContain('kind="track-audio"');
	});

	it('records a failure reason', async () => {
		MetricsCollector.recordUploadFailed('track-audio', 'verify_size_mismatch');
		const metrics = await register.getSingleMetricAsString('media_upload_failed_total');
		expect(metrics).toContain('reason="verify_size_mismatch"');
	});

	it('records a finalized result', async () => {
		MetricsCollector.recordUploadFinalized('track-audio', 'success');
		const metrics = await register.getSingleMetricAsString('media_upload_finalized_total');
		expect(metrics).toContain('result="success"');
	});

	it('observes an upload duration', async () => {
		MetricsCollector.observeUploadDuration('track-audio', 12);
		const metrics = await register.getSingleMetricAsString('media_upload_duration_seconds');
		expect(metrics).toContain('media_upload_duration_seconds');
	});

	it('exposes a pending-uploads gauge', async () => {
		MetricsCollector.setPendingUploads(3);
		const metrics = await register.getSingleMetricAsString('media_pending_uploads');
		expect(metrics).toContain('media_pending_uploads 3');
	});

	it('counts R2 errors by op', async () => {
		MetricsCollector.recordR2Error('deleteObject');
		const metrics = await register.getSingleMetricAsString('r2_errors_total');
		expect(metrics).toContain('op="deleteObject"');
	});
});
