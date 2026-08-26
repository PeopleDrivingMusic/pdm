<script lang="ts">
	import { mdiLockOutline } from '@mdi/js';
	import SvgIcon from '../SvgIcon.svelte';

	let { label = 'Subscribe to unlock' }: { label?: string } = $props();
</script>

<!-- Purely informational — never a button. Absolutely positioned: place it inside a
     `position: relative` container so it overlays whatever sits beneath it. The
     actual subscribe action lives in whatever CTA the page already shows elsewhere;
     this is the same "locked" recipe reused everywhere (feed, posts, chat) so gated
     content always reads the same way. -->
<div class="lock-overlay">
	<SvgIcon path={mdiLockOutline} size={20} />
	<span>{label}</span>
</div>

<style lang="scss">
	.lock-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-4);
		background: color-mix(in srgb, var(--bg-primary) 70%, transparent);
		backdrop-filter: blur(16px);
		color: var(--text-primary);
		text-align: center;
		font-size: var(--font-size-sm);
		font-weight: 700;
	}
</style>
