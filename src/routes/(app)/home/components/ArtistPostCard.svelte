<script lang="ts">
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import Avatar from '$lib/ui/Avatar.svelte';
	import { mdiHeart, mdiEyeCircle, mdiShare } from '@mdi/js';

	interface Post {
		id: string;
		artistName: string;
		artistAvatar: string;
		content: string;
		timestamp: string;
		likes: number;
		comments: number;
		liked: boolean;
	}

	interface Props {
		post: Post;
	}

	let { post }: Props = $props();
	let liked = $state(post.liked);
	let likesCount = $state(post.likes);

	function toggleLike() {
		liked = !liked;
		likesCount = liked ? likesCount + 1 : likesCount - 1;
	}
</script>

<div class="artist-post-card">
	<div class="post-header">
		<Avatar name={post.artistName} src={post.artistAvatar} href={`/artist/${post.artistName}`} />
		<div class="post-meta">
			<a href={`/artist/${post.artistName}`} class="artist-name">{post.artistName}</a>
			<span class="timestamp">{post.timestamp}</span>
		</div>
	</div>

	<div class="post-content">
		<p>{post.content}</p>
	</div>

	<div class="post-actions">
		<button
			class="action-btn"
			class:active={liked}
			on:click={toggleLike}
			aria-label="Like post"
		>
			<SvgIcon path={mdiHeart} size={18} />
			<span class="action-count">{likesCount}</span>
		</button>
		<button class="action-btn" aria-label="Comment on post">
			<SvgIcon path={mdiEyeCircle} size={18} />
			<span class="action-count">{post.comments}</span>
		</button>
		<button class="action-btn" aria-label="Share post">
			<SvgIcon path={mdiShare} size={18} />
		</button>
	</div>
</div>

<style lang="scss">

	.artist-post-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--bg-secondary);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		transition: all 0.3s ease;

		@media (prefers-color-scheme: dark) {
			border-color: var(--color-gray-800);
		}

		&:hover {
			border-color: var(--primary);
			box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);

			@media (prefers-color-scheme: dark) {
				box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
			}
		}
	}

	.post-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.post-meta {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 1;
		min-width: 0;
	}

	.artist-name {
		@include text-sm();
		@include font-semibold();
		color: var(--text-primary);
		text-decoration: none;
		transition: color 0.2s ease;

		&:hover {
			color: var(--primary);
		}
	}

	.timestamp {
		@include text-xs();
		color: var(--text-secondary);
	}

	.post-content {
		@include text-sm();
		color: var(--text-primary);
		line-height: 1.5;

		p {
			margin: 0;
		}
	}

	.post-actions {
		display: flex;
		gap: var(--space-4);
		padding-top: var(--space-2);
		border-top: 1px solid var(--color-gray-100);

		@media (prefers-color-scheme: dark) {
			border-top-color: var(--color-gray-800);
		}
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: var(--color-gray-50);
			color: var(--primary);

			@media (prefers-color-scheme: dark) {
				background: var(--color-gray-800);
			}
		}

		&.active {
			color: var(--primary);
		}
	}

	.action-count {
		@include text-xs();
		@include font-medium();
	}
</style>
