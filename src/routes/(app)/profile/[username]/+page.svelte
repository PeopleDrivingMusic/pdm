<script lang="ts">
	import { Tabs } from '$lib/ui';
	import type { PageData } from './$types';
	import ProfileHeader from './ProfileHeader.svelte';
	import Overview from './Overview.svelte';
	import Affiliate from './Affiliate.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const { user } = $derived(data);

	const viewsMap: { [key: string]: any } = {
		overview: Overview,
		affiliate: Affiliate
	};

	const tabs = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'playlists', label: 'Playlists' },
		{ id: 'subscriptions', label: 'Subscriptions' },
		{ id: 'affiliate', label: 'Affiliate' }
	];

	let activeTab = $state(tabs[0]);
	const activeTabId = $derived(activeTab?.id);
	let ViewComponent = $derived(viewsMap[activeTabId]);
	$inspect(user);
	function handleTabChange(tab) {
		activeTab = tab;
	}
</script>

<div class="profile-page">
	<!-- Header Section -->
	<ProfileHeader {user} />

	<!-- Tabs Section -->
	<section class="profile-tabs-wrapper">
		<Tabs {tabs} type="underline" bind:activeTab onTabChange={handleTabChange}></Tabs>
	</section>

	<!-- Content Section -->
	<section class="profile-content">
		<ViewComponent />
	</section>
</div>

<style lang="scss">
	.profile-page {
		max-width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		padding-bottom: var(--space-8);
	}

	// Tabs Section
	.profile-tabs-wrapper {
		background-color: var(--color-white);
		border-radius: var(--radius-lg);
		padding: 0 var(--space-6);

		@media (prefers-color-scheme: dark) {
			background-color: var(--color-gray-950);
			border-color: var(--color-gray-800);
		}
	}

	// Content Section
	.profile-content {
		background-color: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-6);

		@media (prefers-color-scheme: dark) {
			background-color: var(--color-gray-950);
			border-color: var(--color-gray-800);
		}
	}

	// Profile Info Grid
	.profile-info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-6);
	}

	.info-card {
		background-color: var(--color-gray-50);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-gray-200);
		padding: var(--space-5);

		@media (prefers-color-scheme: dark) {
			background-color: var(--color-gray-900);
			border-color: var(--color-gray-800);
		}
	}

	.info-card__title {
		margin: 0 0 var(--space-4) 0;
		@include text-lg();
		@include font-semibold();
		color: var(--color-gray-900);

		@media (prefers-color-scheme: dark) {
			color: var(--color-white);
		}
	}

	.info-card__content {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);

		label {
			@include text-xs();
			@include font-semibold();
			color: var(--color-gray-600);
			text-transform: uppercase;
			letter-spacing: var(--letter-spacing-wide);

			@media (prefers-color-scheme: dark) {
				color: var(--color-gray-400);
			}
		}

		p {
			margin: 0;
			@include text-md();
			color: var(--color-gray-900);

			@media (prefers-color-scheme: dark) {
				color: var(--color-white);
			}
		}
	}

	// Empty State
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-12);
		text-align: center;

		p {
			margin: 0;
			@include text-lg();
			color: var(--color-gray-600);

			@media (prefers-color-scheme: dark) {
				color: var(--color-gray-400);
			}
		}
	}

	.empty-state__subtitle {
		@include text-sm();
		color: var(--color-gray-500) !important;
	}

	// Settings Form
	.settings-form {
		max-width: 600px;
	}

	.settings-form__title {
		margin: 0 0 var(--space-6) 0;
		@include text-display-sm();
		color: var(--color-gray-900);

		@media (prefers-color-scheme: dark) {
			color: var(--color-white);
		}
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-5);

		label {
			@include text-sm();
			@include font-medium();
			color: var(--color-gray-900);

			@media (prefers-color-scheme: dark) {
				color: var(--color-white);
			}
		}
	}

	.form-input {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-family: var(--font-family-sans);
		color: var(--color-gray-900);
		background-color: var(--color-white);
		transition: all var(--duration-normal) var(--easing-ease-out);

		&:focus {
			outline: none;
			border-color: var(--color-brand-500);
			box-shadow: 0 0 0 3px var(--color-brand-50);
		}

		&:disabled {
			background-color: var(--color-gray-100);
			cursor: not-allowed;
			opacity: 0.6;
		}

		@media (prefers-color-scheme: dark) {
			background-color: var(--color-gray-800);
			border-color: var(--color-gray-700);
			color: var(--color-white);

			&:focus {
				border-color: var(--color-brand-400);
				box-shadow: 0 0 0 3px var(--color-brand-900);
			}

			&:disabled {
				background-color: var(--color-gray-700);
			}
		}

		&--textarea {
			resize: vertical;
			min-height: 120px;
			font-family: var(--font-family-mono);
		}
	}

	.form-actions {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-6);
	}
</style>
