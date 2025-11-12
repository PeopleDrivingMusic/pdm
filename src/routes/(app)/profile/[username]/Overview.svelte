<script lang="ts">
	import { StatCard } from '$lib/ui';
	import {
		mdiMusic,
		mdiMusicNote,
		mdiPlaylistMusic,
		mdiClockOutline,
		mdiHeart,
		mdiHeadphones
	} from '@mdi/js';

	// Stats data with MDI icons
	const stats = [
		{
			label: 'Following Artists',
			value: 127,
			icon: mdiMusic,
			description: 'Artists you follow'
		},
		{
			label: 'Subscribed Artists',
			value: 89,
			icon: mdiMusicNote,
			description: 'Premium subscriptions'
		},
		{
			label: 'Playlists',
			value: 12,
			icon: mdiPlaylistMusic,
			description: 'Created playlists'
		},
		{
			label: 'Listen Duration',
			value: '245h',
			icon: mdiClockOutline,
			description: 'Total listening time'
		},
		{
			label: 'Favorite Artist',
			value: 'Metallica',
			icon: mdiHeart,
			description: 'Saved artists'
		},
		{
			label: 'Now Listening',
			value: 'Metallica - Enter Sandman',
			icon: mdiHeadphones,
			description: 'Active sessions'
		}
	];
</script>

<div class="profile-stats">
	{#each stats as stat (stat.label)}
		<StatCard
			label={stat.label}
			value={stat.value}
			icon={stat.icon}
			description={stat.description}
		/>
	{/each}
</div>

<style lang="scss">
	.profile-stats {
        width: 100%;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
		padding: 0 var(--space-6);
	}
</style>
