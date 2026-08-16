# Studio Music Upload — UI Redesign (Plan C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. For visual implementation, use the `ui-ux-pro-max` skill against the design tokens and the designer spec in `docs/superpowers/specs/2026-06-30-studio-music-upload-refactor-design.md` §5.

**Goal:** Replace the ~1480-line `StudioMusicPage.svelte` monolith with a beautiful, responsive, accessible Studio music experience — reusable `src/lib/ui/` molecules, a rune-backed upload controller with real progress + drag&drop multi-file, a persistent upload dock, gate (visibility) controls, and unified status/gate badges — without regressing the existing R2 resumable upload pipeline.

**Architecture:** Reusable molecules (`Badge`, `ProgressBar`, `SegmentedControl`, `VisibilityToggle`, `UploadDropzone`) live in `src/lib/ui/` (catalogued + tested). Feature components live in `src/routes/studio/music/components/`. The upload pipeline (`uploadR2Target` resume/retry) is extracted verbatim into a factory controller `src/lib/studio/music/uploadController.svelte.ts`. The page consumes the DTOs from Plan A's `MusicApplicationService` load.

**Tech Stack:** Svelte 5 runes, SCSS (design tokens), SvelteKit form actions + `fetch`/`deserialize`, vitest browser project (`*.svelte.spec.ts`), Playwright e2e.

**Depends on:** Plan A (DTO load shape, `visibility`), Plan B (presigned album-cover/track-replace + `upload-target` kinds). The client `ClientMediaUploadTarget.kind` union must be extended to include `'album-cover'` (see Task 7 Step 1).

## Global Constraints

- **Svelte 5 runes only** (`$state`, `$derived`, `$props`, `$effect`). Tabs indentation; `yarn format` before each commit.
- **Reusable molecules → `src/lib/ui/`**, generic props only (no `$lib/server`/route-data imports), catalogued in `.claude/wiki/product/design-system.md`, with component tests + e2e (spec §5.0).
- **Design = evolution of existing tokens** (dark studio). Add new tokens per spec §5.7; do not invent raw hex beyond tints of existing palette. Confirm exact existing token names against `src/styles/tokens.css` before use.
- **MUST NOT regress** the upload pipeline: the `createTrack` `FormData` contract, resume keys `pdm:track-upload:${trackId}:${audio|cover}`, retry ×3 + `750ms*attempt` backoff + `renewTrackUploadTargets`→finalize order, object-URL revocation on teardown.
- **Gate = `public` (default) | `subscribers_only`**; album→track inheritance shown (read from DTOs).
- **a11y:** color-not-only (icon + text), `role="progressbar"` with values, `aria-live="polite"` dock with threshold announcements, focusable dropzone, `prefers-reduced-motion`.
- Component tests run in the vitest **client** project (`*.svelte.spec.ts`, browser env via Playwright).

---

### Task 1: Design tokens + StatCard theming fix

**Files:**

- Modify: `src/styles/tokens.css` (add new tokens)
- Modify: `src/styles/themes/dark.css` (dark overrides if the file separates them)
- Modify: `src/lib/ui/StatCard.svelte` (theming consistency)

**Interfaces:**

- Produces: the gate / upload-progress / status-badge / surface tokens from spec §5.7 (`--gate-accent`, `--gate-tint-bg`, `--gate-tint-text`, `--gate-inherited-border`, `--upload-track-bg`, `--upload-progress`, `--upload-progress-done`, `--upload-failed`, `--upload-overlay`, `--status-*-bg/text`, `--dropzone-active-border`, `--selection-bg`, `--toolbar-bg`).

- [ ] **Step 1: Confirm existing token names**

Run: `git grep -nE "(--color-brand-400|--color-success|--color-blue|--color-error|--bg-surface|--text-secondary|--radius-|--shadow-)" src/styles | head -40`
Expected: prints the existing token definitions you will reference. Note the exact names; adjust the values below to reference real tokens.

- [ ] **Step 2: Add the new tokens**

Append the spec §5.7 token block to the appropriate `:root` / `[data-theme="dark"]` selector in `src/styles/tokens.css`. Each new token must reference an existing primitive or a tint of one (no new raw palette). Example (adjust names to Step 1 findings):

```css
--gate-accent: var(--color-brand-400);
--gate-accent-strong: var(--color-brand-500);
--gate-on-accent: var(--color-gray-900);
--gate-tint-bg: rgba(255, 178, 0, 0.16);
--gate-tint-text: var(--color-brand-300);
--gate-public-text: var(--text-secondary);
--gate-inherited-border: rgba(255, 178, 0, 0.45);
--upload-track-bg: var(--color-gray-700);
--upload-progress: var(--color-blue-500);
--upload-progress-done: var(--color-success-500);
--upload-failed: var(--color-error-500);
--upload-overlay: rgba(10, 12, 18, 0.55);
--status-draft-bg: var(--bg-tertiary);
--status-draft-text: var(--text-secondary);
--status-published-bg: rgba(40, 196, 136, 0.16);
--status-published-text: var(--color-success-300);
--status-scheduled-bg: rgba(123, 148, 255, 0.16);
--status-scheduled-text: var(--color-blue-300);
--status-failed-bg: rgba(233, 77, 61, 0.16);
--status-failed-text: var(--color-error-300);
--dropzone-active-border: var(--border-focus);
--selection-bg: rgba(255, 178, 0, 0.1);
--toolbar-bg: var(--bg-primary);
```

- [ ] **Step 3: Fix StatCard theming**

In `src/lib/ui/StatCard.svelte`, replace any `@media (prefers-color-scheme: dark)` rule with the app's `[data-theme="dark"]` token references so it themes consistently with the rest of Studio (spec §5.7).

- [ ] **Step 4: Verify the app still builds**

