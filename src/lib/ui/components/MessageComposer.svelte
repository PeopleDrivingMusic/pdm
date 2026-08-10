<script lang="ts">
	import { onMount } from 'svelte';
	import { mdiEmoticonOutline } from '@mdi/js';
	import Button from '../Button.svelte';
	import SvgIcon from '../SvgIcon.svelte';

	let {
		disabled = false,
		placeholder = 'Add a comment…',
		submitLabel = 'Send',
		onSubmit
	}: {
		disabled?: boolean;
		placeholder?: string;
		submitLabel?: string;
		onSubmit: (body: string) => Promise<void> | void;
	} = $props();

	let draft = $state('');
	let busy = $state(false);
	let showPicker = $state(false);
	let pickerReady = $state(false);

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
			await onSubmit(body);
			draft = '';
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
		bind:value={draft}
		{placeholder}
		{disabled}
		rows="2"
		aria-label={placeholder}
		onkeydown={onKeydown}
	></textarea>

	<div class="composer-actions">
		<button
			type="button"
			class="emoji-toggle"
			aria-label="Add emoji"
			disabled={disabled || !pickerReady}
			onclick={() => (showPicker = !showPicker)}
		>
			<SvgIcon path={mdiEmoticonOutline} size={20} />
		</button>

		<Button size="sm" onClick={submit} disabled={disabled || busy || !draft.trim()}>
			{submitLabel}
		</Button>
	</div>

	{#if showPicker && pickerReady}
		<div class="picker-anchor">
			<!-- svelte-ignore element_invalid_self_closing_tag -->
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
		resize: vertical;

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

	.emoji-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		// Comfortable tap target on touch screens.
		min-width: 44px;
		min-height: 44px;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;

		&:hover:not(:disabled) {
			color: var(--text-primary);
		}

		&:disabled {
			opacity: 0.5;
			cursor: default;
		}
	}

	.picker-anchor {
		position: absolute;
		bottom: calc(100% + var(--space-2));
		right: 0;
		z-index: 20;
		max-width: 100%;
	}
</style>
