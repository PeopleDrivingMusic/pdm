<script lang="ts">
	import PostCard from '$lib/ui/components/PostCard/PostCard.svelte';
	import { previewAuthor, previewVariations } from './fixtures';

	const widths = [
		{ id: 'phone', label: 'Phone · 390px', width: 390 },
		{ id: 'web', label: 'Web · 640px', width: 640 }
	];
</script>

<svelte:head>
	<title>Post preview · dev</title>
</svelte:head>

{#snippet musicChip()}
	<div class="music-chip">
		<span class="music-chip__dot"></span>
		<div>
			<div class="music-chip__title">Midnight Drive</div>
			<div class="music-chip__meta">Track · 3:24</div>
		</div>
	</div>
{/snippet}

<div class="preview">
	<header class="preview__head">
		<p class="eyebrow">Dev harness</p>
		<h1>Post rendering — static variations</h1>
		<p class="lede">
			Every post shape rendered by the shared <code>PostCard</code> on static data, at phone and web
			widths. Not a shipped page.
		</p>
	</header>

	{#each previewVariations as variation (variation.post.id)}
		<section class="variation" data-variation={variation.post.id}>
			<h2>{variation.label}</h2>
			<div class="widths">
				{#each widths as w (w.id)}
					<div class="frame" data-width={w.id}>
						<span class="frame__label">{w.label}</span>
						<div class="frame__body" style:max-width={`${w.width}px`}>
							<PostCard
								post={variation.post}
								author={previewAuthor}
								music={variation.hasMusic ? musicChip : undefined}
							/>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style lang="scss">
	.preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-7);
		padding: var(--space-6) 0 var(--space-8);
	}

	.preview__head {
		h1 {
			margin: var(--space-1) 0;
			color: var(--text-primary);
			font-size: var(--font-size-2xl);
		}

		.lede {
			margin: 0;
			max-width: 60ch;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
		}

		code {
			padding: 0 var(--space-1);
			border-radius: var(--radius-sm);
			background: var(--bg-tertiary);
			font-size: 0.9em;
		}
	}

	.eyebrow {
		margin: 0;
		color: var(--primary);
		font-size: var(--font-size-xs);
		font-weight: 700;
		text-transform: uppercase;
	}

	.variation {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);

		h2 {
			margin: 0;
			color: var(--text-primary);
			font-size: var(--font-size-lg);
		}
	}

	.widths {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-5);
		align-items: flex-start;
	}

	.frame {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
		flex: 1 1 320px;
	}

	.frame__label {
		color: var(--text-tertiary);
		font-size: var(--font-size-xs);
		font-weight: 700;
		text-transform: uppercase;
	}

	.frame__body {
		width: 100%;
	}

	.music-chip {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		border: 1px solid color-mix(in srgb, var(--border-primary) 70%, transparent);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--bg-primary) 28%, var(--bg-surface));

		&__dot {
			width: 40px;
			height: 40px;
			border-radius: var(--radius-sm);
			background: linear-gradient(
				135deg,
				var(--primary),
				color-mix(in srgb, var(--primary) 40%, #000)
			);
		}

		&__title {
			color: var(--text-primary);
			font-size: var(--font-size-sm);
			font-weight: 700;
		}

		&__meta {
			color: var(--text-tertiary);
			font-size: var(--font-size-xs);
		}
	}
</style>
