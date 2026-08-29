import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudiusAdapter } from './AudiusAdapter';
import users from './fixtures/users-search-deadmau5.json';
import oneUser from './fixtures/user-LKdlD.json';
import tracks from './fixtures/user-tracks-LKdlD.json';

function mockFetch(body: unknown, status = 200) {
	// Typed with fetch's own first parameter so `mock.calls[0][0]` is the requested URL
	// rather than an empty tuple.
	return vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify(body), { status }));
}

function lastUrl(): string {
	const fetchMock = globalThis.fetch as unknown as ReturnType<typeof mockFetch>;
	return String(fetchMock.mock.calls[0][0]);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('AudiusAdapter.searchArtists', () => {
	beforeEach(() => vi.stubGlobal('fetch', mockFetch(users)));

	it('maps a user onto our shape without leaking Audius field names', async () => {
		const [first] = await AudiusAdapter.searchArtists('deadmau5');
		expect(first).toMatchObject({
			source: 'audius',
			externalId: 'LKdlD',
			handle: 'deadmau5',
			name: 'deadmau5',
			externalUrl: 'https://audius.co/deadmau5',
			isVerified: true,
			isDeactivated: false,
			walletAddress: '0x8aada2f1b43f4a36edea369dc01ed30abb9df9cd'
		});
	});

	it('picks the largest artwork and never the mirrors array', async () => {
		const [first] = await AudiusAdapter.searchArtists('deadmau5');
		expect(first.bannerUrl).toMatch(/2000x\.jpg$/);
		expect(first.avatarUrl).toMatch(/1000x1000\.jpg$/);
	});

	it('carries the social handles the artist published', async () => {
		const [first] = await AudiusAdapter.searchArtists('deadmau5');
		expect(first.socials).toEqual({ twitter: 'deadmau5', instagram: 'deadmau5' });
	});

	it('returns the impostor too, rather than silently picking a winner', async () => {
		const found = await AudiusAdapter.searchArtists('deadmau5');
		expect(found.map((a) => a.externalId)).toEqual(['LKdlD', 'D8OGl']);
	});

	it('survives a user with no pictures and no wallet', async () => {
		const found = await AudiusAdapter.searchArtists('deadmau5');
		expect(found[1]).toMatchObject({
			avatarUrl: null,
			bannerUrl: null,
			walletAddress: null,
			isVerified: false,
			socials: {}
		});
	});

	it('sends app_name so Audius can attribute the traffic', async () => {
		await AudiusAdapter.searchArtists('deadmau5');
		expect(lastUrl()).toContain('app_name=PDM');
	});

	it('raises a typed error when the source is unreachable', async () => {
		vi.stubGlobal('fetch', mockFetch('nope', 503));
		await expect(AudiusAdapter.searchArtists('deadmau5')).rejects.toThrow(
			'audius: users/search failed with 503'
		);
	});
});

describe('AudiusAdapter.getArtist', () => {
	it('reads a single-object response, not an array', async () => {
		vi.stubGlobal('fetch', mockFetch(oneUser));
		const found = await AudiusAdapter.getArtist('LKdlD');
		expect(found).toMatchObject({ externalId: 'LKdlD', handle: 'deadmau5' });
	});

	it('asks the id endpoint, never search — search does not match ids', async () => {
		vi.stubGlobal('fetch', mockFetch(oneUser));
		await AudiusAdapter.getArtist('LKdlD');
		expect(lastUrl()).toContain('/users/LKdlD');
		expect(lastUrl()).not.toContain('search');
	});

	it('returns null for an unknown id rather than guessing', async () => {
		vi.stubGlobal('fetch', mockFetch({ data: null }, 404));
		await expect(AudiusAdapter.getArtist('NOPE')).resolves.toBeNull();
	});
});

describe('AudiusAdapter.listTracks', () => {
	beforeEach(() => vi.stubGlobal('fetch', mockFetch(tracks)));

	it('maps a playable track and stores the STABLE stream endpoint', async () => {
		const [first] = await AudiusAdapter.listTracks('LKdlD');
		expect(first).toEqual({
			source: 'audius',
			externalId: '7YmNr',
			title: 'deadmau5 - Nextra (Stem Drop)',
			durationSeconds: 61,
			genre: 'Electronic',
			imageUrl: expect.stringMatching(/1000x1000\.jpg$/),
			streamUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
			releaseDate: new Date('2021-05-11T15:05:00Z'),
			playCount: 106778,
			license: 'All rights reserved',
			isrc: 'GBTDG1302232'
		});
	});

	it('never stores a signed URL, which would 403 the next day', async () => {
		const [first] = await AudiusAdapter.listTracks('LKdlD');
		expect(first.streamUrl).not.toContain('signature');
	});

	it('keeps only the one playable track from the fixture', async () => {
		const found = await AudiusAdapter.listTracks('LKdlD');
		expect(found.map((t) => t.externalId)).toEqual(['7YmNr']);
	});
});

describe('AudiusAdapter.toExternalTrack gates', () => {
	const playable = {
		id: 'X1',
		title: 'T',
		duration: 10,
		is_streamable: true,
		is_available: true,
		is_stream_gated: false,
		is_unlisted: false,
		is_delete: false,
		access: { stream: true }
	};

	it('accepts a track with every flag in the right state', () => {
		expect(AudiusAdapter.toExternalTrack(playable)).not.toBeNull();
	});

	it.each([
		['is_streamable false', { is_streamable: false }],
		['is_available false', { is_available: false }],
		['access.stream false', { access: { stream: false } }],
		['is_stream_gated true', { is_stream_gated: true }],
		['is_unlisted true', { is_unlisted: true }],
		['is_delete true', { is_delete: true }]
	])('rejects a track with %s', (_label, override) => {
		expect(AudiusAdapter.toExternalTrack({ ...playable, ...override })).toBeNull();
	});

	it('drops a play count the artist chose to hide', () => {
		const hidden = { ...playable, play_count: 5, field_visibility: { play_count: false } };
		expect(AudiusAdapter.toExternalTrack(hidden)?.playCount).toBeNull();
	});

	it('drops a genre the artist chose to hide', () => {
		const hidden = { ...playable, genre: 'Electronic', field_visibility: { genre: false } };
		expect(AudiusAdapter.toExternalTrack(hidden)?.genre).toBeNull();
	});

	it('tolerates every optional field being absent', () => {
		expect(AudiusAdapter.toExternalTrack(playable)).toMatchObject({
			genre: null,
			imageUrl: null,
			releaseDate: null,
			playCount: null,
			license: null,
			isrc: null
		});
	});
});
