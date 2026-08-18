# Realtime Fan Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the subscriber-only, per-artist fan chat (`messages.chat`) with a
realtime transport (`query.live` + Postgres `LISTEN`/`NOTIFY`) and a non-subscriber
teaser that shows real presence/cadence with masked content.

**Architecture:** A new `messages.chat` table sits behind a `ChatService` boundary
(mirroring the existing `CommentService`). Writes go through conventional REST
endpoints (`/api/chat`); reads are split between a normal history fetch (subscribers
only) and a SvelteKit `query.live` remote function (`getChatRoom`) that streams new
messages + presence to everyone, masking the payload server-side for non-subscribers.
Presence is in-memory only (`Map` + `EventEmitter`), never persisted. A subscriber's
room connections open platform-wide from the root layout and stay open across
navigation; a guest's connection is scoped to the artist page they're viewing.

**Tech Stack:** SvelteKit 2.69 remote functions (`query.live`, experimental), Drizzle
ORM + `postgres-js` (`sql.listen`/`sql.notify`), Svelte 5 runes, Vitest (client
browser + server node projects), Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-08-18-realtime-fan-chat-design.md` — this plan
implements it task-by-task; read both.

## Global Constraints

- No pgBouncer, no Redis, no second datastore. Single Node instance is assumed
  throughout (spec §1).
- Presence is stored nowhere — in-memory `Map`/`EventEmitter` only, reset on process
  restart is correct behavior, not a bug (spec §4.4).
- Non-subscriber clients must never receive a real message body or real author over
  the network, even for a message they can't see rendered — masking happens
  server-side, before serialization (spec §4.3, Locked decision 2).
- No rate limiting beyond the existing link rule (`containsUrl`) in this branch (spec
  §1 Out of scope).
- History pagination is keyset only (`(artist_id, created_at desc)`), never `OFFSET`
  (spec §4.1, matching the comments precedent in `CommentRepository`).
- `messages.chat` is flat — no `targetType`/`parentId` (spec §3).
- Reuse, don't reinvent: `EntitlementService.isSubscriberOf`, `containsUrl`,
  `resolveTargetOwnerUserId('artist', artistId)`, `MAX_MESSAGE_LENGTH` from
  `src/lib/server/messages/policy.ts`, and the `CommentService`/`CommentRepository`
  structural pattern (spec §2, §4.1–4.2).
- Every server-side task ships test-first (red → green → refactor), matching this
  repo's strict-TDD convention (`CommentService.spec.ts` is the reference shape for
  mocked boundary tests).

---

## File Structure

**Create:**

- `src/lib/db/services/ChatRepository.ts` — thin Drizzle repository over `messages.chat`.
- `src/lib/db/services/ChatRepository.spec.ts`
- `src/lib/server/chat/broadcast.ts` — the room's event shape: `publishChatMessage`
  (wraps `sql.notify`) + `maskChatEvent` (pure masking function, real DTO → teaser).
  One file, not two: neither is more than a few lines alone, they're symmetric halves
  of the same `ChatMessagePublished` shape, and nothing else in the codebase imports
  one without the other.
- `src/lib/server/chat/broadcast.spec.ts`
- `src/lib/server/chat/ChatService.ts` — application boundary (list/create/delete).
- `src/lib/server/chat/ChatService.spec.ts`
- `src/lib/server/chat/index.ts` — barrel export.
- `src/lib/server/chat/presence.ts` — in-memory presence registry.
- `src/lib/server/chat/presence.spec.ts`
- `src/lib/server/chat/asyncQueue.ts` — push-based async queue utility. In-process
  placeholder, same shape as this repo's existing `EventPublisher`/`LogEventPublisher`
  pattern (studio-music-upload-refactor spec) — a real broker (RabbitMQ, per that
  same precedent, though `comments-and-chat-scale-strategy.md` names NATS/Kafka for
  this specific fanout case — worth reconciling before that swap, not now) is the
  named future replacement once this needs to fan out across more than one instance.
- `src/lib/server/chat/asyncQueue.spec.ts`
- `src/lib/server/chat/listener.ts` — ref-counted `LISTEN` subscription manager.
- `src/lib/server/chat/listener.spec.ts`
- `src/lib/remote/chat.remote.ts` — `getChatRoom` live query (outside `src/lib/server`,
  required by the remote-functions file convention).
- `src/lib/remote/chat.remote.spec.ts` — integration test against the real dev DB.
- `src/routes/api/chat/+server.ts` — `GET` (history) / `POST` (create).
- `src/routes/api/chat/[id]/+server.ts` — `DELETE`.
- `src/lib/client/chat.ts` — fetch wrappers (`fetchChatHistory`, `postChatMessage`,
  `deleteChatMessage`), mirroring `src/lib/client/comments.ts`.
- `src/lib/client/chat.spec.ts`
- `src/lib/stores/chat.svelte.ts` — platform-wide room store for subscribers.
- `src/lib/ui/components/ChatWidget.svelte` — the widget (subscriber view + guest teaser).
- `src/lib/ui/components/ChatWidget.svelte.spec.ts`
- `docs/design/2026-08-18-fan-chat-ui-direction.md` — `/ui-ux-pro-max` output (Task 11).
- `e2e/chat.spec.ts`

**Modify:**

- `svelte.config.js` — enable `kit.experimental.remoteFunctions` +
  `compilerOptions.experimental.async`.
- `src/lib/db/schemas/messages.ts` — add the `chat` table, drop the Slice-2 placeholder
  comment.
- `src/lib/db/schema.ts` — export/import `chat`, add `chatRelations`, add the `Chat`
  type, add `chat` to the aggregator object.
- `src/lib/db/index.ts` — export the raw `client` (currently commented out) so
  `broadcast.ts`/`listener.ts` can call `.notify`/`.listen` directly.
- `src/lib/messages/types.ts` — add `ChatAuthor`, `ChatDTO`, `ChatTeaser`, `ChatFrame`,
  `ChatErrorCode`.
- `src/routes/(app)/+layout.server.ts` — add `subscribedArtistIds`.
- `src/routes/(app)/+layout.svelte` — open/close platform-wide chat rooms.
- `src/routes/(app)/artist/[slug]/+page.svelte` — replace the mock `.sidebar-card`
  "Fan room" block (lines ~157–174) with `<ChatWidget>`.

---

## PR Slice 1 — Schema + Repository

### Task 1: `messages.chat` table + migration

**Files:**

- Modify: `src/lib/db/schemas/messages.ts`
- Modify: `src/lib/db/schema.ts`
- Modify: `svelte.config.js`
- Create: `drizzle/migrations/<generated>.sql` (via `yarn db:generate`, not hand-written)

**Interfaces:**

- Produces: `chat` table (Drizzle table object), the `Chat` type — used by Task 2's
  `ChatRepository`.

- [ ] **Step 1: Enable remote functions in `svelte.config.js`**

```js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		experimental: {
			remoteFunctions: true
		}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
