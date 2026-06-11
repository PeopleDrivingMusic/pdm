<script lang="ts">
	import type { User } from '$lib/db/schema.ts';
	import { Avatar, Button } from '$lib/ui';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiCalendarOutline, mdiMapMarkerOutline, mdiShieldCrownOutline } from '@mdi/js';
	import { Tween } from 'svelte/motion';

	interface Props {
		user: User;
		currentUser: Omit<User, 'hashedPassword'> | null;
	}

	const { user, currentUser }: Props = $props();

	const trust_score = new Tween(0);
	trust_score.target = Number(user.trust_score);

	function formatDate(dateString: string | Date): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<section class="profile-header">
	<div class="profile-header__background"></div>

	<div class="profile-header__content">
		<div class="profile-header__avatar">
			<Avatar
				name={user.displayName || user.username || user.email}
				src={user.avatarUrl}
				size="lg"
				alt={user.displayName || user.username || user.email}
			/>
		</div>

		<div class="profile-header__info">
			<div class="profile-header__name-wrapper">
				<h1 class="profile-header__name">
					{user.displayName || user.email}
				</h1>
				<span class="profile-header__trust-score">
					<SvgIcon path={mdiShieldCrownOutline} size={20} />
					{trust_score.target.toFixed(1)}
				</span>
			</div>
			<p class="profile-header__username">@{user.username}</p>

			{#if user.bio}
				<p class="profile-header__bio">{user.bio}</p>
			{/if}

			<div class="profile-header__meta">
				<!-- {#if user.location} -->
				<span class="profile-header__meta-item">
					<SvgIcon path={mdiMapMarkerOutline} size={14} />
					<!-- {user.location} -->
				</span>
				<!-- {/if} -->
				{#if user.createdAt}
					<span class="profile-header__meta-item">
						<SvgIcon path={mdiCalendarOutline} size={14} />
						Joined {formatDate(user.createdAt)}
					</span>
				{/if}
			</div>
		</div>
		{#if currentUser?.id === user.id}
			<div class="profile-header__actions">
				<Button href="/artist/register" variant="primary">Become an artist</Button>
			</div>
		{/if}
	</div>
</section>

<style lang="scss">
	// Header Section
	.profile-header {
		position: relative;
		width: 100%;
		height: max-content;

		p {
			margin: 0;
		}
	}

	.profile-header__background {
		padding-block: var(--space-8);
		width: 100%;
		height: 240px;
		background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-600) 100%);
		position: relative;
		overflow: hidden;

		@media (prefers-color-scheme: dark) {
			background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-800) 100%);
		}

		&::before {
			content: '';
			position: absolute;
			width: 400px;
			height: 400px;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.1);
			top: -100px;
			right: -50px;
		}
	}

	.profile-header__content {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: var(--space-6);
		align-items: flex-start;
		padding: 0 var(--space-6) var(--space-6) var(--space-6);
		margin-top: -60px;
		position: relative;
		z-index: 1;

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
			align-items: center;
			text-align: center;
			padding: var(--space-6);
		}
	}

	.profile-header__avatar {
		flex-shrink: 0;

		@media (max-width: 768px) {
			display: flex;
			justify-content: center;
		}
	}

	.profile-header__info {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.profile-header__name-wrapper {
		display: flex;
		align-items: center;
		gap: var(--space-4);

		.profile-header__name {
			margin: 0;
			@include text-display-md();
			color: var(--color-white);
		}

		.profile-header__trust-score {
			margin: 0;
			@include text-display-md();
			color: var(--color-white);
			display: flex;
			align-items: center;
			gap: var(--space-2);
		}
	}

	.profile-header__username {
		margin: 0;
		@include text-md();
		color: rgba(255, 255, 255, 0.9);
	}

	.profile-header__bio {
		margin: var(--space-2) 0 0 0;
		@include text-sm();
		color: rgba(255, 255, 255, 0.85);
	}

	.profile-header__meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
		margin-top: var(--space-3);
	}

	.profile-header__meta-item {
		@include text-sm();
		color: rgba(255, 255, 255, 0.8);
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.profile-header__actions {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;

		@media (max-width: 768px) {
			justify-content: center;
			width: 100%;
		}
	}
</style>
