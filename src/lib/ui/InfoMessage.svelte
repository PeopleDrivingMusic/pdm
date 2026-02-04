<script lang="ts">
	import { mdiClose, mdiCheckCircle, mdiAlert, mdiAlertCircle, mdiInformation } from '@mdi/js';
	import { fly } from 'svelte/transition';
	import SvgIcon from './SvgIcon.svelte';
	import type { NotificationType } from '$lib/stores/notification.svelte';

	interface Props {
		type: NotificationType;
		message: string;
		onClose?: () => void;
	}

	const { type, message, onClose } = $props();

	const iconMap: Record<NotificationType, string> = {
		success: mdiCheckCircle,
		error: mdiAlert,
		warning: mdiAlertCircle,
		info: mdiInformation
	};
</script>

<div class={`info-message info-message--${type}`} transition:fly={{ x: 400, duration: 300 }}>
	<div class="info-message__icon">
		<SvgIcon path={iconMap[type]} size={20} />
	</div>
	<div class="info-message__content">
		<p class="info-message__text">{message}</p>
	</div>
	<button class="info-message__close" onclick={onClose} aria-label="Close notification">
		<SvgIcon path={mdiClose} size={18} />
	</button>
</div>

<style lang="scss">
	.info-message {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-lg);
		border: 1px solid transparent;
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		box-shadow: var(--shadow-md);
		max-width: 400px;
		min-width: 300px;

		&__icon {
			flex-shrink: 0;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		&__content {
			flex: 1;
			min-width: 0;
		}

		&__text {
			@include text-sm();
			margin: 0;
			color: var(--text-primary);
		}

		&__close {
			flex-shrink: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 32px;
			height: 32px;
			border: none;
			background: transparent;
			color: var(--text-secondary);
			cursor: pointer;
			border-radius: var(--radius-md);
			transition: all var(--duration-fast) var(--easing-ease-out);

			&:hover {
				background-color: rgba(0, 0, 0, 0.1);
				color: var(--text-primary);

				@media (prefers-color-scheme: dark) {
					background-color: rgba(255, 255, 255, 0.1);
				}
			}
		}

		/* Success variant */
		&--success {
			background-color: var(--color-success-50);
			border-color: var(--color-success-200);
			color: var(--color-success-800);

			.info-message__text {
				color: var(--color-success-800);
			}

			.info-message__icon {
				color: var(--success);
			}

			@media (prefers-color-scheme: dark) {
				background-color: rgba(40, 196, 136, 0.1);
				border-color: var(--color-success-600);

				.info-message__text {
					color: var(--color-success-200);
				}

				.info-message__icon {
					color: var(--success);
				}
			}
		}

		/* Error variant */
		&--error {
			background-color: var(--color-error-50);
			border-color: var(--color-error-200);
			color: var(--color-error-800);

			.info-message__text {
				color: var(--color-error-800);
			}

			.info-message__icon {
				color: var(--error);
			}

			@media (prefers-color-scheme: dark) {
				background-color: rgba(233, 77, 61, 0.1);
				border-color: var(--color-error-600);

				.info-message__text {
					color: var(--color-error-200);
				}

				.info-message__icon {
					color: var(--error);
				}
			}
		}

		/* Warning variant */
		&--warning {
			background-color: var(--color-warning-50);
			border-color: var(--color-warning-200);
			color: var(--color-warning-800);

			.info-message__text {
				color: var(--color-warning-800);
			}

			.info-message__icon {
				color: var(--warning);
			}

			@media (prefers-color-scheme: dark) {
				background-color: rgba(246, 139, 0, 0.1);
				border-color: var(--color-warning-600);

				.info-message__text {
					color: var(--color-warning-200);
				}

				.info-message__icon {
					color: var(--warning);
				}
			}
		}

		/* Info variant */
		&--info {
			background-color: var(--color-blue-50);
			border-color: var(--color-blue-200);
			color: var(--color-blue-800);

			.info-message__text {
				color: var(--color-blue-800);
			}

			.info-message__icon {
				color: var(--info);
			}

			@media (prefers-color-scheme: dark) {
				background-color: rgba(123, 148, 255, 0.1);
				border-color: var(--color-blue-600);

				.info-message__text {
					color: var(--color-blue-200);
				}

				.info-message__icon {
					color: var(--info);
				}
			}
		}
	}

	
</style>
