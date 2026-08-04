<script lang="ts">
	import type { Snippet } from 'svelte';
	import { mdiChatOutline, mdiHeartOutline, mdiLockOutline } from '@mdi/js';
	import Avatar from '../../Avatar.svelte';
	import SvgIcon from '../../SvgIcon.svelte';
	import PostPoll from '../PostPoll.svelte';
	import PostMediaGrid from './PostMediaGrid.svelte';

	interface PostMediaItem {
		id: string;
		fileUrl: string;
		thumbnailUrl: string | null;
		alt: string | null;
		caption: string | null;
	}

	interface Poll {
		id: string;
		question: string | null;
		mode: string;
		showResults: string;
		closesAt: Date | string | null;
		totalVotes: number;
		hasVoted: boolean;
		options: Array<{ id: string; label: string; votes: number; selected: boolean }>;
	}

	interface PostCardData {
		title: string;
		excerpt: string | null;
		bodyHtml: string | null;
		visibility: string;
		publishedAt: Date | string | null;
		isLocked: boolean;
		media: PostMediaItem[];
		poll: Poll | null;
	}

	let {
		post,
		author,
		music,
		onLike,
		onComment
	}: {
		post: PostCardData;
		author: { name: string; avatar?: string | null };
		music?: Snippet;
		onLike?: () => void;
		onComment?: () => void;
	} = $props();

	function formatDate(value: Date | string | null) {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
	}
</script>

<article class="post-card" class:is-locked={post.isLocked}>
	<header class="post-header">
		<Avatar size="md" src={author.avatar} name={author.name} />
		<div>
			<div class="author">{author.name}</div>
			<div class="meta-row">
				<span>{formatDate(post.publishedAt)}</span>
				{#if post.visibility !== 'public'}
					<span class="visibility">
						<SvgIcon path={mdiLockOutline} size={13} />
						{post.visibility}
					</span>
				{/if}
			</div>
		</div>
	</header>

	<div class="post-content">
		<h3>{post.title}</h3>

		{#if post.isLocked}
			{#if post.excerpt}
				<p>{post.excerpt}</p>
			{/if}
			<div class="locked-panel">
				<SvgIcon path={mdiLockOutline} size={22} />
				<span>Subscribe to unlock</span>
			</div>
		{:else}
			<PostMediaGrid media={post.media} />

			{#if post.bodyHtml}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- body is sanitized server-side (see studio/content/+page.server.ts sanitizeHtml) -->
				<div class="rich-text">{@html post.bodyHtml}</div>
			{:else if post.excerpt}
				<p>{post.excerpt}</p>
			{/if}

			{#if music}
				<div class="music-attachments">{@render music()}</div>
			{/if}

			{#if post.poll}
				<PostPoll poll={post.poll} />
			{/if}
		{/if}
	</div>

	<footer class="post-actions">
		<button aria-label="Like post" onclick={onLike}>
			<SvgIcon path={mdiHeartOutline} size={20} />
		</button>
		<button aria-label="Comment on post" onclick={onComment}>
			<SvgIcon path={mdiChatOutline} size={20} />
		</button>
	</footer>
</article>

<style lang="scss">
	.post-card {
		position: relative;
		overflow: hidden;
		width: 100%;
		max-width: 700px;
		margin-inline: auto;
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		border: 1px solid color-mix(in srgb, var(--border-primary) 62%, transparent);
		border-radius: var(--radius-lg);
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.035), transparent 40%),
			color-mix(in srgb, var(--bg-surface) 74%, var(--bg-primary));
		box-shadow: 0 14px 40px rgba(0, 0, 0, 0.16);
		transition:
			transform var(--duration-normal) var(--easing-ease-out),
			border-color var(--duration-normal) var(--easing-ease-out);

		&:hover {
			transform: translateY(-2px);
			border-color: color-mix(in srgb, var(--primary) 45%, var(--border-primary));
		}

		&.is-locked {
			border-color: color-mix(in srgb, var(--primary) 42%, transparent);
		}
	}

	.post-header,
	.post-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.post-content {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);

		h3 {
			margin: 0;
			color: var(--text-primary);
			font-size: var(--font-size-lg);
			line-height: 1.25;
		}

		p {
			margin: 0;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
			line-height: 1.5;
		}
	}

	.author {
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
	}

	.visibility {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--primary);
		text-transform: capitalize;
	}

	.rich-text {
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
	}

	.music-attachments {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.locked-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: 140px;
		margin-top: var(--space-3);
		border: 1px dashed color-mix(in srgb, var(--primary) 45%, var(--border-primary));
		border-radius: var(--radius-lg);
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, transparent), transparent),
			color-mix(in srgb, var(--bg-surface) 70%, var(--bg-primary));
		color: var(--text-primary);
		text-align: center;
		font-weight: 700;
	}

	.post-actions {
		justify-content: flex-end;

		button {
			width: 44px;
			height: 44px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			border-radius: var(--radius-md);
			color: var(--text-secondary);
			cursor: pointer;
			transition: background-color var(--duration-fast) var(--easing-ease-out);

			&:hover {
				background: var(--bg-tertiary);
				color: var(--text-primary);
			}

			&:focus-visible {
				outline: 2px solid var(--border-focus);
				outline-offset: 2px;
			}
		}
	}
</style>
