import { describe, it, expect, vi, beforeEach } from 'vitest';

type ConflictConfig = {
	target: unknown[];
	targetWhere?: unknown;
	setWhere?: unknown;
	set: Record<string, unknown>;
};

// Hoisted: a bare module-level const would still be in its temporal dead zone when the
// factory runs on first import of `$lib/db`. See ChatRepository.spec.ts. Each mock
// declares its parameter so `mock.calls[0][0]` is typed rather than an empty tuple.
const m = vi.hoisted(() => {
	const returning = vi.fn(async () => [{ id: 'artist-1' }]);
	const onConflictDoUpdate = vi.fn((_config: ConflictConfig) => ({ returning }));
	const values = vi.fn((_row: Record<string, unknown>) => ({ onConflictDoUpdate }));
	const insert = vi.fn((_table: unknown) => ({ values }));
	return { returning, onConflictDoUpdate, values, insert };
});

vi.mock('$lib/db', () => ({
	db: { insert: m.insert },
	withDbLogging: vi.fn(async (_name: string, fn: () => unknown) => fn())
}));

import { CatalogImportRepository } from './CatalogImportRepository';
import type { ImportedArtistRow, ImportedTrackRow } from './CatalogImportRepository';

const artistRow: ImportedArtistRow = {
	name: 'deadmau5',
	slug: 'deadmau5',
	avatar: 'https://cdn.example/a.jpg',
	coverImg: 'https://cdn.example/b.jpg',
	description: 'cube v3',
	socialLinks: { twitter: 'deadmau5' },
	origin: 'audius',
	externalId: 'LKdlD',
	externalUrl: 'https://audius.co/deadmau5'
};

const trackRow: ImportedTrackRow = {
	title: 'Nextra',
	duration: 61,
	audioUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
	imageUrl: 'https://cdn.example/t.jpg',
	genre: ['Electronic'],
	audioSource: 'audius',
	externalId: '7YmNr',
	metadata: { license: 'All rights reserved', isrc: 'GBTDG1302232' }
};

beforeEach(() => {
	vi.clearAllMocks();
	m.returning.mockResolvedValue([{ id: 'artist-1' }]);
});

describe('CatalogImportRepository.upsertArtist', () => {
	it('writes the artist with no owner and the source recorded', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		expect(m.values).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: null,
				origin: 'audius',
				externalId: 'LKdlD',
				externalUrl: 'https://audius.co/deadmau5',
				slug: 'deadmau5'
			})
		);
	});

	it('imports hidden, so no page can go public before slice S2b', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		expect(m.values).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
	});

	it('never sets claimedAt on import — that belongs to the claim flow', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		expect(m.values.mock.calls[0][0]).not.toHaveProperty('claimedAt');
	});

	it('re-imports into the same row by keying on origin and external id', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0];
		expect(conflict.target).toHaveLength(2);
	});

	it('matches the partial index, or Postgres raises 42P10', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0];
		expect(conflict.targetWhere).toBeDefined();
	});

	it('refuses to overwrite a claimed page', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0];
		expect(conflict.setWhere).toBeDefined();
	});

	it('refreshes mutable fields on re-import but never identity', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0];
		expect(Object.keys(conflict.set).sort()).toEqual(
			['avatar', 'coverImg', 'description', 'name', 'socialLinks', 'updatedAt'].sort()
		);
	});

	it('returns the row id so tracks can be parented', async () => {
		await expect(CatalogImportRepository.upsertArtist(artistRow)).resolves.toEqual({
			id: 'artist-1'
		});
	});

	it('returns null when setWhere suppressed the update on a claimed page', async () => {
		m.returning.mockResolvedValue([]);
		await expect(CatalogImportRepository.upsertArtist(artistRow)).resolves.toBeNull();
	});
});

describe('CatalogImportRepository.upsertTracks', () => {
	it('imports tracks unpublished, matching the hidden artist', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [trackRow]);
		expect(m.values).toHaveBeenCalledWith(
			expect.objectContaining({
				artistId: 'artist-1',
				audioSource: 'audius',
				externalId: '7YmNr',
				audioUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
				status: 'ready',
				isPublished: false,
				visibility: 'public'
			})
		);
	});

	it('keeps the licence and ISRC with the music', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [trackRow]);
		const row = m.values.mock.calls[0][0];
		expect(row.metadata).toEqual({ license: 'All rights reserved', isrc: 'GBTDG1302232' });
	});

	it('matches the partial index, or Postgres raises 42P10', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [trackRow]);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0];
		expect(conflict.targetWhere).toBeDefined();
	});

	it('updates from plain values, never a raw excluded reference', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [trackRow]);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0];
		expect(conflict.set.title).toBe('Nextra');
	});

	it('writes one statement per track', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [
			trackRow,
			{ ...trackRow, externalId: 'B2' }
		]);
		expect(m.values).toHaveBeenCalledTimes(2);
	});

	it('reports how many rows it wrote', async () => {
		await expect(CatalogImportRepository.upsertTracks('artist-1', [trackRow])).resolves.toEqual({
			imported: 1
		});
	});

	it('does not touch the database for an empty list', async () => {
		const result = await CatalogImportRepository.upsertTracks('artist-1', []);
		expect(m.insert).not.toHaveBeenCalled();
		expect(result).toEqual({ imported: 0 });
	});
});
