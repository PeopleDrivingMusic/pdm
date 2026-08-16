# Comments & Fan Chat — Slice 1 (Comments) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any logged-in user comment on posts (and tracks, backend-ready) — free, public-read — shipping GitHub issue #14.

**Architecture:** A dedicated **`messages` Postgres schema** holding **two separate tables** — `messages.comments` (this slice) and `messages.chat` (Slice 2). They are distinct business entities with diverging shape and policy: `comments` is polymorphic over posts/tracks (`target_type`/`target_id`, `parent_id` reserved for threads, public read, free write); `chat` binds directly to an artist (`artist_id`, no threads, subscriber-gated read+write). Splitting the tables lets them scale and be offloaded independently. Each table has a thin Drizzle repository (`CommentRepository` here, `ChatRepository` in Slice 2); an application boundary (`CommentService` / `ChatService`) sits in front returning DTOs only (the microservice seam). Comments use a REST `/api/comments` endpoint (zero experimental deps). A shared `messages/policy.ts` (link rule + target-owner resolver) and shared `MessageList`/`MessageComposer` UI (emoji picker via `emoji-picker-element`) are reused by both. Counts are computed on read.

**Tech Stack:** SvelteKit 2 · Svelte 5 runes · TypeScript · Drizzle ORM + Postgres (`postgres-js`) · Vitest (node `server` + browser `client` projects) · Playwright e2e · `emoji-picker-element`.

## Global Constraints

