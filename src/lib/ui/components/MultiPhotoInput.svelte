<script lang="ts">
	import { mdiAlertCircleOutline, mdiClose, mdiImagePlusOutline } from '@mdi/js';
	import SvgIcon from '../SvgIcon.svelte';

	interface UploadedPhoto {
		key: string;
		contentType: string;
		size: number;
	}

	interface Item {
		id: string;
		name: string;
		url: string;
		status: 'uploading' | 'done' | 'error';
		progress: number;
		photo: UploadedPhoto | null;
	}

	let {
		onUpload,
		onRemovePhoto,
		onChange,
		accept = 'image/jpeg,image/png,image/webp',
		maxSizeMb = 10,
		disabled = false
	}: {
		onUpload: (file: File, onProgress: (pct: number) => void) => Promise<UploadedPhoto>;
		onRemovePhoto?: (photo: UploadedPhoto) => void;
		onChange?: (photos: UploadedPhoto[]) => void;
		accept?: string;
		maxSizeMb?: number;
		disabled?: boolean;
	} = $props();

	let input = $state<HTMLInputElement | null>(null);
	let error = $state('');
	let items = $state<Item[]>([]);

	function emitChange() {
		onChange?.(
			items.filter((item) => item.status === 'done' && item.photo).map((item) => item.photo!)
		);
	}

	async function addFile(file: File) {
		const id = crypto.randomUUID();
		items = [
			...items,
			{
				id,
				name: file.name,
				url: URL.createObjectURL(file),
				status: 'uploading',
				progress: 0,
				photo: null
			}
		];

		try {
			const photo = await onUpload(file, (pct) => {
				const item = items.find((entry) => entry.id === id);
				if (item) item.progress = Math.max(0, Math.min(100, Math.round(pct)));
			});
			const item = items.find((entry) => entry.id === id);
			if (item) {
				item.status = 'done';
				item.progress = 100;
				item.photo = photo;
			}
			emitChange();
		} catch {
			const item = items.find((entry) => entry.id === id);
			if (item) item.status = 'error';
		}
	}

	function onSelect(event: Event) {
		const picked = Array.from((event.target as HTMLInputElement).files ?? []);
		const withinSize = picked.filter((file) => file.size / (1024 * 1024) <= maxSizeMb);
		error = withinSize.length < picked.length ? `Each photo must be under ${maxSizeMb}MB` : '';
		for (const file of withinSize) void addFile(file);
		if (input) input.value = '';
	}

	function remove(id: string) {
		const item = items.find((entry) => entry.id === id);
		if (item) {
			URL.revokeObjectURL(item.url);
			if (item.photo) onRemovePhoto?.(item.photo);
		}
		items = items.filter((entry) => entry.id !== id);
		emitChange();
	}
</script>

<div class="multi-photo">
	<div class="strip">
		{#each items as item (item.id)}
			<figure
				class="thumb"
				class:thumb--error={item.status === 'error'}
				class:thumb--uploading={item.status === 'uploading'}
			>
				<img src={item.url} alt={item.name} />

				{#if item.status === 'uploading'}
					<span class="thumb__overlay">{item.progress}%</span>
				{:else if item.status === 'error'}
					<span class="thumb__overlay thumb__overlay--error">
						<SvgIcon path={mdiAlertCircleOutline} size={18} />
					</span>
				{/if}

				<button
					type="button"
					class="thumb__remove"
					aria-label={`Remove ${item.name}`}
					onclick={() => remove(item.id)}
					{disabled}
				>
					<SvgIcon path={mdiClose} size={16} />
				</button>
			</figure>
		{/each}

		<label class="add-tile" class:disabled>
			<SvgIcon path={mdiImagePlusOutline} size={26} />
			<span>Add photos</span>
			<input
				bind:this={input}
				type="file"
				{accept}
				multiple
				{disabled}
				onchange={onSelect}
				class="add-tile__input"
			/>
		</label>
	</div>

	{#if error}
		<p class="multi-photo__error" role="alert">{error}</p>
	{/if}
</div>

<style lang="scss">
	.multi-photo {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.strip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.thumb {
		position: relative;
		margin: 0;
		width: 84px;
		height: 84px;
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--bg-tertiary);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}

		&--error {
			outline: 2px solid var(--border-error);
			outline-offset: -2px;
		}

		&__overlay {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(0, 0, 0, 0.55);
			color: #fff;
			font-size: var(--font-size-xs);
			font-weight: 700;

			&--error {
				color: var(--border-error);
				background: rgba(0, 0, 0, 0.4);
			}
		}

		&__remove {
			position: absolute;
			top: 4px;
			right: 4px;
			width: 24px;
			height: 24px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			border-radius: 999px;
			color: #fff;
			background: rgba(0, 0, 0, 0.6);
			cursor: pointer;

			&:hover:not(:disabled) {
				background: rgba(0, 0, 0, 0.82);
			}

			&:focus-visible {
				outline: 2px solid #fff;
				outline-offset: 1px;
			}
		}
	}

	.add-tile {
		position: relative;
		width: 84px;
		height: 84px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		border: 1px dashed var(--border-primary);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		text-align: center;
		cursor: pointer;
		transition: border-color var(--duration-fast) var(--easing-ease-out);

		&:hover:not(.disabled) {
			border-color: var(--border-focus);
			color: var(--text-primary);
		}

		&.disabled {
			cursor: not-allowed;
			opacity: 0.6;
		}

		&__input {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			border: 0;
		}
	}

	.multi-photo__error {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--border-error);
	}
</style>
