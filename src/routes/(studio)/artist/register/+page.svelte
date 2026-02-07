<script lang="ts">
    import type { PageProps } from './$types';
	import ArtistRegisterPage from './ArtistRegisterPage.svelte';

    let { data }: PageProps = $props();
</script>

<ArtistRegisterPage />