<script lang="ts">
	let { message }: { message: string } = $props();
</script>

<p class="load-error">{message}</p>

<style lang="scss">
	.load-error {
		padding: var(--space-4);
		border: 1px dashed color-mix(in srgb, var(--error, #e5484d) 46%, transparent);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--bg-surface) 46%, transparent);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		text-align: center;
	}
</style>
