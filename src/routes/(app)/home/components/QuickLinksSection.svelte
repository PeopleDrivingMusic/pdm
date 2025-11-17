<script lang="ts">
	import { Button } from '$lib/ui';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import {
		mdiPlaylistMusic,
		mdiHeart,
		mdiHistory,
		mdiFire,
		mdiArrowRight
	} from '@mdi/js';

	const quickLinks = [
		{
			label: 'Your Playlists',
			icon: mdiPlaylistMusic,
			href: '/playlists',
			color: '#3b82f6'
		},
		{
			label: 'Liked Tracks',
			icon: mdiHeart,
			href: '/liked',
			color: '#ec4899'
		},
		{
			label: 'Recent Plays',
			icon: mdiHistory,
			href: '/history',
			color: '#f59e0b'
		},
		{
			label: 'Trending',
			icon: mdiFire,
			href: '/trending',
			color: '#10b981'
		}
	];
</script>

<section class="quick-links-section">
	<div class="section-header">
		<h3>Quick Access</h3>
	</div>
	<div class="links-grid">
		{#each quickLinks as link (link.label)}
			<a href={link.href} class="quick-link" style={`--link-color: ${link.color}`}>
				<div class="link-icon">
					<SvgIcon path={link.icon} size={24} />
				</div>
				<div class="link-content">
					<span class="link-label">{link.label}</span>
					<SvgIcon path={mdiArrowRight} size={16} />
				</div>
			</a>
		{/each}
	</div>
</section>

<style lang="scss">

	.quick-links-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--bg-secondary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-gray-200);

		@media (prefers-color-scheme: dark) {
			border-color: var(--color-gray-800);
		}
	}

	.section-header {
		h3 {
			@include text-md();
			@include font-semibold();
			margin: 0;
			color: var(--text-primary);
		}
	}

	.links-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);

		@media (max-width: 600px) {
			grid-template-columns: 1fr;
		}
	}

	.quick-link {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--bg-primary);
		border: 1px solid var(--color-gray-100);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: var(--text-primary);
		transition: all 0.3s ease;

		@media (prefers-color-scheme: dark) {
			border-color: var(--color-gray-800);
		}

		&:hover {
			background: var(--link-color, #3b82f6);
			background: color-mix(in srgb, var(--link-color, #3b82f6) 10%, var(--bg-primary));
			border-color: var(--link-color, #3b82f6);
		}
	}

	.link-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--link-color, #3b82f6) 20%, var(--bg-secondary));
		color: var(--link-color, #3b82f6);
		flex-shrink: 0;
	}

	.link-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex: 1;
		gap: var(--space-2);
		min-width: 0;
	}

	.link-label {
		@include text-sm();
		@include font-medium();
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
