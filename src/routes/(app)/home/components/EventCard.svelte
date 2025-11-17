<script lang="ts">
	import { Button } from '$lib/ui';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiMapMarker, mdiCalendar, mdiClock, mdiHeart } from '@mdi/js';

	interface Event {
		id: string;
		title: string;
		artists: string[];
		date: string;
		time: string;
		location: string;
		distance: string;
		image: string;
		interested: number;
	}

	interface Props {
		event: Event;
	}

	let { event }: Props = $props();
	let interested = $state(false);

	function toggleInterested() {
		interested = !interested;
	}

	const eventDate = new Date(event.date);
	const formattedDate = eventDate.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric'
	});
</script>

<div class="event-card">
	<div class="event-image" style={`background-image: url('${event.image}')`}>
		<div class="event-date-badge">
			<span class="date-day">{eventDate.getDate()}</span>
			<span class="date-month">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
		</div>
		<button class="event-heart" class:active={interested} on:click={toggleInterested}>
			<SvgIcon path={mdiHeart} size={20} />
		</button>
	</div>

	<div class="event-content">
		<h3 class="event-title">{event.title}</h3>

		<div class="event-artists">
			{#each event.artists as artist (artist)}
				<a href={`/artist/${artist}`} class="artist-link">{artist}</a>
			{/each}
		</div>

		<div class="event-details">
			<div class="detail-item">
				<SvgIcon path={mdiCalendar} size={16} />
				<span>{formattedDate}</span>
			</div>
			<div class="detail-item">
				<SvgIcon path={mdiClock} size={16} />
				<span>{event.time}</span>
			</div>
			<div class="detail-item">
				<SvgIcon path={mdiMapMarker} size={16} />
				<span>{event.distance}</span>
			</div>
		</div>

		<div class="event-location">
			<p>{event.location}</p>
		</div>

		<div class="event-footer">
			<div class="interested-info">
				<span class="interested-count">{event.interested}</span>
				<span class="interested-label">interested</span>
			</div>
			<div>
				<Button variant="primary" size="md">Get Tickets</Button>
			</div>
		</div>
	</div>
</div>

<style lang="scss">

	.event-card {
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

	.event-image {
		position: relative;
		width: 100%;
		height: 200px;
		background-size: cover;
		background-position: center;
		background-color: var(--color-gray-300);
	}

	.event-date-badge {
		position: absolute;
		top: var(--space-3);
		left: var(--space-3);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		background: var(--primary);
		border-radius: var(--radius-md);
		color: white;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.date-day {
		@include text-lg();
		@include font-bold();
	}

	.date-month {
		@include text-xs();
		@include font-semibold();
		text-transform: uppercase;
	}

	.event-heart {
		position: absolute;
		top: var(--space-3);
		right: var(--space-3);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		border: none;
		background: rgba(255, 255, 255, 0.9);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
		backdrop-filter: blur(8px);

		&:hover {
			background: white;
			color: #ec4899;
		}

		&.active {
			background: white;
			color: #ec4899;
		}
	}

	.event-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		flex: 1;
	}

	.event-title {
		@include text-md();
		@include font-semibold();
		margin: 0;
		color: var(--text-primary);
	}

	.event-artists {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.artist-link {
		@include text-sm();
		color: var(--primary);
		text-decoration: none;
		transition: opacity 0.2s ease;

		&:hover {
			opacity: 0.8;
		}

		&:not(:last-child)::after {
			content: '•';
			margin-left: var(--space-2);
			color: var(--text-secondary);
		}
	}

	.event-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--bg-primary);
		border-radius: var(--radius-md);
	}

	.detail-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		@include text-sm();
		color: var(--text-secondary);
	}

	.event-location {
		p {
			@include text-sm();
			margin: 0;
			color: var(--text-secondary);
		}
	}

	.event-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-gray-100);

		@media (prefers-color-scheme: dark) {
			border-top-color: var(--color-gray-800);
		}
	}

	.interested-info {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
	}

	.interested-count {
		@include text-sm();
		@include font-semibold();
		color: var(--text-primary);
	}

	.interested-label {
		@include text-xs();
		color: var(--text-secondary);
	}
</style>
