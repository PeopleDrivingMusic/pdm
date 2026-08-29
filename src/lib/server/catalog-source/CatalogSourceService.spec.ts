import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./adapters/AudiusAdapter', () => ({
	AudiusAdapter: { searchArtists: vi.fn(), getArtist: vi.fn(), listTracks: vi.fn() }
}));
vi.mock('$lib/db/services/CatalogImportRepository', () => ({
	CatalogImportRepository: { upsertArtist: vi.fn(), upsertTracks: vi.fn() }
}));
vi.mock('$lib/db/queries', () => ({ ArtistService: { getArtistBySlug: vi.fn() } }));
vi.mock('$lib/utils/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn() } }));

import { AudiusAdapter } from './adapters/AudiusAdapter';
import { CatalogImportRepository } from '$lib/db/services/CatalogImportRepository';
import { ArtistService } from '$lib/db/queries';
import { logger } from '$lib/utils/logger';
import { CatalogSourceService } from './CatalogSourceService';
import type { ExternalArtist, ExternalTrack } from './types';

const verified: ExternalArtist = {
	source: 'audius',
	externalId: 'LKdlD',
	handle: 'deadmau5',
	name: 'deadmau5',
	bio: 'cube v3',
	avatarUrl: 'https://cdn.example/a.jpg',
	bannerUrl: 'https://cdn.example/b.jpg',
	externalUrl: 'https://audius.co/deadmau5',
	socials: { twitter: 'deadmau5' },
	followerCount: 94917,
	trackCount: 9,
	isVerified: true,
	isDeactivated: false,
	walletAddress: '0xabc'
};

const impostor: ExternalArtist = {
	...verified,
	externalId: 'D8OGl',
	handle: 'deadmau54321',
	followerCount: 704,
	isVerified: false,
	walletAddress: null
};

const track: ExternalTrack = {
	source: 'audius',
	externalId: '7YmNr',
	title: 'Nextra',
	durationSeconds: 61,
	genre: 'Electronic',
	imageUrl: null,
	streamUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
	releaseDate: null,
	playCount: 1,
	license: null,
	isrc: null
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(CatalogImportRepository.upsertArtist).mockResolvedValue({ id: 'artist-1' });
	vi.mocked(CatalogImportRepository.upsertTracks).mockResolvedValue({ imported: 1 });
	vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(undefined);
	vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(verified);
	vi.mocked(AudiusAdapter.listTracks).mockResolvedValue([track]);
});

describe('CatalogSourceService.lookupArtist', () => {
	it('returns every candidate so a human decides, never picking one', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified, impostor]);
		const found = await CatalogSourceService.lookupArtist('deadmau5');
		expect(found.map((c) => c.externalId)).toEqual(['LKdlD', 'D8OGl']);
	});

	it('surfaces the signals a human needs to tell them apart', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified]);
		const [first] = await CatalogSourceService.lookupArtist('deadmau5');
		expect(first).toEqual({
			externalId: 'LKdlD',
			handle: 'deadmau5',
			name: 'deadmau5',
			followerCount: 94917,
			trackCount: 9,
			isVerified: true,
			externalUrl: 'https://audius.co/deadmau5'
		});
	});

	it('writes nothing — lookup is read-only', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified]);
		await CatalogSourceService.lookupArtist('deadmau5');
		expect(CatalogImportRepository.upsertArtist).not.toHaveBeenCalled();
	});
});

describe('CatalogSourceService.importArtist resolution', () => {
	it('resolves the id through the id endpoint, never through search', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		expect(AudiusAdapter.getArtist).toHaveBeenCalledWith('LKdlD');
		expect(AudiusAdapter.searchArtists).not.toHaveBeenCalled();
	});

	it('refuses an id the source does not know, rather than guessing', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(null);
		await expect(CatalogSourceService.importArtist('NOPE')).resolves.toEqual({
			ok: false,
			reason: 'not_found'
		});
	});
});

describe('CatalogSourceService.importArtist gates', () => {
	it('refuses an unverified artist by default', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(impostor);
		await expect(CatalogSourceService.importArtist('D8OGl')).resolves.toEqual({
			ok: false,
			reason: 'unverified'
		});
	});

	it('imports an unverified artist when an admin overrides on purpose', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(impostor);
		const result = await CatalogSourceService.importArtist('D8OGl', { allowUnverified: true });
		expect(result).toMatchObject({ ok: true });
	});

	it('logs the override, because it weakens the impostor defence', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(impostor);
		await CatalogSourceService.importArtist('D8OGl', { allowUnverified: true });
		expect(logger.warn).toHaveBeenCalled();
	});

	it('refuses a deactivated account', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue({ ...verified, isDeactivated: true });
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: false,
			reason: 'deactivated'
		});
	});

	it('refuses an artist whose tracks are all unplayable', async () => {
		vi.mocked(AudiusAdapter.listTracks).mockResolvedValue([]);
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: false,
			reason: 'no_tracks'
		});
	});

	it('refuses when the slug is already taken by a different artist', async () => {
		vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue({
			id: 'other',
			origin: 'native',
			externalId: null
		} as never);
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: false,
			reason: 'slug_taken'
		});
	});

	it('allows re-import when the slug belongs to this same source artist', async () => {
		vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue({
			id: 'artist-1',
			origin: 'audius',
			externalId: 'LKdlD'
		} as never);
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toMatchObject({ ok: true });
	});

	it('refuses to re-import a page the artist has already claimed', async () => {
		vi.mocked(CatalogImportRepository.upsertArtist).mockResolvedValue(null);
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: false,
			reason: 'already_claimed'
		});
	});

	it('writes nothing when a gate refuses', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(impostor);
		await CatalogSourceService.importArtist('D8OGl');
		expect(CatalogImportRepository.upsertArtist).not.toHaveBeenCalled();
		expect(CatalogImportRepository.upsertTracks).not.toHaveBeenCalled();
	});
});

describe('CatalogSourceService.importArtist success path', () => {
	it('derives a stable slug from the source handle', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		expect(CatalogImportRepository.upsertArtist).toHaveBeenCalledWith(
			expect.objectContaining({ slug: 'deadmau5', origin: 'audius', externalId: 'LKdlD' })
		);
	});

	it('maps the DTO onto a plain row — no DTO reaches the DB layer', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		const row = vi.mocked(CatalogImportRepository.upsertArtist).mock.calls[0][0];
		expect(row).not.toHaveProperty('source');
		expect(row).toMatchObject({ socialLinks: { twitter: 'deadmau5' } });
	});

	it('parents the tracks to the row the repository returned', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		expect(CatalogImportRepository.upsertTracks).toHaveBeenCalledWith('artist-1', [
			expect.objectContaining({ externalId: '7YmNr', audioSource: 'audius' })
		]);
	});

	it('reports what it wrote', async () => {
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: true,
			artistId: 'artist-1',
			slug: 'deadmau5',
			tracksImported: 1
		});
	});
});