```

- [ ] **Step 2: Add the `chat` table to `src/lib/db/schemas/messages.ts`**

`comments` already exists in this file and is unchanged — do not touch it. Two edits
only: add the `artists` import, and replace the trailing placeholder `NOTE:` comment
(the file currently ends with a comment describing `messages.chat` as future work)
with the real table.

Add to the existing import line:

```ts
import { pgSchema, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { artists } from './artist';
```

Replace the trailing `NOTE:` comment with:

```ts
// Subscriber-only, artist-scoped fan chat. Flat — no target_type, no parent_id.
export const chat = messagesDbSchema.table(
	'chat',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		artistId: uuid('artist_id')
			.notNull()
			.references(() => artists.id, { onDelete: 'cascade' }),
		authorId: uuid('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		deletedAt: timestamp('deleted_at')
	},
	(t) => [index('chat_artist_idx').on(t.artistId, t.createdAt)]
);
```

- [ ] **Step 3: Wire `chat` into `src/lib/db/schema.ts`**

Change line 26 (`export { comments } from './schemas/messages';`) to:

```ts
export { comments, chat } from './schemas/messages';
```

Change line 53 (`import { comments } from './schemas/messages';`) to:

```ts
import { comments, chat } from './schemas/messages';
```

Add relations directly after `commentsRelations` (around line 200):

```ts
export const chatRelations = relations(chat, ({ one }) => ({
	author: one(users, {
		fields: [chat.authorId],
		references: [users.id]
	}),
	artist: one(artists, {
		fields: [chat.artistId],
		references: [artists.id]
	})
}));
```

Add `chat,` to the aggregator object, next to `comments,` (around line 431):

```ts
	comments,
	chat,
```

Add type exports next to `Comment`/`NewComment` (around line 368):

```ts
export type Chat = typeof chat.$inferSelect;
```

(No `NewChat` — unlike `Comment`/`NewComment`, nothing in this plan inserts through an
explicit insert-shaped type; `ChatRepository.create` (Task 2) passes an inline object
straight to `.values()` and Drizzle infers it. Add `NewChat` later if something
actually needs it.)

- [ ] **Step 4: Type-check**

Run: `yarn check`
Expected: no errors (this step has no runtime test — schema correctness is verified
by type-checking + the migration applying cleanly, matching how `CommentRepository`
itself has no dedicated spec file in this codebase; its behavior gets pinned by an
e2e test, same as Task 14 does for chat).

- [ ] **Step 5: Generate and review the migration**

Run: `yarn db:generate`
Open the newly created file under `drizzle/migrations/` and confirm it contains
exactly one `CREATE TABLE "messages"."chat"` statement with the two FKs and the
`chat_artist_idx` index — no unrelated DDL.

- [ ] **Step 6: Apply the migration to the local dev DB**

Run: `yarn db:migrate`
Expected: migration applies without error (requires `yarn db:up` running).

- [ ] **Step 7: Commit**

```bash
git add svelte.config.js src/lib/db/schemas/messages.ts src/lib/db/schema.ts drizzle/migrations/
git commit -m "feat(chat): add messages.chat table + enable remote functions"
```

### Task 2: `ChatRepository`

**Files:**

- Create: `src/lib/db/services/ChatRepository.ts`
- Create: `src/lib/db/services/ChatRepository.spec.ts`

**Interfaces:**

- Consumes: `chat`, `users`, `Chat` from `../schema` (Task 1); `db`, `withDbLogging`
  from `../index`.
- Produces: `ChatRepository.create(input)`, `.getById(id)`, `.getMessages(input)`,
  `.softDelete(id)` — consumed by `ChatService` (Task 5). `ChatMessageWithAuthor`
  interface — consumed by `ChatService`'s `toDTO`.

- [ ] **Step 1: Write the failing tests**

`CommentRepository` has no dedicated spec in this codebase (its behavior is pinned by
`e2e/comments.spec.ts` instead), but `LikeRepository.spec.ts` shows the mocked-chain
pattern this repo uses when a repository's query shape is worth pinning directly —
in particular, catching a `.values()` call keyed by the wrong property name, which is
exactly the bug class its own comment describes. `ChatRepository` gets that same
direct coverage rather than deferring everything to Task 14's e2e.

```ts
// src/lib/db/services/ChatRepository.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Same thenable chain stand-in as `LikeRepository.spec.ts`, extended with the
 *  extra chain methods `ChatRepository` calls (`innerJoin`, `orderBy`, `limit`, `set`). */
function makeChain(result: unknown, onCall?: (method: string, args: unknown[]) => void) {
	const chain: Record<string, unknown> = {
		then: (resolve: (value: unknown) => void) => resolve(result)
	};
	for (const method of [
		'where',
		'from',
		'innerJoin',
		'orderBy',
		'limit',
		'set',
		'returning',
		'values'
	]) {
		chain[method] = (...args: unknown[]) => {
			onCall?.(method, args);
			return chain;
		};
	}
	return chain;
}

const dbMock = vi.hoisted(() => ({
	insert: vi.fn(),
	select: vi.fn(),
	update: vi.fn()
}));

vi.mock('../index', () => ({
	db: dbMock,
	withDbLogging: (_name: string, fn: () => unknown) => fn()
}));

import { ChatRepository } from './ChatRepository';

beforeEach(() => vi.clearAllMocks());

describe('ChatRepository.create', () => {
	it('inserts a chat message keyed by the TS property name, not the db column name', async () => {
		let valuesCall: unknown;
		dbMock.insert.mockReturnValue(
			makeChain([{ id: 'm1' }], (method, args) => {
				if (method === 'values') valuesCall = args[0];
			})
		);

		await ChatRepository.create({ artistId: 'a1', authorId: 'u1', body: 'hi' });

		expect(valuesCall).toEqual({ artistId: 'a1', authorId: 'u1', body: 'hi' });
	});
});

describe('ChatRepository.getMessages', () => {
	it('returns the rows resolved by the select chain', async () => {
		dbMock.select.mockReturnValue(makeChain([{ id: 'm1', body: 'hey' }]));

		const rows = await ChatRepository.getMessages({ artistId: 'a1' });

		expect(rows).toEqual([{ id: 'm1', body: 'hey' }]);
	});

	it('clamps limit into the [1, 100] range', async () => {
		let limitArg: unknown;
		dbMock.select.mockReturnValue(
			makeChain([], (method, args) => {
				if (method === 'limit') limitArg = args[0];
			})
		);

		await ChatRepository.getMessages({ artistId: 'a1', limit: 500 });
		expect(limitArg).toBe(100);

		await ChatRepository.getMessages({ artistId: 'a1', limit: -5 });
		expect(limitArg).toBe(1);
	});
});

describe('ChatRepository.softDelete', () => {
	it('sets deletedAt via the update chain', async () => {
		let setArg: unknown;
		dbMock.update.mockReturnValue(
			makeChain(undefined, (method, args) => {
				if (method === 'set') setArg = args[0];
			})
		);

		await ChatRepository.softDelete('m1');

		expect((setArg as { deletedAt: unknown })?.deletedAt).toBeInstanceOf(Date);
	});
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `yarn test:unit -- --run src/lib/db/services/ChatRepository.spec.ts`
Expected: FAIL — `./ChatRepository` does not exist yet.

- [ ] **Step 3: Implement `ChatRepository`**

```ts
import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { db, withDbLogging } from '../index';
import { chat, users, type Chat } from '../schema';

export interface ChatMessageWithAuthor {
	id: string;
	body: string;
	createdAt: Date;
	authorId: string;
	authorName: string | null;
	authorUsername: string | null;
	authorAvatar: string | null;
}

/**
 * Thin Drizzle repository over `messages.chat`. Query-shape correctness (insert
 * keys, limit clamping, soft-delete) is pinned directly by the mocked-chain spec;
 * the real keyset ordering against Postgres is additionally pinned by Task 14's e2e.
 */
export class ChatRepository {
	static async create(input: { artistId: string; authorId: string; body: string }): Promise<Chat> {
		return withDbLogging('ChatRepository.create', async () => {
			const [row] = await db
				.insert(chat)
				.values({ artistId: input.artistId, authorId: input.authorId, body: input.body })
				.returning();
			return row;
		});
	}

	static async getById(id: string): Promise<Chat | undefined> {
		return withDbLogging('ChatRepository.getById', async () => {
			const [row] = await db.select().from(chat).where(eq(chat.id, id)).limit(1);
			return row;
		});
	}

	static async getMessages(input: {
		artistId: string;
		limit?: number;
		before?: Date;
	}): Promise<ChatMessageWithAuthor[]> {
		return withDbLogging('ChatRepository.getMessages', async () => {
			const conditions = [eq(chat.artistId, input.artistId), isNull(chat.deletedAt)];
			if (input.before) conditions.push(lt(chat.createdAt, input.before));

			return db
				.select({
					id: chat.id,
					body: chat.body,
					createdAt: chat.createdAt,
					authorId: chat.authorId,
					authorName: users.displayName,
					authorUsername: users.username,
					authorAvatar: users.avatarUrl
				})
				.from(chat)
				.innerJoin(users, eq(chat.authorId, users.id))
				.where(and(...conditions))
				.orderBy(desc(chat.createdAt))
				.limit(Math.max(1, Math.min(input.limit ?? 50, 100)));
		});
	}

	static async softDelete(id: string): Promise<void> {
		await withDbLogging('ChatRepository.softDelete', async () => {
			await db.update(chat).set({ deletedAt: new Date() }).where(eq(chat.id, id));
		});
	}
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `yarn test:unit -- --run src/lib/db/services/ChatRepository.spec.ts`
Expected: PASS (all 4 cases)

- [ ] **Step 5: Type-check**

Run: `yarn check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/services/ChatRepository.ts src/lib/db/services/ChatRepository.spec.ts
git commit -m "feat(chat): add ChatRepository"
```

---

## PR Slice 2 — `ChatService` boundary + masking + REST endpoints

### Task 3: Chat DTO types

**Files:**

- Modify: `src/lib/messages/types.ts`

**Interfaces:**

- Produces: `ChatAuthor`, `ChatDTO`, `ChatTeaser`, `ChatFrame`, `ChatErrorCode` —
  consumed by every later task (`broadcast.ts`, `ChatService`, `chat.remote.ts`,
  `ChatWidget.svelte`, `client/chat.ts`).

- [ ] **Step 1: Append to `src/lib/messages/types.ts`**

```ts
/** Author identity as a chat message renders it. Same shape as `MessageAuthor`,
 *  kept separate so chat and comments can diverge without cross-coupling. */
export interface ChatAuthor {
	id: string;
	name: string;
	avatar: string | null;
}

/** A subscriber-visible chat message. No edit, no likes — unlike comments. */
export interface ChatDTO {
	id: string;
	body: string;
	createdAt: string;
	author: ChatAuthor;
	isArtist: boolean;
	canDelete: boolean;
}

/** What a non-subscriber sees instead of a real message: real cadence, no content. */
export interface ChatTeaser {
	id: string;
	createdAt: string;
}

/** One frame streamed by `getChatRoom`. `presence` frames go to every viewer
 *  unmasked; `message`/`teaser` are the masked/unmasked split of the same event. */
export type ChatFrame =
	| { type: 'message'; message: ChatDTO }
	| { type: 'teaser'; teaser: ChatTeaser }
	| { type: 'presence'; onlineCount: number; artistOnline: boolean };

export type ChatErrorCode =
	| 'empty'
	| 'too_long'
	| 'links_not_allowed'
	| 'not_subscribed'
	| 'not_found'
	| 'forbidden'
	| 'invalid_request'
	| 'unauthorized';
```

- [ ] **Step 2: Type-check**

Run: `yarn check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/messages/types.ts
git commit -m "feat(chat): add chat DTO and frame types"
```

### Task 4: `broadcast.ts` (publish + mask)

**Files:**

- Modify: `src/lib/db/index.ts`
- Create: `src/lib/server/chat/broadcast.ts`
- Create: `src/lib/server/chat/broadcast.spec.ts`

**Interfaces:**

- Consumes: `client` from `$lib/db` (uncommented export); `ChatDTO`, `ChatFrame` from
  `$lib/messages/types`.
- Produces: `publishChatMessage(artistId, message)`, `ChatMessagePublished` type —
  consumed by `ChatService.create` (Task 5) and `listener.ts` (Task 9).
  `maskChatEvent(event, viewerIsSubscriber)` — consumed by `chat.remote.ts` (Task 10).
  Both live in one file, not two: they're symmetric halves of the same room-event
  shape (write it safely / read it safely) and neither is more than a few lines alone.

- [ ] **Step 1: Export the raw client from `src/lib/db/index.ts`**

Change:

```ts
// Export the client for manual operations if needed
// export { client };
```

to:

```ts
// Exported for LISTEN/NOTIFY, which needs the raw postgres-js client — Drizzle's
// wrapper has no equivalent API. postgres-js maintains LISTEN on its own dedicated
// connection automatically, separate from the `max: 1` query pool above.
export { client };
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/server/chat/broadcast.spec.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/db', () => ({
	client: { notify: vi.fn() }
}));

import { client } from '$lib/db';
import { publishChatMessage, maskChatEvent } from './broadcast';
import type { ChatMessagePublished } from './broadcast';

describe('publishChatMessage', () => {
	it('notifies the artist-scoped channel with a JSON-encoded message event', () => {
		const message = {
			id: 'm1',
			body: 'hi',
			createdAt: '2026-08-18T00:00:00.000Z',
			author: { id: 'u1', name: 'Fan', avatar: null },
			isArtist: false,
			canDelete: true
		};

		publishChatMessage('artist-1', message);

		expect(client.notify).toHaveBeenCalledWith(
			'chat_room_artist-1',
			JSON.stringify({ kind: 'message', message })
		);
	});
});

