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
