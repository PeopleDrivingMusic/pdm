<script lang="ts">
	import { Input, Select } from '$lib/ui';

	const visibilityOptions = [
		{ label: 'Public', value: 'public' },
		{ label: 'Followers', value: 'followers' },
		{ label: 'Subscribers', value: 'subscribers' },
		{ label: 'Investors', value: 'investors' }
	];

	const statusOptions = [
		{ label: 'Publish now', value: 'published' },
		{ label: 'Schedule', value: 'scheduled' },
		{ label: 'Draft', value: 'draft' }
	];

	interface Props {
		status?: string;
		visibility?: string;
		prefix?: string;
	}

	let {
		status = $bindable('published'),
		visibility = $bindable('public'),
		prefix = ''
	}: Props = $props();
	const scheduledName = $derived(prefix ? `${prefix}ScheduledAt` : 'scheduledAt');
</script>

<aside class="publish-panel">
	<h2>Publish settings</h2>
	<Select label="Status" name="status" options={statusOptions} bind:value={status} />
	<Select
		label="Visibility"
		name="visibility"
		options={visibilityOptions}
		bind:value={visibility}
	/>

	{#if status === 'scheduled'}
		<Input type="datetime-local" label="Schedule date" name={scheduledName} required />
	{/if}
</aside>

<style lang="scss">
	.publish-panel {
		display: grid;
		gap: var(--space-4);

		h2 {
			margin: 0;
			color: var(--text-primary);
			font-size: var(--font-size-md);
		}
	}
</style>
