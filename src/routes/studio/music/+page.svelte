<script lang="ts">
	import MusicCatalogShell from './components/MusicCatalogShell.svelte';

	let { data } = $props();
</script>

<MusicCatalogShell {data} />
