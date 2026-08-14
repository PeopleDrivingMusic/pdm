import { page } from '@vitest/browser/context';
import { expect, test, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';

const fetchComments = vi.fn();
const createComment = vi.fn();
const editComment = vi.fn();
const deleteComment = vi.fn();

// The optimistic-apply/rollback/notify algorithm itself is `toggleLikeOptimistic`'s
// job and is covered in `client/comments.spec.ts` — these tests only check that
// CommentSection calls it with the right target and reflects whatever it applies.
const toggleLikeOptimistic = vi.fn();

vi.mock('$lib/client/comments', () => ({
	fetchComments: (...args: unknown[]) => fetchComments(...args),
	createComment: (...args: unknown[]) => createComment(...args),
	editComment: (...args: unknown[]) => editComment(...args),
	deleteComment: (...args: unknown[]) => deleteComment(...args),
	toggleLikeOptimistic: (...args: unknown[]) => toggleLikeOptimistic(...args)
}));

import CommentThread from './CommentThread.svelte';

const TARGET_ID = '11111111-1111-4111-8111-111111111111';

const dto = (over: Record<string, unknown> = {}) => ({
	id: 'm1',
	body: 'This track slaps',
	createdAt: '2026-08-04T00:00:00.000Z',
	editedAt: null,
	author: { id: 'u2', name: 'Real Fan', avatar: null },
	isArtist: false,
	canDelete: true,
	canEdit: true,
	likeCount: 0,
	likedByViewer: false,
	...over
});

beforeEach(() => {
	vi.clearAllMocks();
	fetchComments.mockResolvedValue({ ok: true, comments: [dto()] });
	createComment.mockResolvedValue({ ok: true, comment: dto({ id: 'm2', body: 'brand new' }) });
	editComment.mockResolvedValue({
		ok: true,
		comment: dto({ body: 'reworded', editedAt: '2026-08-05T00:00:00.000Z' })
	});
	deleteComment.mockResolvedValue({ ok: true });
	// Default: behave like the real helper for a plain success.
	toggleLikeOptimistic.mockImplementation(async (_type, _id, current, apply) => {
		apply({ liked: !current.liked, likeCount: current.likeCount + (!current.liked ? 1 : -1) });
	});
});

const mount = (over: Record<string, unknown> = {}) =>
	render(CommentThread, {
		targetType: 'post',
		targetId: TARGET_ID,
		isLoggedIn: true,
		initialCount: 1,
		...over
	});

test('keeps the server count when the loaded page is only part of the thread', async () => {
	// The list is capped (50 rows); the count is a real COUNT(*). Overwriting the
	// count with the page length would silently shrink 80 comments to 50.
	fetchComments.mockResolvedValue({ ok: true, comments: [dto()] });
	mount({ initialCount: 80 });

	const toggle = page.getByRole('button', { name: /^comments/i });
	await toggle.click();
	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();

	await expect.element(toggle).toHaveTextContent('80');
});

test('moves the count by one as the viewer posts and deletes', async () => {
	mount({ initialCount: 80 });
	const toggle = page.getByRole('button', { name: /^comments/i });
	await toggle.click();
	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();

	await page.getByRole('textbox', { name: /add a comment/i }).fill('brand new');
	await page.getByRole('button', { name: /send/i }).click();
	await expect.element(page.getByText('brand new')).toBeInTheDocument();
	await expect.element(toggle).toHaveTextContent('81');

	await page
		.getByRole('button', { name: /more actions/i })
		.first()
		.click();
	await page.getByRole('button', { name: /delete comment/i }).click();
	await expect.element(toggle).toHaveTextContent('80');
});

test('puts the composer above the list so acting needs no scrolling', async () => {
	mount();
	await page.getByRole('button', { name: /^comments/i }).click();
	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();

	const composer = page.getByRole('textbox', { name: /add a comment/i }).element();
	const list = page.getByText('This track slaps').element();

	// DOCUMENT_POSITION_FOLLOWING === the list comes after the composer.
	expect(composer.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('shows a skeleton while the comments load, not a text placeholder', async () => {
	let release: (value: unknown) => void = () => {};
	fetchComments.mockReturnValue(new Promise((resolve) => (release = resolve)));

	mount();
	await page.getByRole('button', { name: /^comments/i }).click();

	await expect.element(page.getByTestId('comment-skeleton')).toBeInTheDocument();
	await expect.element(page.getByText('Loading comments…')).not.toBeInTheDocument();

	release({ ok: true, comments: [dto()] });
	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();
	await expect.element(page.getByTestId('comment-skeleton')).not.toBeInTheDocument();
});

test('does not fetch until the thread is opened', async () => {
	mount();
	await expect.element(page.getByRole('button', { name: /^comments/i })).toBeInTheDocument();
	expect(fetchComments).not.toHaveBeenCalled();
});

test('loads the comments once when opened', async () => {
	mount();
	await page.getByRole('button', { name: /^comments/i }).click();

	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();
	expect(fetchComments).toHaveBeenCalledWith('post', TARGET_ID);
	expect(fetchComments).toHaveBeenCalledTimes(1);
});

test('posting prepends the new comment', async () => {
	mount();
	await page.getByRole('button', { name: /^comments/i }).click();
	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();

	await page.getByRole('textbox').fill('brand new');
	await page.getByRole('button', { name: /send/i }).click();

	expect(createComment).toHaveBeenCalledWith('post', TARGET_ID, 'brand new');
	await expect.element(page.getByText('brand new')).toBeInTheDocument();
});

test('surfaces a link-policy refusal inline', async () => {
	createComment.mockResolvedValue({
		ok: false,
		error: 'Links are not allowed here — only the artist can post links.'
	});
	mount();
	await page.getByRole('button', { name: /^comments/i }).click();

	await page.getByRole('textbox').fill('see scam.com');
	await page.getByRole('button', { name: /send/i }).click();

	await expect.element(page.getByText(/only the artist can post links/i)).toBeInTheDocument();
});

test('deleting removes the comment from the list', async () => {
	mount();
	await page.getByRole('button', { name: /^comments/i }).click();
	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();

	await page.getByRole('button', { name: /more actions/i }).click();
	await page.getByRole('button', { name: /delete comment/i }).click();

	expect(deleteComment).toHaveBeenCalledWith('m1');
	await expect.element(page.getByText('This track slaps')).not.toBeInTheDocument();
});

test('editing replaces the body in place', async () => {
	mount();
	await page.getByRole('button', { name: /^comments/i }).click();
	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();

	await page.getByRole('button', { name: /more actions/i }).click();
	await page.getByRole('button', { name: /edit comment/i }).click();
	await page.getByRole('textbox', { name: /edit comment/i }).fill('reworded');
	await page.getByRole('button', { name: /save/i }).click();

	expect(editComment).toHaveBeenCalledWith('m1', 'reworded');
	await expect.element(page.getByText('reworded')).toBeInTheDocument();
});

test('an anonymous viewer can read but is prompted to log in', async () => {
	mount({ isLoggedIn: false });
	await page.getByRole('button', { name: /^comments/i }).click();

	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();
	await expect.element(page.getByRole('link', { name: /log in to comment/i })).toBeInTheDocument();
	await expect.element(page.getByRole('button', { name: /send/i })).not.toBeInTheDocument();
});

test('shows a load failure without breaking the thread', async () => {
	fetchComments.mockResolvedValue({ ok: false, error: 'Could not load comments.' });
	mount();
	await page.getByRole('button', { name: /^comments/i }).click();

	await expect.element(page.getByText('Could not load comments.')).toBeInTheDocument();
});

test('likes a comment through the shared toggle helper', async () => {
	mount();
	await page.getByRole('button', { name: /^comments/i }).click();
	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();

	await page.getByRole('button', { name: 'Like comment' }).click();

	expect(toggleLikeOptimistic).toHaveBeenCalledWith(
		'comment',
		'm1',
		{ liked: false, likeCount: 0 },
		expect.any(Function)
	);
	const button = page.getByRole('button', { name: 'Unlike comment' });
	await expect.element(button).toBeInTheDocument();
	await expect.element(button).toHaveTextContent('1');
});
