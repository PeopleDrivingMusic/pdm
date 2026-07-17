<script lang="ts">
	import ContentShell from './components/ContentShell.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
		form?: { error?: string; success?: boolean } | null;
	}

	let { data, form }: Props = $props();
</script>

<svelte:head>
	<title>Studio Content - PDM</title>
</svelte:head>

<ContentShell {data} {form} />
