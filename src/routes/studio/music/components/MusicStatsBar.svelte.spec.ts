import { page } from '@vitest/browser/context';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MusicStatsBar from './MusicStatsBar.svelte';

test('renders the subscriber-only stat', async () => {
	render(MusicStatsBar, {
		stats: {
			totalAlbums: 1,
			totalTracks: 2,
			publishedTracks: 1,
			draftTracks: 1,
			subscribersOnly: 1,
			totalPlays: 10,
			totalLikes: 3,
			totalSaves: 2
		}
	});
	await expect.element(page.getByText('Subscriber-only')).toBeInTheDocument();
});
