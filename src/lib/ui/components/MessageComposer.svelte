<script lang="ts">
	import { onMount } from 'svelte';
	import { mdiEmoticonOutline } from '@mdi/js';
	import Button from '../Button.svelte';
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
	// pushing the page around.
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
		const detail = (event as CustomEvent<{ unicode?: string }>).detail;
		if (detail?.unicode) draft += detail.unicode;
		showPicker = false;
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
	<textarea
		bind:this={field}
		bind:value={draft}
		{placeholder}
		{disabled}
		rows="1"
		aria-label={placeholder}
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

		<Button size="sm" onClick={submit} disabled={disabled || busy || !draft.trim()}>
			{submitLabel}
		</Button>
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
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
	}

	textarea {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid color-mix(in srgb, var(--border-primary) 62%, transparent);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--bg-surface) 70%, transparent);
		color: var(--text-primary);
		font: inherit;
		font-size: var(--font-size-sm);
		// Height is driven by the content (autoGrow); manual resize would fight it.
		resize: none;
		overflow-y: auto;
		max-height: 200px;

		&:disabled {
			opacity: 0.6;
		}
	}

	.composer-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.picker-anchor {
		position: absolute;
		bottom: calc(100% + var(--space-2));
		right: 0;
		z-index: 20;
		max-width: 100%;
	}
</style>