describe('maskChatEvent', () => {
	const event: ChatMessagePublished = {
		kind: 'message',
		message: {
			id: 'm1',
			body: 'real body text',
			createdAt: '2026-08-18T00:00:00.000Z',
			author: { id: 'u1', name: 'Real Fan', avatar: 'https://example.test/a.png' },
			isArtist: false,
			canDelete: true
		}
	};

	it('passes the real message through for a subscriber', () => {
		const frame = maskChatEvent(event, true);
		expect(frame).toEqual({ type: 'message', message: event.message });
	});

	it('replaces the body and author with a teaser for a non-subscriber', () => {
		const frame = maskChatEvent(event, false);
		expect(frame).toEqual({
			type: 'teaser',
			teaser: { id: 'm1', createdAt: '2026-08-18T00:00:00.000Z' }
		});
	});

	it('never leaks the real body onto a teaser frame', () => {
		const frame = maskChatEvent(event, false);
		expect(JSON.stringify(frame)).not.toContain('real body text');
		expect(JSON.stringify(frame)).not.toContain('Real Fan');
	});
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `yarn test:unit -- --run src/lib/server/chat/broadcast.spec.ts`
Expected: FAIL — `./broadcast` does not exist yet.

- [ ] **Step 4: Implement `broadcast.ts`**

```ts
// src/lib/server/chat/broadcast.ts
import { client } from '$lib/db';
import type { ChatDTO, ChatFrame } from '$lib/messages/types';

export interface ChatMessagePublished {
	kind: 'message';
	message: ChatDTO;
}

/** Publish a newly created chat message to every live listener of the room. Fire
 *  and forget from the caller's perspective — NOTIFY delivery is best-effort by
 *  design; the message itself is already durably committed by the time this runs. */
export function publishChatMessage(artistId: string, message: ChatDTO): void {
	const event: ChatMessagePublished = { kind: 'message', message };
	void client.notify(`chat_room_${artistId}`, JSON.stringify(event));
}

/**
 * The access boundary for realtime chat content. A non-subscriber must never
 * receive a real body or author over the wire — this is where that's enforced,
 * server-side, before the frame is serialized to the client.
 */
export function maskChatEvent(event: ChatMessagePublished, viewerIsSubscriber: boolean): ChatFrame {
	if (viewerIsSubscriber) {
		return { type: 'message', message: event.message };
	}
	return {
		type: 'teaser',
		teaser: { id: event.message.id, createdAt: event.message.createdAt }
	};
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `yarn test:unit -- --run src/lib/server/chat/broadcast.spec.ts`
Expected: PASS (all cases)

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/index.ts src/lib/server/chat/broadcast.ts src/lib/server/chat/broadcast.spec.ts
git commit -m "feat(chat): add NOTIFY publisher and server-side masking"
```

### Task 5: `ChatService`

**Files:**

- Create: `src/lib/server/chat/ChatService.ts`
- Create: `src/lib/server/chat/ChatService.spec.ts`
- Create: `src/lib/server/chat/index.ts`

**Interfaces:**

- Consumes: `ChatRepository` (Task 2), `containsUrl`/`resolveTargetOwnerUserId`/
  `MAX_MESSAGE_LENGTH` from `$lib/server/messages/policy`, `EntitlementService` from
  `$lib/server/entitlement`, `publishChatMessage` from `./broadcast` (Task 4), `ChatDTO`
  (Task 3).
- Produces: `ChatService.getMessages(input)`, `.create(input)`, `.delete(input)` —
  consumed by the REST endpoints (Task 6) and the `resolveIsArtistOwner` logic reused
  conceptually in `chat.remote.ts` (Task 10, via the same `resolveTargetOwnerUserId`
  helper, not via `ChatService` directly).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/server/chat/ChatService.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/services/ChatRepository', () => ({
	ChatRepository: {
		create: vi.fn(),
		getById: vi.fn(),
		getMessages: vi.fn(),
		softDelete: vi.fn()
	}
}));
vi.mock('$lib/server/messages/policy', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/messages/policy')>()),
	resolveTargetOwnerUserId: vi.fn()
}));
vi.mock('$lib/server/entitlement', () => ({
	EntitlementService: { isSubscriberOf: vi.fn() }
}));
vi.mock('./broadcast', () => ({
	publishChatMessage: vi.fn()
}));

import { ChatRepository } from '$lib/db/services/ChatRepository';
import { resolveTargetOwnerUserId } from '$lib/server/messages/policy';
import { EntitlementService } from '$lib/server/entitlement';
import { publishChatMessage } from './broadcast';
import { ChatService } from './ChatService';

beforeEach(() => {
	vi.clearAllMocks();
	(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
});

describe('ChatService.getMessages', () => {
	it('refuses a non-subscriber without querying the repository', async () => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);

		const result = await ChatService.getMessages({ artistId: 'a1', viewerUserId: 'u2' });

		expect(result).toEqual({ ok: false, reason: 'not_subscribed' });
		expect(ChatRepository.getMessages).not.toHaveBeenCalled();
	});

	it('returns DTOs for a subscriber, flagging the artist-authored row', async () => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(true);
		(ChatRepository.getMessages as any).mockResolvedValue([
			{
				id: 'm1',
				body: 'hey fans',
				createdAt: new Date('2026-08-18T00:00:00Z'),
				authorId: 'owner1',
				authorName: 'The Artist',
				authorUsername: 'artist1',
				authorAvatar: null
			}
		]);

		const result = await ChatService.getMessages({ artistId: 'a1', viewerUserId: 'u2' });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.messages[0].isArtist).toBe(true);
			expect(result.messages[0].body).toBe('hey fans');
		}
	});
});

describe('ChatService.create', () => {
	beforeEach(() => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(true);
		(ChatRepository.create as any).mockResolvedValue({
			id: 'm2',
			body: 'nice show',
			createdAt: new Date('2026-08-18T00:00:00Z'),
			authorId: 'u2'
		});
	});

	it('refuses a non-subscriber and never touches the repository', async () => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);

		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: 'hi'
		});

		expect(result).toEqual({ ok: false, reason: 'not_subscribed' });
		expect(ChatRepository.create).not.toHaveBeenCalled();
	});

	it('rejects an empty body', async () => {
		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: '   '
		});
		expect(result).toEqual({ ok: false, reason: 'empty' });
	});

	it('rejects a link from a non-owner', async () => {
		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: 'check out scam.com'
		});
		expect(result).toEqual({ ok: false, reason: 'links_not_allowed' });
	});

	it('publishes the created message to the room on success', async () => {
		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: 'nice show'
		});

		expect(result.ok).toBe(true);
		expect(publishChatMessage).toHaveBeenCalledWith(
			'a1',
			expect.objectContaining({ id: 'm2', body: 'nice show' })
		);
	});
});

describe('ChatService.delete', () => {
	it('lets the author delete their own message', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a1',
			authorId: 'u2',
			deletedAt: null
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'u2', artistId: 'a1' });

		expect(result).toEqual({ ok: true });
		expect(ChatRepository.softDelete).toHaveBeenCalledWith('m1');
	});

	it('lets the artist-owner delete any message in their room', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a1',
			authorId: 'u2',
			deletedAt: null
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'owner1', artistId: 'a1' });

		expect(result).toEqual({ ok: true });
	});

	it('forbids a third party', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a1',
			authorId: 'u2',
			deletedAt: null
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'u3', artistId: 'a1' });

		expect(result).toEqual({ ok: false, reason: 'forbidden' });
		expect(ChatRepository.softDelete).not.toHaveBeenCalled();
	});

	it('returns not_found for a message from a different artist room', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a-other',
			authorId: 'u2',
			deletedAt: null
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'u2', artistId: 'a1' });

		expect(result).toEqual({ ok: false, reason: 'not_found' });
	});

	it('returns not_found when the message does not exist at all', async () => {
		(ChatRepository.getById as any).mockResolvedValue(undefined);

		const result = await ChatService.delete({ messageId: 'missing', userId: 'u2', artistId: 'a1' });

		expect(result).toEqual({ ok: false, reason: 'not_found' });
		expect(ChatRepository.softDelete).not.toHaveBeenCalled();
	});

	it('returns not_found for a message that was already deleted', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a1',
			authorId: 'u2',
			deletedAt: new Date('2026-08-17T00:00:00Z')
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'u2', artistId: 'a1' });

		expect(result).toEqual({ ok: false, reason: 'not_found' });
		expect(ChatRepository.softDelete).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `yarn test:unit -- --run src/lib/server/chat/ChatService.spec.ts`
Expected: FAIL — `./ChatService` does not exist yet.

- [ ] **Step 3: Implement `ChatService.ts`**

```ts
// src/lib/server/chat/ChatService.ts
import { ChatRepository, type ChatMessageWithAuthor } from '$lib/db/services/ChatRepository';
import {
	containsUrl,
	resolveTargetOwnerUserId,
	MAX_MESSAGE_LENGTH
} from '$lib/server/messages/policy';
import { EntitlementService } from '$lib/server/entitlement';
import { publishChatMessage } from './broadcast';
import type { ChatDTO } from '$lib/messages/types';

export type { ChatDTO };

type WriteRejection = 'empty' | 'too_long' | 'links_not_allowed';

type ListResult = { ok: true; messages: ChatDTO[] } | { ok: false; reason: 'not_subscribed' };
type CreateResult =
	| { ok: true; message: ChatDTO }
	| { ok: false; reason: WriteRejection | 'not_subscribed' | 'unauthorized' };
type DeleteResult =
	| { ok: true }
	| { ok: false; reason: 'not_found' | 'forbidden' | 'unauthorized' };

function displayName(name: string | null, username: string | null): string {
	return name ?? username ?? 'Listener';
}

function toDTO(
	row: {
		id: string;
		body: string;
		createdAt: Date;
		authorId: string;
		authorName: string | null;
		authorUsername: string | null;
		authorAvatar: string | null;
	},
	ownerUserId: string | null,
	viewerUserId: string | null
): ChatDTO {
	return {
		id: row.id,
		body: row.body,
		createdAt: row.createdAt.toISOString(),
		author: {
			id: row.authorId,
			name: displayName(row.authorName, row.authorUsername),
			avatar: row.authorAvatar
		},
		isArtist: !!ownerUserId && row.authorId === ownerUserId,
		canDelete: !!viewerUserId && (viewerUserId === row.authorId || viewerUserId === ownerUserId)
	};
}

/**
 * Application boundary for the subscriber fan chat. Unlike `CommentService`, every
 * operation here — read and write — is gated by `EntitlementService.isSubscriberOf`.
 * Returns only DTOs — no Drizzle rows leak across this seam.
 */
export class ChatService {
	static async getMessages(input: {
		artistId: string;
		viewerUserId: string | null;
		before?: Date;
	}): Promise<ListResult> {
		const isSubscriber = await EntitlementService.isSubscriberOf(
			input.viewerUserId,
			input.artistId
		);
		if (!isSubscriber) return { ok: false, reason: 'not_subscribed' };

		const [rows, ownerUserId] = await Promise.all([
			ChatRepository.getMessages({ artistId: input.artistId, before: input.before }),
			resolveTargetOwnerUserId('artist', input.artistId)
		]);

		return { ok: true, messages: rows.map((r) => toDTO(r, ownerUserId, input.viewerUserId)) };
	}

	static async create(input: {
		artistId: string;
		authorId: string | null;
		authorName: string | null;
		authorUsername: string | null;
		authorAvatar: string | null;
		body: string;
	}): Promise<CreateResult> {
		if (!input.authorId) return { ok: false, reason: 'unauthorized' };

		const isSubscriber = await EntitlementService.isSubscriberOf(input.authorId, input.artistId);
		if (!isSubscriber) return { ok: false, reason: 'not_subscribed' };

		const body = input.body.trim();
		if (!body) return { ok: false, reason: 'empty' };
		if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: 'too_long' };

		const ownerUserId = await resolveTargetOwnerUserId('artist', input.artistId);
		if (containsUrl(body) && input.authorId !== ownerUserId) {
			return { ok: false, reason: 'links_not_allowed' };
		}

		const row: ChatMessageWithAuthor & { id: string } = {
			...(await ChatRepository.create({
				artistId: input.artistId,
				authorId: input.authorId,
				body
			})),
			authorName: input.authorName,
			authorUsername: input.authorUsername,
			authorAvatar: input.authorAvatar
		};
		const message = toDTO(row, ownerUserId, input.authorId);

		publishChatMessage(input.artistId, message);
		return { ok: true, message };
	}

	static async delete(input: {
		messageId: string;
		userId: string | null;
		artistId: string;
	}): Promise<DeleteResult> {
		if (!input.userId) return { ok: false, reason: 'unauthorized' };

		const row = await ChatRepository.getById(input.messageId);
		if (!row || row.deletedAt || row.artistId !== input.artistId) {
			return { ok: false, reason: 'not_found' };
		}

		const isAuthor = row.authorId === input.userId;
		if (!isAuthor) {
			const ownerUserId = await resolveTargetOwnerUserId('artist', row.artistId);
			if (input.userId !== ownerUserId) return { ok: false, reason: 'forbidden' };
		}
		await ChatRepository.softDelete(input.messageId);
		return { ok: true };
	}
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `yarn test:unit -- --run src/lib/server/chat/ChatService.spec.ts`
Expected: PASS (all cases)

- [ ] **Step 5: Add the barrel export**

```ts
// src/lib/server/chat/index.ts
export { ChatService, type ChatDTO } from './ChatService';
```

- [ ] **Step 6: Type-check**

Run: `yarn check`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/chat/ChatService.ts src/lib/server/chat/ChatService.spec.ts src/lib/server/chat/index.ts
git commit -m "feat(chat): add ChatService application boundary"
```

