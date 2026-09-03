import { describe, it, expect, vi, beforeEach } from 'vitest';

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
vi.mock('$lib/db/services/ClaimRequestService', () => ({
	ClaimRequestService: { create: vi.fn() }
}));

import { ArtistService } from '$lib/db/queries';
import { ClaimRequestService } from '$lib/db/services/ClaimRequestService';
import { load, actions } from './+page.server';

const artist = (over = {}) => ({
	id: 'a1',
	slug: 'deadmau5',
	name: 'deadmau5',
	userId: 'owner1',
	origin: 'native',
	isActive: true,
	claimedAt: null,
	externalUrl: null,
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

it('renders a seeded artist page instead of 404ing, now that S2b builds it', async () => {
	vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(
		artist({ origin: 'audius', userId: null, isActive: true }) as never
	);
	await expect(call()).resolves.toMatchObject({ artist: { slug: 'deadmau5', origin: 'audius' } });
});

it('renders a claimed seeded artist page the same way', async () => {
	vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(
		artist({ origin: 'audius', claimedAt: new Date(), isActive: true }) as never
	);
	await expect(call()).resolves.toMatchObject({ artist: { slug: 'deadmau5' } });
});

it('404s a slug that matches no artist', async () => {
	vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(undefined);
	await expect(call()).rejects.toMatchObject({ status: 404 });
});

describe('claimArtist action', () => {
	const formData = (message = '') => {
		const data = new FormData();
		data.set('message', message);
		return data;
	};
	const runAction = (locals: { user: { id: string } | null }, message = '') =>
		(actions.claimArtist as any)({
			params: { slug: 'deadmau5' },
			locals,
			request: { formData: async () => formData(message) }
		});

	it('refuses an anonymous visitor', async () => {
		const result = await runAction({ user: null });
		expect(result).toMatchObject({ status: 401 });
	});

	it('refuses a message over MAX_MESSAGE_LENGTH', async () => {
		vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(
			artist({ origin: 'audius', claimedAt: null }) as never
		);
		const result = await runAction({ user: { id: 'u1' } }, 'x'.repeat(2001));
		expect(result).toMatchObject({ status: 400 });
		expect(ClaimRequestService.create).not.toHaveBeenCalled();
	});

	it('refuses a claim on a native artist', async () => {
		vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(
			artist({ origin: 'native' }) as never
		);
		const result = await runAction({ user: { id: 'u1' } });
		expect(result).toMatchObject({ status: 400 });
		expect(ClaimRequestService.create).not.toHaveBeenCalled();
	});

	it('refuses a claim on an artist that is already claimed', async () => {
		vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(
			artist({ origin: 'audius', claimedAt: new Date() }) as never
		);
		const result = await runAction({ user: { id: 'u1' } });
		expect(result).toMatchObject({ status: 400 });
		expect(ClaimRequestService.create).not.toHaveBeenCalled();
	});

	it('records a claim request from a logged-in visitor on an unclaimed seeded page', async () => {
		vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(
			artist({ origin: 'audius', claimedAt: null }) as never
		);
		vi.mocked(ClaimRequestService.create).mockResolvedValue({ ok: true });

		const result = await runAction({ user: { id: 'u1' } }, 'This is my page');

		expect(ClaimRequestService.create).toHaveBeenCalledWith({
			artistId: 'a1',
			userId: 'u1',
			message: 'This is my page'
		});
		expect(result).toEqual({ claimed: true });
	});

	it('surfaces a friendly failure on a duplicate request instead of a second row', async () => {
		vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(
			artist({ origin: 'audius', claimedAt: null }) as never
		);
		vi.mocked(ClaimRequestService.create).mockResolvedValue({
			ok: false,
			reason: 'already_requested'
		});

		const result = await runAction({ user: { id: 'u1' } });
		expect(result).toMatchObject({ status: 400 });
	});
});
