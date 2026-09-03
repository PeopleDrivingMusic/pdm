<script lang="ts">
	interface Props {
		placeholder?: string;
		value?: string;
		label?: string;
		required?: boolean;
		disabled?: boolean;
		id?: string;
		name?: string;
		rows?: number;
		error?: boolean;
	}

	let {
		placeholder = '',
		value = $bindable(''),
		label = '',
		required = false,
		disabled = false,
		id = label || `textarea-${Math.random().toString(36).substr(2, 9)}`,
		name = '',
		rows = 4,
		error = false,
		...rest
	}: Props = $props();
</script>

<div class="textarea-group">
	{#if label}
		<label class="textarea-label" for={id}>
			{label}
			{#if required}
				<span class="required-indicator" aria-hidden="true">*</span>
			{/if}
		</label>
	{/if}

	<textarea
		{id}
		{name}
		class="textarea"
		class:textarea--error={error}
		{placeholder}
		bind:value
		{required}
		{disabled}
		{rows}
		{...rest}
	></textarea>
</div>

<style lang="scss">
	.textarea-group {
		width: 100%;
	}

	.textarea-label {
		display: block;
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--text-primary);
		font-family: var(--font-family-sans);
	}

	.required-indicator {
		color: var(--text-danger, var(--border-error));
		margin-left: var(--space-1, 0.25rem);
	}

	.textarea {
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-family: var(--font-family-sans);
		background-color: var(--bg-surface);
		color: var(--text-primary);
		transition: all var(--duration-normal) var(--easing-ease-out);

		&:focus {
			outline: none;
			border-color: var(--border-focus);
		}

		&:hover:not(:disabled):not(:focus) {
			border-color: var(--border-secondary);
		}

		&:disabled {
			background-color: var(--bg-tertiary);
			color: var(--text-disabled);
			cursor: not-allowed;
			opacity: 0.6;
		}

		&::placeholder {
			color: var(--text-tertiary);
		}
	}

	.textarea--error {
		border-color: var(--border-error);
	}
</style>
