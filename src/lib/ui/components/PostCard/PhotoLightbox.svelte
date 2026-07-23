<script lang="ts">
	import { mdiChevronLeft, mdiChevronRight, mdiClose } from '@mdi/js';
	import { portal } from '$lib/actions/portal';
	import SvgIcon from '../../SvgIcon.svelte';

	interface Photo {
		id: string;
		fileUrl: string;
		thumbnailUrl: string | null;
		alt: string | null;
		caption: string | null;
	}

	let {
		photos,
		open = $bindable(false),
		index = $bindable(0),
		onClose
	}: {
		photos: Photo[];
		open?: boolean;
		index?: number;
		onClose?: () => void;
	} = $props();

	const total = $derived(photos.length);
	const clamped = $derived(Math.min(Math.max(index, 0), Math.max(total - 1, 0)));
	const current = $derived(photos[clamped]);
	const canPrev = $derived(clamped > 0);
	const canNext = $derived(clamped < total - 1);

	function close() {
		open = false;
		onClose?.();
	}
	function next() {
		if (canNext) index = clamped + 1;
	}
	function prev() {
		if (canPrev) index = clamped - 1;
	}

	function onKeydown(event: KeyboardEvent) {
		if (!open) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			next();
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			prev();
		}
	}

	let touchStartX = 0;
	function onTouchStart(event: TouchEvent) {
		touchStartX = event.changedTouches[0].clientX;
	}
	function onTouchEnd(event: TouchEvent) {
		const dx = event.changedTouches[0].clientX - touchStartX;
		if (Math.abs(dx) > 40) {
			if (dx < 0) next();
			else prev();
		}
	}

	let closeButton = $state<HTMLButtonElement | null>(null);
	$effect(() => {
		if (open) closeButton?.focus();
	});

	// Lock background scroll while the viewer is open.
	$effect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if open && total}
	<div class="lightbox" use:portal role="dialog" aria-modal="true" aria-label="Photo viewer">
		<button class="backdrop" aria-label="Dismiss viewer" onclick={close}></button>

		<!-- Swipe is a progressive enhancement; full keyboard/button nav already exists. -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="stage" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
			<img
				class="lightbox-photo"
				src={current.fileUrl}
				alt={current.alt || current.caption || ''}
			/>
		</div>

		<button bind:this={closeButton} class="ctrl close" aria-label="Close" onclick={close}>
			<SvgIcon path={mdiClose} size={24} />
		</button>

		{#if total > 1}
			<button class="ctrl prev" aria-label="Previous photo" onclick={prev} disabled={!canPrev}>
				<SvgIcon path={mdiChevronLeft} size={32} />
			</button>
			<button class="ctrl next" aria-label="Next photo" onclick={next} disabled={!canNext}>
				<SvgIcon path={mdiChevronRight} size={32} />
			</button>
		{/if}

		<div class="counter">{clamped + 1} / {total}</div>
	</div>
{/if}

<style lang="scss">
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-5);
	}

	.backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		padding: 0;
		background: rgba(0, 0, 0, 0.86);
		cursor: zoom-out;
	}

	.stage {
		position: relative;
		z-index: 1;
		max-width: min(96vw, 1200px);
		max-height: 90vh;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.lightbox-photo {
		max-width: 100%;
		max-height: 90vh;
		object-fit: contain;
		border-radius: var(--radius-md);
		box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
	}

	.ctrl {
		position: absolute;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 999px;
		color: #fff;
		background: rgba(255, 255, 255, 0.12);
		cursor: pointer;
		transition: background-color var(--duration-fast) var(--easing-ease-out);

		&:hover:not(:disabled) {
			background: rgba(255, 255, 255, 0.24);
		}

		&:focus-visible {
			outline: 2px solid #fff;
			outline-offset: 2px;
		}

		&:disabled {
			opacity: 0.35;
			cursor: default;
		}
	}

	.close {
		top: var(--space-4);
		right: var(--space-4);
	}

	.prev {
		left: var(--space-4);
		top: 50%;
		transform: translateY(-50%);
	}

	.next {
		right: var(--space-4);
		top: 50%;
		transform: translateY(-50%);
	}

	.counter {
		position: absolute;
		z-index: 2;
		bottom: var(--space-4);
		left: 50%;
		transform: translateX(-50%);
		pointer-events: none;
		padding: var(--space-1) var(--space-3);
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.5);
		color: #fff;
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	@media (prefers-reduced-motion: reduce) {
		.ctrl {
			transition: none;
		}
	}
</style>
