# Studio Music Upload — Observability (Plan D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrument the music upload pipeline — counters, duration histograms, a pending-uploads gauge, R2 error tracking, structured logs, and a Grafana panel — flowing through the existing prom-client `/api/metrics` + Loki/Grafana stack with no new infrastructure.

**Architecture:** New prom-client metrics + `MetricsCollector` methods in `src/lib/utils/metrics.ts`; a `withMediaLogging(op, fn)` timing helper in the media seam; emission wired into `MusicApplicationService` (create / finalize / fail) reusing the already-defined `recordMusicUpload`; R2Service errors routed through `logger`/`MetricsCollector`. A Grafana "Upload Pipeline" panel set is added to the existing dashboard provisioning.

**Tech Stack:** prom-client, SvelteKit, Grafana/Loki/Prometheus (docker-compose), vitest.

**Depends on:** Plan A (`MusicApplicationService` create/finalize call sites), Plan B (the new media kinds).

## Global Constraints

- **TDD** for `MetricsCollector` methods and `withMediaLogging`. Metric wiring inside the boundary keeps the seam at **≥90% coverage** (add the wiring under existing tests or extend them).
- **No new infrastructure** — reuse `/api/metrics`, Loki, Grafana, Prometheus already in `docker-compose.yml`.
- Reuse the existing `musicUploads` counter + `MetricsCollector.recordMusicUpload` (today defined but never called).
- Structured logs carry `requestId` (from `locals`) where available, plus `artistId`/`trackId`/`key`.
- Indentation tabs; `yarn format` before each commit.

---

### Task 1: Upload pipeline metrics + collector methods

**Files:**

- Modify: `src/lib/utils/metrics.ts`
- Test: `src/lib/utils/metrics.spec.ts`

**Interfaces:**

- Produces (prom-client, registered on the shared `register`):
  - `mediaUploadStartedTotal` Counter `{ kind }`
  - `mediaUploadFinalizedTotal` Counter `{ kind, result }`
  - `mediaUploadFailedTotal` Counter `{ kind, reason }`
  - `mediaUploadDuration` Histogram `{ kind }` (buckets up to multi-minute)
  - `mediaPendingUploads` Gauge
  - `r2ErrorsTotal` Counter `{ op }`
- `MetricsCollector` methods: `recordUploadStarted(kind)`, `recordUploadFinalized(kind, result)`, `recordUploadFailed(kind, reason)`, `observeUploadDuration(kind, seconds)`, `setPendingUploads(n)`, `recordR2Error(op)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/utils/metrics.spec.ts
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

	it('exposes a pending-uploads gauge', async () => {
		MetricsCollector.setPendingUploads(3);
		const metrics = await register.getSingleMetricAsString('media_pending_uploads');
		expect(metrics).toContain('media_pending_uploads 3');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/utils/metrics.spec.ts`
Expected: FAIL — methods not defined.

- [ ] **Step 3: Implement the metrics**

In `src/lib/utils/metrics.ts`, add after the existing business metrics (using the existing `getMetric` helper):

```ts
export const mediaUploadStartedTotal = getMetric(
	'media_upload_started_total',
	() =>
		new Counter({
			name: 'media_upload_started_total',
			help: 'Media uploads started',
			labelNames: ['kind'],
			registers: [register]
		})
);
export const mediaUploadFinalizedTotal = getMetric(
	'media_upload_finalized_total',
	() =>
		new Counter({
			name: 'media_upload_finalized_total',
			help: 'Media uploads finalized',
			labelNames: ['kind', 'result'],
			registers: [register]
		})
);
export const mediaUploadFailedTotal = getMetric(
	'media_upload_failed_total',
	() =>
		new Counter({
			name: 'media_upload_failed_total',
			help: 'Media uploads failed',
			labelNames: ['kind', 'reason'],
			registers: [register]
		})
);
export const mediaUploadDuration = getMetric(
	'media_upload_duration_seconds',
	() =>
		new Histogram({
			name: 'media_upload_duration_seconds',
			help: 'Upload create→finalize duration',
			labelNames: ['kind'],
			buckets: [1, 5, 15, 30, 60, 120, 300, 600],
			registers: [register]
		})
);
export const mediaPendingUploads = getMetric(
	'media_pending_uploads',
	() =>
		new Gauge({
			name: 'media_pending_uploads',
			help: 'Tracks awaiting upload completion',
			registers: [register]
		})
);
export const r2ErrorsTotal = getMetric(
	'r2_errors_total',
	() =>
		new Counter({
			name: 'r2_errors_total',
			help: 'R2 operation errors',
			labelNames: ['op'],
			registers: [register]
		})
);
```

Add the methods to `MetricsCollector`:

