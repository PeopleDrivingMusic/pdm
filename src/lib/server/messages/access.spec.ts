import { describe, it, expect, vi, beforeEach } from 'vitest';

const postRow = vi.fn();

vi.mock('$lib/db', () => ({
	db: {
		select: () => ({
			from: () => ({ where: () => ({ limit: async () => postRow() }) })
		})
	}
}));
vi.mock('$lib/db/schema', () => ({ posts: {} }));
vi.mock('$lib/db/queries', () => ({
	ArtistService: { getArtistById: vi.fn() },
	TrackService: { getTrackById: vi.fn() }
}));
vi.mock('$lib/db/services/CommentRepository', () => ({
	CommentRepository: { getById: vi.fn() }
}));
vi.mock('$lib/server/entitlement', () => ({
	EntitlementService: { isSubscriberOf: vi.fn() }
}));

import { ArtistService, TrackService } from '$lib/db/queries';
import { CommentRepository } from '$lib/db/services/CommentRepository';
import { EntitlementService } from '$lib/server/entitlement';
import { resolveTargetAccess } from './access';

beforeEach(() => {
	vi.clearAllMocks();
	(ArtistService.getArtistById as any).mockResolvedValue({ id: 'a1', userId: 'owner1' });
	(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);
	postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'public', status: 'published' }]);
});

describe('post targets', () => {
	it('allows anyone on a published public post', async () => {
		const r = await resolveTargetAccess('post', 'p1', 'u2');
		expect(r).toEqual({ ok: true, ownerUserId: 'owner1' });
	});

	it('refuses a target that does not exist', async () => {
		postRow.mockResolvedValue([]);
		expect(await resolveTargetAccess('post', 'gone', 'u2')).toEqual({ ok: false });
	});

	it('refuses a draft post to a stranger', async () => {
		postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'public', status: 'draft' }]);
		expect(await resolveTargetAccess('post', 'p1', 'u2')).toEqual({ ok: false });
	});

	it('still lets the artist reach their own draft', async () => {
		postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'public', status: 'draft' }]);
		const r = await resolveTargetAccess('post', 'p1', 'owner1');
		expect(r).toEqual({ ok: true, ownerUserId: 'owner1' });
	});

	it('refuses a subscribers-only post to a non-subscriber', async () => {
		postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'subscribers', status: 'published' }]);
		expect(await resolveTargetAccess('post', 'p1', 'u2')).toEqual({ ok: false });
	});

	it('allows a subscribers-only post once the viewer subscribes', async () => {
		postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'subscribers', status: 'published' }]);
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(true);
		const r = await resolveTargetAccess('post', 'p1', 'u2');
		expect(r).toEqual({ ok: true, ownerUserId: 'owner1' });
	});

	it('refuses a gated post to an anonymous viewer without asking entitlement', async () => {
		postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'subscribers', status: 'published' }]);
		expect(await resolveTargetAccess('post', 'p1', null)).toEqual({ ok: false });
		expect(EntitlementService.isSubscriberOf).not.toHaveBeenCalled();
	});
});

describe('track targets', () => {
	it('refuses an unpublished track', async () => {
		(TrackService.getTrackById as any).mockResolvedValue({
			artistId: 'a1',
			visibility: 'public',
			isPublished: false
		});
		expect(await resolveTargetAccess('track', 't1', 'u2')).toEqual({ ok: false });
	});

	it('refuses a subscribers-only track to a non-subscriber', async () => {
		(TrackService.getTrackById as any).mockResolvedValue({
			artistId: 'a1',
			visibility: 'subscribers',
			isPublished: true
		});
		expect(await resolveTargetAccess('track', 't1', 'u2')).toEqual({ ok: false });
	});
});

describe('comment targets inherit their parent access', () => {
	it('refuses a comment whose parent post is gated', async () => {
		(CommentRepository.getById as any).mockResolvedValue({
			id: 'c1',
			targetType: 'post',
			targetId: 'p1'
		});
		postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'subscribers', status: 'published' }]);
		expect(await resolveTargetAccess('comment', 'c1', 'u2')).toEqual({ ok: false });
	});

	it('allows a comment on a public post', async () => {
		(CommentRepository.getById as any).mockResolvedValue({
			id: 'c1',
			targetType: 'post',
			targetId: 'p1'
		});
		const r = await resolveTargetAccess('comment', 'c1', 'u2');
		expect(r).toEqual({ ok: true, ownerUserId: 'owner1' });
	});

	it('refuses a comment that is gone', async () => {
		(CommentRepository.getById as any).mockResolvedValue(undefined);
		expect(await resolveTargetAccess('comment', 'c1', 'u2')).toEqual({ ok: false });
	});

	it('refuses a soft-deleted comment', async () => {
		(CommentRepository.getById as any).mockResolvedValue({
			id: 'c1',
			targetType: 'post',
			targetId: 'p1',
			deletedAt: new Date()
		});
		expect(await resolveTargetAccess('comment', 'c1', 'u2')).toEqual({ ok: false });
	});
});

// An imported artist has no `userId` — nobody has claimed the page yet. Before slice
// S2a the missing owner denied access outright, which would have made a seeded track
// unplayable and uncommentable for everyone, permanently.
describe('an artist nobody owns', () => {
	beforeEach(() => {
		(ArtistService.getArtistById as any).mockResolvedValue({ id: 'a1', userId: null });
	});

	it('allows a published public target and reports no owner', async () => {
		expect(await resolveTargetAccess('post', 'p1', 'u2')).toEqual({
			ok: true,
			ownerUserId: null
		});
	});

	it('still hides an unpublished target', async () => {
		postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'public', status: 'draft' }]);
		expect(await resolveTargetAccess('post', 'p1', 'u2')).toEqual({ ok: false });
	});

	it('does not let an anonymous viewer match the absent owner', async () => {
		// The owner bypass compares `viewerUserId === ownerUserId`. With both null a
		// naive comparison grants an anonymous stranger the artist's own access, which
		// reaches unpublished drafts and subscriber-only content.
		postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'subscribers', status: 'draft' }]);
		expect(await resolveTargetAccess('post', 'p1', null)).toEqual({ ok: false });
	});

	it('still requires a subscription for gated content', async () => {
		postRow.mockResolvedValue([{ artistId: 'a1', visibility: 'subscribers', status: 'published' }]);
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);
		expect(await resolveTargetAccess('post', 'p1', 'u2')).toEqual({ ok: false });
	});

	it('applies the same rule to a track', async () => {
		(TrackService.getTrackById as any).mockResolvedValue({
			id: 't1',
			artistId: 'a1',
			visibility: 'public',
			isPublished: true
		});
		expect(await resolveTargetAccess('track', 't1', 'u2')).toEqual({
			ok: true,
			ownerUserId: null
		});
	});
});
