import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	AlbumService: { getAlbumsByArtist: vi.fn(), getAlbumById: vi.fn() },
	TrackService: { getTracksByArtistForStudio: vi.fn(), getTrackById: vi.fn() },
	GenreService: { getAllGenres: vi.fn() },
	AlbumTrackService: { getAlbumTracksByArtist: vi.fn() }
}));

import { AlbumService, TrackService, GenreService, AlbumTrackService } from '$lib/db/queries';
import { MusicApplicationService, MusicAccessError } from './MusicApplicationService';

const d = new Date('2026-06-30T00:00:00Z');
const track = (over = {}) => ({
	id: 't1',
	albumId: null,
	artistId: 'a1',
	title: 'S',
	duration: 100,
	audioUrl: null,
	lyrics: null,
	clipUrl: null,
	imageUrl: null,
	trackNumber: null,
	genre: [],
	status: 'uploaded',
	isPublished: true,
	visibility: 'subscribers',
	contentId: null,
	metadata: null,
	createdAt: d,
	updatedAt: d,
	...over
});

beforeEach(() => vi.clearAllMocks());

describe('getStudioOverview', () => {
	it('aggregates DTOs and computes stats incl. subscribersOnly', async () => {
		(AlbumService.getAlbumsByArtist as any).mockResolvedValue([]);
		(TrackService.getTracksByArtistForStudio as any).mockResolvedValue([
			{ track: track(), stats: { trackId: 't1', playCount: 5, likeCount: 2, saveCount: 1 } }
		]);
		(GenreService.getAllGenres as any).mockResolvedValue([]);
		(AlbumTrackService.getAlbumTracksByArtist as any).mockResolvedValue([]);

		const overview = await MusicApplicationService.getStudioOverview('a1');
		expect(overview.stats.totalTracks).toBe(1);
		expect(overview.stats.subscribersOnly).toBe(1);
		expect(overview.stats.totalPlays).toBe(5);
		expect(overview.tracks[0].track.audioKey).toBeNull();
		expect('metadata' in overview.tracks[0].track).toBe(false);
	});
});

describe('assertTrackOwned', () => {
	it('returns the track when owned', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		await expect(MusicApplicationService.assertTrackOwned('a1', 't1')).resolves.toMatchObject({
			id: 't1'
		});
	});
	it('throws MusicAccessError when not owned', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track({ artistId: 'other' }));
		await expect(MusicApplicationService.assertTrackOwned('a1', 't1')).rejects.toBeInstanceOf(
			MusicAccessError
		);
	});
	it('throws MusicAccessError when missing', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(undefined);
		await expect(MusicApplicationService.assertTrackOwned('a1', 't1')).rejects.toBeInstanceOf(
			MusicAccessError
		);
	});
});