### Task 6: REST endpoints (`/api/chat`)

**Files:**

- Create: `src/routes/api/chat/+server.ts`
- Create: `src/routes/api/chat/server.spec.ts`
- Create: `src/routes/api/chat/[id]/+server.ts`
- Create: `src/routes/api/chat/[id]/server.spec.ts`

**Interfaces:**

- Consumes: `ChatService` (Task 5), `requireSameOrigin`/`requireUser`/
  `isGuardResponse` from `$lib/server/security/guards`, `isUuid` from
  `$lib/server/security/uuid`.
- Produces: `GET/POST /api/chat`, `DELETE /api/chat/[id]` — consumed by
  `src/lib/client/chat.ts` (Task 12).

- [ ] **Step 1: Write the failing tests for `/api/chat`**

```ts
// src/routes/api/chat/server.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/chat', () => ({
	ChatService: { getMessages: vi.fn(), create: vi.fn() }
}));
vi.mock('$lib/server/security/guards', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/security/guards')>())
}));

import { ChatService } from '$lib/server/chat';
import { GET, POST } from './+server';

const ARTIST_ID = '11111111-1111-1111-1111-111111111111';

function makeGetEvent(searchParams: Record<string, string>, userId?: string) {
	const url = new URL('http://localhost/api/chat');
	for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
	return { url, locals: { user: userId ? { id: userId } : undefined } } as any;
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/chat', () => {
	it('400s on a malformed artistId', async () => {
		const response = await GET(makeGetEvent({ artistId: 'not-a-uuid' }));
		expect(response.status).toBe(400);
	});

	it('403s when the service refuses a non-subscriber', async () => {
		(ChatService.getMessages as any).mockResolvedValue({ ok: false, reason: 'not_subscribed' });
		const response = await GET(makeGetEvent({ artistId: ARTIST_ID }));
		expect(response.status).toBe(403);
	});

	it('200s with messages for a subscriber', async () => {
		(ChatService.getMessages as any).mockResolvedValue({ ok: true, messages: [{ id: 'm1' }] });
		const response = await GET(makeGetEvent({ artistId: ARTIST_ID }, 'u1'));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ messages: [{ id: 'm1' }] });
	});
});

function makePostEvent(body: unknown, userId?: string) {
	return {
		request: {
			json: async () => body,
			headers: new Headers({ origin: 'http://localhost' })
		},
		url: new URL('http://localhost/api/chat'),
		locals: userId
			? { user: { id: userId, displayName: 'Fan', username: 'fan1', avatarUrl: null } }
			: {}
	} as any;
}

describe('POST /api/chat', () => {
	it('401s when logged out', async () => {
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }));
		expect(response.status).toBe(401);
	});

	it('400s on a malformed artistId', async () => {
		const response = await POST(makePostEvent({ artistId: 'nope', body: 'hi' }, 'u1'));
		expect(response.status).toBe(400);
	});

	it('403s when the service refuses a non-subscriber', async () => {
		(ChatService.create as any).mockResolvedValue({ ok: false, reason: 'not_subscribed' });
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		expect(response.status).toBe(403);
	});

	it('201s with the created message on success', async () => {
		(ChatService.create as any).mockResolvedValue({ ok: true, message: { id: 'm1' } });
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ message: { id: 'm1' } });
	});
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `yarn test:unit -- --run src/routes/api/chat/server.spec.ts`
Expected: FAIL — `./+server` does not exist yet.

- [ ] **Step 3: Implement `src/routes/api/chat/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import { ChatService } from '$lib/server/chat';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import { isUuid } from '$lib/server/security/uuid';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const artistId = event.url.searchParams.get('artistId');
	if (!isUuid(artistId)) return json({ error: 'invalid_request' }, { status: 400 });

	const result = await ChatService.getMessages({
		artistId,
		viewerUserId: event.locals.user?.id ?? null
	});
	if (!result.ok) return json({ error: result.reason }, { status: 403 });
	return json({ messages: result.messages });
};

export const POST: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	const payload = await event.request.json().catch(() => null);
	if (!isUuid(payload?.artistId) || typeof payload?.body !== 'string') {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const user = event.locals.user;
	const result = await ChatService.create({
		artistId: payload.artistId,
		authorId: auth.userId,
		authorName: user?.displayName ?? null,
		authorUsername: user?.username ?? null,
		authorAvatar: user?.avatarUrl ?? null,
		body: payload.body
	});

	if (result.ok) return json({ message: result.message }, { status: 201 });

	const status = result.reason === 'not_subscribed' ? 403 : 400;
	return json({ error: result.reason }, { status });
};
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `yarn test:unit -- --run src/routes/api/chat/server.spec.ts`
Expected: PASS

- [ ] **Step 5: Write the failing tests for `/api/chat/[id]`**

```ts
// src/routes/api/chat/[id]/server.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/chat', () => ({
	ChatService: { delete: vi.fn() }
}));

import { ChatService } from '$lib/server/chat';
import { DELETE } from './+server';

const ARTIST_ID = '11111111-1111-1111-1111-111111111111';
const MESSAGE_ID = '22222222-2222-2222-2222-222222222222';

function makeEvent(id: string, artistId: string, userId?: string) {
	const url = new URL('http://localhost/api/chat/x');
	url.searchParams.set('artistId', artistId);
	return {
		params: { id },
		url,
		request: { headers: new Headers({ origin: 'http://localhost' }) },
		locals: userId ? { user: { id: userId } } : {}
	} as any;
}

beforeEach(() => vi.clearAllMocks());

describe('DELETE /api/chat/[id]', () => {
	it('401s when logged out', async () => {
		const response = await DELETE(makeEvent(MESSAGE_ID, ARTIST_ID));
		expect(response.status).toBe(401);
	});

	it('400s on a malformed id', async () => {
		const response = await DELETE(makeEvent('nope', ARTIST_ID, 'u1'));
		expect(response.status).toBe(400);
	});

	it('404s when the service reports not_found', async () => {
		(ChatService.delete as any).mockResolvedValue({ ok: false, reason: 'not_found' });
		const response = await DELETE(makeEvent(MESSAGE_ID, ARTIST_ID, 'u1'));
		expect(response.status).toBe(404);
	});

	it('403s when the service reports forbidden', async () => {
		(ChatService.delete as any).mockResolvedValue({ ok: false, reason: 'forbidden' });
		const response = await DELETE(makeEvent(MESSAGE_ID, ARTIST_ID, 'u1'));
		expect(response.status).toBe(403);
	});

	it('200s on success', async () => {
		(ChatService.delete as any).mockResolvedValue({ ok: true });
		const response = await DELETE(makeEvent(MESSAGE_ID, ARTIST_ID, 'u1'));
		expect(response.status).toBe(200);
	});
});
```

- [ ] **Step 6: Run tests, verify they fail**

Run: `yarn test:unit -- --run "src/routes/api/chat/[id]/server.spec.ts"`
Expected: FAIL — `./+server` does not exist yet.

- [ ] **Step 7: Implement `src/routes/api/chat/[id]/+server.ts`**

```ts
import { json } from '@sveltejs/kit';
import { ChatService } from '$lib/server/chat';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import { isUuid } from '$lib/server/security/uuid';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	const artistId = event.url.searchParams.get('artistId');
	if (!isUuid(event.params.id) || !isUuid(artistId)) {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const result = await ChatService.delete({
		messageId: event.params.id,
		userId: auth.userId,
		artistId
	});
	if (result.ok) return json({ ok: true });
	return json({ error: result.reason }, { status: result.reason === 'not_found' ? 404 : 403 });
};
```

- [ ] **Step 8: Run tests, verify they pass**

