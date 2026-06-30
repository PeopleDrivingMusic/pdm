import { describe, it, expect } from 'vitest';
import { toTrackDTO, toAlbumDTO } from './dto';

const baseTrack = {
	id: 't1',
	albumId: null,
	artistId: 'a1',
	title: 'Song',
	duration: 120,
	audioUrl: 'a1/tracks/t1/source.mp3',
	lyrics: null,
	clipUrl: null,
	imageUrl: 'a1/tracks/t1/cover.jpg',
	trackNumber: null,
	genre: ['rock'],
	status: 'uploaded',
	isPublished: true,
	visibility: 'subscribers_only',
	contentId: null,
	metadata: { upload: { secret: 1 } },
	createdAt: new Date('2026-06-30T00:00:00Z'),
	updatedAt: new Date('2026-06-30T00:00:00Z')
} as any;

describe('toTrackDTO', () => {
	it('maps keys and never leaks audioUrl/metadata', () => {
		const dto = toTrackDTO(baseTrack);
		expect(dto.audioKey).toBe('a1/tracks/t1/source.mp3');
		expect(dto.imageKey).toBe('a1/tracks/t1/cover.jpg');
		expect(dto.visibility).toBe('subscribers_only');
		expect(dto.genres).toEqual(['rock']);
		expect('audioUrl' in dto).toBe(false);
		expect('metadata' in dto).toBe(false);
	});
	it('coerces an unknown visibility to public', () => {
		expect(toTrackDTO({ ...baseTrack, visibility: 'weird' }).visibility).toBe('public');
	});
	it('defaults missing genres to an empty array', () => {
		expect(toTrackDTO({ ...baseTrack, genre: null }).genres).toEqual([]);
	});
});

describe('toAlbumDTO', () => {
	it('maps coverImageUrl to coverImageKey and keeps visibility', () => {
		const dto = toAlbumDTO({
			id: 'al1',
			artistId: 'a1',
			title: 'Album',
			description: null,
			coverImageUrl: 'a1/albums/al1/cover.jpg',
			releaseDate: null,
			price: null,
			isPublished: false,
			visibility: 'public',
			genres: ['pop'],
			metadata: null,
			createdAt: new Date('2026-06-30T00:00:00Z'),
			updatedAt: new Date('2026-06-30T00:00:00Z')
		} as any);
		expect(dto.coverImageKey).toBe('a1/albums/al1/cover.jpg');
		expect(dto.visibility).toBe('public');
		expect('metadata' in dto).toBe(false);
	});
});
