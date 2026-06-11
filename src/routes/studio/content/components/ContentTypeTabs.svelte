<script lang="ts">
	import { Tabs } from '$lib/ui';

	export type ContentTabId = 'all' | 'post' | 'photo_album' | 'video' | 'scheduled' | 'draft';

	const tabs: Array<{ id: ContentTabId; label: string }> = [
		{ id: 'all', label: 'All' },
		{ id: 'post', label: 'Posts' },
		{ id: 'photo_album', label: 'Photos' },
		{ id: 'video', label: 'Videos' },
		{ id: 'scheduled', label: 'Scheduled' },
		{ id: 'draft', label: 'Drafts' }
	];

	interface Props {
		activeTab?: { id: ContentTabId; label: string };
		onTabChange?: (tab: { id: ContentTabId; label: string }) => void;
	}

	let {
		activeTab = $bindable(tabs[0] as { id: ContentTabId; label: string }),
		onTabChange
	}: Props = $props();
</script>

<div class="content-tabs">
	<Tabs
		{tabs}
		bind:activeTab
		type="button"
		onTabChange={(tab) => onTabChange?.(tab as { id: ContentTabId; label: string })}
	/>
</div>

<style lang="scss">
	.content-tabs {
		margin-bottom: var(--space-4);
		max-width: 760px;
	}
</style>