```ts
	static recordUploadStarted(kind: string) { mediaUploadStartedTotal.inc({ kind }); }
	static recordUploadFinalized(kind: string, result: 'success' | 'failure') { mediaUploadFinalizedTotal.inc({ kind, result }); }
	static recordUploadFailed(kind: string, reason: string) { mediaUploadFailedTotal.inc({ kind, reason }); }
	static observeUploadDuration(kind: string, seconds: number) { mediaUploadDuration.observe({ kind }, seconds); }
	static setPendingUploads(n: number) { mediaPendingUploads.set(n); }
	static recordR2Error(op: string) { r2ErrorsTotal.inc({ op }); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/utils/metrics.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/utils/metrics.ts src/lib/utils/metrics.spec.ts
git commit -m "feat(metrics): add media upload pipeline counters/histogram/gauge"
```

---

### Task 2: `withMediaLogging` timing helper

**Files:**

- Create: `src/lib/server/media/logging.ts`
- Test: `src/lib/server/media/logging.spec.ts`

**Interfaces:**

- Produces: `withMediaLogging<T>(op: string, fn: () => Promise<T>, ctx?: Record<string, unknown>): Promise<T>` — times `fn`, logs success at `debug` and failure at `error` (routing the failure through `MetricsCollector.recordR2Error(op)`), and re-throws.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/media/logging.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));
vi.mock('$lib/utils/metrics', () => ({ MetricsCollector: { recordR2Error: vi.fn() } }));

import { logger } from '$lib/utils/logger';
import { MetricsCollector } from '$lib/utils/metrics';
import { withMediaLogging } from './logging';

beforeEach(() => vi.clearAllMocks());

