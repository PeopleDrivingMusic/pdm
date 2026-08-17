<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	interface Option {
		label: string;
		value: string;
		disabled?: boolean;
	}

	interface Props {
		options: Option[];
		placeholder?: string;
		value?: string;
		label?: string;
		required?: boolean;
		disabled?: boolean;
		id?: string;
		name?: string;
		error?: boolean;
	}

	let {
		options,
		placeholder = '',
		value = $bindable(''),
		label = '',
		required = false,
		disabled = false,
		id = label || `select-${Math.random().toString(36).substr(2, 9)}`,
		name = '',
		error = false
	}: Props = $props();

	let isOpen = $state(false);
	let rootEl: HTMLDivElement | null = $state(null);
	let menuDirection = $state<'down' | 'up'>('down');

	const selectedOption = $derived(options.find((option) => option.value === value));
	const displayLabel = $derived(selectedOption?.label || placeholder || 'Select');

	function updateMenuDirection() {
		if (!rootEl || typeof window === 'undefined') return;

		const rect = rootEl.getBoundingClientRect();
		const menuHeight = Math.min(
			240,
			Math.max(48, (options.length + (placeholder ? 1 : 0)) * 42 + 16)
		);
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;

		menuDirection = spaceBelow < menuHeight && spaceAbove > spaceBelow ? 'up' : 'down';
	}

	function toggleOpen() {
		if (disabled) return;
		if (!isOpen) {
			updateMenuDirection();
			isOpen = true;
			return;
		}
		isOpen = false;
	}

	function close() {
		isOpen = false;
	}

	function handleSelect(option: Option) {
		if (option.disabled) return;
		value = option.value;
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;
		if (event.key === 'Escape') {
			close();
		}
	}

	onMount(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!rootEl) return;
			if (!rootEl.contains(event.target as Node)) {
				close();
			}
		};

		document.addEventListener('click', handleClickOutside);
		onDestroy(() => {
			document.removeEventListener('click', handleClickOutside);
		});
	});
</script>

<div class="select-group" role="presentation" bind:this={rootEl} onkeydown={handleKeydown}>
	{#if label}
		<label class="select-label" for={id}>
			{label}
			{#if required}
				<span class="required-indicator" aria-hidden="true">*</span>
			{/if}
		</label>
	{/if}

	<select
		{id}
		{name}
		class="select-native"
		bind:value
		{required}
		{disabled}
		aria-hidden="true"
		tabindex="-1"
	>
		{#if placeholder}
			<option value="" disabled={required} selected={!value}>
				{placeholder}
			</option>
		{/if}
		{#each options as option (option.value)}
			<option value={option.value} disabled={option.disabled}>
				{option.label}
			</option>
		{/each}
	</select>

	<button
		type="button"
		class="select-trigger"
		class:select-trigger--error={error}
		class:select-trigger--open={isOpen}
		{disabled}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		aria-controls={`${id}-listbox`}
		onclick={toggleOpen}
	>
		<span class="select-value">
			<slot name="value" {selectedOption} {value}>
				{displayLabel}
			</slot>
		</span>
		<span class="select-chevron" aria-hidden="true">▾</span>
	</button>

	{#if isOpen}
		<ul
			id={`${id}-listbox`}
			class="select-menu"
			class:select-menu--up={menuDirection === 'up'}
			role="listbox"
			aria-activedescendant={selectedOption ? `${id}-option-${selectedOption.value}` : undefined}
			tabindex="-1"
		>
			{#if placeholder}
				<li class="select-option" role="option" aria-selected={!value}>
					<button
						type="button"
						class="select-option-button"
						onclick={() => handleSelect({ label: placeholder, value: '' })}
					>
						<slot name="option" option={{ label: placeholder, value: '' }} selected={!value}>
							{placeholder}
						</slot>
					</button>
				</li>
			{/if}
			{#each options as option (option.value)}
				<li
					id={`${id}-option-${option.value}`}
					class="select-option"
					class:select-option--selected={option.value === value}
					class:select-option--disabled={option.disabled}
					role="option"
					aria-selected={option.value === value}
					aria-disabled={option.disabled}
				>
					<button
						type="button"
						class="select-option-button"
						disabled={option.disabled}
						onclick={() => handleSelect(option)}
					>
						<slot name="option" {option} selected={option.value === value}>
							{option.label}
						</slot>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style lang="scss">
	.select-group {
		width: 100%;
		position: relative;
		--select-bg: var(--bg-surface);
		--select-border: var(--border-primary);
		--select-border-hover: var(--border-secondary);
		--select-border-focus: var(--border-focus);
		--select-text: var(--text-primary);
		--select-placeholder: var(--text-tertiary);
		--select-menu-bg: var(--bg-surface);
		--select-menu-shadow: 0 14px 30px rgba(0, 0, 0, 0.12);
		--select-option-hover: var(--bg-tertiary);
		--select-option-selected: var(--bg-secondary, var(--bg-tertiary));
		--select-option-disabled: var(--text-disabled);
		--select-error: var(--border-error);
		--select-max-height: 240px;
	}

	.select-label {
		display: block;
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--text-primary);
		font-family: var(--font-family-sans);
	}

	.required-indicator {
		color: var(--text-danger, var(--select-error));
		margin-left: var(--space-1, 0.25rem);
	}

	.select-native {
		position: absolute;
		inset: 0;
		opacity: 0;
		pointer-events: none;
		height: 0;
		width: 0;
		border: 0;
		padding: 0;
		margin: 0;
	}

	.select-trigger {
		width: 100%;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--select-border);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-family: var(--font-family-sans);
		background-color: var(--select-bg);
		color: var(--select-text);
		transition: all var(--duration-normal) var(--easing-ease-out);
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		cursor: pointer;
		text-align: left;

		&:focus {
			outline: none;
			border-color: var(--select-border-focus);
			box-shadow: 0 0 0 3px color-mix(in srgb, var(--select-border-focus) 35%, transparent);
		}

		&:hover:not(:disabled):not(:focus) {
			border-color: var(--select-border-hover);
		}

		&:disabled {
			background-color: var(--bg-tertiary);
			color: var(--text-disabled);
			cursor: not-allowed;
			opacity: 0.6;
		}
	}

	.select-trigger--error {
		border-color: var(--select-error);
	}

	.select-trigger--open {
		border-color: var(--select-border-focus);
	}

	.select-value {
		color: var(--select-text);
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.select-chevron {
		font-size: 0.85rem;
		color: var(--select-placeholder);
	}

	.select-menu {
		position: absolute;
		z-index: 20;
		top: 100%;
		margin-top: var(--space-2);
		width: 100%;
		max-height: var(--select-max-height);
		overflow-y: auto;
		list-style: none;
		padding: var(--space-2);
		border: 1px solid var(--select-border);
		border-radius: var(--radius-md);
		background-color: var(--select-menu-bg);
		box-shadow: var(--select-menu-shadow);
		box-sizing: border-box;
	}

	.select-menu--up {
		top: auto;
		bottom: 100%;
		margin-top: 0;
		margin-bottom: var(--space-2);
	}

	.select-option {
		border-radius: var(--radius-sm);
	}

	.select-option-button {
		width: 100%;
		border: none;
		background: transparent;
		text-align: left;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-family: var(--font-family-sans);
		color: var(--select-text);
		cursor: pointer;
	}

	.select-option-button:hover:not(:disabled) {
		background-color: var(--select-option-hover);
	}

	.select-option--selected .select-option-button {
		background-color: var(--select-option-selected);
	}

	.select-option--disabled .select-option-button {
		color: var(--select-option-disabled);
		cursor: not-allowed;
	}
</style>
