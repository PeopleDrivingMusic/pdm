<script lang="ts">
	import { mdiOpenInNew } from '@mdi/js';
	import { Link, SvgIcon } from '$lib/ui';
	import ClaimRequestModal from './ClaimRequestModal.svelte';

	let {
		externalUrl,
		isLoggedIn
	}: {
		externalUrl: string | null;
		isLoggedIn: boolean;
	} = $props();

	let showClaimModal = $state(false);

	// externalUrl has exactly one writer today (AudiusAdapter, always `https://audius.co/…`),
	// so this can't be tripped right now — but it's rendered into a `target="_blank"` href,
	// and re-checking the scheme at the point of render is the same defense S2a applied to
	// `audioUrl`: a future second source or writer that skips sanitising must not get to
	// decide what this anchor navigates to.
	const safeExternalUrl = $derived.by(() => {
		if (!externalUrl) return null;
		try {
			return new URL(externalUrl).protocol === 'https:' ? externalUrl : null;
		} catch {
			return null;
		}
	});
</script>

<div class="seeded-notice">
	<p class="notice-text">
		Fans brought this page to PDM from Audius. It's not the artist's own account yet.
	</p>
	<div class="notice-actions">
		{#if safeExternalUrl}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- safeExternalUrl is the artist's Audius profile (scheme-checked above), not a SvelteKit route; the rule can't trace that back to a literal to confirm it itself. -->
			<a class="attribution" href={safeExternalUrl} target="_blank" rel="noopener noreferrer">
				Music from Audius
				<SvgIcon path={mdiOpenInNew} size={12} />
			</a>
			<span class="divider" aria-hidden="true"></span>
		{/if}
		{#if isLoggedIn}
			<Link color="secondary" onclick={() => (showClaimModal = true)}>Claim this page</Link>
		{:else}
			<Link color="secondary" href="/login">Log in to claim this page</Link>
		{/if}
	</div>
</div>

<ClaimRequestModal bind:show={showClaimModal} />

<style lang="scss">
	// A caption, not an alert — sits right under the hero, sharing `.hero-content`'s own
	// horizontal padding so the notice lines up with the avatar/title above it instead of
	// reading as a separate block with its own, different margins. Can't live inside
	// `.hero` itself: `.hero-content` is `position: absolute; bottom: 0`, so a normal-flow
	// sibling after it would grow `.hero`'s height and push that whole block down with it.
	// Muted text, hairline, no fill: nothing here is actually wrong, it's provenance.
	.seeded-notice {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		// Clustered to the left, not spread across the full card width — `.hero-content`
		// above it is now a compact left-aligned block too, and pinning the actions to
		// the far right edge here broke that shared rhythm.
		justify-content: flex-start;
		gap: var(--space-2) var(--space-5);
		padding: var(--space-3) var(--space-6, 1.5rem) var(--space-4);
		border-top: 1px solid color-mix(in srgb, var(--border-primary) 40%, transparent);

		@media (max-width: 720px) {
			padding: var(--space-3) var(--space-4) var(--space-4);
		}
	}

	.notice-text {
		margin: 0;
		color: var(--text-tertiary);
		font-size: var(--font-size-xs);
	}

	.notice-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-shrink: 0;
	}

	.attribution {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--text-tertiary);
		font-size: var(--font-size-xs);
		text-decoration: underline;
		text-underline-offset: 2px;

		&:hover {
			color: var(--text-secondary);
		}
	}

	.divider {
		width: 1px;
		height: 12px;
		background: color-mix(in srgb, var(--border-primary) 60%, transparent);
	}

	// Matches `.attribution`'s muted tone — two links doing the same job (secondary,
	// provenance-adjacent) side by side must read at the same weight, not one dim and
	// one bright.
	:global(.seeded-notice .notice-actions .link) {
		font-size: var(--font-size-xs);
		color: var(--text-tertiary);
	}

	:global(.seeded-notice .notice-actions .link:hover) {
		color: var(--text-secondary);
	}
</style>
