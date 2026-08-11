<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { mdiClose } from '@mdi/js';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { modalStore } from '$lib/stores/modal.svelte';

	interface Props {
		id?: string;
		show?: boolean;
		outerclose?: boolean;
		backdrop?: boolean;
		title?: string;
		header?: any;
		children?: any;
		onclose?: () => void;
	}

	let {
		id,
		show = $bindable(false),
		onclose,
		outerclose = true,
		backdrop = true,
		title,
		header,
		children
	}: Props = $props();

	$effect(() => {
		if (id) {
			modalStore.register(id);
		}
	});

	function handleBackdropClick(): void {
		if (outerclose) {
			show = false;
			if (id) {
				modalStore.close(id);
			}
		}
	}

	$effect(() => {
		if (!show) {
			onclose?.();
		}
	});

	function handleEscapeKey(e: KeyboardEvent): void {
		if (e.key === 'Escape' && show && outerclose) {
			show = false;
			if (id) {
				modalStore.close(id);
			}
		}
	}

	function handleClose(): void {
		show = false;
		if (id) {
			modalStore.close(id);
		}
	}
</script>

<svelte:window on:keydown={handleEscapeKey} />

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-overlay"
		class:with-backdrop={backdrop}
		onclick={handleBackdropClick}
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 200 }}
	>
		<div class="modal-content" in:scale out:scale onclick={(e) => e.stopPropagation()}>
			{#if title || header}
				<div class="modal-header">
					<div class="modal-title-wrapper">
						{#if header}
							{@render header?.()}
						{:else}
							<h2 class="modal-title">{title}</h2>
						{/if}
					</div>
					<button class="modal-close-button" onclick={handleClose}>
						<SvgIcon path={mdiClose} size={20} />
					</button>
				</div>
			{/if}
			<div class="modal-body" class:no-header={!title && !header}>
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		background: rgba(0, 0, 0, 0);

		&.with-backdrop {
			background: rgba(0, 0, 0, 0.5);
		}
	}

	.modal-content {
		position: relative;
		background: var(--bg-surface);
		border-radius: var(--rounded-lg);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
		max-width: 90vw;
		min-width: 30%;
		max-height: 90vh;
		overflow: auto;
		animation: slideUp 300ms ease-out;
		display: flex;
		flex-direction: column;

		.modal-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-4);
			padding: var(--space-6);
			border-bottom: 1px solid var(--border-color);
			flex-shrink: 0;

			.modal-title-wrapper {
				flex-grow: 1;
				display: flex;
				justify-content: space-between;
				align-items: center;

				.modal-title {
					@include text-xl();
					font-weight: var(--font-weight-bold);
					color: var(--text-primary);
					margin: 0;
				}
			}

			.modal-close-button {
				background: none;
				border: none;
				cursor: pointer;
				color: var(--text-secondary);
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;

				&:hover {
					color: var(--text-primary);
				}
			}
		}

		.modal-body {
			padding: var(--space-6);
			padding-top: 0;
			overflow: auto;
			flex-grow: 1;

			&.no-header {
				padding-top: var(--space-6);
			}
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
