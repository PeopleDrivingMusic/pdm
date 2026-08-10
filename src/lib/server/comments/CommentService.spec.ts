import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/services/CommentRepository', () => ({
	CommentRepository: {
		create: vi.fn(),
		getById: vi.fn(),
		listForTarget: vi.fn(),
		countForTargets: vi.fn(),
		softDelete: vi.fn(),
		updateBody: vi.fn()
	}
}));
// Partial mock: stub only the DB-touching resolver, keep the real containsUrl.
vi.mock('$lib/server/messages/policy', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/messages/policy')>()),
	resolveTargetOwnerUserId: vi.fn()
}));
vi.mock('$lib/server/entitlement', () => ({
	EntitlementService: { isSubscriberOf: vi.fn() }
}));

import { CommentRepository } from '$lib/db/services/CommentRepository';
import { resolveTargetOwnerUserId } from '$lib/server/messages/policy';
import { EntitlementService } from '$lib/server/entitlement';
import { CommentService } from './CommentService';

beforeEach(() => {
	vi.clearAllMocks();
	(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
	(CommentRepository.create as any).mockResolvedValue({
		id: 'm1',
		body: 'nice',
		createdAt: new Date('2026-08-04T00:00:00Z'),
		authorId: 'u2'
	});
});

// Base author identity the endpoint passes in from the session (locals.user).
const fan = { authorId: 'u2', authorName: 'Real Fan', authorUsername: 'fan2', authorAvatar: null };

describe('create — comments are free (no entitlement)', () => {
	it('never calls the entitlement gate', async () => {
		await CommentService.create({ targetType: 'post', targetId: 'p1', ...fan, body: 'nice' });
		expect(EntitlementService.isSubscriberOf).not.toHaveBeenCalled();
	});

	it('returns a DTO with the author real name, not a placeholder', async () => {
		const r = await CommentService.create({
			targetType: 'post',
			targetId: 'p1',
			...fan,
			body: 'nice'
		});
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.comment.author.name).toBe('Real Fan');
			expect(r.comment.author.id).toBe('u2');
		}
	});

	it('falls back to username then Listener when the display name is missing', async () => {
		const r = await CommentService.create({
			targetType: 'post',
			targetId: 'p1',
			authorId: 'u2',
			authorName: null,
			authorUsername: 'fan2',
			authorAvatar: null,
			body: 'nice'
		});
		expect(r.ok && r.comment.author.name).toBe('fan2');
	});

	it('rejects an empty body', async () => {
		const r = await CommentService.create({
			targetType: 'post',
			targetId: 'p1',
			...fan,
			body: '   '
		});
		expect(r).toEqual({ ok: false, reason: 'empty' });
		expect(CommentRepository.create).not.toHaveBeenCalled();
	});

	it('rejects a non-content target type', async () => {
		const r = await CommentService.create({
			targetType: 'artist' as any,
			targetId: 'a1',
			...fan,
			body: 'hi'
		});
		expect(r).toEqual({ ok: false, reason: 'invalid_target' });
	});

	it('rejects a target that does not resolve to an owner (missing/draft/deleted)', async () => {
		(resolveTargetOwnerUserId as any).mockResolvedValue(null);
		const r = await CommentService.create({
			targetType: 'post',
			targetId: 'p-does-not-exist',
			...fan,
			body: 'hi'
		});
		expect(r).toEqual({ ok: false, reason: 'invalid_target' });
		expect(CommentRepository.create).not.toHaveBeenCalled();
	});

	it('rejects an over-long body', async () => {
		const r = await CommentService.create({
			targetType: 'post',
			targetId: 'p1',
			...fan,
			body: 'x'.repeat(2001)
		});
		expect(r).toEqual({ ok: false, reason: 'too_long' });
		expect(CommentRepository.create).not.toHaveBeenCalled();
	});
});

