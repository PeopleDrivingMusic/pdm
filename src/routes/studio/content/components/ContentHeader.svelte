<script lang="ts">
	import { Button } from '$lib/ui';

	interface Props {
		counts: {
			all: number;
			posts: number;
			photos: number;
			videos: number;
			scheduled: number;
			drafts: number;
		};
		onCreatePost: () => void;
		onCreateGallery: () => void;
		onCreateVideo: () => void;
	}

	let { counts, onCreatePost, onCreateGallery, onCreateVideo }: Props = $props();
</script>

<header class="content-header">
	<div>
		<p class="eyebrow">Studio</p>
		<h1>Content</h1>
		<p class="subtitle">Plan posts, polls, galleries, and videos from one production surface.</p>
	</div>

	<div class="actions" aria-label="Create content">
		<Button variant="secondary" onClick={onCreateGallery}>New gallery</Button>
		<Button variant="secondary" onClick={onCreateVideo}>Upload video</Button>
		<Button onClick={onCreatePost}>New post</Button>
	</div>
</header>

<section class="stats" aria-label="Content summary">
	<div class="stat">
		<span>{counts.all}</span>
		<p>All items</p>
	</div>
	<div class="stat">
		<span>{counts.posts}</span>
		<p>Posts</p>
	</div>
	<div class="stat">
		<span>{counts.photos}</span>
		<p>Galleries</p>
	</div>
	<div class="stat">
		<span>{counts.videos}</span>
		<p>Videos</p>
	</div>
	<div class="stat">
		<span>{counts.scheduled}</span>
		<p>Scheduled</p>
	</div>
	<div class="stat">
		<span>{counts.drafts}</span>
		<p>Drafts</p>
	</div>
</section>

<style lang="scss">
	.content-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-6);
		margin-bottom: var(--space-6);

		h1,
		p {
			margin: 0;
		}

		h1 {
			font-size: var(--font-size-4xl);
			line-height: 1.1;
			color: var(--text-primary);
		}
	}

	.eyebrow {
		margin-bottom: var(--space-2) !important;
		color: var(--primary);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		text-transform: uppercase;
	}

	.subtitle {
		max-width: 620px;
		margin-top: var(--space-2) !important;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.5;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-3);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}

	.stat {
		min-width: 0;
		padding: var(--space-4);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		background: var(--bg-surface);

		span {
			display: block;
			color: var(--text-primary);
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-semibold);
		}

		p {
			margin: var(--space-1) 0 0;
			color: var(--text-secondary);
			font-size: var(--font-size-xs);
		}
	}

	@media (max-width: 960px) {
		.content-header {
			flex-direction: column;
		}

		.actions {
			justify-content: flex-start;
		}

		.stats {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 560px) {
		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
