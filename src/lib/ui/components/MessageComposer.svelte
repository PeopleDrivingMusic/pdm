<script lang="ts">
	import { onMount } from 'svelte';
	import { mdiEmoticonOutline, mdiSend } from '@mdi/js';
	import IconButton from '../IconButton.svelte';

	let {
		disabled = false,
		placeholder = 'Add a comment…',
		submitLabel = 'Send',
		onSubmit
	}: {
		disabled?: boolean;
		placeholder?: string;
		submitLabel?: string;
		/** Resolve `false` to reject the draft — the field keeps it so it can be fixed. */
		onSubmit: (body: string) => Promise<boolean | void> | boolean | void;
	} = $props();

	let draft = $state('');
	let busy = $state(false);
	let showPicker = $state(false);
	let pickerReady = $state(false);
	let field = $state<HTMLTextAreaElement | null>(null);

	// Grow with the content instead of reserving space up front: reset to one row,
	// then take the scroll height, capped so a long draft scrolls rather than
	// pushing the page around. The cap is applied here and mirrored to CSS from the
	// same constant so the two can't drift.
	const MAX_HEIGHT = 200;
	function autoGrow() {
		if (!field) return;
		field.style.height = 'auto';
		field.style.height = `${Math.min(field.scrollHeight, MAX_HEIGHT)}px`;
	}

	// Re-measure whenever the draft changes — typing, emoji insert, or a reset.
	$effect(() => {
		void draft;
		autoGrow();
	});

	// `emoji-picker-element` is a custom element built on IndexedDB — it only exists in
	// the browser, so load it after mount to keep this component SSR-safe.
	onMount(async () => {
		try {
			await import('emoji-picker-element');
			pickerReady = true;
		} catch {
			// The picker is an enhancement; typing still works without it.
			pickerReady = false;
		}
	});

	// Same dismissal contract as the message overflow menu: an outside click or
	// Escape closes it, and focus returns to the toggle rather than being dropped.
	$effect(() => {
		if (!showPicker) return;
		const onClick = (event: MouseEvent) => {
			const target = event.target as Element | null;
			if (!target?.closest?.('.picker-anchor, .composer-actions')) showPicker = false;
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			showPicker = false;
			field?.focus();
		};
		document.addEventListener('click', onClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	function addEmoji(event: Event) {
		const emoji = (event as CustomEvent<{ unicode?: string }>).detail?.unicode;
		showPicker = false;
		if (!emoji) return;

		// Insert at the caret rather than appending — picking an emoji mid-sentence
		// should not jump it to the end of the draft.
		const start = field?.selectionStart ?? draft.length;
		const end = field?.selectionEnd ?? draft.length;
		draft = draft.slice(0, start) + emoji + draft.slice(end);

		const caret = start + emoji.length;
		// Restore focus and caret after Svelte has written the new value.
		requestAnimationFrame(() => {
			field?.focus();
			field?.setSelectionRange(caret, caret);
		});
	}

	async function submit() {
		const body = draft.trim();
		if (!body || busy || disabled) return;
		busy = true;
		try {
			// Only clear on an explicit success — a refusal (link policy, rate limit,
			// network blip) must leave the text in place to correct and resend.
			const accepted = await onSubmit(body);
			if (accepted !== false) draft = '';
		} finally {
			busy = false;
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			submit();
		}
	}
</script>

<div class="composer">
	<div class="field-wrap">
		<textarea
			style:max-height="{MAX_HEIGHT}px"
			bind:this={field}
			bind:value={draft}
			{placeholder}
			{disabled}
			rows="1"
			aria-label={placeholder || 'Write a message'}
			onkeydown={onKeydown}
		></textarea>

		<div class="composer-actions">
			<IconButton
				path={mdiEmoticonOutline}
				label="Add emoji"
				variant="ghost"
				size="sm"
				active={showPicker}
				disabled={disabled || !pickerReady}
				onClick={() => (showPicker = !showPicker)}
			/>

			<IconButton
				path={mdiSend}
				label={submitLabel}
				variant="ghost"
				size="sm"
				tone={draft.trim() ? 'accent' : undefined}
				disabled={disabled || busy || !draft.trim()}
				onClick={submit}
			/>
		</div>
	</div>

	{#if showPicker && pickerReady}
		<div class="picker-anchor">
			<emoji-picker onemoji-click={addEmoji}></emoji-picker>
		</div>
	{/if}
</div>

<style lang="scss">
	.composer {
		position: relative;
		width: 100%;
	}

	.field-wrap {
		position: relative;
	}

	textarea {
		// A <textarea> is inline-level by default, which reserves a few px of
		// baseline "descender" space below it inside a block container — enough
		// to throw off centering the docked icons against it. Block-level removes
		// that gap so `.field-wrap`'s height matches the textarea's exactly.
		display: block;
		width: 100%;
		padding: var(--space-3);
		// Room for the emoji + send icons docked inside the field, so typed text
		// never runs under them.
		padding-right: 76px;
		border: 1px solid color-mix(in srgb, var(--border-primary) 62%, transparent);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--bg-surface) 70%, transparent);
		color: var(--text-primary);
		font: inherit;
		font-size: var(--font-size-sm);
		// Height is driven by the content (autoGrow); manual resize would fight it.
		resize: none;
		overflow-y: auto;

		&:disabled {
			opacity: 0.6;
		}
	}

	// Docked inside the field's bottom-right corner rather than below it — the emoji
	// picker and send action read as part of the input, not a separate toolbar row.
	// Bottom-anchored: on a single line this sits centered against the text (the
	// textarea's padding is symmetric and the icons are only slightly taller than
	// one line box, so the gap above/below reads as centered) — was previously
	// thrown off by the textarea's own inline-block layout, see `display: block`
	// above. On a grown, multi-line draft it stays pinned to the last line,
	// which is the familiar chat-composer pattern.
	.composer-actions {
		position: absolute;
		right: var(--space-2);
		bottom: var(--space-2);
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.picker-anchor {
		position: absolute;
		bottom: calc(100% + var(--space-2));
		right: 0;
		z-index: 20;
		max-width: 100%;
	}
</style>