describe('create — link policy', () => {
	it('rejects a URL from a non-owner', async () => {
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		const r = await CommentService.create({
			targetType: 'post',
			targetId: 'p1',
			...fan,
			body: 'see scam.com'
		});
		expect(r).toEqual({ ok: false, reason: 'links_not_allowed' });
		expect(CommentRepository.create).not.toHaveBeenCalled();
	});

	it('allows a URL from the artist-owner', async () => {
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		const r = await CommentService.create({
			targetType: 'post',
			targetId: 'p1',
			authorId: 'owner1',
			authorName: 'The Artist',
			authorUsername: 'artist',
			authorAvatar: null,
			body: 'my tour scam.com'
		});
		expect(r.ok).toBe(true);
		expect(CommentRepository.create).toHaveBeenCalled();
	});
});

describe('delete — authz', () => {
	it('allows the author', async () => {
		(CommentRepository.getById as any).mockResolvedValue({
			id: 'm1',
			authorId: 'u2',
			targetType: 'post',
			targetId: 'p1'
		});
		const r = await CommentService.delete({ commentId: 'm1', userId: 'u2' });
		expect(r).toEqual({ ok: true });
		expect(CommentRepository.softDelete).toHaveBeenCalledWith('m1');
	});

	it('allows the artist-owner of the target', async () => {
		(CommentRepository.getById as any).mockResolvedValue({
			id: 'm1',
			authorId: 'u2',
			targetType: 'post',
			targetId: 'p1'
		});
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		const r = await CommentService.delete({ commentId: 'm1', userId: 'owner1' });
		expect(r).toEqual({ ok: true });
	});

	it('forbids a stranger', async () => {
		(CommentRepository.getById as any).mockResolvedValue({
			id: 'm1',
			authorId: 'u2',
			targetType: 'post',
			targetId: 'p1'
		});
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		const r = await CommentService.delete({ commentId: 'm1', userId: 'stranger' });
		expect(r).toEqual({ ok: false, reason: 'forbidden' });
		expect(CommentRepository.softDelete).not.toHaveBeenCalled();
	});

	it('reports not_found for a missing comment', async () => {
		(CommentRepository.getById as any).mockResolvedValue(undefined);
		const r = await CommentService.delete({ commentId: 'gone', userId: 'u2' });
		expect(r).toEqual({ ok: false, reason: 'not_found' });
	});

	it('reports not_found for an already soft-deleted comment', async () => {
		(CommentRepository.getById as any).mockResolvedValue({
			id: 'm1',
			authorId: 'u2',
			targetType: 'post',
			targetId: 'p1',
			deletedAt: new Date()
		});
		const r = await CommentService.delete({ commentId: 'm1', userId: 'u2' });
		expect(r).toEqual({ ok: false, reason: 'not_found' });
	});
});

