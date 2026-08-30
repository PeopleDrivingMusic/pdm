import { it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	ArtistService: { getArtistBySlug: vi.fn() },
	AlbumService: { getAlbumsByArtist: vi.fn().mockResolvedValue([]) },
	TrackService: { getTracksByArtist: vi.fn().mockResolvedValue([]) }
}));
vi.mock('$lib/db/services/ContentService', () => ({
	ArtistPublicContentService: { getArtistContent: vi.fn().mockResolvedValue({}) },
	PostPollService: { vote: vi.fn() }
}));
vi.mock('$lib/server/entitlement', () => ({
	EntitlementService: { isSubscriberOf: vi.fn().mockResolvedValue(false) }
}));

import { ArtistService } from '$lib/db/queries';
import { load } from './+page.server';

const artist = (over = {}) => ({
	id: 'a1',
	slug: 'deadmau5',
	name: 'deadmau5',
	userId: 'owner1',
	origin: 'native',
	isActive: true,
	...over
});

const call = () => (load as any)({ params: { slug: 'deadmau5' }, locals: { user: null } });

beforeEach(() => {
	vi.clearAllMocks();
});

it('renders a native artist page', async () => {
	vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(artist() as never);
	await expect(call()).resolves.toMatchObject({ artist: { slug: 'deadmau5' } });
});

it('404s an imported artist — S1 seeds rows, S2b builds the page that may show them', async () => {
	// Without this gate the route serves a real person's name, avatar and bio under a
	// Subscribe CTA with no "unofficial account" notice. `isActive: false` does NOT
	// protect this route: it loads purely by slug.
	vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(
		artist({ origin: 'audius', userId: null, isActive: false }) as never
	);
	await expect(call()).rejects.toMatchObject({ status: 404 });
});

it('404s an imported artist even once it is claimed, until S2b ships', async () => {
	vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(
		artist({ origin: 'audius', claimedAt: new Date(), isActive: true }) as never
	);
	await expect(call()).rejects.toMatchObject({ status: 404 });
});

it('404s a slug that matches no artist', async () => {
	vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(undefined);
	await expect(call()).rejects.toMatchObject({ status: 404 });
});
