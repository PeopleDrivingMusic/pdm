<script lang="ts">
	import { mdiUpload, mdiClose, mdiFileMusic, mdiImage, mdiFile } from '@mdi/js';
	import SvgIcon from './SvgIcon.svelte';

	interface Props {
		label?: string;
		name?: string;
		accept?: string;
		required?: boolean;
		disabled?: boolean;
		maxSize?: number; // in MB
		preview?: boolean;
		value?: File | null;
		helpText?: string;
	}

	let {
		label = 'Upload File',
		name = 'file',
		accept = '*/*',
		required = false,
		disabled = false,
		maxSize = 50, // 50MB default
		preview = true,
		value = $bindable(null),
		helpText = ''
	}: Props = $props();

	let fileInput: HTMLInputElement;
	let error = $state('');
	let previewUrl = $state<string | null>(null);

	// Sync input when value is cleared externally
	$effect(() => {
		if (value === null && fileInput) {
			fileInput.value = '';
			previewUrl = null;
		}
	});

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) {
			clearFile();
			return;
		}

		// Validate file size
		const fileSizeMB = file.size / (1024 * 1024);
		if (fileSizeMB > maxSize) {
			error = `File size must be less than ${maxSize}MB`;
			clearFile();
			return;
		}

		error = '';
		value = file;

		// Generate preview for images
		if (preview && file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.onload = (e) => {
				previewUrl = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			previewUrl = null;
		}
	}

	function clearFile() {
		value = null;
		previewUrl = null;
		error = '';
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function getFileIcon(file: File | null) {
		if (!file) return mdiFile;
		if (file.type.startsWith('image/')) return mdiImage;
		if (file.type.startsWith('audio/')) return mdiFileMusic;
		return mdiFile;
	}

	function formatFileSize(bytes: number) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
	}
</script>

<div class="file-upload">
	{#if label}
		<label class="file-upload__label">
			{label}
			{#if required}
				<span class="required-indicator">*</span>
			{/if}
		</label>
	{/if}

	{#if helpText}
		<p class="file-upload__help">{helpText}</p>
	{/if}

	<div class="file-upload__content">
		<!-- Hidden input - always in DOM for FormData -->
		<input
			bind:this={fileInput}
			id={name}
			type="file"
			{name}
			{accept}
			{required}
			{disabled}
			onchange={handleFileChange}
			class="file-upload__input"
		/>

		{#if value}
			<!-- File Selected Display -->
			<div class="file-preview">
				{#if previewUrl}
					<!-- Image Preview -->
					<div class="file-preview__image">
						<img src={previewUrl} alt="Preview" />
					</div>
				{:else}
					<!-- File Icon -->
					<div class="file-preview__icon">
						<SvgIcon path={getFileIcon(value)} size={32} />
					</div>
				{/if}

				<div class="file-preview__info">
					<p class="file-preview__name">{value.name}</p>
					<p class="file-preview__size">{formatFileSize(value.size)}</p>
				</div>

				<button
					type="button"
					class="file-preview__remove"
					onclick={clearFile}
					disabled={disabled}
					aria-label="Remove file"
				>
					<SvgIcon path={mdiClose} size={20} />
				</button>
			</div>
		{:else}
			<!-- Upload Button -->
			<label class="file-upload__dropzone" class:disabled for={name}>
				<div class="file-upload__icon">
					<SvgIcon path={mdiUpload} size={32} />
				</div>
				<p class="file-upload__text">
					{disabled ? 'Upload disabled' : 'Click to upload or drag and drop'}
				</p>
				{#if maxSize}
					<p class="file-upload__limit">Max file size: {maxSize}MB</p>
				{/if}
			</label>
		{/if}
	</div>

	{#if error}
		<p class="file-upload__error">{error}</p>
	{/if}
</div>

<style lang="scss">
	.file-upload {
		width: 100%;

		&__label {
			display: block;
			margin-bottom: var(--space-2);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--text-primary);

			.required-indicator {
				color: var(--text-danger, var(--border-error));
				margin-left: var(--space-1);
			}
		}

		&__help {
			margin: 0 0 var(--space-2) 0;
			font-size: var(--font-size-xs);
			color: var(--text-secondary);
		}

		&__content {
			position: relative;
		}

		&__dropzone {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: var(--space-8) var(--space-6);
			border: 2px dashed var(--border-primary);
			border-radius: var(--radius-lg);
			background-color: var(--bg-surface);
			cursor: pointer;
			transition: all var(--duration-normal);

			&:hover:not(.disabled) {
				border-color: var(--border-focus);
				background-color: var(--bg-secondary);
			}

			&.disabled {
				cursor: not-allowed;
				opacity: 0.6;
				background-color: var(--bg-tertiary);
			}
		}

		&__input {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border-width: 0;
		}

		&__icon {
			color: var(--text-tertiary);
			margin-bottom: var(--space-3);
		}

		&__text {
			margin: 0;
			font-size: var(--font-size-sm);
			color: var(--text-primary);
			font-weight: var(--font-weight-medium);
		}

		&__limit {
			margin: var(--space-1) 0 0 0;
			font-size: var(--font-size-xs);
			color: var(--text-tertiary);
		}

		&__error {
			margin: var(--space-2) 0 0 0;
			font-size: var(--font-size-sm);
			color: var(--color-error-600);
		}
	}

	.file-preview {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-lg);
		background-color: var(--bg-surface);

		&__image {
			width: 64px;
			height: 64px;
			border-radius: var(--radius-md);
			overflow: hidden;
			flex-shrink: 0;
			background-color: var(--bg-tertiary);

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		}

		&__icon {
			width: 64px;
			height: 64px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: var(--radius-md);
			background-color: var(--bg-tertiary);
			color: var(--text-tertiary);
			flex-shrink: 0;
		}

		&__info {
			flex: 1;
			min-width: 0;
		}

		&__name {
			margin: 0 0 var(--space-1) 0;
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--text-primary);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		&__size {
			margin: 0;
			font-size: var(--font-size-xs);
			color: var(--text-secondary);
		}

		&__remove {
			flex-shrink: 0;
			width: 36px;
			height: 36px;
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px solid var(--border-primary);
			border-radius: var(--radius-md);
			background-color: transparent;
			color: var(--text-secondary);
			cursor: pointer;
			transition: all var(--duration-fast);

			&:hover:not(:disabled) {
				background-color: var(--color-error-100);
				border-color: var(--color-error-500);
				color: var(--color-error-700);
			}

			&:disabled {
				cursor: not-allowed;
				opacity: 0.5;
			}
		}
	}
</style>