Run: `yarn test:unit -- --run "src/routes/api/chat/[id]/server.spec.ts"`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/routes/api/chat/
git commit -m "feat(chat): add REST endpoints for chat history/create/delete"
```

### Task 6b: 100% coverage gate for the chat server seam

**Files:**

- Modify: `vitest.config.ts`

**Interfaces:**

- Consumes: nothing new — wires the existing v8 coverage config over the files
  Tasks 2, 4, 5, and 6 already created.

Everything server-side added so far in this plan (`ChatRepository`, `broadcast.ts`,
`ChatService`, the REST endpoints) is pure, mockable logic with no untestable
branches — a stricter bar than this repo's existing 90% gate is achievable here.
`chat.remote.ts` (Task 10) is deliberately **excluded**: its generator body can't be
invoked directly in a unit test (it needs a live SvelteKit request context — Task
10's own integration test only exercises the raw LISTEN/NOTIFY mechanics it depends
on, not the generator itself), so gating it at 100% would either fail CI or force a
fake test written only to hit a number. Client-side files (`ChatWidget.svelte`,
`client/chat.ts`) stay outside this gate too, matching the existing convention: the
`include` list below only ever covered the server seam.

- [ ] **Step 1: Add the chat paths + a per-glob 100% threshold**

In `vitest.config.ts`, extend `coverage.include` and turn the flat `thresholds`
object into one with a glob-specific override (Vitest supports per-glob-pattern
thresholds that don't inherit the top-level numbers, so `perFile: true` has to be
repeated on the override — see the Vitest coverage docs):

```ts
coverage: {
	provider: 'v8',
	include: [
		'src/lib/server/music/**',
		'src/lib/server/events/**',
		'src/lib/server/media/validation.ts',
		'src/lib/server/media/uploadTargetHandler.ts',
		'src/lib/server/media/logging.ts',
		'src/lib/server/security/**',
		'src/lib/server/chat/**',
		'src/lib/db/services/ChatRepository.ts',
		'src/routes/api/chat/**'
	],
	// Barrel re-exports and type-only modules carry no testable logic.
	exclude: ['**/index.ts', '**/types.ts'],
	thresholds: {
		lines: 90,
		branches: 90,
		functions: 90,
		statements: 90,

		'src/lib/server/chat/**': {
			lines: 100,
			branches: 100,
			functions: 100,
			statements: 100,
			perFile: true
		},
		'src/lib/db/services/ChatRepository.ts': {
			lines: 100,
			branches: 100,
			functions: 100,
			statements: 100,
			perFile: true
		},
		'src/routes/api/chat/**': {
			lines: 100,
			branches: 100,
			functions: 100,
			statements: 100,
			perFile: true
		}
	}
}
```

- [ ] **Step 2: Run coverage and verify the chat seam is fully hit**

Run: `yarn vitest run --project server --coverage`
Expected: PASS, with `src/lib/server/chat/**`, `ChatRepository.ts`, and
`src/routes/api/chat/**` each reporting 100% lines/branches/functions/statements. If
any branch is missed, it means a real code path (e.g. `ChatService.delete`'s
`unauthorized`/`not_found`/already-deleted branches) has no test yet — add the test,
don't relax the threshold.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test(chat): gate the chat server seam at 100% coverage"
```

---

## PR Slice 3 — Presence registry

### Task 7: `presence.ts`

**Files:**

- Create: `src/lib/server/chat/presence.ts`
- Create: `src/lib/server/chat/presence.spec.ts`

**Interfaces:**

- Produces: `presence.join(artistId, entry, onChange): () => void`,
  `presence.snapshot(artistId): PresenceSnapshot`, `PresenceEntry`,
  `PresenceSnapshot` types — consumed by `chat.remote.ts` (Task 10).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/server/chat/presence.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { presence } from './presence';

describe('presence', () => {
	it('reports zero online for a room nobody has joined', () => {
		expect(presence.snapshot('empty-room')).toEqual({ onlineCount: 0, artistOnline: false });
	});

	it('counts joins and reflects leaves', () => {
		const leave1 = presence.join(
			'room-1',
			{ connectionId: 'c1', userId: 'u1', isArtist: false },
			() => {}
		);
		const leave2 = presence.join(
			'room-1',
			{ connectionId: 'c2', userId: 'u2', isArtist: false },
			() => {}
		);

		expect(presence.snapshot('room-1')).toEqual({ onlineCount: 2, artistOnline: false });

		leave1();
		expect(presence.snapshot('room-1')).toEqual({ onlineCount: 1, artistOnline: false });

		leave2();
		expect(presence.snapshot('room-1')).toEqual({ onlineCount: 0, artistOnline: false });
	});

	it('flags artistOnline when the artist-owner connection is present', () => {
		const leaveArtist = presence.join(
			'room-2',
			{ connectionId: 'c1', userId: 'owner1', isArtist: true },
			() => {}
		);
		expect(presence.snapshot('room-2').artistOnline).toBe(true);

		leaveArtist();
		expect(presence.snapshot('room-2').artistOnline).toBe(false);
	});

	it('notifies other room members when someone joins or leaves', () => {
		const onChange1 = vi.fn();
		presence.join('room-3', { connectionId: 'c1', userId: 'u1', isArtist: false }, onChange1);

		const leave2 = presence.join(
			'room-3',
			{ connectionId: 'c2', userId: 'u2', isArtist: false },
			() => {}
		);
		expect(onChange1).toHaveBeenCalledWith({ onlineCount: 2, artistOnline: false });

		onChange1.mockClear();
		leave2();
		expect(onChange1).toHaveBeenCalledWith({ onlineCount: 1, artistOnline: false });
	});

	it('does not notify a member after they themselves have left', () => {
		const onChange1 = vi.fn();
		const leave1 = presence.join(
			'room-4',
			{ connectionId: 'c1', userId: 'u1', isArtist: false },
			onChange1
		);
		leave1();
		onChange1.mockClear();

		presence.join('room-4', { connectionId: 'c2', userId: 'u2', isArtist: false }, () => {});
		expect(onChange1).not.toHaveBeenCalled();
	});

	it('keeps rooms independent', () => {
		presence.join('room-5a', { connectionId: 'c1', userId: 'u1', isArtist: false }, () => {});
		expect(presence.snapshot('room-5b')).toEqual({ onlineCount: 0, artistOnline: false });
	});
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `yarn test:unit -- --run src/lib/server/chat/presence.spec.ts`
Expected: FAIL — `./presence` does not exist yet.

- [ ] **Step 3: Implement `presence.ts`**

```ts
// src/lib/server/chat/presence.ts
import { EventEmitter } from 'node:events';

export interface PresenceEntry {
	connectionId: string;
	userId: string | null;
	isArtist: boolean;
}

export interface PresenceSnapshot {
	onlineCount: number;
	artistOnline: boolean;
}

/**
 * Who is currently connected to each artist's chat room. In-memory only, scoped to
 * this Node process — presence is "right now," never persisted, and a process
 * restart correctly resets it to empty. See spec §4.4 for the full reasoning
 * (multi-instance fan-out via Redis is a named future trigger, not built here).
 */
const rooms = new Map<string, Set<PresenceEntry>>();
const emitter = new EventEmitter();

function channelFor(artistId: string): string {
	return `presence:${artistId}`;
}

export function snapshot(artistId: string): PresenceSnapshot {
	const entries = rooms.get(artistId);
	if (!entries || entries.size === 0) return { onlineCount: 0, artistOnline: false };

	let artistOnline = false;
	for (const entry of entries) {
		if (entry.isArtist) {
			artistOnline = true;
			break;
		}
	}
	return { onlineCount: entries.size, artistOnline };
}

/** Register a connection in a room and subscribe to future presence changes for
 *  that room. Returns a `leave` callback — call it exactly once, on disconnect. */
export function join(
	artistId: string,
	entry: PresenceEntry,
	onChange: (next: PresenceSnapshot) => void
): () => void {
	let entries = rooms.get(artistId);
	if (!entries) {
		entries = new Set();
		rooms.set(artistId, entries);
	}
	entries.add(entry);

	const listener = (next: PresenceSnapshot) => onChange(next);
	emitter.on(channelFor(artistId), listener);
	emitter.emit(channelFor(artistId), snapshot(artistId));

	let left = false;
	return () => {
		if (left) return;
		left = true;
		emitter.off(channelFor(artistId), listener);
		entries!.delete(entry);
		if (entries!.size === 0) rooms.delete(artistId);
		emitter.emit(channelFor(artistId), snapshot(artistId));
	};
}

export const presence = { join, snapshot };
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `yarn test:unit -- --run src/lib/server/chat/presence.spec.ts`
Expected: PASS (all 6 cases)

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/chat/presence.ts src/lib/server/chat/presence.spec.ts
git commit -m "feat(chat): add in-memory presence registry"
```

---

## PR Slice 4 — `getChatRoom` live query

### Task 8: `asyncQueue.ts`

**Files:**

- Create: `src/lib/server/chat/asyncQueue.ts`
- Create: `src/lib/server/chat/asyncQueue.spec.ts`

**Interfaces:**

- Produces: `createAsyncQueue<T>(): { push, close, iterate }` — consumed by
  `chat.remote.ts` (Task 10) to merge Postgres `LISTEN` events and presence events
  into one `for await` loop.

**Future migration note:** this is the in-process stand-in for a real message
broker, same posture as the existing `EventPublisher`/`LogEventPublisher` pattern in
this codebase — ship the interface now, swap the implementation when it needs to
survive across more than one process/instance. Do not build that swap now; just keep
`createAsyncQueue`'s call sites (`chat.remote.ts`, Task 10) behind this small
function so the eventual replacement is an implementation swap, not a rewrite.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/server/chat/asyncQueue.spec.ts
import { describe, it, expect } from 'vitest';
import { createAsyncQueue } from './asyncQueue';

describe('createAsyncQueue', () => {
	it('delivers a value pushed before iteration starts', async () => {
		const queue = createAsyncQueue<number>();
		queue.push(1);

		const iterator = queue.iterate();
		const result = await iterator.next();
		expect(result).toEqual({ value: 1, done: false });
	});

	it('delivers a value pushed after iteration has started waiting', async () => {
		const queue = createAsyncQueue<number>();
		const iterator = queue.iterate();

		const pending = iterator.next();
		queue.push(42);

		expect(await pending).toEqual({ value: 42, done: false });
	});

	it('delivers values in push order', async () => {
		const queue = createAsyncQueue<number>();
		queue.push(1);
		queue.push(2);
		queue.push(3);

		const iterator = queue.iterate();
		expect((await iterator.next()).value).toBe(1);
		expect((await iterator.next()).value).toBe(2);
		expect((await iterator.next()).value).toBe(3);
	});

	it('ends iteration cleanly when closed while a consumer is waiting', async () => {
		const queue = createAsyncQueue<number>();
		const iterator = queue.iterate();

		const pending = iterator.next();
		queue.close();

		expect(await pending).toEqual({ value: undefined, done: true });
	});

	it('drops a push that arrives after close', async () => {
		const queue = createAsyncQueue<number>();
		queue.close();
		queue.push(1);

		const iterator = queue.iterate();
		expect(await iterator.next()).toEqual({ value: undefined, done: true });
	});
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `yarn test:unit -- --run src/lib/server/chat/asyncQueue.spec.ts`
Expected: FAIL — `./asyncQueue` does not exist yet.

- [ ] **Step 3: Implement `asyncQueue.ts`**

```ts
// src/lib/server/chat/asyncQueue.ts

/**
 * A minimal push-based async queue: producers call `push`, one consumer drains it
 * via `iterate()`. Bridges callback-based event sources (Postgres LISTEN, an
 * EventEmitter) into a single `for await` loop, which is what `getChatRoom` needs
 * to merge message events and presence events into one stream.
 */