describe('edit — author only', () => {
	// Identity comes from the session, exactly like create — never a placeholder.
	const editorIdentity = { authorName: 'Real Fan', authorUsername: 'fan2', authorAvatar: null };
	const existing = {
		id: 'm1',
		authorId: 'u2',
		targetType: 'post',
		targetId: 'p1',
		body: 'old',
		createdAt: new Date('2026-08-04T00:00:00Z'),
		deletedAt: null
	};

	beforeEach(() => {
		(CommentRepository.getById as any).mockResolvedValue(existing);
		(CommentRepository.updateBody as any).mockResolvedValue({
			...existing,
			body: 'new text',
			editedAt: new Date('2026-08-05T00:00:00Z')
		});
	});

	it('lets the author edit their own comment and stamps editedAt', async () => {
		const r = await CommentService.edit({
			commentId: 'm1',
			userId: 'u2',
			...editorIdentity,
			body: 'new text'
		});
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.comment.body).toBe('new text');
			expect(r.comment.editedAt).toBe('2026-08-05T00:00:00.000Z');
			expect(r.comment.author.name).toBe('Real Fan');
		}
		expect(CommentRepository.updateBody).toHaveBeenCalledWith('m1', 'new text');
	});

	it('forbids the artist-owner from rewriting someone else words', async () => {
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		const r = await CommentService.edit({
			commentId: 'm1',
			userId: 'owner1',
			...editorIdentity,
			body: 'nope'
		});
		expect(r).toEqual({ ok: false, reason: 'forbidden' });
		expect(CommentRepository.updateBody).not.toHaveBeenCalled();
	});

	it('forbids a stranger', async () => {
		const r = await CommentService.edit({
			commentId: 'm1',
			userId: 'stranger',
			...editorIdentity,
			body: 'nope'
		});
		expect(r).toEqual({ ok: false, reason: 'forbidden' });
		expect(CommentRepository.updateBody).not.toHaveBeenCalled();
	});

	it('reports not_found for a missing comment', async () => {
		(CommentRepository.getById as any).mockResolvedValue(undefined);
		const r = await CommentService.edit({
			commentId: 'gone',
			userId: 'u2',
			...editorIdentity,
			body: 'hi'
		});
		expect(r).toEqual({ ok: false, reason: 'not_found' });
	});

	it('reports not_found for a soft-deleted comment', async () => {
		(CommentRepository.getById as any).mockResolvedValue({ ...existing, deletedAt: new Date() });
		const r = await CommentService.edit({
			commentId: 'm1',
			userId: 'u2',
			...editorIdentity,
			body: 'hi'
		});
		expect(r).toEqual({ ok: false, reason: 'not_found' });
	});

	it('rejects an empty body', async () => {
		const r = await CommentService.edit({
			commentId: 'm1',
			userId: 'u2',
			...editorIdentity,
			body: '   '
		});
		expect(r).toEqual({ ok: false, reason: 'empty' });
		expect(CommentRepository.updateBody).not.toHaveBeenCalled();
	});

	it('rejects an over-long body', async () => {
		const r = await CommentService.edit({
			commentId: 'm1',
			userId: 'u2',
			...editorIdentity,
			body: 'x'.repeat(2001)
		});
		expect(r).toEqual({ ok: false, reason: 'too_long' });
	});

	it('re-applies the link rule on edit for a non-owner author', async () => {
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		const r = await CommentService.edit({
			commentId: 'm1',
			userId: 'u2',
			...editorIdentity,
			body: 'now scam.com'
		});
		expect(r).toEqual({ ok: false, reason: 'links_not_allowed' });
		expect(CommentRepository.updateBody).not.toHaveBeenCalled();
	});

	it('allows a link when the author is the artist-owner', async () => {
		(CommentRepository.getById as any).mockResolvedValue({ ...existing, authorId: 'owner1' });
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		const r = await CommentService.edit({
			commentId: 'm1',
			userId: 'owner1',
			...editorIdentity,
			body: 'tour scam.com'
		});
		expect(r.ok).toBe(true);
	});
});

describe('listForTarget — DTO shape', () => {
	it('marks the artist-owner and computes canDelete', async () => {
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		(CommentRepository.listForTarget as any).mockResolvedValue([
			{
				id: 'm1',
				body: 'hi',
				createdAt: new Date('2026-08-04T00:00:00Z'),
				authorId: 'owner1',
				authorName: 'The Artist',
				authorUsername: 'artist',
				authorAvatar: null
			}
		]);
		const [dto] = await CommentService.listForTarget({
			targetType: 'post',
			targetId: 'p1',
			viewerUserId: 'u2'
		});
		expect(dto.isArtist).toBe(true);
		expect(dto.author.name).toBe('The Artist');
		expect(dto.canDelete).toBe(false);
	});

	it('lets the author delete their own comment', async () => {
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		(CommentRepository.listForTarget as any).mockResolvedValue([
			{
				id: 'm2',
				body: 'yo',
				createdAt: new Date('2026-08-04T00:00:00Z'),
				authorId: 'u2',
				authorName: null,
				authorUsername: 'fan2',
				authorAvatar: null
			}
		]);
		const [dto] = await CommentService.listForTarget({
			targetType: 'post',
			targetId: 'p1',
			viewerUserId: 'u2'
		});
		expect(dto.isArtist).toBe(false);
		expect(dto.author.name).toBe('fan2');
		expect(dto.canDelete).toBe(true);
	});
});

describe('countsForPosts', () => {
	it('delegates to the repository counter', async () => {
		const map = new Map([['p1', 3]]);
		(CommentRepository.countForTargets as any).mockResolvedValue(map);
		const result = await CommentService.countsForPosts(['p1']);
		expect(CommentRepository.countForTargets).toHaveBeenCalledWith('post', ['p1']);
		expect(result).toBe(map);
	});
});
