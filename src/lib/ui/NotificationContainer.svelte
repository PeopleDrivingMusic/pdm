<script lang="ts">
	import { notificationStore } from '$lib/stores/notification.svelte';
	import InfoMessage from './InfoMessage.svelte';
	import { fade } from 'svelte/transition';

	const notifications = $derived(notificationStore);
</script>

<div class="notification-container">
	{#each $notifications as notification (notification.id)}
		<div
			class="notification-item"
			transition:fade={{ duration: 200 }}
			role="alert"
			aria-live="polite"
		>
			<InfoMessage
				type={notification.type}
				message={notification.message}
				onClose={() => notificationStore.remove(notification.id)}
			/>
		</div>
	{/each}
</div>

<style lang="scss">
	.notification-container {
		position: fixed;
		top: var(--space-6);
		right: var(--space-6);
		z-index: var(--z-toast);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		pointer-events: none;

		@media (max-width: 768px) {
			top: var(--space-4);
			right: var(--space-4);
			left: var(--space-4);
		}
	}

	.notification-item {
		pointer-events: auto;

		@media (max-width: 768px) {
			display: flex;
			justify-content: center;
		}
	}
</style>
