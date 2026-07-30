import { describe, it, expect } from 'vitest';
import { toTrackDTO, toAlbumDTO, toTrackStatsDTO } from './dto';

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
	visibility: 'subscribers',
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
		expect(dto.visibility).toBe('subscribers');
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
	it('maps null optionals and set albumId/trackNumber', () => {
		const dto = toTrackDTO({
			...baseTrack,
			duration: null,
			audioUrl: null,
			imageUrl: null,
			albumId: 'al1',
			trackNumber: 5,
			isPublished: false
		});
		expect(dto.duration).toBeNull();
		expect(dto.audioKey).toBeNull();
		expect(dto.imageKey).toBeNull();
		expect(dto.albumId).toBe('al1');
		expect(dto.trackNumber).toBe(5);
		expect(dto.isPublished).toBe(false);
	});
});

describe('toTrackStatsDTO', () => {
	it('returns null for missing stats', () => {
		expect(toTrackStatsDTO(null)).toBeNull();
	});
	it('defaults undefined counts to zero', () => {
		expect(toTrackStatsDTO({ trackId: 't1' } as any)).toEqual({
			playCount: 0,
			likeCount: 0,
			saveCount: 0
		});
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