Run: `yarn check`
Expected: no SCSS/type errors.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/styles/ src/lib/ui/StatCard.svelte
git commit -m "feat(ui): add gate/upload/status tokens and fix StatCard theming"
```

---

### Task 2: `ProgressBar` reusable molecule

**Files:**

- Create: `src/lib/ui/ProgressBar.svelte`
- Test: `src/lib/ui/ProgressBar.svelte.spec.ts`

**Interfaces:**

- Produces: a non-interactive determinate bar. Props: `{ value: number; max?: number; label: string; state?: 'active' | 'done' | 'failed'; indeterminate?: boolean }`. Renders `role="progressbar"` with `aria-valuenow/min/max` (omitted when `indeterminate`) and `aria-label={label}`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ui/ProgressBar.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test } from 'vitest';
import ProgressBar from './ProgressBar.svelte';

test('renders a progressbar with aria values', async () => {
	const screen = render(ProgressBar, { value: 42, label: 'Uploading Song' });
	const bar = screen.getByRole('progressbar');
	await expect.element(bar).toHaveAttribute('aria-valuenow', '42');
	await expect.element(bar).toHaveAttribute('aria-label', 'Uploading Song');
});

test('omits aria-valuenow when indeterminate', async () => {
	const screen = render(ProgressBar, { value: 0, label: 'Finalizing', indeterminate: true });
	const bar = screen.getByRole('progressbar');
	await expect.element(bar).not.toHaveAttribute('aria-valuenow');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/ui/ProgressBar.svelte.spec.ts`
Expected: FAIL — cannot resolve `./ProgressBar.svelte`.

- [ ] **Step 3: Implement**

```svelte
<!-- src/lib/ui/ProgressBar.svelte -->
<script lang="ts">
	let {
		value = 0,
		max = 100,
		label,
		state = 'active',
		indeterminate = false
	}: {
		value?: number;
		max?: number;
		label: string;
		state?: 'active' | 'done' | 'failed';
		indeterminate?: boolean;
	} = $props();

	const pct = $derived(Math.max(0, Math.min(100, (value / max) * 100)));
</script>

<div
	class="progress-bar {state}"
	class:indeterminate
	role="progressbar"
	aria-label={label}
	aria-valuemin={indeterminate ? undefined : 0}
	aria-valuemax={indeterminate ? undefined : max}
	aria-valuenow={indeterminate ? undefined : Math.round(value)}
>
	<span class="fill" style={indeterminate ? '' : `width:${pct}%`}></span>
</div>

<style lang="scss">
	.progress-bar {
		position: relative;
		height: 6px;
		width: 100%;
		border-radius: var(--radius-full);
		background: var(--upload-track-bg);
		overflow: hidden;

		.fill {
			position: absolute;
			inset: 0 auto 0 0;
			background: var(--upload-progress);
			border-radius: inherit;
			transition: width var(--duration-normal) ease;
		}
		&.done .fill {
			background: var(--upload-progress-done);
		}
		&.failed .fill {
			width: 100% !important;
			background: var(--upload-failed);
		}
		&.indeterminate .fill {
			width: 40%;
			animation: indeterminate 1.2s ease-in-out infinite;
		}
	}
	@keyframes indeterminate {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(350%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.progress-bar.indeterminate .fill {
			animation: none;
			width: 100%;
		}
	}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/ui/ProgressBar.svelte.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/ui/ProgressBar.svelte src/lib/ui/ProgressBar.svelte.spec.ts
git commit -m "feat(ui): add reusable ProgressBar molecule"
```

---

### Task 3: `Badge` reusable molecule

**Files:**

- Create: `src/lib/ui/Badge.svelte`
- Test: `src/lib/ui/Badge.svelte.spec.ts`

**Interfaces:**

- Produces: `{ variant: 'draft' | 'published' | 'scheduled' | 'uploading' | 'failed' | 'gate'; label: string; icon?: string }`. Renders an icon (`SvgIcon`) + text (never color-only). `gate` variant uses the gate tint tokens; the rest use `--status-*` token pairs.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ui/Badge.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test } from 'vitest';
import Badge from './Badge.svelte';

test('renders label text and the variant class', async () => {
	const screen = render(Badge, { variant: 'published', label: 'Published' });
	await expect.element(screen.getByText('Published')).toBeInTheDocument();
});

