import { page } from '@vitest/browser/context';
import { expect, test, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { get } from 'svelte/store';
import { notificationStore } from '$lib/stores/notification.svelte';

const toggleLike = vi.fn();
const fetchComments = vi.fn();
vi.mock('$lib/client/comments', () => ({
	toggleLike: (...args: unknown[]) => toggleLike(...args),
	fetchComments: (...args: unknown[]) => fetchComments(...args),
	createComment: vi.fn(),
	editComment: vi.fn(),
	deleteComment: vi.fn()
}));

import PostCard from './PostCard.svelte';

type Poll = {
	id: string;
	question: string | null;
	mode: string;
	showResults: string;
	closesAt: Date | string | null;
	totalVotes: number;
	hasVoted: boolean;
	options: Array<{ id: string; label: string; votes: number; selected: boolean }>;
};

const basePost = (over: Record<string, unknown> = {}) => ({
	id: 'post-1',
	commentCount: 0,
	likeCount: 0,
	likedByViewer: false,
	title: 'Studio session',
	excerpt: 'A quick look behind the scenes.',
	bodyHtml: null as string | null,
	visibility: 'public' as string,
	publishedAt: new Date('2026-07-01T00:00:00Z'),
	isLocked: false,
	media: [] as Array<{
		id: string;
		fileUrl: string;
		thumbnailUrl: string | null;
		alt: string | null;
		caption: string | null;
	}>,
	poll: null as Poll | null,
	...over
});

const author = { name: 'Nyx', avatar: null };

const photo = (i: number) => ({
	id: `m${i}`,
	fileUrl: `https://cdn.example/${i}.jpg`,
	thumbnailUrl: null,
	alt: `Photo ${i}`,
	caption: null
});

const poll = (): Poll => ({
	id: 'poll-1',
	question: 'Which cover?',
	mode: 'single',
	showResults: 'always',
	closesAt: null,
	totalVotes: 3,
	hasVoted: false,
	options: [
		{ id: 'o1', label: 'Cover A', votes: 2, selected: false },
		{ id: 'o2', label: 'Cover B', votes: 1, selected: false }
	]
});

test('renders the post title', async () => {
	render(PostCard, { post: basePost(), author });
	await expect.element(page.getByRole('heading', { name: 'Studio session' })).toBeInTheDocument();
});

test('renders the excerpt when there is no rich body', () => {
	const { container } = render(PostCard, { post: basePost(), author });
	expect(container.textContent).toContain('A quick look behind the scenes.');
});

test('renders rich body html when present', () => {
	const { container } = render(PostCard, {
		post: basePost({ bodyHtml: '<p>Full <strong>story</strong> here</p>' }),
		author
	});
	expect(container.textContent).toContain('Full story here');
});

test('renders the media grid when photos are present', () => {
	const { container } = render(PostCard, {
		post: basePost({ media: [photo(1), photo(2)] }),
		author
	});
	expect(container.querySelectorAll('img')).toHaveLength(2);
});

test('renders the poll when present', () => {
	const { container } = render(PostCard, { post: basePost({ poll: poll() }), author });
	expect(container.querySelector('[aria-label="Poll"]')).not.toBeNull();
});

test('locked post hides media and shows the lock reason', () => {
	const { container } = render(PostCard, {
		post: basePost({
			isLocked: true,
			media: [photo(1), photo(2)],
			poll: poll()
		}),
		author
	});
	expect(container.textContent).toContain('Subscribe to unlock');
	expect(container.querySelectorAll('img')).toHaveLength(0);
	expect(container.querySelector('[aria-label="Poll"]')).toBeNull();
});

test('shows a visibility badge for non-public posts', () => {
	const { container } = render(PostCard, { post: basePost({ visibility: 'subscribers' }), author });
	expect(container.querySelector('.visibility')).not.toBeNull();
	expect(container.textContent).toContain('subscribers');
});

test('hides the visibility badge for public posts', () => {
	const { container } = render(PostCard, { post: basePost({ visibility: 'public' }), author });
	expect(container.querySelector('.visibility')).toBeNull();
});

beforeEach(() => {
	vi.clearAllMocks();
	notificationStore.clear();
	toggleLike.mockResolvedValue({ ok: true, liked: true, likeCount: 1 });
});

test('likes a post and shows the server count', async () => {
	render(PostCard, { post: basePost(), author, isLoggedIn: true });

	await page.getByRole('button', { name: 'Like post' }).click();

	expect(toggleLike).toHaveBeenCalledWith('post', 'post-1');
	const button = page.getByRole('button', { name: 'Unlike post' });
	await expect.element(button).toBeInTheDocument();
	await expect.element(button).toHaveTextContent('1');
});

test('unlikes a liked post', async () => {
	toggleLike.mockResolvedValue({ ok: true, liked: false, likeCount: 0 });
	render(PostCard, {
		post: basePost({ likeCount: 1, likedByViewer: true }),
		author,
		isLoggedIn: true
	});

	await page.getByRole('button', { name: 'Unlike post' }).click();

	expect(toggleLike).toHaveBeenCalledWith('post', 'post-1');
	await expect.element(page.getByRole('button', { name: 'Like post' })).toBeInTheDocument();
});

test('does not register a like for an anonymous viewer', async () => {
	render(PostCard, { post: basePost(), author, isLoggedIn: false });

	await page.getByRole('button', { name: 'Like post' }).click();

	expect(toggleLike).not.toHaveBeenCalled();
});

test('shows the like count on a locked post as a teaser, but does not register a like', async () => {
	render(PostCard, {
		post: basePost({ isLocked: true, likeCount: 3 }),
		author,
		isLoggedIn: true
	});

	const like = page.getByRole('button', { name: 'Like post' });
	await expect.element(like).toBeInTheDocument();
	await expect.element(like).toHaveTextContent('3');

	await like.click();
	expect(toggleLike).not.toHaveBeenCalled();
});

test('shows the comment count on a locked post as a teaser, but never opens the thread', async () => {
	render(PostCard, {
		post: basePost({ isLocked: true, commentCount: 5 }),
		author,
		isLoggedIn: true
	});

	const toggle = page.getByRole('button', { name: 'Comments (5)' });
	await expect.element(toggle).toBeInTheDocument();

	await toggle.click();
	await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('likes a post optimistically, before the server responds', async () => {
	let release: (value: unknown) => void = () => {};
	toggleLike.mockReturnValue(new Promise((resolve) => (release = resolve)));

	render(PostCard, { post: basePost(), author, isLoggedIn: true });
	await page.getByRole('button', { name: 'Like post' }).click();

	// Flips before the server answers — the request is still pending.
	await expect.element(page.getByRole('button', { name: 'Unlike post' })).toBeInTheDocument();

	release({ ok: true, liked: true, likeCount: 1 });
});

test('rolls back a failed post like and notifies the viewer', async () => {
	toggleLike.mockResolvedValue({ ok: false, error: 'Could not register your like.' });
	render(PostCard, { post: basePost(), author, isLoggedIn: true });

	await page.getByRole('button', { name: 'Like post' }).click();

	await expect.element(page.getByRole('button', { name: 'Like post' })).toBeInTheDocument();
	await expect.element(page.getByRole('button', { name: 'Like post' })).not.toHaveTextContent('1');

	expect(get(notificationStore)).toEqual([
		expect.objectContaining({ type: 'error', message: 'Could not register your like.' })
	]);
});
