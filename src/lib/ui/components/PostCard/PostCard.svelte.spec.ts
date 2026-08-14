import { page } from '@vitest/browser/context';
import { expect, test, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';

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

test('hides the like button on a locked post — the server refuses it either way', () => {
	const { container } = render(PostCard, {
		post: basePost({ isLocked: true }),
		author,
		isLoggedIn: true
	});
	expect(container.querySelector('.like')).toBeNull();
});
