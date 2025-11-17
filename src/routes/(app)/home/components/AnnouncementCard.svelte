<script lang="ts">
	import { Button } from '$lib/ui';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiStar } from '@mdi/js';

	interface Announcement {
		id: string;
		type: 'new-album' | 'new-single' | 'milestone' | 'collab';
		title: string;
		description: string;
		image: string;
		artistName: string;
		date: string;
	}

	interface Props {
		announcement: Announcement;
	}

	let { announcement }: Props = $props();

	const typeLabels = {
		'new-album': '🎵 New Album',
		'new-single': '🎶 New Single',
		milestone: '🏆 Milestone',
		collab: '🤝 Collaboration'
	};

	const typeColors = {
		'new-album': '#3b82f6',
		'new-single': '#8b5cf6',
		milestone: '#f59e0b',
		collab: '#ec4899'
	};
</script>

<div class="announcement-card">
	<div class="announcement-image" style={`background-image: url('${announcement.image}')`}>
		<div class="announcement-badge">
			<span>{typeLabels[announcement.type]}</span>
		</div>
	</div>

	<div class="announcement-content">
		<p class="announcement-date">{new Date(announcement.date).toLocaleDateString()}</p>
		<h3 class="announcement-title">{announcement.description}</h3>
		<p class="announcement-artist">{announcement.artistName}</p>

		<Button variant="primary" size="sm" >Check it out</Button>
	</div>
</div>

<style lang="scss">

	.announcement-card {
		display: flex;
		flex-direction: column;
		background: var(--bg-secondary);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: all 0.3s ease;

		@media (prefers-color-scheme: dark) {
			border-color: var(--color-gray-800);
		}

		&:hover {
			transform: translateY(-4px);
			border-color: var(--primary);
			box-shadow: 0 8px 16px rgba(59, 130, 246, 0.15);

			@media (prefers-color-scheme: dark) {
				box-shadow: 0 8px 16px rgba(99, 102, 241, 0.25);
			}
		}
	}

	.announcement-image {
		position: relative;
		width: 100%;
		height: 180px;
		background-size: cover;
		background-position: center;
		background-color: var(--color-gray-300);
	}

	.announcement-badge {
		position: absolute;
		top: var(--space-3);
		left: var(--space-3);
		padding: var(--space-2) var(--space-3);
		background: rgba(0, 0, 0, 0.7);
		border-radius: var(--radius-full);
		backdrop-filter: blur(8px);

		span {
			@include text-xs();
			@include font-semibold();
			color: white;
		}
	}

	.announcement-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		flex: 1;
	}

	.announcement-date {
		@include text-xs();
		color: var(--text-secondary);
		margin: 0;
	}

	.announcement-title {
		@include text-md();
		@include font-semibold();
		margin: 0;
		color: var(--text-primary);
	}

	.announcement-artist {
		@include text-sm();
		color: var(--text-secondary);
		margin: 0;
	}

	.announcement-btn {
		align-self: flex-start;
		margin-top: var(--space-2);
	}
</style>
