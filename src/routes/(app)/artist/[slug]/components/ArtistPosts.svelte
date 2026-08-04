<script lang="ts">
	import type { PageData } from '../$types';
	import PostMusicAttachment from '$lib/ui/components/PostMusicAttachment.svelte';
	import PostCard from '$lib/ui/components/PostCard/PostCard.svelte';
	import ContentSkeleton from './ContentSkeleton.svelte';
	import LoadError from './LoadError.svelte';

	let {
		artist,
		tracks,
		albums,
		content
	}: {
		artist: PageData['artist'];
		tracks: PageData['tracks'];
		albums: PageData['albums'];
		content: PageData['content'];
	} = $props();
</script>

{#await albums}
	<div class="skeleton-stack">
		<ContentSkeleton kind="card" count={3} />
	</div>
{:then albumsResolved}
	{@const albumMap = new Map(albumsResolved.map((album) => [album.id, album]))}
	{#await tracks}
		<div class="skeleton-stack">
			<ContentSkeleton kind="card" count={3} />
		</div>
	{:then tracksResolved}
		{@const trackMap = new Map(tracksResolved.map((t) => [t.track.id, t]))}
		{#await content}
			<div class="skeleton-stack">
				<ContentSkeleton kind="card" count={3} />
			</div>
		{:then contentResolved}
			{#if contentResolved.posts.length}
				<div class="posts-list">
					{#each contentResolved.posts as post (post.id)}
						{#snippet music()}
							{#each post.musicAttachments as item}
								{@const trackEntry = item.type === 'track' ? trackMap.get(item.id) : undefined}
								<PostMusicAttachment
									attachment={item}
									{trackEntry}
									artist={artist ?? null}
									album={trackEntry?.track.albumId ? albumMap.get(trackEntry.track.albumId) : null}
									locked={trackEntry?.locked ?? false}
								/>
							{/each}
						{/snippet}
						<PostCard
							{post}
							author={{ name: artist.name, avatar: artist.avatar }}
							music={post.musicAttachments.length ? music : undefined}
						/>
					{/each}
				</div>
			{:else}
				<div class="empty-state">No posts yet.</div>
			{/if}
		{:catch}
			<LoadError message="Couldn't load posts. Refresh to try again." />
		{/await}
	{:catch}
		<LoadError message="Couldn't load tracks. Refresh to try again." />
	{/await}
{:catch}
	<LoadError message="Couldn't load albums. Refresh to try again." />
{/await}

<style lang="scss">
	.skeleton-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.empty-state {
		padding: var(--space-6);
		border: 1px dashed color-mix(in srgb, var(--border-primary) 58%, transparent);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--bg-surface) 46%, transparent);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		text-align: center;
	}
</style>