export function createAsyncQueue<T>() {
	const buffer: T[] = [];
	const waiters: Array<(result: IteratorResult<T>) => void> = [];
	let closed = false;

	function push(value: T): void {
		if (closed) return;
		const waiter = waiters.shift();
		if (waiter) waiter({ value, done: false });
		else buffer.push(value);
	}

	function close(): void {
		if (closed) return;
		closed = true;
		while (waiters.length > 0) {
			waiters.shift()!({ value: undefined as never, done: true });
		}
	}

	async function* iterate(): AsyncGenerator<T> {
		while (true) {
			if (buffer.length > 0) {
				yield buffer.shift() as T;
				continue;
			}
			if (closed) return;
			const result = await new Promise<IteratorResult<T>>((resolve) => waiters.push(resolve));
			if (result.done) return;
			yield result.value;
		}
	}

	return { push, close, iterate };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `yarn test:unit -- --run src/lib/server/chat/asyncQueue.spec.ts`
Expected: PASS (all 5 cases)

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/chat/asyncQueue.ts src/lib/server/chat/asyncQueue.spec.ts
git commit -m "feat(chat): add push-based async queue for merging event sources"
```

### Task 9: `listener.ts`

**Files:**

- Create: `src/lib/server/chat/listener.ts`
- Create: `src/lib/server/chat/listener.spec.ts`

**Interfaces:**

- Consumes: `client` from `$lib/db` (Task 4), `ChatMessagePublished` from `./broadcast`.
- Produces: `subscribeToChatRoom(artistId, onMessage): Promise<() => Promise<void>>`
  — consumed by `chat.remote.ts` (Task 10).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/server/chat/listener.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const unlistenMocks: Array<ReturnType<typeof vi.fn>> = [];
const listenMock = vi.fn(async (_channel: string, _onnotify: (payload: string) => void) => {
	const unlisten = vi.fn(async () => {});
	unlistenMocks.push(unlisten);
	return { unlisten };
});

vi.mock('$lib/db', () => ({
	client: { listen: (...args: [string, (payload: string) => void]) => listenMock(...args) }
}));

import { subscribeToChatRoom } from './listener';

beforeEach(() => {
	vi.clearAllMocks();
	unlistenMocks.length = 0;
});

describe('subscribeToChatRoom', () => {
	it('opens exactly one Postgres LISTEN for two subscribers of the same room', async () => {
		await subscribeToChatRoom('artist-1', () => {});
		await subscribeToChatRoom('artist-1', () => {});

		expect(listenMock).toHaveBeenCalledTimes(1);
		expect(listenMock).toHaveBeenCalledWith('chat_room_artist-1', expect.any(Function));
	});

	it('fans a single NOTIFY out to every subscriber of the room', async () => {
		const received1: unknown[] = [];
		const received2: unknown[] = [];
		await subscribeToChatRoom('artist-2', (event) => received1.push(event));
		await subscribeToChatRoom('artist-2', (event) => received2.push(event));

		const onnotify = listenMock.mock.calls[0][1] as (payload: string) => void;
		onnotify(JSON.stringify({ kind: 'message', message: { id: 'm1' } }));

		expect(received1).toEqual([{ kind: 'message', message: { id: 'm1' } }]);
		expect(received2).toEqual([{ kind: 'message', message: { id: 'm1' } }]);
	});

	it('keeps the LISTEN open while at least one subscriber remains', async () => {
		const unsubscribe1 = await subscribeToChatRoom('artist-3', () => {});
		await subscribeToChatRoom('artist-3', () => {});

		await unsubscribe1();

		expect(unlistenMocks[0]).not.toHaveBeenCalled();
	});

	it('unlistens once the last subscriber of a room leaves', async () => {
		const unsubscribe1 = await subscribeToChatRoom('artist-4', () => {});
		const unsubscribe2 = await subscribeToChatRoom('artist-4', () => {});

		await unsubscribe1();
		await unsubscribe2();

		expect(unlistenMocks[0]).toHaveBeenCalledTimes(1);
	});

	it('opens a fresh LISTEN if a room is rejoined after everyone left', async () => {
		const unsubscribe1 = await subscribeToChatRoom('artist-5', () => {});
		await unsubscribe1();

		await subscribeToChatRoom('artist-5', () => {});

		expect(listenMock).toHaveBeenCalledTimes(2);
	});

	it('keeps different rooms on separate LISTEN channels', async () => {
		await subscribeToChatRoom('artist-6', () => {});
		await subscribeToChatRoom('artist-7', () => {});

		expect(listenMock).toHaveBeenCalledWith('chat_room_artist-6', expect.any(Function));
		expect(listenMock).toHaveBeenCalledWith('chat_room_artist-7', expect.any(Function));
	});
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `yarn test:unit -- --run src/lib/server/chat/listener.spec.ts`
Expected: FAIL — `./listener` does not exist yet.

- [ ] **Step 3: Implement `listener.ts`**

```ts
// src/lib/server/chat/listener.ts
import { client } from '$lib/db';
import type { ChatMessagePublished } from './broadcast';

interface RoomListener {
	unlisten: () => Promise<void>;
	subscribers: Set<(event: ChatMessagePublished) => void>;
}

/**
 * Ref-counted `LISTEN` per artist room: the first subscriber opens the Postgres
 * channel, every later subscriber for the same room reuses it, and the last one to
 * leave closes it. `postgres-js` maintains its own dedicated connection for
 * `.listen()` automatically — this map only dedupes at the application level so N
 * subscribers of the same room don't open N separate LISTENs.
 */
const roomListeners = new Map<string, RoomListener>();

export async function subscribeToChatRoom(
	artistId: string,
	onMessage: (event: ChatMessagePublished) => void
): Promise<() => Promise<void>> {
	let room = roomListeners.get(artistId);
	if (!room) {
		const subscribers = new Set<(event: ChatMessagePublished) => void>();
		const { unlisten } = await client.listen(`chat_room_${artistId}`, (payload: string) => {
			const event = JSON.parse(payload) as ChatMessagePublished;
			for (const subscriber of subscribers) subscriber(event);
		});
		room = { unlisten, subscribers };
		roomListeners.set(artistId, room);
	}
	room.subscribers.add(onMessage);

	let left = false;
	return async () => {
		if (left) return;
		left = true;
		const current = roomListeners.get(artistId);
		if (!current) return;
		current.subscribers.delete(onMessage);
		if (current.subscribers.size === 0) {
			roomListeners.delete(artistId);
			await current.unlisten();
		}
	};
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `yarn test:unit -- --run src/lib/server/chat/listener.spec.ts`
Expected: PASS (all 6 cases)

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/chat/listener.ts src/lib/server/chat/listener.spec.ts
git commit -m "feat(chat): add ref-counted Postgres LISTEN subscription manager"
```

### Task 10: `getChatRoom` live query

**Files:**

- Create: `src/lib/remote/chat.remote.ts`
- Create: `src/lib/remote/chat.remote.spec.ts` (integration test against the real dev
  Postgres — requires `yarn db:up` running; this is the one test in this plan that
  is not a mocked unit test, matching the spec's §7 testing split)

**Interfaces:**

- Consumes: `EntitlementService.isSubscriberOf`, `resolveTargetOwnerUserId('artist', …)`,
  `presence` (Task 7), `subscribeToChatRoom` (Task 9), `maskChatEvent`/
  `ChatMessagePublished` from `./broadcast` (Task 4), `createAsyncQueue` (Task 8),
  `isUuid`.
- Produces: `getChatRoom(artistId): RemoteLiveQuery<ChatFrame>` — consumed by
  `ChatWidget.svelte` and `chat.svelte.ts` store (Task 12/13).

- [ ] **Step 1: Write the failing integration test**

```ts
// src/lib/remote/chat.remote.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';

/**
 * Exercises the real LISTEN/NOTIFY round trip: publishing a message through
 * `publishChatMessage` must reach a `subscribeToChatRoom` listener on the same
 * process talking to the real dev Postgres. This is deliberately not mocked —
 * it is the one place that pins the actual Postgres wiring, same as
 * `e2e/comments.spec.ts` pins `CommentRepository`'s real query behavior.
 * Requires `yarn db:up`.
 */
describe('chat LISTEN/NOTIFY wiring', () => {
	const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

	afterAll(async () => {
		await sql.end();
	});

	it('delivers a NOTIFY payload to a LISTEN on the same channel', async () => {
		const received: string[] = [];
		const { unlisten } = await sql.listen('chat_room_test-artist', (payload) => {
			received.push(payload);
		});

		await sql.notify(
			'chat_room_test-artist',
			JSON.stringify({ kind: 'message', message: { id: 'm1' } })
		);

		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(received).toEqual([JSON.stringify({ kind: 'message', message: { id: 'm1' } })]);

		await unlisten();
	});
});
```

- [ ] **Step 2: Run test, verify it fails or is skipped without a DB**

Run: `yarn test:unit -- --run src/lib/remote/chat.remote.spec.ts`
Expected: FAIL with a connection error if `yarn db:up` isn't running; start it and
re-run — expected PASS once Postgres is reachable. This test doesn't exercise
`getChatRoom` itself (a live query's generator can't be unit-invoked outside a
request context), only the raw LISTEN/NOTIFY mechanics `chat.remote.ts` depends on —
full behavior is covered by the e2e flow in Task 14.

- [ ] **Step 3: Implement `chat.remote.ts`**

```ts
// src/lib/remote/chat.remote.ts
import { query, getRequestEvent } from '$app/server';
import { EntitlementService } from '$lib/server/entitlement';
import { resolveTargetOwnerUserId } from '$lib/server/messages/policy';
import { subscribeToChatRoom } from '$lib/server/chat/listener';
import { presence } from '$lib/server/chat/presence';
import { maskChatEvent } from '$lib/server/chat/broadcast';
import { createAsyncQueue } from '$lib/server/chat/asyncQueue';
import { isUuid } from '$lib/server/security/uuid';
import type { ChatFrame } from '$lib/messages/types';
import type { ChatMessagePublished } from '$lib/server/chat/broadcast';

/**
 * Streams one artist chat room to whoever is connected. Subscribers get real
 * messages; everyone else gets the masked teaser (spec §4.3–4.5). Presence frames
 * (`onlineCount`, `artistOnline`) go to both, unmasked — that's the whole point of
 * the teaser: real signal, fake content.
 */
export const getChatRoom = query.live('unchecked', async function* (artistId: unknown) {
	if (!isUuid(artistId)) throw new Error('invalid_artist_id');

	const { locals } = getRequestEvent();
	const viewerUserId = locals.user?.id ?? null;

	const [isSubscriber, ownerUserId] = await Promise.all([
		EntitlementService.isSubscriberOf(viewerUserId, artistId),
		resolveTargetOwnerUserId('artist', artistId)
	]);
	const isArtist = Boolean(viewerUserId) && viewerUserId === ownerUserId;
	const connectionId = crypto.randomUUID();

	const queue = createAsyncQueue<ChatFrame>();

	const leavePresence = presence.join(
		artistId,
		{ connectionId, userId: viewerUserId, isArtist },
		(snapshot) => queue.push({ type: 'presence', ...snapshot })
	);
	// Seed the frame the connecting client needs immediately — otherwise the header
	// shows nothing until the next unrelated presence change.
	queue.push({ type: 'presence', ...presence.snapshot(artistId) });

	const stopListening = await subscribeToChatRoom(artistId, (event: ChatMessagePublished) => {
		queue.push(maskChatEvent(event, isSubscriber));
	});

	try {
		for await (const frame of queue.iterate()) {
			yield frame;
		}
	} finally {
		await stopListening();
		leavePresence();
		queue.close();
	}
});
```

- [ ] **Step 4: Type-check**

Run: `yarn check`
Expected: no errors (requires the `svelte.config.js` remote-functions flag from
Task 1 to already be enabled).

- [ ] **Step 5: Commit**

```bash
git add src/lib/remote/chat.remote.ts src/lib/remote/chat.remote.spec.ts
git commit -m "feat(chat): add getChatRoom live query (LISTEN/NOTIFY + presence)"
```

---

## PR Slice 5 — UI/UX design pass

### Task 11: `/ui-ux-pro-max` design direction

**Files:**

- Create: `docs/design/2026-08-18-fan-chat-ui-direction.md`

**Interfaces:**

- Produces: the visual direction consumed by Task 12 (`ChatWidget.svelte`) — layout,
  color/blur treatment for the teaser, header presence indicator styling, message
  bubble/row styling for the subscriber view, empty-state treatment.

- [ ] **Step 1: Read the current mock and existing tokens**

Read `src/routes/(app)/artist/[slug]/+page.svelte` lines 157–174 (the mock
`.sidebar-card` "Fan room" block being replaced) and `src/styles/` tokens, so the
design pass builds on the existing dark-artist-page aesthetic rather than inventing a
new visual language (same constraint the `studio-music-upload-refactor` spec locked
for its own UI work).

- [ ] **Step 2: Run the design pass**

Invoke: `/ui-ux-pro-max` with this brief —

> Design the fan chat widget for the PDM artist page sidebar (replacing the mock
> "Fan room" card at `src/routes/(app)/artist/[slug]/+page.svelte:157-174`). Two
> states share one widget: (1) **subscriber view** — a live scrolling message list
> (reuse the existing `MessageList`/`MessageComposer` visual language from
> `src/lib/ui/components/`) with a header showing online count and "artist in room"
> indicator; (2) **non-subscriber teaser** — same header (real online count, real
> artist-in-room status), body blurred/obscured with placeholder message rows that
> visibly react in real time when a real message arrives (new blurred row appears),
> plus a subscribe CTA. Match the existing dark artist-page aesthetic (see
> `.sidebar-card`, `.online-dot` in the file above) — evolve it, don't replace it.
> Deliverable: written direction (layout, spacing, blur technique, color/motion for
> the presence indicator and the arriving-message reaction) saved as this file.

- [ ] **Step 3: Save the output**

Save the design pass's output to `docs/design/2026-08-18-fan-chat-ui-direction.md`.

- [ ] **Step 4: Commit**

```bash
git add docs/design/2026-08-18-fan-chat-ui-direction.md
git commit -m "docs(chat): fan chat widget UI/UX direction"
```

---

## PR Slice 6 — `ChatWidget` + wiring

### Task 12: `client/chat.ts` + `ChatWidget.svelte` (page-scoped guest mode)

**Files:**

- Create: `src/lib/client/chat.ts`
- Create: `src/lib/client/chat.spec.ts`
- Create: `src/lib/ui/components/ChatWidget.svelte`
- Create: `src/lib/ui/components/ChatWidget.svelte.spec.ts`

**Interfaces:**

- Consumes: `ChatDTO`/`ChatErrorCode`/`ChatFrame` (Task 3), `errorMessage`/
  `GENERIC_ERROR` from `$lib/client/errors`, `getChatRoom` (Task 10), `MessageList`/
  `MessageComposer` from `$lib/ui/components/`, the design direction (Task 11).
- Produces: `fetchChatHistory`, `postChatMessage`, `deleteChatMessage` — consumed by
  `ChatWidget.svelte`. `<ChatWidget artistId isSubscriber isArtist canSubscribe />` —
  consumed by the artist page (Task 13) directly for guests, and indirectly for
  subscribers via the `chatStore` (Task 13).

- [ ] **Step 1: Write the failing tests for `client/chat.ts`**

```ts
// src/lib/client/chat.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchChatHistory, postChatMessage, deleteChatMessage } from './chat';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => vi.clearAllMocks());

describe('fetchChatHistory', () => {
	it('returns messages on success', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: 'm1' }] }) });
		const result = await fetchChatHistory('a1');
		expect(result).toEqual({ ok: true, messages: [{ id: 'm1' }] });
	});

	it('maps a not_subscribed error to copy', async () => {
		fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'not_subscribed' }) });
		const result = await fetchChatHistory('a1');
		expect(result).toEqual({ ok: false, error: 'Subscribe to join the conversation.' });
	});
});