test('gate variant shows its label', async () => {
	const screen = render(Badge, { variant: 'gate', label: 'Subscribers' });
	await expect.element(screen.getByText('Subscribers')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/ui/Badge.svelte.spec.ts`
Expected: FAIL — cannot resolve `./Badge.svelte`.

- [ ] **Step 3: Implement**

```svelte
<!-- src/lib/ui/Badge.svelte -->
<script lang="ts">
	import SvgIcon from './SvgIcon.svelte';
	let {
		variant,
		label,
		icon
	}: {
		variant: 'draft' | 'published' | 'scheduled' | 'uploading' | 'failed' | 'gate';
		label: string;
		icon?: string;
	} = $props();
</script>

<span class="badge {variant}">
	{#if icon}<SvgIcon path={icon} size={14} />{/if}
	<span class="label">{label}</span>
</span>

<style lang="scss">
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		white-space: nowrap;

		&.draft {
			background: var(--status-draft-bg);
			color: var(--status-draft-text);
		}
		&.published {
			background: var(--status-published-bg);
			color: var(--status-published-text);
		}
		&.scheduled {
			background: var(--status-scheduled-bg);
			color: var(--status-scheduled-text);
		}
		&.uploading {
			background: var(--status-scheduled-bg);
			color: var(--status-scheduled-text);
		}
		&.failed {
			background: var(--status-failed-bg);
			color: var(--status-failed-text);
		}
		&.gate {
			background: var(--gate-tint-bg);
			color: var(--gate-tint-text);
		}
	}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/ui/Badge.svelte.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/ui/Badge.svelte src/lib/ui/Badge.svelte.spec.ts
git commit -m "feat(ui): add reusable Badge molecule (status + gate, icon+text)"
```

---

### Task 4: `SegmentedControl` reusable molecule

**Files:**

- Create: `src/lib/ui/SegmentedControl.svelte`
- Test: `src/lib/ui/SegmentedControl.svelte.spec.ts`

**Interfaces:**

- Produces: `{ value: string ($bindable); options: { value: string; label: string; icon?: string }[]; disabled?: boolean; ariaLabel: string; onChange?: (v: string) => void }`. Renders a group of `<button role="radio" aria-checked>` inside `role="radiogroup"`; arrow-key navigation; click/Enter selects.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ui/SegmentedControl.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import SegmentedControl from './SegmentedControl.svelte';

const options = [
	{ value: 'public', label: 'Public' },
	{ value: 'subscribers_only', label: 'Subscribers' }
];

test('marks the selected option aria-checked', async () => {
	const screen = render(SegmentedControl, { value: 'public', options, ariaLabel: 'Visibility' });
	await expect
		.element(screen.getByRole('radio', { name: 'Public' }))
		.toHaveAttribute('aria-checked', 'true');
});

test('fires onChange when another option is clicked', async () => {
	const onChange = vi.fn();
	const screen = render(SegmentedControl, {
		value: 'public',
		options,
		ariaLabel: 'Visibility',
		onChange
	});
	await screen.getByRole('radio', { name: 'Subscribers' }).click();
	expect(onChange).toHaveBeenCalledWith('subscribers_only');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/ui/SegmentedControl.svelte.spec.ts`
Expected: FAIL — cannot resolve `./SegmentedControl.svelte`.

- [ ] **Step 3: Implement**

```svelte
<!-- src/lib/ui/SegmentedControl.svelte -->
<script lang="ts">
	import SvgIcon from './SvgIcon.svelte';
	type Option = { value: string; label: string; icon?: string };
	let {
		value = $bindable(),
		options,
		disabled = false,
		ariaLabel,
		onChange
	}: {
		value: string;
		options: Option[];
		disabled?: boolean;
		ariaLabel: string;
		onChange?: (v: string) => void;
	} = $props();

	function select(v: string) {
		if (disabled || v === value) return;
		value = v;
		onChange?.(v);
	}

	function onKey(e: KeyboardEvent, index: number) {
		if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
		e.preventDefault();
		const next =
			e.key === 'ArrowRight'
				? (index + 1) % options.length
				: (index - 1 + options.length) % options.length;
		select(options[next].value);
	}
</script>

<div class="segmented" role="radiogroup" aria-label={ariaLabel}>
	{#each options as option, i}
		<button
			type="button"
			role="radio"
			aria-checked={value === option.value}
			class:active={value === option.value}
			{disabled}
			onclick={() => select(option.value)}
			onkeydown={(e) => onKey(e, i)}
		>
			{#if option.icon}<SvgIcon path={option.icon} size={16} />{/if}
			<span>{option.label}</span>
		</button>
	{/each}
</div>

<style lang="scss">
	.segmented {
		display: inline-flex;
		gap: var(--space-1);
		padding: 2px;
		border-radius: var(--radius-md);
		background: var(--bg-secondary);
		border: 1px solid var(--border-primary);

		button {
			display: inline-flex;
			align-items: center;
			gap: var(--space-1);
			padding: var(--space-1) var(--space-3);
			min-height: 32px;
			border: 0;
			border-radius: var(--radius-sm);
			background: transparent;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
			cursor: pointer;
			transition:
				background var(--duration-fast),
				color var(--duration-fast);

			&.active {
				background: var(--bg-surface);
				color: var(--text-primary);
			}
			&:focus-visible {
				outline: 2px solid var(--border-focus);
				outline-offset: 1px;
			}
			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}
	}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/ui/SegmentedControl.svelte.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/ui/SegmentedControl.svelte src/lib/ui/SegmentedControl.svelte.spec.ts
git commit -m "feat(ui): add reusable SegmentedControl molecule"
```

---

### Task 5: `VisibilityToggle` reusable molecule

**Files:**

- Create: `src/lib/ui/VisibilityToggle.svelte`
- Test: `src/lib/ui/VisibilityToggle.svelte.spec.ts`

**Interfaces:**

- Consumes: `SegmentedControl`, `@mdi/js` (`mdiEarth`, `mdiLock`).
- Produces: `{ value: 'public' | 'subscribers_only' ($bindable); level: 'album' | 'track'; inheritedFrom?: 'album' | null; disabled?: boolean; onChange?: (v) => void }`. Shows the segmented control; when `inheritedFrom === 'album'` and not overridden, shows an inherited cue + an "Override" affordance; selecting subscribers_only reveals the one-line helper.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ui/VisibilityToggle.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import VisibilityToggle from './VisibilityToggle.svelte';

test('defaults to public and shows both options', async () => {
	const screen = render(VisibilityToggle, { value: 'public', level: 'track' });
	await expect
		.element(screen.getByRole('radio', { name: /Public/ }))
		.toHaveAttribute('aria-checked', 'true');
});

test('shows the subscribers helper when subscribers_only is selected', async () => {
	const onChange = vi.fn();
	const screen = render(VisibilityToggle, { value: 'public', level: 'track', onChange });
	await screen.getByRole('radio', { name: /Subscribers/ }).click();
	expect(onChange).toHaveBeenCalledWith('subscribers_only');
});

test('shows an inherited cue for an inherited track', async () => {
	const screen = render(VisibilityToggle, {
		value: 'subscribers_only',
		level: 'track',
		inheritedFrom: 'album'
	});
	await expect.element(screen.getByText(/from album/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/ui/VisibilityToggle.svelte.spec.ts`
Expected: FAIL — cannot resolve `./VisibilityToggle.svelte`.

- [ ] **Step 3: Implement**

```svelte
<!-- src/lib/ui/VisibilityToggle.svelte -->
<script lang="ts">
	import { mdiEarth, mdiLock } from '@mdi/js';
	import SegmentedControl from './SegmentedControl.svelte';

	let {
		value = $bindable(),
		level,
		inheritedFrom = null,
		disabled = false,
		onChange
	}: {
		value: 'public' | 'subscribers_only';
		level: 'album' | 'track';
		inheritedFrom?: 'album' | null;
		disabled?: boolean;
		onChange?: (v: 'public' | 'subscribers_only') => void;
	} = $props();

	let overridden = $state(false);
	const locked = $derived(inheritedFrom === 'album' && !overridden);

	const options = [
		{ value: 'public', label: 'Public', icon: mdiEarth },
		{ value: 'subscribers_only', label: 'Subscribers', icon: mdiLock }
	];

	function handleChange(v: string) {
		value = v as 'public' | 'subscribers_only';
		onChange?.(value);
	}
</script>

<div class="visibility-toggle">
	<SegmentedControl
		{value}
		{options}
		disabled={disabled || locked}
		ariaLabel={`${level} visibility`}
		onChange={handleChange}
	/>
	{#if locked}
		<span class="cue">
			Subscribers-only (from album)
			<button type="button" class="override" onclick={() => (overridden = true)}>Override</button>
		</span>
	{:else if value === 'subscribers_only'}
		<span class="helper">Only your $1/mo subscribers can play this.</span>
	{/if}
</div>

<style lang="scss">
	.visibility-toggle {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.cue,
	.helper {
		font-size: var(--font-size-xs);
		color: var(--text-tertiary);
	}
	.cue {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
	}
	.override {
		border: 0;
		background: transparent;
		color: var(--gate-tint-text);
		cursor: pointer;
		text-decoration: underline;
		font-size: inherit;
		padding: 0;
	}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/ui/VisibilityToggle.svelte.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/ui/VisibilityToggle.svelte src/lib/ui/VisibilityToggle.svelte.spec.ts
git commit -m "feat(ui): add reusable VisibilityToggle molecule with inheritance cue"
```

---

### Task 6: `UploadDropzone` reusable molecule

**Files:**

- Create: `src/lib/ui/UploadDropzone.svelte`
- Test: `src/lib/ui/UploadDropzone.svelte.spec.ts`

**Interfaces:**

- Produces: `{ accept?: string; maxSizeMb?: number; disabled?: boolean; onFiles: (files: File[]) => void }`. Real drag&drop (`ondragenter/over/leave/drop`) + a hidden `<input type="file" multiple>`; keyboard-operable (Enter/Space opens the picker); filters by type/size and emits accepted `File[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ui/UploadDropzone.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import UploadDropzone from './UploadDropzone.svelte';

test('exposes a labelled file input button', async () => {
	const screen = render(UploadDropzone, { onFiles: vi.fn() });
	await expect.element(screen.getByRole('button')).toBeInTheDocument();
});

test('emits accepted files on input change', async () => {
	const onFiles = vi.fn();
	const screen = render(UploadDropzone, { accept: 'audio/*', onFiles });
	const input = screen.container.querySelector('input[type=file]') as HTMLInputElement;
	const file = new File(['x'], 'song.mp3', { type: 'audio/mpeg' });
	Object.defineProperty(input, 'files', { value: [file] });
	input.dispatchEvent(new Event('change', { bubbles: true }));
	expect(onFiles).toHaveBeenCalledWith([file]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/ui/UploadDropzone.svelte.spec.ts`
Expected: FAIL — cannot resolve `./UploadDropzone.svelte`.

- [ ] **Step 3: Implement**

```svelte
<!-- src/lib/ui/UploadDropzone.svelte -->
<script lang="ts">
	import { mdiUpload } from '@mdi/js';
	import SvgIcon from './SvgIcon.svelte';

	let {
		accept = 'audio/*',
		maxSizeMb = 100,
		disabled = false,
		onFiles
	}: {
		accept?: string;
		maxSizeMb?: number;
		disabled?: boolean;
		onFiles: (files: File[]) => void;
	} = $props();

	let input: HTMLInputElement;
	let dragOver = $state(false);

	function accepts(file: File) {
		const okSize = file.size <= maxSizeMb * 1024 * 1024;
		if (accept === 'audio/*') return okSize && file.type.startsWith('audio/');
		if (accept === 'image/*') return okSize && file.type.startsWith('image/');
		return okSize;
	}

	function emit(list: FileList | null) {
		if (!list) return;
		const files = Array.from(list).filter(accepts);
		if (files.length) onFiles(files);
	}

	function open() {
		if (!disabled) input.click();
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		emit(e.dataTransfer?.files ?? null);
	}
</script>

<div
	class="dropzone"
	class:drag-over={dragOver}
	class:disabled
	role="button"
	tabindex="0"
	onclick={open}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
	ondragenter={(e) => (e.preventDefault(), (dragOver = true))}
	ondragover={(e) => e.preventDefault()}
	ondragleave={() => (dragOver = false)}
	ondrop={onDrop}
>
	<SvgIcon path={mdiUpload} size={28} />
	<p>Click to upload or drag &amp; drop</p>
	<span class="hint">Up to {maxSizeMb} MB each · multiple files OK</span>
	<input
		bind:this={input}
		type="file"
		{accept}
		multiple
		hidden
		onchange={(e) => emit((e.currentTarget as HTMLInputElement).files)}
	/>
</div>

<style lang="scss">
	.dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-8);
		border: 2px dashed var(--border-primary);
		border-radius: var(--radius-lg);
		background: var(--bg-surface);
		color: var(--text-secondary);
		text-align: center;
		cursor: pointer;
		transition:
			border-color var(--duration-fast),
			background var(--duration-fast);

		&.drag-over {
			border-color: var(--dropzone-active-border);
			background: var(--bg-secondary);
		}
		&.disabled {
			opacity: 0.5;
			pointer-events: none;
		}
		&:focus-visible {
			outline: 2px solid var(--border-focus);
			outline-offset: 2px;
		}
		.hint {
			font-size: var(--font-size-xs);
			color: var(--text-tertiary);
		}
		p {
			margin: 0;
		}
	}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/ui/UploadDropzone.svelte.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/ui/UploadDropzone.svelte src/lib/ui/UploadDropzone.svelte.spec.ts
git commit -m "feat(ui): add reusable UploadDropzone molecule (real drag&drop + multi-file)"
```

---

### Task 7: Extract the upload controller

**Files:**

- Modify: `src/lib/utils/helpers.ts:27-34` (extend `ClientMediaUploadTarget.kind` with `'album-cover'`)
- Create: `src/lib/studio/music/types.ts`
- Create: `src/lib/studio/music/uploadController.svelte.ts`
- Test: `src/lib/studio/music/uploadController.svelte.spec.ts`

**Interfaces:**

- Consumes: `uploadR2Target`, `clearUploadResumeState`, `type ClientMediaUploadTarget`, `type ClientUploadResult` from `$lib/utils/helpers`; `deserialize` from `$app/forms`; `invalidateAll` from `$app/navigation`; `notificationStore`.
- Produces: `createUploadController()` returning `{ jobs (rune record), list(): TrackUploadJob[], enqueue(input), runTrackUpload(trackId), retryTrackUpload(trackId), dismiss(trackId), destroy() }`. Preserves resume keys, retry ×3 + backoff, finalize order, object-URL revocation. Adds `onProgress` → `job.progress` and a concurrency cap (max 3 active).

> This is a verbatim move of the monolith's `postAction`, `storageKey`, `wait`, `createCoverPreviewUrl`, `revokeCoverPreviewUrl`, `renewTrackUploadTargets`, `runTrackUpload`, `retryTrackUpload`, `removeTrackUploadJob` (from `StudioMusicPage.svelte`), wrapped in a factory with `$state` jobs, plus the two additions above. Keep `JobState` = `'queued' | 'uploading' | 'finalizing' | 'uploaded' | 'failed'`.

- [ ] **Step 1: Extend the client target kind**

In `src/lib/utils/helpers.ts`, change the `ClientMediaUploadTarget.kind` union to include `'album-cover'`:

```ts
kind: 'track-audio' | 'track-cover' | 'album-cover' | 'content-photo';
```

- [ ] **Step 2: Add shared types**

```ts
// src/lib/studio/music/types.ts
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
```

- [ ] **Step 3: Write the failing test**

```ts
// src/lib/studio/music/uploadController.svelte.spec.ts
import { expect, test, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/helpers', () => ({
	uploadR2Target: vi.fn(async ({ onProgress }) => {
		onProgress?.(100);
		return { key: 'k', mode: 'single', parts: [] };
	}),
	clearUploadResumeState: vi.fn()
}));
vi.mock('$app/forms', () => ({ deserialize: vi.fn(() => ({ type: 'success', data: {} })) }));
vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }));
vi.mock('$lib/stores/notification.svelte', () => ({
	notificationStore: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

import { createUploadController } from './uploadController.svelte';

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response('{}'))
	);
});

function target() {
	return {
		kind: 'track-audio',
		bucket: 'music',
		key: 'k',
		contentType: 'audio/mpeg',
		size: 10,
		target: { mode: 'single', bucket: 'music', key: 'k', url: 'u' }
	} as any;
}

test('enqueue creates a job and runs it to uploaded with progress', async () => {
	const c = createUploadController();
	c.enqueue({
		trackId: 't1',
		title: 'S',
		audioFile: new File(['x'], 's.mp3'),
		coverFile: null,
		uploadTargets: { audio: target(), cover: null }
	});
	await c.runTrackUpload('t1');
	// after a successful finalize the job is removed
	expect(c.list().find((j) => j.trackId === 't1')).toBeUndefined();
	c.destroy();
});

test('destroy revokes cover preview URLs', () => {
	const revoke = vi.fn();
	vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: revoke });
	const c = createUploadController();
	c.enqueue({
		trackId: 't2',
		title: 'S',
		audioFile: new File(['x'], 's.mp3'),
		coverFile: new File(['y'], 'c.jpg', { type: 'image/jpeg' }),
		uploadTargets: { audio: target(), cover: target() }
	});
	c.destroy();
	expect(revoke).toHaveBeenCalled();
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/studio/music/uploadController.svelte.spec.ts`
Expected: FAIL — cannot resolve `./uploadController.svelte`.

- [ ] **Step 5: Implement (port the monolith logic into the factory)**

Create `src/lib/studio/music/uploadController.svelte.ts`. Port the functions listed above from `StudioMusicPage.svelte` verbatim, adapting them to operate on a local `let jobs = $state<Record<string, TrackUploadJob>>({})`, and:

- thread `onProgress: (p) => updateJob(id, { progress: p })` into both `uploadR2Target` calls in `runTrackUpload`;
- add `enqueue(input)` that builds a `queued` job (with `createCoverPreviewUrl`) and, respecting a `MAX_ACTIVE = 3` cap, starts `runTrackUpload` or leaves it `queued` (a `pump()` helper starts queued jobs as actives free);
- `destroy()` revokes every job's `coverPreviewUrl`.

Keep `storageKey(trackId, kind)` = `pdm:track-upload:${trackId}:${kind}`, the 3-attempt retry with `750 * attempt` backoff via `renewTrackUploadTargets` (`?/resumeTrackUpload`), `?/finalizeTrackUpload` body (`trackId`, `audioParts`, `coverUploaded`), `clearUploadResumeState` on success, `invalidateAll()` + `notificationStore.success` after finalize. (Reference: `StudioMusicPage.svelte` lines 255-404.)

- [ ] **Step 6: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/studio/music/uploadController.svelte.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
yarn format
git add src/lib/utils/helpers.ts src/lib/studio/music/
git commit -m "feat(studio): extract rune-backed upload controller with progress + concurrency cap"
```

---

### Task 8: Feature components — shell, stats, cards, rows

**Files:**

- Create: `src/routes/studio/music/components/MusicCatalogShell.svelte`
- Create: `src/routes/studio/music/components/MusicStatsBar.svelte`
- Create: `src/routes/studio/music/components/AlbumGrid.svelte`, `AlbumCard.svelte`
- Create: `src/routes/studio/music/components/TrackList.svelte`, `TrackRow.svelte`
- Modify: `src/routes/studio/music/+page.svelte` (render `<MusicCatalogShell {data} />`)
- Delete: `src/routes/studio/music/StudioMusicPage.svelte` (after parity)

**Interfaces:**

- `MusicCatalogShell` props `{ data }` (the Plan A DTO overview). Owns `$derived` slices, modal flags, editing targets, and a `createUploadController()` instance (torn down in `onDestroy`). Renders `MusicStatsBar`, `UploadDropzone` + Upload Dock (Task 10), `Tabs` (All/Albums/Tracks), `AlbumGrid`, `TrackList`, and the modals (Task 11).
- `MusicStatsBar` props `{ stats }` — wraps `StatCard` incl. the new "Subscribers-only" stat.
- `AlbumCard` props `{ album: AlbumDTO; linkedTracks; onEdit; onDelete; onUnlinkTrack; onCoverUpload }` — uses `Badge` (status + gate) and `VisibilityToggle` (album level).
- `TrackRow` props `{ track: TrackDTO; stats; links; job?: TrackUploadJob; onEdit; onDelete; onLink; onVisibilityChange; onRetry }` — uses `Badge`, `VisibilityToggle` (with `inheritedFrom` when linked), and `ProgressBar` while uploading.

> Visual implementation (layout/SCSS) follows the designer spec §5.5 and uses the Task 1 tokens. Use the `ui-ux-pro-max` skill for the card/row/grid styling. Reference the existing `src/routes/studio/content/components/ContentListItem.svelte` for the responsive collapse pattern.

- [ ] **Step 1: Build `MusicStatsBar` + a render test**

Create the component (wraps `StatCard` for albums/tracks/plays/likes/saves/subscribers-only). Test:

```ts
// src/routes/studio/music/components/MusicStatsBar.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test } from 'vitest';
import MusicStatsBar from './MusicStatsBar.svelte';

test('renders the subscribers-only stat', async () => {
	const screen = render(MusicStatsBar, {
		stats: {
			totalAlbums: 1,
			totalTracks: 2,
			publishedTracks: 1,
			draftTracks: 1,
			subscribersOnly: 1,
			totalPlays: 10,
			totalLikes: 3,
			totalSaves: 2
		}
	});
	await expect.element(screen.getByText('Subscriber-only')).toBeInTheDocument();
});
```

Run: `yarn test:unit -- --run src/routes/studio/music/components/MusicStatsBar.svelte.spec.ts` → fail, implement, pass.

- [ ] **Step 2: Build `AlbumCard` + `AlbumGrid` with a render test**

`AlbumCard` renders cover, gate `Badge` (only when `subscribers_only`), status `Badge`, title/meta, linked-track list with unlink, and footer actions. Test asserts a subscribers-only album shows the gate badge and a public one does not:

```ts
// src/routes/studio/music/components/AlbumCard.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import AlbumCard from './AlbumCard.svelte';

const album = (visibility) => ({
	id: 'al1',
	artistId: 'a1',
	title: 'A',
	description: null,
	coverImageKey: null,
	releaseDate: null,
	genres: [],
	visibility,
	isPublished: true,
	createdAt: '',
	updatedAt: ''
});
const cb = { onEdit: vi.fn(), onDelete: vi.fn(), onUnlinkTrack: vi.fn(), onCoverUpload: vi.fn() };

test('shows the gate badge only for subscribers-only albums', async () => {
	const a = render(AlbumCard, { album: album('subscribers_only'), linkedTracks: [], ...cb });
	await expect.element(a.getByText('Subscribers')).toBeInTheDocument();
});
```

Run the test → fail, implement `AlbumCard` + `AlbumGrid`, pass.

- [ ] **Step 3: Build `TrackRow` + `TrackList` with a render test**

`TrackRow` renders cover (with `ProgressBar` overlay when `job` is uploading), title, duration, `VisibilityToggle` (passing `inheritedFrom='album'` when the track is linked to a gated album), status `Badge`, stats, actions, and a Retry button when `job.state==='failed'`. Test:

```ts
// src/routes/studio/music/components/TrackRow.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import TrackRow from './TrackRow.svelte';

const track = {
	id: 't1',
	artistId: 'a1',
	albumId: null,
	title: 'Song',
	duration: 120,
	audioKey: 'k',
	imageKey: null,
	genres: [],
	status: 'uploaded',
	visibility: 'public',
	isPublished: true,
	trackNumber: null,
	createdAt: '',
	updatedAt: ''
};
const cb = {
	onEdit: vi.fn(),
	onDelete: vi.fn(),
	onLink: vi.fn(),
	onVisibilityChange: vi.fn(),
	onRetry: vi.fn()
};

test('shows a progressbar while a job is uploading', async () => {
	const job = { state: 'uploading', progress: 40, error: '', attempt: 1, title: 'Song' };
	const screen = render(TrackRow, { track, stats: null, links: [], job, ...cb });
	await expect.element(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

Run the test → fail, implement, pass.

- [ ] **Step 4: Build `MusicCatalogShell` + wire the page**

Implement `MusicCatalogShell` (owns the controller, `$derived` slices, modal flags, Tabs). Update `+page.svelte`:

```svelte
<script lang="ts">
	import MusicCatalogShell from './components/MusicCatalogShell.svelte';
	let { data } = $props();
</script>

<MusicCatalogShell {data} />
```

- [ ] **Step 5: Remove the compatibility shim + delete the monolith**

If Plan A Task 12 added a DTO→legacy compat shim in `load`, remove it now (components consume DTO keys `audioKey`/`imageKey`/`coverImageKey` via `resolveR2ImageUrl`). Delete `src/routes/studio/music/StudioMusicPage.svelte`.

Run: `yarn check && yarn test:unit -- --run`
Expected: clean; component tests pass.

- [ ] **Step 6: Commit**

```bash
yarn format
git add src/routes/studio/music/
git commit -m "feat(studio): decompose music page into shell + stats/cards/rows components"
```

---

### Task 9: Upload Composer + persistent Upload Dock

**Files:**

- Create: `src/routes/studio/music/components/UploadComposer.svelte`
- Create: `src/routes/studio/music/components/UploadDock.svelte`
- Create: `src/routes/studio/music/components/UploadQueue.svelte`, `TrackUploadJobCard.svelte`
- Modify: `MusicCatalogShell.svelte` (wire dropzone → composer → controller → dock)

**Interfaces:**

- `UploadComposer` props `{ open ($bindable); genres; albums; onSubmit: (items: ComposerItem[]) => void }` where `ComposerItem = { audioFile; coverFile; title; visibility; albumId | null }`. Hosts `UploadDropzone` + a per-file queue with editable title, `VisibilityToggle`, album select, and a batch gate.
- `UploadDock` props `{ jobs: TrackUploadJob[]; onRetry; onDismiss }` — persistent bottom panel, `aria-live="polite"` with threshold announcements; renders `UploadQueue` → `TrackUploadJobCard` (uses `ProgressBar`).

> The Composer turns each `ComposerItem` into the `createTrack` `FormData` contract (spec §2 / Plan A) via the controller's create path: build `metadata`/`type`/`file_name`/`file_size`/`cover_*`, POST `?/createTrack`, then `controller.enqueue(...)` + `runTrackUpload`. Reference `StudioMusicPage.svelte` `handleTrackSubmit` (lines 406-479) for the exact FormData fields.

- [ ] **Step 1: Build `TrackUploadJobCard` + `UploadQueue` with a render test**

`TrackUploadJobCard` shows thumb (`job.coverPreviewUrl`), title, a `ProgressBar` (state from `job.state`), status text, and a Retry button on `failed`. Test asserts the failed state shows Retry:

```ts
// src/routes/studio/music/components/TrackUploadJobCard.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import TrackUploadJobCard from './TrackUploadJobCard.svelte';

test('shows Retry when the job failed', async () => {
	const job = {
		trackId: 't1',
		title: 'S',
		state: 'failed',
		progress: 0,
		error: 'network',
		attempt: 1,
		coverPreviewUrl: null
	};
	const screen = render(TrackUploadJobCard, { job, onRetry: vi.fn(), onDismiss: vi.fn() });
	await expect.element(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});
```

Run → fail, implement, pass.

- [ ] **Step 2: Build `UploadComposer` with a behavior test**

Test asserts that submitting maps dropped files to `ComposerItem[]` with the chosen visibility:

```ts
// src/routes/studio/music/components/UploadComposer.svelte.spec.ts
import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import UploadComposer from './UploadComposer.svelte';

test('emits composer items on submit', async () => {
	const onSubmit = vi.fn();
	const screen = render(UploadComposer, { open: true, genres: [], albums: [], onSubmit });
	const input = screen.container.querySelector('input[type=file]') as HTMLInputElement;
	const file = new File(['x'], 'song.mp3', { type: 'audio/mpeg' });
	Object.defineProperty(input, 'files', { value: [file] });
	input.dispatchEvent(new Event('change', { bubbles: true }));
	await screen.getByRole('button', { name: /upload/i }).click();
	expect(onSubmit).toHaveBeenCalledWith(
		expect.arrayContaining([expect.objectContaining({ visibility: 'public' })])
	);
});
```

Run → fail, implement, pass.

- [ ] **Step 3: Build `UploadDock` + wire into the shell**

Implement `UploadDock` (persistent, collapsible, `aria-live`). In `MusicCatalogShell`, render the dock with `controller.list()`, wire `onFiles` from the page-level dropzone to open the Composer, and the Composer `onSubmit` to the controller's create+enqueue loop.

- [ ] **Step 4: Run tests + check**

Run: `yarn check && yarn test:unit -- --run`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/routes/studio/music/components/
git commit -m "feat(studio): upload composer + persistent dock on the resumable pipeline"
```

---

### Task 10: Form modals (album / track / link) with visibility + presigned cover

**Files:**

- Create: `src/routes/studio/music/components/AlbumFormModal.svelte`, `TrackFormModal.svelte`, `LinkTrackModal.svelte`
- Modify: `MusicCatalogShell.svelte` (wire modals)

**Interfaces:**

- `AlbumFormModal` props `{ open ($bindable); album?: AlbumDTO | null; onSaved }` — fields incl. `VisibilityToggle`; on cover change, after the album CRUD action succeeds, issues a presigned `album-cover` target (`POST /api/studio/media/upload-target` `{ kind:'album-cover', albumId, ... }`) and PUTs via `uploadR2Target`.
- `TrackFormModal` props `{ open ($bindable); track?: TrackDTO | null; onSaved }` — metadata/visibility/publish via `?/updateTrack`; audio/image replacement via presigned `track-audio`/`track-cover` targets (Plan B) + the controller.
- `LinkTrackModal` props `{ open ($bindable); albums; trackId; onSaved }` — `?/linkTrackToAlbum`.

- [ ] **Step 1: Build `LinkTrackModal` (simplest) + a render test**

Test asserts the album options render and submit calls `?/linkTrackToAlbum` (mock `enhance`/fetch). Run → fail, implement, pass.

- [ ] **Step 2: Build `AlbumFormModal`**

Use `use:enhance` for `?/createAlbum`/`?/updateAlbum` with `VisibilityToggle`. On cover file present, after success, call the upload-target endpoint with `kind:'album-cover'` and PUT. Behavior test mocks fetch and asserts the presigned PUT runs when a cover is chosen.

- [ ] **Step 3: Build `TrackFormModal`**

Metadata edit via `?/updateTrack` (maps to `updateTrackMetadata`), `VisibilityToggle`, and audio/image replacement via the presigned flow (Plan B `track-audio`/`track-cover`). Reuse the controller for audio finalize.

- [ ] **Step 4: Wire modals into `MusicCatalogShell` + check**

Run: `yarn check && yarn test:unit -- --run`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/routes/studio/music/components/
git commit -m "feat(studio): album/track/link modals with visibility + presigned covers"
```

---

### Task 11: Empty / loading / error states + a11y pass

**Files:**

- Modify: `MusicCatalogShell.svelte`, `AlbumGrid.svelte`, `TrackList.svelte`, `UploadDock.svelte`

- [ ] **Step 1: Empty states**

First-run empty panel (doubles as a live dropzone): "Upload your first track". Per-tab empty messages. Implement in `AlbumGrid`/`TrackList`.

- [ ] **Step 2: Loading skeletons**

Skeleton placeholders for stats/album-cards/track-rows that reserve exact heights (CLS < 0.1) and respect reduced-motion (static when reduced).

- [ ] **Step 3: a11y pass**

Verify: `UploadDock` is `aria-live="polite"` with threshold announcements (queued → 25/50/75% → finalizing → done/failed, not every %); each `ProgressBar` exposes `role="progressbar"` + values (Task 2); failures use `role="alert"`; gate is icon+text (never color-only); focus rings on cards/rows (`:focus-within`); themed confirm modal replaces native `confirm()` for deletes; all decorative motion behind `prefers-reduced-motion`.

- [ ] **Step 4: Manual smoke + check**

Run: `yarn check && yarn dev` and verify the screen renders, uploads show progress, gate toggles work, layout reflows on mobile width. (Driven properly by Task 13 e2e.)

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/routes/studio/music/
git commit -m "feat(studio): empty/loading/error states + a11y pass for music catalog"
```

---

### Task 12: Wiki UI catalogue + feedback memory

**Files:**

- Modify: `.claude/wiki/product/design-system.md`
- Create: `C:\Users\USER\.claude\projects\D--IT-pet-projects-PDM-pdm\memory\reusable-ui-molecules.md`
- Modify: `C:\Users\USER\.claude\projects\D--IT-pet-projects-PDM-pdm\memory\MEMORY.md`

- [ ] **Step 1: Add a "UI component inventory" section to the wiki**

In `.claude/wiki/product/design-system.md`, add a table listing each reusable molecule introduced/confirmed: name, path, purpose, props summary, test status — including `Badge`, `ProgressBar`, `SegmentedControl`, `VisibilityToggle`, `UploadDropzone` (and the existing `Progress`, `StatCard`, `Tabs`, `Modal`, `Button`, `Input`, `Select`, `Checkbox`, `IconButton`, `SvgIcon`, `FileUpload`, `Avatar`).

- [ ] **Step 2: Record the feedback memory**

Write `reusable-ui-molecules.md` (frontmatter `type: feedback`) capturing the rule: _new reusable interface molecules go in `src/lib/ui/`, are catalogued in the wiki design-system page, and ship with component + e2e tests_ — with **Why** and **How to apply** lines. Add the one-line pointer to `MEMORY.md`.

- [ ] **Step 3: Commit**

```bash
yarn format
git add .claude/wiki/product/design-system.md
git commit -m "docs(wiki): add UI component inventory for studio music molecules"
```

---

### Task 13: e2e coverage for molecules + flows

**Files:**

- Create: `e2e/studio-music-upload.spec.ts`

**Interfaces:**

- Consumes: Playwright; a logged-in artist session fixture (follow existing `e2e/` patterns; mock the R2 presigned PUT + the `?/createTrack`/`finalizeTrackUpload` responses where needed).

- [ ] **Step 1: Write the e2e flows**

Cover: (a) drag&drop multi-file upload happy path with visible per-file progress; (b) induced failure → Retry; (c) set a track to subscribers_only and observe the amber gate badge persist after reload; (d) link a track to a subscribers-only album and observe the inherited cue; (e) responsive smoke at mobile + desktop widths; (f) Upload Dock survives a tab switch.

- [ ] **Step 2: Run e2e**

Run: `yarn test:e2e -- studio-music-upload`
Expected: PASS (or document any environment-gated steps that require a seeded artist).

- [ ] **Step 3: Commit**

```bash
yarn format
git add e2e/studio-music-upload.spec.ts
git commit -m "test(e2e): studio music upload, gate, inheritance and responsive flows"
```

---

## Self-Review

**Spec coverage (Plan C = spec phase 7 + §5):**

- §5.0/§5.1 reusable molecules in `src/lib/ui/` + catalogue + tests → Tasks 2-6, 12, 13. ✓
- §5.2 controller extraction (factory, progress, concurrency cap, resume/retry preserved) → Task 7. ✓
- §5.3 upload composer + persistent dock + drag&drop multi-file → Tasks 6, 9. ✓
- §5.4 VisibilityToggle (public default, subscribers_only, inheritance cue) → Task 5, used in 8/9/10. ✓
- §5.5 album/track surfaces + unified badges → Tasks 3, 8. ✓
- §5.6 states/responsive/a11y → Task 11. ✓
- §5.7 tokens + StatCard fix → Task 1. ✓
- §5.8 data flow (DTO consumption, enhance vs fetch, invalidation, optimistic) → Tasks 7-10. ✓
- §10.3 component + e2e tests for molecules → each molecule task + Task 13. ✓
- MUST-NOT-regress upload pipeline → Task 7 ports it verbatim; FormData/resume/retry constraints restated. ✓

**Placeholder scan:** Reusable molecules + controller + tokens have complete code. Feature-component tasks (8-10) give complete interfaces + render/behavior tests + structural wiring, and delegate final SCSS to the `ui-ux-pro-max` skill against the designer spec §5.5 — this is the intended UI build workflow, not a hand-wave; the contracts and tests are concrete. No "TODO/implement later". ✓

**Type consistency:** DTO field names (`audioKey`/`imageKey`/`coverImageKey`/`visibility`) match Plan A. `TrackUploadJob`/`JobState` consistent between `types.ts`, controller, and `TrackUploadJobCard`/`TrackRow`. Molecule prop names (`value`/`options`/`onChange`/`onFiles`/`label`/`variant`/`level`/`inheritedFrom`) consistent across definitions and consumers. `createUploadController()` API (`enqueue`/`runTrackUpload`/`retryTrackUpload`/`dismiss`/`destroy`/`list`) consistent across Tasks 7-10. ✓
