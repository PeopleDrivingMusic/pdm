<script lang="ts">
	let {
		value = 0,
		max = 100,
		label,
		state = 'active',
		indeterminate = false
	}: {
		value?: number;
		max?: number;
		label: string;
		state?: 'active' | 'done' | 'failed';
		indeterminate?: boolean;
	} = $props();

	const pct = $derived(Math.max(0, Math.min(100, (value / max) * 100)));
</script>

<div
	class="progress-bar {state}"
	class:indeterminate
	role="progressbar"
	aria-label={label}
	aria-valuemin={indeterminate ? undefined : 0}
	aria-valuemax={indeterminate ? undefined : max}
	aria-valuenow={indeterminate ? undefined : Math.round(value)}
>
	<span class="fill" style={indeterminate ? '' : `width:${pct}%`}></span>
</div>

<style lang="scss">
	.progress-bar {
		position: relative;
		height: 6px;
		width: 100%;
		border-radius: var(--radius-full);
		background: var(--upload-track-bg);
		overflow: hidden;

		.fill {
			position: absolute;
			inset: 0 auto 0 0;
			background: var(--upload-progress);
			border-radius: inherit;
			transition: width var(--duration-normal) ease;
		}
		&.done .fill {
			background: var(--upload-progress-done);
		}
		&.failed .fill {
			width: 100% !important;
			background: var(--upload-failed);
		}
		&.indeterminate .fill {
			width: 40%;
			animation: indeterminate 1.2s ease-in-out infinite;
		}
	}
	@keyframes indeterminate {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(350%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.progress-bar.indeterminate .fill {
			animation: none;
			width: 100%;
		}
	}
</style>