describe('postChatMessage', () => {
	it('posts to /api/chat and returns the created message', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ message: { id: 'm2' } }) });
		const result = await postChatMessage('a1', 'hello');

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/chat',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ artistId: 'a1', body: 'hello' })
			})
		);
		expect(result).toEqual({ ok: true, message: { id: 'm2' } });
	});
});

describe('deleteChatMessage', () => {
	it('deletes with the artistId as a query param', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
		const result = await deleteChatMessage('a1', 'm2');

		expect(fetchMock).toHaveBeenCalledWith('/api/chat/m2?artistId=a1', { method: 'DELETE' });
		expect(result).toEqual({ ok: true });
	});
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `yarn test:unit -- --run src/lib/client/chat.spec.ts`
Expected: FAIL — `./chat` does not exist yet.

- [ ] **Step 3: Implement `client/chat.ts`**

```ts
// src/lib/client/chat.ts
import type { ChatDTO, ChatErrorCode } from '$lib/messages/types';
import { errorMessage, GENERIC_ERROR } from './errors';

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

export type ChatMessagesResult = Ok<{ messages: ChatDTO[] }> | Fail;
export type ChatMessageResult = Ok<{ message: ChatDTO }> | Fail;
export type ChatDeleteResult = { ok: true } | Fail;

const CHAT_ERROR_COPY = {
	empty: 'Write something first.',
	too_long: 'That message is too long.',
	links_not_allowed: 'Links are not allowed here — only the artist can post links.',
	not_subscribed: 'Subscribe to join the conversation.',
	not_found: 'That message is no longer available.',
	forbidden: "You can't do that.",
	invalid_request: 'That message could not be sent.',
	unauthorized: 'Sign in to join the conversation.'
} satisfies Record<ChatErrorCode, string>;

export async function fetchChatHistory(artistId: string): Promise<ChatMessagesResult> {
	try {
		const response = await fetch(`/api/chat?${new URLSearchParams({ artistId })}`);
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, CHAT_ERROR_COPY, 'Could not load chat.')
			};
		}
		const body = await response.json();
		return { ok: true, messages: Array.isArray(body?.messages) ? body.messages : [] };
	} catch {
		return { ok: false, error: 'Could not load chat.' };
	}
}

export async function postChatMessage(artistId: string, body: string): Promise<ChatMessageResult> {
	try {
		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ artistId, body })
		});
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, CHAT_ERROR_COPY, 'Could not send your message.')
			};
		}
		const payload = await response.json();
		if (!payload?.message?.id) return { ok: false, error: GENERIC_ERROR };
		return { ok: true, message: payload.message };
	} catch {
		return { ok: false, error: 'Could not send your message.' };
	}
}

export async function deleteChatMessage(
	artistId: string,
	messageId: string
): Promise<ChatDeleteResult> {
	try {
		const response = await fetch(`/api/chat/${messageId}?artistId=${artistId}`, {
			method: 'DELETE'
		});
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, CHAT_ERROR_COPY, 'Could not delete that message.')
			};
		}
		return { ok: true };
	} catch {
		return { ok: false, error: 'Could not delete that message.' };
	}
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `yarn test:unit -- --run src/lib/client/chat.spec.ts`
Expected: PASS

- [ ] **Step 5: Write the failing component tests for `ChatWidget.svelte`**

```ts
// src/lib/ui/components/ChatWidget.svelte.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ChatWidget from './ChatWidget.svelte';

vi.mock('$lib/remote/chat.remote', () => ({
	getChatRoom: () => {
		async function* empty() {
			yield { type: 'presence', onlineCount: 3, artistOnline: true };
		}
		return empty();
	}
}));
vi.mock('$lib/client/chat', () => ({
	fetchChatHistory: vi.fn().mockResolvedValue({ ok: true, messages: [] }),
	postChatMessage: vi.fn(),
	deleteChatMessage: vi.fn()
}));

describe('ChatWidget — guest (non-subscriber)', () => {
	it('shows the online count and artist-in-room status without any message body', async () => {
		render(ChatWidget, {
			artistId: 'a1',
			isSubscriber: false,
			isArtist: false,
			canSubscribe: true
		});

		expect(await screen.findByText(/3/)).toBeTruthy();
		expect(screen.queryByPlaceholderText(/message/i)).toBeNull();
	});
});
```

- [ ] **Step 6: Run tests, verify they fail**

Run: `yarn test:unit -- --run src/lib/ui/components/ChatWidget.svelte.spec.ts`
Expected: FAIL — `./ChatWidget.svelte` does not exist yet.

- [ ] **Step 7: Implement `ChatWidget.svelte`**

Build the markup/styling from Task 11's design direction. The reactive/data core —
independent of visual styling — must follow this shape:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { getChatRoom } from '$lib/remote/chat.remote';
	import { fetchChatHistory, postChatMessage, deleteChatMessage } from '$lib/client/chat';
	import { chatStore } from '$lib/stores/chat.svelte';
	import MessageList from './MessageList.svelte';
	import MessageComposer from './MessageComposer.svelte';
	import type { ChatDTO, ChatFrame } from '$lib/messages/types';

	let {
		artistId,
		isSubscriber,
		isArtist,
		canSubscribe
	}: {
		artistId: string;
		isSubscriber: boolean;
		isArtist: boolean;
		canSubscribe: boolean;
	} = $props();

	// Subscribers read from the platform-wide store (opened in the root layout);
	// guests open a page-scoped connection here, torn down on unmount.
	let localMessages = $state<ChatFrame[]>([]);
	let onlineCount = $state(0);
	let artistOnline = $state(false);

	function applyFrame(frame: ChatFrame) {
		if (frame.type === 'presence') {
			onlineCount = frame.onlineCount;
			artistOnline = frame.artistOnline;
		} else {
			localMessages = [...localMessages, frame];
		}
	}

	$effect(() => {
		if (isSubscriber) {
			const room = chatStore.rooms[artistId];
			if (room) {
				onlineCount = room.onlineCount;
				artistOnline = room.artistOnline;
			}
			return;
		}

		let cancelled = false;
		(async () => {
			for await (const frame of getChatRoom(artistId)) {
				if (cancelled) break;
				applyFrame(frame);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	let history = $state<ChatDTO[]>([]);
	onMount(async () => {
		if (!isSubscriber) return;
		const result = await fetchChatHistory(artistId);
		if (result.ok) history = [...result.messages].reverse();
	});

	const messages = $derived(
		isSubscriber
			? [
					...history,
					...(isSubscriber ? (chatStore.rooms[artistId]?.messages ?? localMessages) : [])
						.filter((f): f is Extract<ChatFrame, { type: 'message' }> => f.type === 'message')
						.map((f) => f.message)
				]
			: []
	);

	const teasers = $derived(
		localMessages.filter((f): f is Extract<ChatFrame, { type: 'teaser' }> => f.type === 'teaser')
	);

	async function handleSubmit(body: string): Promise<boolean> {
		const result = await postChatMessage(artistId, body);
		return result.ok;
	}

	async function handleDelete(messageId: string) {
		await deleteChatMessage(artistId, messageId);
	}
</script>

<section class="chat-widget">
	<header class="chat-header">
		<span class="online-dot" class:offline={onlineCount === 0}></span>
		<span>{onlineCount} online</span>
		{#if artistOnline}
			<span class="artist-in-room">Artist in room</span>
		{/if}
	</header>

	{#if isSubscriber}
		<MessageList
			messages={messages.map((m) => ({ ...m, canEdit: false, likeCount: 0, likedByViewer: false }))}
			onDelete={handleDelete}
		/>
		<MessageComposer placeholder="Message the room…" onSubmit={handleSubmit} />
	{:else}
		<div class="teaser-body" aria-hidden="true">
			{#each teasers.slice(-6) as teaser (teaser.id)}
				<div class="teaser-row"></div>
			{/each}
		</div>
		{#if canSubscribe}
			<p class="teaser-cta">Subscribe to join the conversation — $1/mo.</p>
		{/if}
	{/if}
</section>
```

(Styling per Task 11's direction goes in the component's `<style lang="scss">` block —
not reproduced here since it's the design pass's output, not architecture.)

- [ ] **Step 8: Run tests, verify they pass**

Run: `yarn test:unit -- --run src/lib/ui/components/ChatWidget.svelte.spec.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/client/chat.ts src/lib/client/chat.spec.ts src/lib/ui/components/ChatWidget.svelte src/lib/ui/components/ChatWidget.svelte.spec.ts
git commit -m "feat(chat): add ChatWidget component + client fetch wrappers"
```

### Task 13: Platform-wide subscriber wiring + artist page integration

**Files:**

- Create: `src/lib/stores/chat.svelte.ts`
- Modify: `src/routes/(app)/+layout.server.ts`
- Modify: `src/routes/(app)/+layout.svelte`
- Modify: `src/routes/(app)/artist/[slug]/+page.svelte`

**Interfaces:**

- Consumes: `getChatRoom` (Task 10), `EntitlementService.getSubscribedArtistIds`
  (already exists), `ChatWidget` (Task 12).
- Produces: `chatStore.rooms: Record<string, RoomState>`, `chatStore.open(artistId)`,
  `chatStore.close(artistId)`, `chatStore.closeAll()` — consumed by `ChatWidget.svelte`
  and the root layout.

- [ ] **Step 1: Implement `src/lib/stores/chat.svelte.ts`**

```ts
import { getChatRoom } from '$lib/remote/chat.remote';
import type { ChatFrame } from '$lib/messages/types';

interface RoomState {
	messages: ChatFrame[];
	onlineCount: number;
	artistOnline: boolean;
}

function createRoomState(): RoomState {
	return { messages: [], onlineCount: 0, artistOnline: false };
}

/**
 * Platform-wide chat connections for a logged-in subscriber. Opened once per
 * subscribed artist from the root layout and kept alive across client-side
 * navigation — "online" means "on the platform," not "looking at this chat right
 * now" (spec §1, Locked decision 4). Guests never use this store; their connection
 * is page-scoped, owned directly by `ChatWidget`.
 */
class ChatStore {
	rooms = $state<Record<string, RoomState>>({});
	#cancelled = new Map<string, { value: boolean }>();

	open(artistId: string): void {
		if (this.#cancelled.has(artistId)) return;
		this.rooms[artistId] = createRoomState();

		const flag = { value: false };
		this.#cancelled.set(artistId, flag);

		(async () => {
			for await (const frame of getChatRoom(artistId)) {
				if (flag.value) break;
				const state = this.rooms[artistId];
				if (!state) continue;
				if (frame.type === 'presence') {
					state.onlineCount = frame.onlineCount;
					state.artistOnline = frame.artistOnline;
				} else {
					state.messages = [...state.messages, frame];
				}
			}
		})();
	}

	close(artistId: string): void {
		const flag = this.#cancelled.get(artistId);
		if (flag) flag.value = true;
		this.#cancelled.delete(artistId);
		delete this.rooms[artistId];
	}

	closeAll(): void {
		for (const artistId of [...this.#cancelled.keys()]) this.close(artistId);
	}
}

export const chatStore = new ChatStore();
```

- [ ] **Step 2: Add `subscribedArtistIds` to the root layout load**

In `src/routes/(app)/+layout.server.ts`:

```ts
import { PlaylistService } from '$lib/db/services/PlaylistService';
import { EntitlementService } from '$lib/server/entitlement';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = event.locals.user;

	return {
		user,
		session: event.locals.session,
		user_playlists: user ? PlaylistService.getUserPlaylists(user.id) : [],
		subscribedArtistIds: user ? await EntitlementService.getSubscribedArtistIds(user.id) : []
	};
};
```

- [ ] **Step 3: Open/close platform-wide rooms in the root layout**

In `src/routes/(app)/+layout.svelte`, add after the existing `let sidebarExpand`
declaration:

```svelte
	import { chatStore } from '$lib/stores/chat.svelte';

	$effect(() => {
		for (const artistId of data.subscribedArtistIds ?? []) chatStore.open(artistId);
		return () => chatStore.closeAll();
	});
```

- [ ] **Step 4: Replace the mock chat block on the artist page**

In `src/routes/(app)/artist/[slug]/+page.svelte`, replace lines 157–174 (the
`.sidebar-card` with the hardcoded `Array(6)` fan-message mock) with:

```svelte
<section class="sidebar-card">
	<div class="section-heading compact">
		<div>
			<p class="eyebrow">Community</p>
			<h2>Fan room</h2>
		</div>
	</div>
	<ChatWidget
		artistId={artist.id}
		isSubscriber={viewer.isSubscribed}
		isArtist={viewer.isOwner}
		canSubscribe={viewer.canSubscribe}
	/>
</section>
```

Add the import alongside the other component imports:

```ts
import ChatWidget from '$lib/ui/components/ChatWidget.svelte';
```

Remove the now-unused `.online-dot` / `.chat-preview` / `.message-row` style rules
that only served the mock (verify nothing else in the file still references them
before deleting).

- [ ] **Step 5: Type-check**

Run: `yarn check`
Expected: no errors.

- [ ] **Step 6: Manual smoke test**

Run: `yarn dev`, open two browser profiles (one logged in as a subscriber of a test
artist, one anonymous), navigate both to that artist's page, post a message as the
subscriber, and confirm: the subscriber's own view updates live; the anonymous
view's teaser reacts (a new blurred row appears, online count is accurate) without
ever showing the real text.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores/chat.svelte.ts src/routes/\(app\)/+layout.server.ts src/routes/\(app\)/+layout.svelte "src/routes/(app)/artist/[slug]/+page.svelte"
git commit -m "feat(chat): wire platform-wide subscriber rooms + artist page widget"
```

### Task 14: End-to-end flow

**Files:**

- Create: `e2e/chat.spec.ts`

**Interfaces:**

- Consumes: the full stack (Tasks 1–13) through the running app; `TEST_DATABASE_URL`
  from `./test-db.mjs`, matching `e2e/comments.spec.ts`'s seeding style.

- [ ] **Step 1: Write the e2e test**

```ts
// e2e/chat.spec.ts
import { expect, test, chromium } from '@playwright/test';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import postgres from 'postgres';
import { TEST_DATABASE_URL } from './test-db.mjs';

function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

function sessionIdFor(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

test.describe.serial('fan chat', () => {
	const sql = postgres(TEST_DATABASE_URL, { max: 1 });

	let artistId: string;
	let artistSlug: string;
	let fanSessionToken: string;

	test.beforeAll(async () => {
		const stamp = Date.now();
		artistSlug = `e2e-chat-artist-${stamp}`;

		const [owner] = await sql`
			insert into users.users (email, display_name)
			values (${`e2e-chat-owner-${stamp}@example.test`}, 'E2E Chat Owner')
			returning id
		`;
		const [artist] = await sql`
			insert into artist.artists (user_id, name, slug)
			values (${owner.id}, 'E2E Chat Artist', ${artistSlug})
			returning id
		`;
		artistId = artist.id;

		const [fan] = await sql`
			insert into users.users (email, display_name)
			values (${`e2e-chat-fan-${stamp}@example.test`}, 'E2E Fan')
			returning id
		`;
		fanSessionToken = generateSessionToken();
		await sql`
			insert into users.sessions (id, user_id, expires_at)
			values (${sessionIdFor(fanSessionToken)}, ${fan.id}, now() + interval '1 day')
		`;
		await sql`
			insert into finance.subscriptions (user_id, artist_id, status)
			values (${fan.id}, ${artistId}, 'active')
		`;
	});

	test.afterAll(async () => {
		await sql.end();
	});

	test('a subscriber posts and a guest sees the teaser react without the real body', async ({
		baseURL
	}) => {
		const fanBrowser = await chromium.launch();
		const fanContext = await fanBrowser.newContext();
		await fanContext.addCookies([
			{
				name: 'session',
				value: fanSessionToken,
				url: baseURL
			}
		]);
		const fanPage = await fanContext.newPage();

		const guestBrowser = await chromium.launch();
		const guestContext = await guestBrowser.newContext();
		const guestPage = await guestContext.newPage();

		await fanPage.goto(`/artist/${artistSlug}`);
		await guestPage.goto(`/artist/${artistSlug}`);

		const secretText = `secret-${Date.now()}`;
		await fanPage.getByPlaceholder('Message the room…').fill(secretText);
		await fanPage.getByRole('button', { name: 'Send' }).click();

		await expect(fanPage.getByText(secretText)).toBeVisible();

		// The guest must never see the real body — only a reacting teaser row —
		// and the online count must reflect both connected viewers.
		await expect(guestPage.locator('.teaser-row')).toHaveCount(1, { timeout: 5000 });
		await expect(guestPage.getByText(secretText)).toHaveCount(0);
		await expect(guestPage.getByText(/2 online/)).toBeVisible();

		await fanContext.close();
		await fanBrowser.close();
		await guestContext.close();
		await guestBrowser.close();
	});
});
```

- [ ] **Step 2: Run the e2e test**

Run: `yarn test:e2e -- e2e/chat.spec.ts`
Expected: PASS. If the subscription seed's column names or the `session` cookie
mechanics don't match this repo's exact e2e harness conventions, adjust against
`e2e/comments.spec.ts` and `e2e/global-teardown.ts` (same `pdm_e2e` database,
dropped after the run — no manual cleanup needed) rather than guessing further.

- [ ] **Step 3: Commit**

```bash
git add e2e/chat.spec.ts
git commit -m "test(chat): add e2e coverage for the realtime teaser masking"
```

---

## Self-Review Notes

- **Spec coverage:** Locked decisions 1 (transport) → Tasks 4/9/10; 2 (masking) →
  Task 4 (`broadcast.ts`); 3 (teaser widget) → Tasks 11/12; 4 (presence lifecycle) →
  Tasks 7/13; 5 (data/moderation reuse) → Tasks 1/2/5; 6 (history via keyset) →
  Task 2/6; 7 (design step precedes UI) → Task 11 before Task 12. Out-of-scope items
  (rate limiting, Redis, background notifications, threading/likes) are not
  implemented anywhere in this plan — confirmed by absence, not by an explicit
  "skip" step.
- **`svelte.config.js` timing:** the spec's PR slicing said "prereq folded into
  Slice 1"; this plan does exactly that (Task 1, Step 1) rather than deferring it to
  the live-query slice, since Slice 1's migration work and everything after it can
  then assume remote functions are available.
- **File consolidation:** `events.ts` and `mask.ts` were merged into one
  `broadcast.ts` (Task 4) — both were only a few lines, always used together, and
  are the two ends of the same `ChatMessagePublished` shape. `presence.ts`,
  `asyncQueue.ts`, and `listener.ts` stayed separate: each holds real internal state
  (a `Map`/`EventEmitter`, a push-queue, a ref-counted subscription registry) and has
  its own independent test suite, so merging them would trade cohesion for a smaller
  file count without an actual benefit.
- **Type consistency check:** `ChatDTO`/`ChatFrame`/`ChatErrorCode` (Task 3) are the
  single definitions reused verbatim by `broadcast.ts` (Task 4), `ChatService`
  (Task 5), `chat.remote.ts` (Task 10), `client/chat.ts` and `ChatWidget.svelte`
  (Task 12) — no shadow/duplicate type names introduced. `ChatMessagePublished`
  (Task 4) is reused identically by `listener.ts` (Task 9) and `chat.remote.ts`
  (Task 10). `presence.join`/`presence.snapshot` signatures (Task 7) match their call
  sites in `chat.remote.ts` (Task 10) exactly. `ChatRepository.getMessages` (Task 2)
  and `ChatService.getMessages` (Task 5) share the same name across layers, matching
  the existing `CommentRepository.listForTarget`/`CommentService.listForTarget`
  precedent — renamed from the original `listForArtist` per review feedback.
