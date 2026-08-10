// Static, deterministic fixtures for the post-rendering preview harness.
// Offline data-URI SVG "photos" keep the visual e2e tests stable (no network).

export interface PreviewMedia {
	id: string;
	fileUrl: string;
	thumbnailUrl: string | null;
	alt: string | null;
	caption: string | null;
}

export interface PreviewPoll {
	id: string;
	question: string | null;
	mode: string;
	showResults: string;
	closesAt: Date | string | null;
	totalVotes: number;
	hasVoted: boolean;
	options: Array<{ id: string; label: string; votes: number; selected: boolean }>;
}

export interface PreviewPost {
	id: string;
	title: string;
	excerpt: string | null;
	bodyHtml: string | null;
	visibility: string;
	publishedAt: Date | string | null;
	isLocked: boolean;
	commentCount: number;
	media: PreviewMedia[];
	poll: PreviewPoll | null;
}

export interface PreviewVariation {
	label: string;
	hasMusic?: boolean;
	post: PreviewPost;
}

function swatch(color: string, label: string, w: number, h: number): string {
	const svg =
		`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
		`<rect width='${w}' height='${h}' fill='${color}'/>` +
		`<text x='50%' y='50%' fill='rgba(255,255,255,0.85)' font-family='sans-serif' ` +
		`font-size='96' text-anchor='middle' dominant-baseline='middle'>${label}</text></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const colors = ['#7C3AED', '#2563EB', '#059669', '#DB2777', '#D97706', '#0891B2'];
// Mixed aspect ratios so the masonry layout shows photos at their real proportions.
const dims: Array<[number, number]> = [
	[900, 1200],
	[1200, 800],
	[900, 900],
	[800, 1150],
	[1280, 720],
	[1000, 1000]
];

function photos(n: number): PreviewMedia[] {
	return Array.from({ length: n }, (_, i) => {
		const [w, h] = dims[i % dims.length];
		return {
			id: `photo-${i + 1}`,
			fileUrl: swatch(colors[i % colors.length], String(i + 1), w, h),
			thumbnailUrl: null,
			alt: `Sample photo ${i + 1}`,
			caption: null
		};
	});
}

const publishedAt = new Date('2026-07-18T12:00:00Z');

function base(over: Partial<PreviewPost>): PreviewPost {
	return {
		id: 'post',
		title: 'Untitled',
		excerpt: null,
		bodyHtml: null,
		visibility: 'public',
		publishedAt,
		isLocked: false,
		commentCount: 0,
		media: [],
		poll: null,
		...over
	};
}

const samplePoll: PreviewPoll = {
	id: 'poll-1',
	question: 'Which cover should we ship?',
	mode: 'single',
	showResults: 'always',
	closesAt: null,
	totalVotes: 42,
	hasVoted: false,
	options: [
		{ id: 'o1', label: 'The neon one', votes: 27, selected: false },
		{ id: 'o2', label: 'The film-grain one', votes: 15, selected: false }
	]
};

export const previewAuthor = { name: 'Nyx Rivera', avatar: null };

export const previewVariations: PreviewVariation[] = [
	{
		label: 'Text only',
		post: base({
			id: 'text-only',
			title: 'Rehearsals start Monday',
			excerpt: 'Locking the setlist this week — three new songs make the cut.'
		})
	},
	{
		label: 'Rich body',
		post: base({
			id: 'rich-body',
			title: 'The making of "Midnight Drive"',
			bodyHtml:
				'<p>This one started as a <strong>voice memo</strong> at 3am. ' +
				'I kept the original hum under the second chorus — see if you can hear it.</p>' +
				'<p>We tracked the whole thing in two nights.</p>'
		})
	},
	{
		label: 'One photo',
		post: base({ id: 'one-photo', title: 'Backstage before the show', media: photos(1) })
	},
	{
		label: 'Two photos',
		post: base({ id: 'two-photos', title: 'Soundcheck', media: photos(2) })
	},
	{
		label: 'Three photos + body',
		post: base({
			id: 'three-photos',
			title: 'On the road',
			media: photos(3),
			excerpt: 'Three cities in three nights. The van smells like victory and cold coffee.'
		})
	},
	{
		label: 'Six photos + body',
		post: base({
			id: 'six-photos',
			title: 'Tour dump',
			media: photos(6),
			excerpt: 'A dump of everything from the last leg — scroll through.'
		})
	},
	{
		label: 'Photos + poll',
		post: base({
			id: 'photos-poll',
			title: 'Help pick the single cover',
			media: photos(2),
			poll: samplePoll
		})
	},
	{
		label: 'Photo + music',
		hasMusic: true,
		post: base({ id: 'photo-music', title: 'New demo is up', media: photos(1) })
	},
	{
		label: 'Locked (subscriber teaser)',
		post: base({
			id: 'locked',
			title: 'Unreleased acoustic version',
			excerpt: 'Just me and a guitar, recorded last night.',
			visibility: 'subscribers',
			isLocked: true,
			media: photos(3)
		})
	}
];