- Package manager is **yarn**; run `yarn run check` (NOT bare `yarn check`).
- Indentation is **tabs**; run `yarn format` before each commit.
- New DB repository methods wrap notable ops in `withDbLogging(name, fn)` from `src/lib/db/index.ts`.
- **Boundary rule:** `CommentService` returns only primitives/DTOs; never leak Drizzle rows/types across it.
- Vitest `server` project runs with `requireAssertions: true` — every test must assert.
- **Link policy (issue requirement):** URLs are forbidden in any message **except** when the author is the target's **artist-owner**. Applies to comments and (later) chat.
- **Chat gating (issue requirement, Slice 2):** `messages.chat` is gated at **every layer** — the SvelteKit endpoint, the `ChatService` boundary, and the repository is reachable only through the gated boundary. Read + write require the viewer to be an **active subscriber OR the artist-owner** (`EntitlementService.isSubscriberOf`).
- **Strict TDD (standing rule):** write the failing test, confirm red, implement to green, commit. Each slice ships as one PR to `feature/comments-and-fan-chat` for founder review before the next.
- When changing DB shape: edit the domain schema file → update `schema.ts` aggregator + relations + type exports → `yarn db:generate` → review SQL → `yarn db:migrate`. (Migration tooling drift #25: if `db:generate` misbehaves, use `yarn db:push` for the dev DB and flag it in the PR. **Confirm the generated migration includes `CREATE SCHEMA "messages"`.**)
- **DB-layer coverage:** `CommentRepository` is a thin Drizzle wrapper — its query behavior (keyset, soft-delete filter, grouped counts) is pinned by the Task 9 E2E against the ephemeral `pdm_e2e` DB, not by brittle db-mock unit tests (matches the repo's `SubscriptionService` precedent). Pure utils, the boundary, and endpoints are unit-tested with mocks.

---

## File Structure

- `src/lib/db/schemas/messages.ts` (new) — `messagesDbSchema = pgSchema('messages')` + `comments` table (+ `chat` in Slice 2).
- `src/lib/db/schema.ts` — re-export `comments`, add `commentsRelations`, `Comment`/`NewComment` type exports, add to aggregated schema object.
- `src/lib/db/services/CommentRepository.ts` (new) — Drizzle CRUD for `messages.comments`.
- `src/lib/server/messages/policy.ts` (new) — `containsUrl(body)` + `resolveTargetOwnerUserId(targetType, targetId)` + `MAX_MESSAGE_LENGTH` (shared by both boundaries; deliberately NOT in `security/guards.ts` — see Task 3 rationale).
- `src/lib/server/messages/policy.spec.ts` (new).
- `src/lib/server/comments/CommentService.ts` (new) — application boundary + `CommentDTO`.
- `src/lib/server/comments/index.ts` (new) — barrel.
- `src/lib/server/comments/CommentService.spec.ts` (new).
- `src/routes/api/comments/+server.ts` (new) — `GET` list, `POST` create.
- `src/routes/api/comments/server.spec.ts` (new).
- `src/routes/api/comments/[id]/+server.ts` (new) — `DELETE`.
- `src/routes/api/comments/[id]/server.spec.ts` (new).
- `src/lib/db/services/ContentService.ts` — wire `commentCount` into `getArtistContent` (~line 1108-1460).
- `src/lib/ui/components/MessageList.svelte` (new) — renders a list of messages.
- `src/lib/ui/components/MessageComposer.svelte` (new) — textarea + emoji picker + submit.
- `src/lib/ui/components/CommentThread.svelte` (new) — `(targetType, targetId)`-keyed thread: lazy fetch + compose.
- `src/lib/ui/components/PostCard/PostCard.svelte` — extend `PostCardData` with `id`/`commentCount`, show count, toggle thread.
- `src/routes/(app)/artist/[slug]/components/ArtistPosts.svelte` — pass `viewer`/`targetId` through to `PostCard`.
- `e2e/comments.spec.ts` (new) — end-to-end.
- `package.json` — add `emoji-picker-element`.

**Deferred to later slices (own plans):** `messages.chat` table + `ChatRepository` + `ChatService` (with all-layer subscriber/owner gating) + `chat.remote.ts` + `ArtistFanChat` (Slice 2); `query.live` realtime + `LISTEN/NOTIFY` + dedicated listener connection (Slice 3, gated on the `max:1` pool fix / #24).

---

### Task 1: `messages` schema + `messages.comments` table + migration

**Files:**

- Create: `src/lib/db/schemas/messages.ts`
- Modify: `src/lib/db/schema.ts`
- Create: migration under `drizzle/migrations/`

**Interfaces:**

- Produces: schema `messages`; table `comments` (`id, targetType, targetId, authorId, body, parentId, createdAt, deletedAt`); type exports `Comment` (`$inferSelect`), `NewComment` (`$inferInsert`).

- [ ] **Step 1: Create `src/lib/db/schemas/messages.ts`**

```ts
import { pgSchema, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const messagesDbSchema = pgSchema('messages');

// Content comments — polymorphic over posts/tracks. Public read, free write.
export const comments = messagesDbSchema.table(
	'comments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		targetType: varchar('target_type', { length: 16 }).notNull(), // 'post' | 'track'
		targetId: uuid('target_id').notNull(),
		authorId: uuid('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		// Plain uuid (no self-FK yet): threading is deferred; app owns integrity.
		parentId: uuid('parent_id'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		deletedAt: timestamp('deleted_at')
	},
	(t) => [
		index('comments_target_idx').on(t.targetType, t.targetId, t.createdAt),
		index('comments_author_idx').on(t.authorId)
	]
);

// NOTE: `messages.chat` (artist_id, author_id, body, created_at, deleted_at) is added
// in Slice 2 as a SEPARATE table in this same schema — distinct shape (no target_type,
// no parent_id) + subscriber-gated policy.
```

- [ ] **Step 2: Wire the aggregator `schema.ts`**

1. Re-export block: `export { comments } from './schemas/messages';`
2. Import block: `import { comments } from './schemas/messages';` (and `users` is already imported).
3. Add relations after an existing relations block:

```ts
export const commentsRelations = relations(comments, ({ one }) => ({
	author: one(users, {
		fields: [comments.authorId],
		references: [users.id]
	})
}));
```

4. Type exports near the other `$inferSelect`/`$inferInsert`:

```ts
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

5. Add `comments` to the aggregated schema object.

- [ ] **Step 3: Generate + review + apply the migration**

Run: `yarn db:generate`
Expected: a new SQL file that **creates the `messages` schema** (`CREATE SCHEMA "messages";`) and `messages.comments` with the two indexes and the `author_id → users.id` FK (`ON DELETE CASCADE`). No accidental drops.
Run: `yarn db:up` (if Postgres not running) then `yarn db:migrate` (or `yarn db:push` if #25 blocks generate — note in PR). Verify `CREATE SCHEMA "messages"` is present; add it manually to the migration if drizzle-kit omits it.

- [ ] **Step 4: Typecheck + commit**

Run: `yarn run check` → 0 errors.

```bash
git add src/lib/db/schemas/messages.ts src/lib/db/schema.ts drizzle/migrations/
git commit -m "feat(messages): add messages schema + comments table"
```

---

### Task 2: `CommentRepository` (DB layer)

**Files:**

- Create: `src/lib/db/services/CommentRepository.ts`

**Interfaces:**

- Consumes: `db`, `withDbLogging` from `src/lib/db/index.ts`; `comments`, `users`, `Comment` from `src/lib/db/schema`.
- Produces: `CommentTargetType`, `CommentWithAuthor`, and `CommentRepository` with:
  - `create(input: { targetType: CommentTargetType; targetId: string; authorId: string; body: string; parentId?: string | null }): Promise<Comment>`
  - `getById(id: string): Promise<Comment | undefined>`
  - `listForTarget(input: { targetType: CommentTargetType; targetId: string; limit?: number; before?: Date }): Promise<CommentWithAuthor[]>` (newest-first, excludes soft-deleted)
  - `countForTargets(targetType: CommentTargetType, targetIds: string[]): Promise<Map<string, number>>`
  - `softDelete(id: string): Promise<void>`
  - `deleteForTarget(targetType: CommentTargetType, targetId: string): Promise<void>`

Verified by Task 9 E2E + the Task 4/5 boundary/endpoint tests. Deliverable here is a typechecking module.

- [ ] **Step 1: Write the repository**

```ts
import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db, withDbLogging } from '../index';
import { comments, users, type Comment } from '../schema';

export type CommentTargetType = 'post' | 'track';

export interface CommentWithAuthor {
	id: string;
	body: string;
	createdAt: Date;
	authorId: string;
	authorName: string | null;
	authorUsername: string | null;
	authorAvatar: string | null;
}

export class CommentRepository {
	static async create(input: {
		targetType: CommentTargetType;
		targetId: string;
		authorId: string;
		body: string;
		parentId?: string | null;
	}): Promise<Comment> {
		return withDbLogging('CommentRepository.create', async () => {
			const [row] = await db
				.insert(comments)
				.values({
					targetType: input.targetType,
					targetId: input.targetId,
					authorId: input.authorId,
					body: input.body,
					parentId: input.parentId ?? null
				})
				.returning();
			return row;
		});
	}

	static async getById(id: string): Promise<Comment | undefined> {
		return withDbLogging('CommentRepository.getById', async () => {
			const [row] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
			return row;
		});
	}

	static async listForTarget(input: {
		targetType: CommentTargetType;
		targetId: string;
		limit?: number;
		before?: Date;
	}): Promise<CommentWithAuthor[]> {
		return withDbLogging('CommentRepository.listForTarget', async () => {
			const conditions = [
				eq(comments.targetType, input.targetType),
				eq(comments.targetId, input.targetId),
				isNull(comments.deletedAt)
			];
			if (input.before) conditions.push(lt(comments.createdAt, input.before));

			return db
				.select({
					id: comments.id,
					body: comments.body,
					createdAt: comments.createdAt,
					authorId: comments.authorId,
					authorName: users.displayName,
					authorUsername: users.username,
					authorAvatar: users.avatarUrl
				})
				.from(comments)
				.innerJoin(users, eq(comments.authorId, users.id))
				.where(and(...conditions))
				.orderBy(desc(comments.createdAt))
				.limit(Math.min(input.limit ?? 50, 100));
		});
	}

	static async countForTargets(
		targetType: CommentTargetType,
		targetIds: string[]
	): Promise<Map<string, number>> {
		return withDbLogging('CommentRepository.countForTargets', async () => {
			if (targetIds.length === 0) return new Map();
			const rows = await db
				.select({ targetId: comments.targetId, count: sql<number>`count(*)::int` })
				.from(comments)
				.where(
					and(
						eq(comments.targetType, targetType),
						inArray(comments.targetId, targetIds),
						isNull(comments.deletedAt)
					)
				)
				.groupBy(comments.targetId);
			return new Map(rows.map((r) => [r.targetId, r.count]));
		});
	}

	static async softDelete(id: string): Promise<void> {
		await withDbLogging('CommentRepository.softDelete', async () => {
			await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, id));
		});
	}

	static async deleteForTarget(targetType: CommentTargetType, targetId: string): Promise<void> {
		await withDbLogging('CommentRepository.deleteForTarget', async () => {
			await db
				.delete(comments)
				.where(and(eq(comments.targetType, targetType), eq(comments.targetId, targetId)));
		});
	}
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `yarn run check` → 0 errors. `yarn lint` → clean.

```bash
git add src/lib/db/services/CommentRepository.ts
git commit -m "feat(comments): add CommentRepository DB layer"
```

---

### Task 3: Message write policy — link rule + target-owner resolver (TDD)

**Files:**

- Create: `src/lib/server/messages/policy.ts`
- Test: `src/lib/server/messages/policy.spec.ts`

**Interfaces:**

- Produces: `MessageTargetType`, `MAX_MESSAGE_LENGTH`, `containsUrl(body: string): boolean`, `resolveTargetOwnerUserId(targetType: MessageTargetType, targetId: string): Promise<string | null>`.
- Consumes: `ArtistService`, `TrackService` from `$lib/db/queries`; `db` + `posts` for the post branch.

**Why one module (and not `security/guards.ts`):** these two things — the link rule and "who owns this target" — are what authorizes a message write, and both the comment and chat boundaries share them, so they live together as one "message write policy" unit. They are deliberately **not** in `src/lib/server/security/guards.ts`: those guards take a `RequestEvent` and return a `Response` to short-circuit an HTTP handler and import zero DB; `resolveTargetOwnerUserId` is a domain lookup that hits the DB — putting it there would couple the HTTP-security module to the data layer. (Ownership logic already lives in the domain layer, e.g. `StudioContentService.assertTrackOwnership`.) The resolver covers `artist` too so Slice 2's chat boundary reuses it.

- [ ] **Step 1: Write the failing test** (both concerns in one spec; `containsUrl` needs no mocks, the resolver mocks queries + db)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	ArtistService: { getArtistById: vi.fn() },
	TrackService: { getTrackById: vi.fn() }
}));
vi.mock('$lib/db', () => ({ db: {} }));
vi.mock('$lib/db/schema', () => ({ posts: {} }));

