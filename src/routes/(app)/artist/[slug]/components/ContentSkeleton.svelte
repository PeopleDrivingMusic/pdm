<script lang="ts">
	let { kind, count }: { kind: 'track' | 'album' | 'card'; count: number } = $props();
</script>

{#each Array(count) as _}
	<div class="{kind}-skeleton" aria-hidden="true"></div>
{/each}

<style lang="scss">
	@keyframes skeleton-shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	.track-skeleton,
	.album-skeleton,
	.card-skeleton {
		border-radius: var(--radius-lg);
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--bg-surface) 70%, transparent) 25%,
			color-mix(in srgb, var(--bg-tertiary) 90%, transparent) 50%,
			color-mix(in srgb, var(--bg-surface) 70%, transparent) 75%
		);
		background-size: 200% 100%;
		animation: skeleton-shimmer 1.4s ease-in-out infinite;
	}

	.track-skeleton {
		height: 72px;
	}

	.album-skeleton {
		height: 220px;
	}

	.card-skeleton {
		height: 96px;
	}
</style>