describe('withMediaLogging', () => {
	it('returns the value and logs success', async () => {
		const result = await withMediaLogging('headObject', async () => 42);
		expect(result).toBe(42);
		expect(logger.debug).toHaveBeenCalled();
	});
	it('records an R2 error and rethrows on failure', async () => {
		await expect(
			withMediaLogging('headObject', async () => {
				throw new Error('boom');
			})
		).rejects.toThrow('boom');
		expect(MetricsCollector.recordR2Error).toHaveBeenCalledWith('headObject');
		expect(logger.error).toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/media/logging.spec.ts`
Expected: FAIL — cannot resolve `./logging`.

- [ ] **Step 3: Implement**

```ts
// src/lib/server/media/logging.ts
import { logger } from '$lib/utils/logger';
import { MetricsCollector } from '$lib/utils/metrics';

export async function withMediaLogging<T>(
	op: string,
	fn: () => Promise<T>,
	ctx: Record<string, unknown> = {}
): Promise<T> {
	const start = Date.now();
	try {
		const result = await fn();
		logger.debug(`media.${op}`, {
			component: 'media',
			metadata: { ...ctx, durationMs: Date.now() - start }
		});
		return result;
	} catch (error) {
		MetricsCollector.recordR2Error(op);
		logger.error(`media.${op} failed`, { component: 'media', metadata: { ...ctx, error } });
		throw error;
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/media/logging.spec.ts`
Expected: PASS.

- [ ] **Step 5: Add `logging.ts` to the coverage include**

In `vite.config.ts`, add `'src/lib/server/media/logging.ts'` to the server project's `coverage.include` array.

- [ ] **Step 6: Commit**

```bash
yarn format
git add src/lib/server/media/logging.ts src/lib/server/media/logging.spec.ts vite.config.ts
git commit -m "feat(media): add withMediaLogging timing+error helper"
```

---

### Task 3: Wire metrics into the boundary (create / finalize / fail)

**Files:**

- Modify: `src/lib/server/music/MusicApplicationService.ts`
- Modify: `src/lib/server/music/MusicApplicationService.track.spec.ts` (extend assertions)

**Interfaces:**

- Consumes: `MetricsCollector` from `$lib/utils/metrics`.
- Behavior: `createTrack`/`replaceTrackAudio` call `recordUploadStarted(kind)`; `finalizeTrackUpload` records duration (using the track's `createdAt`/metadata timestamp as the start), `recordUploadFinalized(kind, 'success')` + `recordMusicUpload(format, true)` on success, and `recordUploadFailed(kind, reason)` + `recordUploadFinalized(kind, 'failure')` + `recordMusicUpload(format, false)` on verify failure.

- [ ] **Step 1: Extend the finalize test**

In `src/lib/server/music/MusicApplicationService.track.spec.ts`, add a metrics mock and assert the success/failure paths call the collector:

```ts
vi.mock('$lib/utils/metrics', () => ({
	MetricsCollector: {
		recordUploadStarted: vi.fn(),
		recordUploadFinalized: vi.fn(),
		recordUploadFailed: vi.fn(),
		recordMusicUpload: vi.fn(),
		observeUploadDuration: vi.fn()
	}
}));
import { MetricsCollector } from '$lib/utils/metrics';
```

Add to the success finalize test:

```ts
expect(MetricsCollector.recordUploadFinalized).toHaveBeenCalledWith('track-audio', 'success');
expect(MetricsCollector.recordMusicUpload).toHaveBeenCalledWith(expect.any(String), true);
```

Add to the failure finalize test:

```ts
expect(MetricsCollector.recordUploadFailed).toHaveBeenCalledWith('track-audio', expect.any(String));
expect(MetricsCollector.recordMusicUpload).toHaveBeenCalledWith(expect.any(String), false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.track.spec.ts`
Expected: FAIL — collector not yet called.

- [ ] **Step 3: Wire the boundary**

In `MusicApplicationService.ts`, `import { MetricsCollector } from '$lib/utils/metrics';`. In `createTrack` (and `replaceTrackAudio` from Plan B) after the audio target is issued: `MetricsCollector.recordUploadStarted('track-audio');`. In `finalizeTrackUpload`:

- on verify failure (both audio + cover branches): `MetricsCollector.recordUploadFailed('track-audio', reason); MetricsCollector.recordUploadFinalized('track-audio', 'failure'); MetricsCollector.recordMusicUpload(audio.contentType ?? 'audio', false);`
- on success: derive `format` from `audio.contentType`, compute `seconds = (Date.now() - new Date(track.createdAt).getTime()) / 1000`, then `MetricsCollector.observeUploadDuration('track-audio', seconds); MetricsCollector.recordUploadFinalized('track-audio', 'success'); MetricsCollector.recordMusicUpload(format, true);`

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.track.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/server/music/MusicApplicationService.ts src/lib/server/music/MusicApplicationService.track.spec.ts
git commit -m "feat(music): instrument upload create/finalize with pipeline metrics"
```

---

### Task 4: Route R2Service errors through the logger/metrics

**Files:**

- Modify: `src/lib/db/services/R2Service.ts:274-295` (`deleteFileFromR2`)

- [ ] **Step 1: Replace the swallowed console.error**

In `deleteFileFromR2`'s catch block, replace `console.error('Error deleting file from R2:', error);` with a routed log + metric:

```ts
	} catch (error) {
		MetricsCollector.recordR2Error('deleteObject');
		logger.error('R2 deleteObject failed', { component: 'media', metadata: { error, key: uniqueKey, bucket } });
		return false;
	}
```

Add imports at the top of `R2Service.ts`:

```ts
import { logger } from '$lib/utils/logger';
import { MetricsCollector } from '$lib/utils/metrics';
```

- [ ] **Step 2: Type-check**

Run: `yarn check`
Expected: no type errors (note: importing metrics into R2Service is server-only — confirm R2Service is not imported into any client bundle; it already imports `$env/static/private`, so it is server-only).

- [ ] **Step 3: Commit**

```bash
yarn format
git add src/lib/db/services/R2Service.ts
git commit -m "feat(media): route R2 delete errors through logger + r2_errors metric"
```

---

### Task 5: Grafana "Upload Pipeline" panel

**Files:**

- Modify: the Grafana dashboard JSON under the provisioning directory (locate in Step 1)

- [ ] **Step 1: Locate the dashboard provisioning**

Run: `git grep -l "PDM Application Overview\|dashboard" -- monitoring grafana docker 2>/dev/null; git ls-files | grep -iE "grafana|dashboard" | head`
Expected: prints the dashboard JSON path(s) used by the Grafana provisioning mounted in `docker-compose.yml`.

- [ ] **Step 2: Add the panels**

Add a row "Upload Pipeline" with panels querying the new metrics:

- Started/finalized/failed rates: `rate(media_upload_started_total[5m])`, `rate(media_upload_finalized_total{result="success"}[5m])`, `rate(media_upload_failed_total[5m])`
- p50/p95 duration: `histogram_quantile(0.95, rate(media_upload_duration_seconds_bucket[5m]))`
- Pending gauge: `media_pending_uploads`
- R2 error rate: `rate(r2_errors_total[5m])`

- [ ] **Step 3: Verify the stack scrapes it**

Run: `yarn logging:up` then open Grafana (per `docker-compose.yml` port) and confirm the panels render once an upload has happened in dev. (If the dashboard is provisioned read-only, add the JSON to the provisioning folder so it loads on restart.)

- [ ] **Step 4: Commit**

```bash
yarn format
git add -A
git commit -m "feat(observability): add Upload Pipeline Grafana panels"
```

---

## Self-Review

**Spec coverage (Plan D = spec phase 8 / §8):**

- Wire `recordMusicUpload` (previously unused) → Task 3. ✓
- Upload counters (started/finalized/failed) + duration histogram + pending gauge + R2 error counter → Tasks 1, 3, 4. ✓
- `withMediaLogging` timing helper + structured logs → Task 2; R2 error routing → Task 4. ✓
- Grafana panel through the existing stack, no new infra → Task 5. ✓

**Placeholder scan:** complete code for metrics, helper, wiring, and R2 routing; Grafana task locates the real dashboard file first (Step 1) rather than guessing a path. No TODO/implement-later. ✓

**Type consistency:** `MetricsCollector` method names (`recordUploadStarted`, `recordUploadFinalized`, `recordUploadFailed`, `observeUploadDuration`, `setPendingUploads`, `recordR2Error`) consistent between metrics.ts, the boundary, the helper, and R2Service. `withMediaLogging(op, fn, ctx?)` signature consistent. ✓