import { ArtistService, TrackService } from '$lib/db/queries';
import { containsUrl, resolveTargetOwnerUserId } from './policy';

beforeEach(() => vi.clearAllMocks());

describe('containsUrl', () => {
	it('detects an http(s) url', () =>
		expect(containsUrl('check https://evil.test/x out')).toBe(true));
	it('detects a bare www domain', () => expect(containsUrl('go to www.evil.test now')).toBe(true));
	it('detects a bare domain with a path', () =>
		expect(containsUrl('evil.test/promo is great')).toBe(true));
	it('passes plain prose', () =>
		expect(containsUrl('this track absolutely slaps, well done')).toBe(false));
	it('passes emoji + text', () => expect(containsUrl('🔥🔥 love this 🎸')).toBe(false));
});

describe('resolveTargetOwnerUserId', () => {
	it('resolves an artist target directly to its userId', async () => {
		(ArtistService.getArtistById as any).mockResolvedValue({ id: 'a1', userId: 'owner1' });
		expect(await resolveTargetOwnerUserId('artist', 'a1')).toBe('owner1');
	});
	it('resolves a track target through its artist', async () => {
		(TrackService.getTrackById as any).mockResolvedValue({ id: 't1', artistId: 'a1' });
		(ArtistService.getArtistById as any).mockResolvedValue({ id: 'a1', userId: 'owner1' });
		expect(await resolveTargetOwnerUserId('track', 't1')).toBe('owner1');
	});
	it('returns null for a missing track', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(undefined);
		expect(await resolveTargetOwnerUserId('track', 'nope')).toBeNull();
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/messages/policy.spec.ts`
Expected: FAIL — cannot resolve `./policy`.

- [ ] **Step 3: Implement `policy.ts`**

```ts
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { posts } from '$lib/db/schema';
import { ArtistService, TrackService } from '$lib/db/queries';

export type MessageTargetType = 'post' | 'track' | 'artist';

/** Max stored message length (comments + chat share this default). */
export const MAX_MESSAGE_LENGTH = 2000;

// Conservative URL sniffing for the link policy. Matches http(s)://, bare www., and
// bare domain.tld(/path). Deliberately broad: a false positive on a non-owner message
// is acceptable (they just can't post links); only the artist-owner may include URLs.
const URL_PATTERN = /(https?:\/\/|www\.)[^\s]+|(?<![\w@.])[a-z0-9-]+(\.[a-z]{2,})+(\/[^\s]*)?/i;

export function containsUrl(body: string): boolean {
	return URL_PATTERN.test(body);
}

/** The userId that owns the artist behind a message target, or null. */
export async function resolveTargetOwnerUserId(
	targetType: MessageTargetType,
	targetId: string
): Promise<string | null> {
	switch (targetType) {
		case 'artist': {
			const artist = await ArtistService.getArtistById(targetId);
			return artist?.userId ?? null;
		}
		case 'track': {
			const track = await TrackService.getTrackById(targetId);
			if (!track) return null;
			const artist = await ArtistService.getArtistById(track.artistId);
			return artist?.userId ?? null;
		}
		case 'post': {
			const [row] = await db
				.select({ artistId: posts.artistId })
				.from(posts)
				.where(eq(posts.id, targetId))
				.limit(1);
			if (!row) return null;
			const artist = await ArtistService.getArtistById(row.artistId);
			return artist?.userId ?? null;
		}
		default:
			return null;
	}
}
```

- [ ] **Step 4: Run to verify it passes + commit**

Run: `yarn test:unit -- --run src/lib/server/messages/policy.spec.ts`
Expected: PASS (8 tests). (The `post` branch's DB query is pinned by the Task 9 E2E.)

```bash
git add src/lib/server/messages/
git commit -m "feat(messages): write policy — link rule + target-owner resolver"
```

---

### Task 4: `CommentService` boundary + DTO (TDD)

**Files:**

- Create: `src/lib/server/comments/CommentService.ts`
- Create: `src/lib/server/comments/index.ts`
- Test: `src/lib/server/comments/CommentService.spec.ts`

**Interfaces:**

- Consumes: `CommentRepository` (Task 2), `containsUrl` + `resolveTargetOwnerUserId` + `MAX_MESSAGE_LENGTH` (Task 3).
- Produces: `CommentDTO`, and `CommentService` with:
  - `listForTarget(input: { targetType: CommentTargetType; targetId: string; viewerUserId: string | null }): Promise<CommentDTO[]>`
  - `create(input: { targetType: CommentTargetType; targetId: string; authorId: string; body: string }): Promise<{ ok: true; comment: CommentDTO } | { ok: false; reason: 'empty' | 'too_long' | 'links_not_allowed' | 'invalid_target' }>`
  - `delete(input: { commentId: string; userId: string }): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'forbidden' }>`
  - `countsForPosts(postIds: string[]): Promise<Map<string, number>>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/services/CommentRepository', () => ({
	CommentRepository: {
		create: vi.fn(),
		getById: vi.fn(),
		listForTarget: vi.fn(),
		countForTargets: vi.fn(),
		softDelete: vi.fn()
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

describe('create — comments are free (no entitlement)', () => {
	it('never calls the entitlement gate', async () => {
		await CommentService.create({
			targetType: 'post',
			targetId: 'p1',
			authorId: 'u2',
			body: 'nice'
		});
		expect(EntitlementService.isSubscriberOf).not.toHaveBeenCalled();
	});

	it('rejects an empty body', async () => {
		const r = await CommentService.create({
			targetType: 'post',
			targetId: 'p1',
			authorId: 'u2',
			body: '   '
		});
		expect(r).toEqual({ ok: false, reason: 'empty' });
		expect(CommentRepository.create).not.toHaveBeenCalled();
	});

	it('rejects a non-content target type', async () => {
		const r = await CommentService.create({
			targetType: 'artist' as any,
			targetId: 'a1',
			authorId: 'u2',
			body: 'hi'
		});
		expect(r).toEqual({ ok: false, reason: 'invalid_target' });
	});
});

describe('create — link policy', () => {
	it('rejects a URL from a non-owner', async () => {
		(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
		const r = await CommentService.create({
			targetType: 'post',
			targetId: 'p1',
			authorId: 'u2',
			body: 'see https://x.test'
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
			body: 'my tour https://x.test'
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
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/comments/CommentService.spec.ts`
Expected: FAIL — cannot resolve `./CommentService`.

- [ ] **Step 3: Implement `CommentService.ts`**

```ts
import { CommentRepository, type CommentTargetType } from '$lib/db/services/CommentRepository';
import {
	containsUrl,
	resolveTargetOwnerUserId,
	MAX_MESSAGE_LENGTH
} from '$lib/server/messages/policy';

export interface CommentDTO {
	id: string;
	body: string;
	createdAt: string;
	author: { id: string; name: string; avatar: string | null };
	isArtist: boolean;
	canDelete: boolean;
}

/**
 * Application boundary for content comments. Free to write (no entitlement),
 * public to read. Returns only DTOs — no Drizzle rows leak across this seam.
 */
export class CommentService {
	static async listForTarget(input: {
		targetType: CommentTargetType;
		targetId: string;
		viewerUserId: string | null;
	}): Promise<CommentDTO[]> {
		const [rows, ownerUserId] = await Promise.all([
			CommentRepository.listForTarget({ targetType: input.targetType, targetId: input.targetId }),
			resolveTargetOwnerUserId(input.targetType, input.targetId)
		]);
		return rows.map((r) => ({
			id: r.id,
			body: r.body,
			createdAt: r.createdAt.toISOString(),
			author: {
				id: r.authorId,
				name: r.authorName ?? r.authorUsername ?? 'Listener',
				avatar: r.authorAvatar
			},
			isArtist: !!ownerUserId && r.authorId === ownerUserId,
			canDelete:
				!!input.viewerUserId &&
				(input.viewerUserId === r.authorId || input.viewerUserId === ownerUserId)
		}));
	}

	static async create(input: {
		targetType: CommentTargetType;
		targetId: string;
		authorId: string;
		body: string;
	}): Promise<
		| { ok: true; comment: CommentDTO }
		| { ok: false; reason: 'empty' | 'too_long' | 'links_not_allowed' | 'invalid_target' }
	> {
		if (input.targetType !== 'post' && input.targetType !== 'track') {
			return { ok: false, reason: 'invalid_target' };
		}
		const body = input.body.trim();
		if (!body) return { ok: false, reason: 'empty' };
		if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: 'too_long' };

		const ownerUserId = await resolveTargetOwnerUserId(input.targetType, input.targetId);
		if (containsUrl(body) && input.authorId !== ownerUserId) {
			return { ok: false, reason: 'links_not_allowed' };
		}

		const row = await CommentRepository.create({
			targetType: input.targetType,
			targetId: input.targetId,
			authorId: input.authorId,
			body
		});
		return {
			ok: true,
			comment: {
				id: row.id,
				body: row.body,
				createdAt: row.createdAt.toISOString(),
				author: { id: row.authorId, name: 'You', avatar: null },
				isArtist: input.authorId === ownerUserId,
				canDelete: true
			}
		};
	}

	static async delete(input: {
		commentId: string;
		userId: string;
	}): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'forbidden' }> {
		const row = await CommentRepository.getById(input.commentId);
		if (!row || row.deletedAt) return { ok: false, reason: 'not_found' };

		const isAuthor = row.authorId === input.userId;
		if (!isAuthor) {
			const ownerUserId = await resolveTargetOwnerUserId(
				row.targetType as CommentTargetType,
				row.targetId
			);
			if (input.userId !== ownerUserId) return { ok: false, reason: 'forbidden' };
		}
		await CommentRepository.softDelete(input.commentId);
		return { ok: true };
	}

	static async countsForPosts(postIds: string[]): Promise<Map<string, number>> {
		return CommentRepository.countForTargets('post', postIds);
	}
}
```

And `src/lib/server/comments/index.ts`:

```ts
export { CommentService, type CommentDTO } from './CommentService';
```

- [ ] **Step 4: Run to verify it passes + commit**

Run: `yarn test:unit -- --run src/lib/server/comments/CommentService.spec.ts`
Expected: PASS.

```bash
git add src/lib/server/comments/
git commit -m "feat(comments): CommentService boundary + DTO with policy tests"
```

---

### Task 5: `/api/comments` endpoints (TDD)

**Files:**

- Create: `src/routes/api/comments/+server.ts`
- Test: `src/routes/api/comments/server.spec.ts`
- Create: `src/routes/api/comments/[id]/+server.ts`
- Test: `src/routes/api/comments/[id]/server.spec.ts`

**Interfaces:**

- Consumes: `CommentService` (Task 4); `requireSameOrigin`, `requireUser`, `isGuardResponse` from `src/lib/server/security/guards.ts`; `createRateLimiter` from `src/lib/server/security/rateLimiter.ts`.
- Produces: `GET /api/comments?targetType=&targetId=` (public list); `POST /api/comments` (create, guarded, rate-limited → 429); `DELETE /api/comments/[id]` (guarded, authz).

- [ ] **Step 1: Write the failing collection-endpoint test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/comments', () => ({
	CommentService: { listForTarget: vi.fn(), create: vi.fn() }
}));

import { CommentService } from '$lib/server/comments';
import { GET, POST } from './+server';

const evt = (over: any = {}) => ({
	url: new URL(over.url ?? 'http://localhost/api/comments?targetType=post&targetId=p1'),
	locals: over.locals ?? {},
	request: new Request('http://localhost/api/comments', {
		method: over.method ?? 'GET',
		headers: over.headers ?? { origin: 'http://localhost' }
	}),
	getClientAddress: () => '1.2.3.4'
});

beforeEach(() => vi.clearAllMocks());

describe('GET', () => {
	it('lists comments publicly', async () => {
		(CommentService.listForTarget as any).mockResolvedValue([{ id: 'm1' }]);
		const res = await (GET as any)(evt());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ comments: [{ id: 'm1' }] });
	});

	it('400s on a missing target', async () => {
		const res = await (GET as any)(evt({ url: 'http://localhost/api/comments' }));
		expect(res.status).toBe(400);
	});
});

describe('POST', () => {
	it('401s when not logged in', async () => {
		const res = await (POST as any)({
			...evt({ method: 'POST' }),
			request: new Request('http://localhost/api/comments', {
				method: 'POST',
				headers: { origin: 'http://localhost', 'content-type': 'application/json' },
				body: JSON.stringify({ targetType: 'post', targetId: 'p1', body: 'hi' })
			})
		});
		expect(res.status).toBe(401);
		expect(CommentService.create).not.toHaveBeenCalled();
	});

	it('creates for a logged-in user', async () => {
		(CommentService.create as any).mockResolvedValue({ ok: true, comment: { id: 'm1' } });
		const res = await (POST as any)({
			...evt({ method: 'POST', locals: { user: { id: 'u2' } } }),
			request: new Request('http://localhost/api/comments', {
				method: 'POST',
				headers: { origin: 'http://localhost', 'content-type': 'application/json' },
				body: JSON.stringify({ targetType: 'post', targetId: 'p1', body: 'hi' })
			})
		});
		expect(res.status).toBe(201);
		expect(CommentService.create).toHaveBeenCalledWith({
			targetType: 'post',
			targetId: 'p1',
			authorId: 'u2',
			body: 'hi'
		});
	});

	it('422s a rejected comment (e.g. links)', async () => {
		(CommentService.create as any).mockResolvedValue({ ok: false, reason: 'links_not_allowed' });
		const res = await (POST as any)({
			...evt({ method: 'POST', locals: { user: { id: 'u2' } } }),
			request: new Request('http://localhost/api/comments', {
				method: 'POST',
				headers: { origin: 'http://localhost', 'content-type': 'application/json' },
				body: JSON.stringify({ targetType: 'post', targetId: 'p1', body: 'see https://x.test' })
			})
		});
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ error: 'links_not_allowed' });
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn test:unit -- --run src/routes/api/comments/server.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import { CommentService } from '$lib/server/comments';
import type { CommentTargetType } from '$lib/db/services/CommentRepository';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import { createRateLimiter } from '$lib/server/security/rateLimiter';
import type { RequestHandler } from './$types';

const writeLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

export const GET: RequestHandler = async ({ url, locals }) => {
	const targetType = url.searchParams.get('targetType');
	const targetId = url.searchParams.get('targetId');
	if ((targetType !== 'post' && targetType !== 'track') || !targetId) {
		return json({ error: 'Invalid target' }, { status: 400 });
	}
	const comments = await CommentService.listForTarget({
		targetType,
		targetId,
		viewerUserId: locals.user?.id ?? null
	});
	return json({ comments });
};

export const POST: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	if (!writeLimiter.check(auth.userId)) {
		return json({ error: 'Slow down a moment' }, { status: 429 });
	}

	const payload = await event.request.json().catch(() => null);
	const targetType = payload?.targetType as CommentTargetType;
	if (
		!payload ||
		(targetType !== 'post' && targetType !== 'track') ||
		typeof payload.targetId !== 'string' ||
		typeof payload.body !== 'string'
	) {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	const result = await CommentService.create({
		targetType,
		targetId: payload.targetId,
		authorId: auth.userId,
		body: payload.body
	});
	if (!result.ok) return json({ error: result.reason }, { status: 422 });
	return json({ comment: result.comment }, { status: 201 });
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `yarn test:unit -- --run src/routes/api/comments/server.spec.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing DELETE test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/comments', () => ({
	CommentService: { delete: vi.fn() }
}));

import { CommentService } from '$lib/server/comments';
import { DELETE } from './+server';

const evt = (locals: any, id = 'm1') => ({
	params: { id },
	locals,
	url: new URL(`http://localhost/api/comments/${id}`),
	request: new Request(`http://localhost/api/comments/${id}`, {
		method: 'DELETE',
		headers: { origin: 'http://localhost' }
	})
});

beforeEach(() => vi.clearAllMocks());

it('401s when not logged in', async () => {
	const res = await (DELETE as any)(evt({}));
	expect(res.status).toBe(401);
	expect(CommentService.delete).not.toHaveBeenCalled();
});

it('deletes for an authorized user', async () => {
	(CommentService.delete as any).mockResolvedValue({ ok: true });
	const res = await (DELETE as any)(evt({ user: { id: 'u2' } }));
	expect(res.status).toBe(200);
	expect(CommentService.delete).toHaveBeenCalledWith({ commentId: 'm1', userId: 'u2' });
});

it('403s a forbidden delete', async () => {
	(CommentService.delete as any).mockResolvedValue({ ok: false, reason: 'forbidden' });
	const res = await (DELETE as any)(evt({ user: { id: 'stranger' } }));
	expect(res.status).toBe(403);
});

it('404s a missing comment', async () => {
	(CommentService.delete as any).mockResolvedValue({ ok: false, reason: 'not_found' });
	const res = await (DELETE as any)(evt({ user: { id: 'u2' } }));
	expect(res.status).toBe(404);
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `yarn test:unit -- --run "src/routes/api/comments/[id]/server.spec.ts"`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `[id]/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import { CommentService } from '$lib/server/comments';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	const result = await CommentService.delete({ commentId: event.params.id, userId: auth.userId });
	if (result.ok) return json({ deleted: true });
	return json({ error: result.reason }, { status: result.reason === 'not_found' ? 404 : 403 });
};
```

- [ ] **Step 8: Run to verify it passes + commit**

Run: `yarn test:unit -- --run src/routes/api/comments/`
Expected: PASS.

```bash
git add src/routes/api/comments/
git commit -m "feat(comments): /api/comments GET/POST/DELETE with guards + rate limit"
```

---

### Task 6: Wire `commentCount` into the artist page load (compute-on-read)

**Files:**

- Modify: `src/lib/db/services/ContentService.ts` (`ArtistPublicContentService.getArtistContent`, ~1108-1460)

**Interfaces:**

- Consumes: `CommentRepository.countForTargets` (Task 2).
- Produces: each returned post DTO carries `commentCount: number`.

- [ ] **Step 1: Add the count query to the existing `Promise.all`**

Import `CommentRepository` at the top of `ContentService.ts`. In `getArtistContent`, after `postIds` is computed, add a count fetch into the **second** `Promise.all` (the one that already fetches `documentsByPost`, `mediaRows`, `pollRows`, …):

```ts
postIds.length ? CommentRepository.countForTargets('post', postIds) : new Map<string, number>(),
```

Capture it as `commentCounts` in the destructuring, then where each post is mapped into its returned DTO, add:

```ts
commentCount: commentCounts.get(post.id) ?? 0,
```

- [ ] **Step 2: Add a focused assertion to the existing content test (or rely on E2E)**

If `src/lib/db/services/ContentService.spec.ts` mocks the DB, add a case asserting `commentCount` is attached and defaults to `0`. Otherwise this behavior is covered by the Task 9 E2E (count reflects created rows); note which in the PR.

- [ ] **Step 3: Typecheck + commit**

Run: `yarn run check` → 0 errors.

```bash
git add src/lib/db/services/ContentService.ts src/lib/db/services/ContentService.spec.ts
git commit -m "feat(comments): compute-on-read commentCount on artist posts"
```

---

### Task 7: Shared `MessageList` + `MessageComposer` UI (emoji picker)

**Files:**

- Create: `src/lib/ui/components/MessageList.svelte`
- Create: `src/lib/ui/components/MessageComposer.svelte`
- Modify: `package.json` (add `emoji-picker-element`)

**Interfaces:**

- `MessageList` props: `messages: CommentDTO[]`, `onDelete?: (id: string) => void`.
- `MessageComposer` props: `disabled?: boolean`, `placeholder?: string`, `onSubmit: (body: string) => Promise<void> | void`.
- These are **context-agnostic** — reused by `CommentThread` (this slice) and the fan chat / player later (requirement #5).

- [ ] **Step 1: Add the dependency**

Run: `yarn add emoji-picker-element`
Expected: added to `package.json` + `yarn.lock`.

- [ ] **Step 2: Build `MessageList.svelte` (runes)**

Render each message: `Avatar` (existing `$lib/ui/Avatar.svelte`), author name, an "Artist" badge when `message.isArtist`, the body (escaped by Svelte text interpolation — never `{@html}` for user text), a relative time, and a delete affordance when `message.canDelete`. For an `isArtist` message, linkify bare URLs client-side into `<a rel="noopener noreferrer" target="_blank">`; fan messages render as plain text (no linkify). Mobile: single-column, `gap: var(--space-2)`, avatar `size="s"`, body wraps (`overflow-wrap: anywhere`).

- [ ] **Step 3: Build `MessageComposer.svelte` (runes + emoji picker)**

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/ui';

	let {
		disabled = false,
		placeholder = 'Add a comment…',
		onSubmit
	}: {
		disabled?: boolean;
		placeholder?: string;
		onSubmit: (body: string) => Promise<void> | void;
	} = $props();

	let body = $state('');
	let showPicker = $state(false);
	let busy = $state(false);
	let pickerLoaded = $state(false);

	// emoji-picker-element is a custom element — load it client-side only (SSR-safe).
	onMount(async () => {
		await import('emoji-picker-element');
		pickerLoaded = true;
	});

	function onEmoji(event: CustomEvent) {
		body += event.detail.unicode;
		showPicker = false;
	}

	async function submit() {
		const trimmed = body.trim();
		if (!trimmed || busy) return;
		busy = true;
		try {
			await onSubmit(trimmed);
			body = '';
		} finally {
			busy = false;
		}
	}
</script>

<div class="composer">
	<textarea
		bind:value={body}
		{placeholder}
		{disabled}
		rows="2"
		onkeydown={(e) => {
			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
		}}
	></textarea>
	<div class="composer-actions">
		<button
			type="button"
			class="emoji-btn"
			onclick={() => (showPicker = !showPicker)}
			disabled={disabled || !pickerLoaded}
			aria-label="Add emoji">🙂</button
		>
		<Button onClick={submit} disabled={disabled || busy || !body.trim()}>Send</Button>
	</div>
	{#if showPicker && pickerLoaded}
		<emoji-picker onemoji-click={onEmoji}></emoji-picker>
	{/if}
</div>
```

Notes: `emoji-picker-element` emits an `emoji-click` event — bind via `onemoji-click`. Add a small `src/emoji-picker-element.d.ts` shim declaring the `emoji-picker` custom element if `svelte-check` flags it. Mobile: composer full-width, picker `position: absolute` above the input, `max-width: 100%`.

- [ ] **Step 4: Typecheck + format + commit**

Run: `yarn run check` → 0 errors. `yarn format`.

```bash
git add src/lib/ui/components/MessageList.svelte src/lib/ui/components/MessageComposer.svelte package.json yarn.lock src/emoji-picker-element.d.ts
git commit -m "feat(ui): reusable MessageList + MessageComposer with emoji picker"
```

---

### Task 8: `CommentThread` + `PostCard` wiring

**Files:**

- Create: `src/lib/ui/components/CommentThread.svelte`
- Modify: `src/lib/ui/components/PostCard/PostCard.svelte`
- Modify: `src/routes/(app)/artist/[slug]/components/ArtistPosts.svelte`

**Interfaces:**

- `CommentThread` props: `targetType: 'post' | 'track'`, `targetId: string`, `isLoggedIn: boolean`, `initialCount?: number`.
- Consumes: `/api/comments` (Task 5), `MessageList` + `MessageComposer` (Task 7).

- [ ] **Step 1: Build `CommentThread.svelte`**

Lazy: fetch `GET /api/comments?targetType=&targetId=` on first expand (`$state` `comments`, `loading`, `expanded`). Compose via `POST` then optimistically prepend the returned comment and bump the count; delete via `DELETE /api/comments/{id}` then filter it out. When `!isLoggedIn`, show a "Log in to comment" link to `/login` instead of the composer. Handle the `422 links_not_allowed` response with an inline error ("Links aren't allowed — only the artist can post links."). Mobile: full-width, tap targets min-height 44px.

- [ ] **Step 2: Extend `PostCard` to show the count and toggle the thread**

`PostCardData` currently lacks `id`/`commentCount`. Add both:

```ts
interface PostCardData {
	id: string;
	// ...existing fields...
	commentCount: number;
}
```

`PostCard` already imports `mdiChatOutline` and accepts an `onComment` prop. Render `post.commentCount` next to the chat icon, and add `isLoggedIn` prop so the card can mount `<CommentThread targetType="post" targetId={post.id} {isLoggedIn} initialCount={post.commentCount} />` when the comment control is toggled.

- [ ] **Step 3: Pass viewer + ids through `ArtistPosts.svelte`**

`ArtistPosts` renders `PostCard`; pass `isLoggedIn={viewer.isLoggedIn}` (thread it from `+page.svelte` `viewer`) and rely on `post.id`/`post.commentCount` already present on the `content` DTOs (Task 6).

- [ ] **Step 4: Typecheck + format + commit**

Run: `yarn run check` → 0 errors. `yarn format`.

```bash
git add "src/lib/ui/components/CommentThread.svelte" "src/lib/ui/components/PostCard/PostCard.svelte" "src/routes/(app)/artist/[slug]/components/ArtistPosts.svelte"
git commit -m "feat(comments): CommentThread + post comment UI on the artist page"
```

---

### Task 9: E2E + full verification + PR

**Files:**

- Create: `e2e/comments.spec.ts`

- [ ] **Step 1: Write the E2E spec** (real DB via the ephemeral `pdm_e2e` pattern, screenshots per the #21 convention using `testInfo.outputPath(...)`)

Drive the artist page and assert:

1. **Anonymous** — opening a post's comments shows existing comments (read is public) and a "Log in to comment" prompt (no composer).
2. **Logged-in listener** — posts a comment → it appears at the top, the post's comment count increments.
3. **Link policy** — the same listener posting a body containing `https://…` gets the inline "links aren't allowed" error and no new comment.
4. **Delete** — the author deletes their own comment → it disappears and the count decrements.

This E2E also pins `CommentRepository`'s keyset/soft-delete/count behavior against a real DB (per Global Constraints).

- [ ] **Step 2: Run the E2E**

Run: `yarn test:e2e`
Expected: `comments.spec.ts` green.

- [ ] **Step 3: Full suite + checks**

Run: `yarn test:unit -- --run` → all green (confirm any pre-existing unrelated failure, e.g. the home `page.svelte.spec.ts`, is the only untouched one).
Run: `yarn run check` → 0 errors. `yarn lint` → clean. `yarn format`.

- [ ] **Step 4: Real-data smoke (docker up)**

With `yarn db:up`: as a second logged-in user, comment on a post → visible + count updates; try a link as a non-owner → rejected; as the artist-owner, a link → allowed. Clean up test rows.

- [ ] **Step 5: Catalog the new UI molecules**

Per the `reusable-ui-molecules` convention, add `MessageList`/`MessageComposer`/`CommentThread` to the wiki UI catalogue (reused later by the fan chat + player comments tab #19).

- [ ] **Step 6: Push + open the PR (founder review gate)**

```bash
git push -u origin feature/comments-and-fan-chat
gh pr create --base main --title "feat: content comments — free, public-read (#14)" --body "<summary: messages schema + comments table, CommentRepository, CommentService boundary, /api/comments, reusable MessageList/Composer/CommentThread, compute-on-read counts, link policy, emoji picker>"
```

Stop here for founder review before starting Slice 2 (fan chat).

---

## Slice 1 · Likes (PR6, after the comments core merges)

**Decision (founder, 2026-08-05):** likes on comments **and posts** (posts are a
known second target). Modeled as **separate per-entity tables with real FK
`ON DELETE CASCADE`** — NOT a polymorphic `engagement.likes` — because the founder
requires DB-guaranteed cleanup (delete a comment/post → its likes vanish
automatically; a polymorphic `target_id` cannot carry a real FK, so cascade is
impossible there). DRY is preserved at the **service + UI** layer via one generic
`LikeService`; only the thin repository has a per-table query. Matches the existing
`user_favorites` precedent (track likes = own table with FK to tracks). PR1's
`messages.comments` table is untouched — likes are purely additive.

**Soft-delete nuance:** comments are soft-deleted (`deleted_at`), so FK cascade only
fires on **hard** delete (e.g. parent post deleted → comments hard-deleted →
their `comment_likes` cascade). Likes on a _moderated_ (soft-deleted) comment linger
by design; clear them app-side in `CommentService.delete` only if product wants it
(out of scope now).

### Task 10: `comment_likes` + `post_likes` tables + migration

**Files:** `src/lib/db/schemas/engagement.ts` (extend), `src/lib/db/schema.ts` (aggregate), migration.

```ts
// in engagement.ts — alongside trackStats
export const commentLikes = engagementDbSchema.table(
	'comment_likes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		commentId: uuid('comment_id')
			.notNull()
			.references(() => comments.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [unique('comment_likes_comment_user_unique').on(t.commentId, t.userId)]
);

export const postLikes = engagementDbSchema.table(
	'post_likes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [unique('post_likes_post_user_unique').on(t.postId, t.userId)]
);
```

Import `comments` (from `./messages`) and `posts` (from `./content`) into `engagement.ts`.
Aggregate in `schema.ts` (re-export, relations to `users`/`comments`/`posts`, `CommentLike`/`PostLike` type exports, schema object). Migration hand-written per #25 (`0012_engagement_likes.sql`): two tables, both FKs `ON DELETE CASCADE`, both UNIQUE constraints. Verify with `\d engagement.comment_likes` that the cascade FKs exist.

### Task 11: generic `LikeService` (DB layer, TDD-by-E2E)

**Files:** `src/lib/db/services/LikeService.ts`

```ts
export type LikeTargetType = 'comment' | 'post';

export class LikeService {
	// toggle → returns the new liked state; insert onConflictDoNothing / delete.
	static async toggle(
		targetType: LikeTargetType,
		targetId: string,
		userId: string
	): Promise<boolean>;
	// grouped count per target — compute-on-read, same shape as CommentRepository.countForTargets.
	static async countForTargets(
		targetType: LikeTargetType,
		targetIds: string[]
	): Promise<Map<string, number>>;
	// the subset of targetIds the viewer has liked (mirrors the poll viewerVoteRows pattern).
	static async likedByUser(
		userId: string,
		targetType: LikeTargetType,
		targetIds: string[]
	): Promise<Set<string>>;
}
```

Internally a small `{ comment: commentLikes, post: postLikes }` table map routes each call; the FK column is `commentId`/`postId` respectively. Wrap ops in `withDbLogging`. Behavior pinned by the PR6 E2E.

### Task 12: wire likes into `CommentService` DTO + toggle endpoint (TDD)

- Extend `CommentDTO` with `likeCount: number` and `likedByViewer: boolean`. In `CommentService.listForTarget`, add `LikeService.countForTargets('comment', ids)` + `LikeService.likedByUser(viewerUserId, 'comment', ids)` into the existing `Promise.all`; map onto each DTO. Unit test (mock `LikeService`): counts/`likedByViewer` attached; anonymous viewer → `likedByViewer:false`, no `likedByUser` call.
- Endpoint `POST /api/likes` `{ targetType, targetId }` → toggle, guarded (`requireUser` + `requireSameOrigin`) + rate-limited; returns `{ liked, likeCount }`. Unit test: 401 anon, toggles for a user, 429 on flood, 400 on bad target. Accepts `targetType: 'post'` too (backend ready for post likes).

### Task 13: heart UI in `MessageList` + verification + PR6

- Add a like button (`mdiHeart`/`mdiHeartOutline`) + count to each row in `MessageList.svelte`; optimistic toggle → `POST /api/likes`; disabled with a "log in to like" affordance when anonymous. Mobile tap target ≥44px.
- E2E (`e2e/comment-likes.spec.ts`): a listener likes a comment → count increments, heart fills; unlike → decrements; **delete the comment → its `comment_likes` rows are gone** (assert cascade via a follow-up count/query).
- `yarn run check` / `yarn lint` / `yarn test:unit --run` / `yarn test:e2e` green. PR6 → integration branch.

---

## Slice 2 preview — Fan chat (own plan after Slice 1 merges)

- **Table:** `messages.chat` in the same `messages` schema — **separate table, diverging shape**: `id, artist_id (→ artists.id), author_id (→ users.id), body, created_at, deleted_at`; index `(artist_id, created_at desc)`. No `target_type`, no `parent_id` (chat is flat, artist-scoped).
- **`ChatRepository`** (DB) on `messages.chat`; **`ChatService`** boundary.
- **Gating at every layer (issue requirement):** the SvelteKit endpoint checks `requireUser` + subscriber/owner; `ChatService` **re-checks** `EntitlementService.isSubscriberOf` (or owner) on read AND write — never trusts the caller; `ChatRepository` is reachable only through `ChatService`. Non-subscriber → locked teaser + "Subscribe to join" CTA (reuse the #13 lock pattern).
- **Transport:** `chat.remote.ts` (`query`/`command`, async). Reuses `MessageList`/`MessageComposer`, `policy.ts` (same link rule), and `resolveTargetOwnerUserId('artist', …)`.
- **UI:** `ArtistFanChat.svelte` replaces the mock "Fan room" sidebar.

## Slice 3 preview — Chat realtime (own plan, gated on #24)

Enable experimental remote functions; upgrade chat `query` → `query.live` fed by Postgres `LISTEN/NOTIFY`; a **dedicated listener `postgres()` client** outside the `max: 1` pool.

---

## Self-Review Notes

- **Spec coverage (Slice 1):** schema + messages schema/comments table (T1), DB repository (T2), link policy + owner resolver (T3), boundary + DTO (T4), REST endpoints + guards + rate limit (T5), compute-on-read counts (T6), reusable emoji-enabled composer/list (T7), CommentThread + PostCard wiring (T8), E2E + PR (T9). Requirements map: strict TDD (every logic task is red→green; PR gate at T9); links-forbidden-except-artist (T3 `containsUrl` + T4 policy tests, both comment paths); emoji (T7 `emoji-picker-element`); mobile (T7/T8 notes); reusability (T7 context-agnostic components consumed by T8, reused later by chat/player).
- **Two-table split (founder decision):** `messages.comments` (this slice) and `messages.chat` (Slice 2) are separate tables in a dedicated `messages` schema — distinct business entities, diverging shape (comments: polymorphic + threading-ready; chat: artist-scoped, flat), independent scaling. Chat is gated at every layer (endpoint → boundary → repo-only-via-boundary): subscriber OR owner.
- **Likes (PR6, founder decision 2026-08-05):** separate per-entity tables `engagement.comment_likes` + `engagement.post_likes` with real FK `ON DELETE CASCADE` (posts are a known second target) — chosen over a polymorphic `engagement.likes` **because** DB-guaranteed cascade cleanup was required and a polymorphic `target_id` cannot carry a real FK. DRY kept at the service/UI layer via one generic `LikeService`; matches the `user_favorites` (track likes) precedent. Counts are compute-on-read (`likeCount`) + a viewer-liked set (`likedByViewer`), mirroring the poll vote pattern. Backend covers comment + post from day one; comment-like UI ships in Slice 1, post-like UI rides when posts are next touched.
- **Name consistency:** DB `CommentRepository.{create,getById,listForTarget,countForTargets,softDelete,deleteForTarget}`; boundary `CommentService.{listForTarget,create,delete,countsForPosts}`; policy `resolveTargetOwnerUserId` / `containsUrl` / `MAX_MESSAGE_LENGTH` / `MessageTargetType`; DB `CommentTargetType = 'post' | 'track'`; DTO `CommentDTO`; type exports `Comment`/`NewComment`. Endpoints: `GET/POST /api/comments`, `DELETE /api/comments/[id]`.
- **Risks flagged in-plan:** migration must emit `CREATE SCHEMA "messages"` (add manually if drizzle-kit omits it; #25 → `db:push` fallback); custom-element typing for `emoji-picker-element` (small `.d.ts` shim); `CommentRepository` behavior pinned by E2E not db-mock units (matches `SubscriptionService` precedent).
- **Independent review follow-ups (PR1 / #26, 2026-08-05):**
  - **PR5 (pagination):** `CommentRepository.listForTarget` keyset cursor must move from `lt(createdAt)` to a composite `(createdAt, id)` cursor — `created_at` is not unique, so a same-timestamp boundary silently drops rows. Add a `beforeId` param, order by `(createdAt desc, id desc)`, and predicate `(created_at, id) < (before, beforeId)`. Land it with the pagination E2E (test-first). _(The `before` param is currently unused — no caller — so this is latent until pagination is wired.)_
  - **Content-deletion path (whichever slice touches it):** wire `CommentRepository.deleteForTarget('post'|'track', id)` into `PostService.deletePost` and the track-delete path — polymorphic `target_id` has no FK, so comments orphan on parent delete unless cleaned in app code.
  - **Soft-delete garbage collection (same deletion slice):** add `CommentRepository.purgeSoftDeleted(olderThan: Date, batch = 1000): Promise<number>` — batched hard-delete of rows where `deleted_at IS NOT NULL AND deleted_at < olderThan` (loops until 0 affected; hard-delete cascades `comment_likes` via FK). TDD: purge removes rows older than the window, leaves fresh soft-deleted + all non-deleted untouched. Expose via a thin **authenticated** `POST /api/admin/purge-comments` (shared-secret guard). **Trigger deferred** — no scheduler exists yet; pattern + job registry recorded in wiki `[[scheduled-jobs]]` (option A: logic-in-service + external cron via Vercel Cron / pg_cron / system cron per deploy target). Default retention 30 days, configurable.
  - **Applied in PR1:** `limit` floored at 1 (`Math.max(1, Math.min(limit ?? 50, 100))`).
  - **PR4 (endpoints):** validate `targetId` is a UUID before it reaches `resolveTargetOwnerUserId` / the repository — a malformed id otherwise triggers Postgres `invalid input syntax for type uuid` (→ 500); return 400 instead. (Independent review of PR2 / #27, finding #3.)
  - **Applied in PR2:** `containsUrl` tightened so missing-space prose typos (`amazing.Keep`, `Node.js`) no longer read as links (finding #1); `post`-branch query + obfuscation limits remain E2E-pinned / out-of-scope as documented.

- **Tech debt deferred out of PR5 (founder review, 2026-08-11):**
  - **E2E should seed through production code, not raw SQL.** `e2e/comments.spec.ts` arranges fixtures with direct `insert into messages.comments …`. Act+assert already run the full production stack (browser → endpoint → `CommentService` → repository), so the risk is narrow: SQL could write a row shape the service would never produce, and the test would pass on impossible data. Two ways out — (a) seed comments via `POST /api/comments` with a session cookie (no env plumbing, every seeded row takes the real write path), or (b) call `CommentService` directly, which needs `TEST_DATABASE_URL` injected into the Playwright process because `$lib/server/db` reads `DATABASE_URL` (the dev DB). Prefer (a). Note `e2e/artist-subscription.spec.ts` has the same SQL-seeding shape, so fix both together.
  - **`/login` cannot return the user to where they were.** It only reads `?error` today. Until it supports `?redirectTo=`, the comment thread keeps a plain "Log in to comment" **link** rather than redirecting on composer focus: an auto-redirect would drop the reader out of the artist page, losing scroll position and the open thread, and strand them on the home page after signing in. When `redirectTo` lands, switch to focus-to-login (let them start typing, then prompt) and return them to the same post with the thread open.
  - **Pagination on the read path** — the repository already supports keyset (`limit`/`before`) but `GET /api/comments` does not expose them, so a target with thousands of comments loads the newest 50 with no way to page. Ship together with the `(createdAt, id)` cursor fix above; if the first page ever moves into `load` for SSR, that is where SvelteKit's `event.fetch` becomes the right call (the current browser-event-handler calls correctly use global `fetch`).

```

```
