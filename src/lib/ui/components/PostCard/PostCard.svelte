<script lang="ts">
	import type { Snippet } from 'svelte';
	import { mdiHeart, mdiHeartOutline, mdiLockOutline } from '@mdi/js';
	import Avatar from '../../Avatar.svelte';
	import SvgIcon from '../../SvgIcon.svelte';
	import PostPoll from '../PostPoll.svelte';
	import PostMediaGrid from './PostMediaGrid.svelte';
	import CommentToggle from '../CommentToggle.svelte';
	import CommentSection from '../CommentSection.svelte';
	import IconButton from '../../IconButton.svelte';
	import LockedPanel from '../LockedPanel.svelte';
	import { toggleLikeOptimistic, type LikeState } from '$lib/client/comments';

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
		id: string;
		title: string;
		excerpt: string | null;
		bodyHtml: string | null;
		visibility: string;
		publishedAt: Date | string | null;
		isLocked: boolean;
		commentCount: number;
		likeCount: number;
		likedByViewer: boolean;
		media: PostMediaItem[];
		poll: Poll | null;
	}

	let {
		post,
		author,
		music,
		isLoggedIn = false,
		commentsEnabled = true
	}: {
		post: PostCardData;
		author: { name: string; avatar?: string | null };
		music?: Snippet;
		isLoggedIn?: boolean;
		/** Set false where the post id isn't real (e.g. the design preview fixtures). */
		commentsEnabled?: boolean;
	} = $props();

	let showComments = $state(false);
	// A locked post still shows its counts as a teaser (curiosity toward
	// subscribing), but the conversation itself is part of what the subscription
	// unlocks — the thread never opens and the server refuses the write anyway.
	const canOpenComments = $derived(commentsEnabled && !post.isLocked);
	// The server count stays the source of truth (a re-load updates it); the delta
	// layers the viewer's own posts/deletes on top without shadowing it.
	let countDelta = $state(0);
	const commentCount = $derived(Math.max(0, post.commentCount + countDelta));

	function handleCommentToggle() {
		if (!canOpenComments) return;
		showComments = !showComments;
	}

	// Overrides the prop once the viewer has actually toggled — the server's
	// response is the source of truth (another reader may have liked it since).
	let likeOverride = $state<LikeState | null>(null);
	const likedByViewer = $derived(likeOverride?.liked ?? post.likedByViewer);
	const likeCount = $derived(likeOverride?.likeCount ?? post.likeCount);

	// TODO(#19?): route an anonymous click to a login modal instead of just
	// disabling — a locked post already has its own "Subscribe to unlock" CTA,
	// but a logged-out viewer on an unlocked post currently has no path from
	// this button into signing in.
	const canLike = $derived(isLoggedIn && !post.isLocked);

	async function handleLike() {
		if (!canLike) return;
		await toggleLikeOptimistic(
			'post',
			post.id,
			{ liked: likedByViewer, likeCount },
			(next) => (likeOverride = next)
		);
	}

	function formatDate(value: Date | string | null) {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
	}
</script>

<article class="post-card" class:is-locked={post.isLocked}>
	{#if post.isLocked}
		<!-- Matches the feed's locked-card treatment exactly: the whole card is the
		     gated surface — no header, no like/comment row, nothing peeking out
		     from under the overlay. -->
		<div class="post-content">
			<h3>{post.title}</h3>
			{#if post.excerpt}
				<p>{post.excerpt}</p>
			{/if}
		</div>
		<LockedPanel />
	{:else}
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
		</div>

		<footer class="post-actions">
			<IconButton
				path={likedByViewer ? mdiHeart : mdiHeartOutline}
				label={likedByViewer ? 'Unlike post' : 'Like post'}
				variant="ghost"
				tone={likedByViewer ? 'accent' : 'neutral'}
				count={likeCount}
				disabled={!canLike}
				onClick={handleLike}
			/>
			{#if commentsEnabled}
				<CommentToggle
					count={commentCount}
					expanded={showComments}
					onToggle={handleCommentToggle}
				/>
			{/if}
		</footer>

		<!-- Outside the action row on purpose: the panel spans the card's full width. -->
		{#if showComments && canOpenComments}
			<div class="post-comments">
				<CommentSection
					targetType="post"
					targetId={post.id}
					{isLoggedIn}
					onCountChange={(delta) => (countDelta += delta)}
				/>
			</div>
		{/if}
	{/if}
</article>

<style lang="scss">
	.post-card {
		position: relative;
		// No overflow clip: the comment overflow menu and the emoji picker are
		// descendants and would be cut off. Media clips itself in PostMediaGrid.
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

		// No hover lift: a post card isn't a single click target — it holds its own
		// buttons, thread and composer, so shifting the whole thing under the cursor
		// is noise (and the transform made it a stacking context that trapped popovers).

		&.is-locked {
			border-color: color-mix(in srgb, var(--primary) 42%, transparent);
		}
	}

	.post-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.post-actions {
		display: flex;
		align-items: center;
		// Each control already carries its own tap padding, so they read as a group
		// with only a hairline gap — a larger one leaves them floating apart.
		gap: var(--space-1);
	}

	.post-comments {
		margin-top: var(--space-3);
		padding-top: var(--space-4);
		border-top: 1px solid color-mix(in srgb, var(--border-primary) 55%, transparent);
	}

	.post-content {
		position: relative;
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

	.post-actions {
		justify-content: flex-end;
	}
</style>
