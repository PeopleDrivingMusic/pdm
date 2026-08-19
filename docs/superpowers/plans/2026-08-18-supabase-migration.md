# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move PDM's Postgres from local docker-compose to Supabase managed
Postgres, with Supabase Realtime brought into scope alongside it, on the single
already-provisioned project (`falcoioeiutzoselpnhe`).

**Architecture:** Two connection strings (`DATABASE_URL` via the transaction-mode
pooler for the app, `DIRECT_DATABASE_URL` via the direct connection for
`drizzle-kit`), `prepare: false` + raised `max` in `postgres-js`, `supabase start`
replacing docker-compose Postgres for local dev, and the e2e harness's schema-clone
step rewritten to not depend on `docker exec`-ing into a named container.

**Tech Stack:** Supabase (managed Postgres 17 + Realtime), Supabase CLI
(`supabase start`), Drizzle ORM + `postgres-js`, existing Playwright e2e harness.

**Spec:** `docs/superpowers/specs/2026-08-18-supabase-migration-design.md` — this
plan implements it task-by-task; read both.

## Global Constraints

- Single Supabase project for dev/staging/prod, not the two-project split (spec §1.1).
- Scope is **DB + Realtime only** — Auth, Storage, Edge Functions stay out (spec §1.3).
- `prepare: false` is set unconditionally, not branched by environment (spec §3.2).
- `drizzle-kit` migrations always go through `DIRECT_DATABASE_URL` (port 5432),
  never the pooler (spec §3.3).
- The Supabase project itself is empty, but local dev data is **not** discarded —
  Task 1 is a schema-scoped `pg_dump`/`pg_restore` from local Docker Postgres, not
  a fresh `yarn db:migrate` baseline (spec §3.4, revised).
- Backup storage is a dedicated target the user provisions separately, with
  retention/expiry — never the R2 media bucket (spec §3.5, revised).
- Local dev uses `supabase start`, not docker-compose Postgres — already removed
  from `docker-compose.yml` on this branch (spec §1.2, §4).

---

## File Structure

**Create:**

- `docs/db/nightly-backup.md` or equivalent — the `pg_dump` → R2 cron, wherever this
  repo's convention puts operational scripts (check `scheduled-jobs.md` in the wiki
  for the existing pattern before picking a location).

**Modify:**

- `src/lib/db/index.ts` — `prepare: false`, raise `max`.
- `drizzle.config.ts` — `DIRECT_DATABASE_URL` instead of `DATABASE_URL`.
- `.env` / `.env.example` — split `DATABASE_URL` into pooler + direct variants
  (`.env.example` already had its pgAdmin var swapped this branch).
- `e2e/test-db.mjs`, `e2e/setup-test-db.mjs` — remove the `docker exec
${POSTGRES_CONTAINER}` dependency; clone the `pdm_e2e` schema by running
  `drizzle-kit migrate` against it instead of `pg_dump | psql` inside a named
  container that no longer exists in `docker-compose.yml`.
- `.claude/wiki/decisions/supabase-managed-postgres.md` — remove "Realtime... out of
  scope", update status from "not scheduled, P2" to reflect this work.
- `.claude/wiki/architecture/local-development.md` — replace `docker-compose up -d`
  DB instructions with `supabase start`/`supabase stop`.
- GitHub issue #24 — scope amendment comment, matching the spec.

---

## Task 1: Carry the local dev data into Supabase (schema + data, not a fresh baseline)

**Files:** none (infrastructure step against the local Docker Postgres and the live
Supabase project)

**Interfaces:**

- Consumes: the running local `pdm-postgres` container (still present — only the
  `docker-compose.yml` _service definition_ was removed this branch, the container
  and its `postgres_data` volume are untouched until someone tears them down), the
  Supabase MCP tools already connected to project `falcoioeiutzoselpnhe`.
- Produces: a Supabase Postgres instance with PDM's real dev data already in it — so
  local `supabase start` (Task 4) and the cloud project both start from the same
  populated state, not an empty one. Testing doesn't restart from zero.

**Correction from the first pass of this plan:** the original Task 1 planned a bare
`yarn db:migrate` against an empty Supabase database (true — `list_tables` returned
`[]`) — but that only recreates the _schema_, not the dev fixtures (test users,
artists, sample tracks, etc.) that already exist in the local Docker Postgres. Per
review feedback, this needs to be a real `pg_dump`/restore, not a migration replay.

**Also important:** the dump must be **scoped to PDM's own schemas only** — `users`,
`artist`, `content`, `catalog`, `engagement`, `finance`, `messages` (the complete
list, confirmed via `grep pgSchema( src/lib/db/schemas/`). Supabase's Postgres
already has its own reserved schemas and roles (`auth`, `storage`, `realtime`,
`public`, plus `anon`/`authenticated`/`service_role`) — a blanket `pg_dump` of the
whole local database (or `pg_dumpall`) would try to touch those and could collide
with what Supabase already manages. Never dump/restore outside the 7 schemas above.

- [ ] **Step 1: Confirm the local container is up and has the expected schemas**

Run: `docker ps --filter "name=pdm-postgres"` (start it via the previous
`docker-compose up -d postgres` invocation if it's not running — the service
definition was removed from `docker-compose.yml` on this branch, so bring it up from
git history if needed, e.g. `git show main:docker-compose.yml > /tmp/old-compose.yml
&& docker compose -f /tmp/old-compose.yml up -d postgres`, or restore from the
`postgres_data` volume directly).
Expected: container running, and `psql $DATABASE_URL -c '\dn'` lists all 7 schemas.

- [ ] **Step 2: Dump the 7 PDM schemas (schema + data)**

```bash
pg_dump "$DATABASE_URL" \
  --schema=users --schema=artist --schema=content --schema=catalog \
  --schema=engagement --schema=finance --schema=messages \
  --no-owner --no-privileges --format=custom \
  --file=pdm-dev-dump.dump
```

`--no-owner --no-privileges` because the local dump's roles (`admin`) don't exist on
Supabase and shouldn't be recreated there — Supabase's own `postgres` role owns
everything post-restore. `--format=custom` so `pg_restore` can run with
`--if-exists --clean` safely if this needs to be re-run.

- [ ] **Step 3: Confirm the target is still empty, then get the direct-connection string**

Run (MCP): `list_tables` for project `falcoioeiutzoselpnhe`.
Expected: `[]` (matches the check already done in conversation — reconfirm since
time may have passed; if it's _not_ empty, stop — that means someone else already
restored into it, don't overwrite blindly).

Run (MCP): `get_project` for `falcoioeiutzoselpnhe`, or read the direct-connection
string from the Supabase dashboard's Database Settings page. Do not hardcode the
password into any committed file — it goes into local `.env` only (Task 2, Step 2).

- [ ] **Step 4: Restore into the Supabase project**

```bash
pg_restore --no-owner --no-privileges \
  -d "postgresql://postgres:[password]@db.falcoioeiutzoselpnhe.supabase.co:5432/postgres" \
  pdm-dev-dump.dump
```

(Direct connection, port 5432 — same reasoning as `drizzle-kit`: this is DDL +
session-level work, not something the transaction-mode pooler supports.)

- [ ] **Step 5: Verify**

Run (MCP): `list_tables` again for the same project.
Expected: every table from `src/lib/db/schema.ts`'s aggregator present, under the
same 7 schemas, **with row counts matching the local dump** (spot-check a couple —
e.g. `select count(*) from users.users` — against the local source).

- [ ] **Step 6: Run advisors**

Run (MCP): `get_advisors` for the project.
Expected: no unexpected findings. RLS is not yet enabled on any of these tables at
this point (that's the fan-chat plan's job once it resumes) — if the advisor flags
missing RLS, note it but don't fix it in this task; confirm rather than assume it'll
be quiet.

- [ ] **Step 7: Keep the dump file for Task 4**

`pdm-dev-dump.dump` is reused as-is to seed local `supabase start` — don't delete it
until Task 4 finishes. Don't commit it to git (it contains real dev data + is a
binary artifact) — add `pdm-dev-dump.dump` to `.gitignore` if it isn't already
covered by an existing `*.dump`/binary-artifact pattern.

---

## Task 2: Repoint the app at Supabase (pooler + direct connections)

**Files:**

- Modify: `src/lib/db/index.ts`
- Modify: `drizzle.config.ts`
- Modify: `.env`, `.env.example`

**Interfaces:**

- Consumes: the restored schema+data from Task 1.
- Produces: `db`/`client` (from `src/lib/db/index.ts`) now talking to Supabase
  through the pooler — every existing `db/services/*` and `db/queries.ts` caller is
  unaffected, since none of them touch connection config directly.

**Do every `db/services/*` call go through the pooler? Yes, automatically, no
per-service changes needed.** Every DB service and query in the app
(`src/lib/db/services/*`, `src/lib/db/queries.ts`, `ContentApplicationService`, etc.)
imports the same single `db`/`client` singleton exported from `src/lib/db/index.ts`
— there's no per-service connection config anywhere else to update. Once this one
file points at the pooler, every caller does too, transparently.

Checked for anything that would specifically _not_ survive transaction-mode pooling
(a physical connection is only held for one transaction's duration, so it can't
support session-level state across separate requests): grepped the whole `src/`
tree for `.transaction(`, `pg_advisory`, `LISTEN `/`NOTIFY `, and raw `.unsafe(` —
**zero matches anywhere.** Nothing in the current codebase relies on multi-statement
sessions, advisory locks, or Postgres pub/sub, so there's nothing that needs special
handling — every existing query is a plain single-statement call, exactly what
transaction-mode pooling is built for.

- [ ] **Step 1: Split `.env.example`'s `DATABASE_URL` into two vars**

```
# Supabase — transaction-mode pooler (app queries)
DATABASE_URL="postgresql://postgres:{password}@db.{ref}.supabase.co:6543/postgres?sslmode=require"
# Supabase — direct connection (drizzle-kit migrations only)
DIRECT_DATABASE_URL="postgresql://postgres:{password}@db.{ref}.supabase.co:5432/postgres?sslmode=require"
```

Remove the now-unused `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_NAME`
block (confirmed unread by any file under `src/` — spec §2).

- [ ] **Step 2: Set the same two vars in local `.env`**

For local dev (once Task 4 sets up `supabase start`), both point at
`127.0.0.1:54322` — see spec §3.1. For now, point them at the real Supabase project
(from Task 1) so Task 3's verification runs against a real target.

- [ ] **Step 3: Update `src/lib/db/index.ts`**

```ts
const client = postgres(process.env.DATABASE_URL!, {
	max: Number(process.env.DATABASE_POOL_MAX ?? 10),
	prepare: false,
	onnotice: (notice) => {
		logger.info(`PostgreSQL notice: ${notice.message}`, {
			component: 'database',
			metadata: { severity: notice.severity, code: notice.code }
		});
	},
	debug: (connection, query, parameters) => {
		if (process.env.NODE_ENV === 'development') {
			logger.debug('SQL Query executed', {
				component: 'database',
				metadata: {
					query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
					parameters,
					connection
				}
			});
		}
	}
});
```

(Only the first two lines of the options object change — `max: 1` becomes the env-
driven pool size, and `prepare: false` is added. Everything else is untouched.)

- [ ] **Step 4: Update `drizzle.config.ts`**

```ts
export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/db/schema.ts',
	out: './drizzle/migrations',
	dbCredentials: {
		url: process.env.DIRECT_DATABASE_URL!
	},
	verbose: true,
	strict: true
});
```

- [ ] **Step 5: Verify**

Run: `yarn check`
Expected: no type errors (env var name changes don't affect types directly, but
confirms nothing else broke).

Run: `yarn db:generate`
Expected: no diff — schema already matches what Task 1 applied, so this should
produce an empty migration (delete it if drizzle-kit creates an empty file; if it
proposes _any_ real change, stop and investigate before proceeding — that means
Task 1's baseline apply and the current `schema.ts` have drifted).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/index.ts drizzle.config.ts .env.example
git commit -m "feat(db): point app + drizzle-kit at Supabase (pooler + direct)"
```

(`.env` itself is gitignored — not committed.)

---

## Task 3: Verify the app against Supabase

**Files:** none (verification task, matches issue #24's acceptance criteria)

**Interfaces:**

- Consumes: Task 2's connection config.
- Produces: confidence that nothing regressed — this is the gate before local dev
  workflow and e2e get rewired in Tasks 4–5.

- [ ] **Step 1: Run the unit suite**

Run: `yarn test:unit -- --run`
Expected: PASS. Most unit tests mock `$lib/db`/repositories directly and don't hit a
real connection, so this mainly catches import/type breakage from Task 2.

- [ ] **Step 2: Smoke-test the dev server**

Run: `yarn dev`, open the app, confirm the homepage and an artist page load (both
exercise real `db/services/*` queries against the new Supabase connection).

- [ ] **Step 3: Confirm no prepared-statement errors under concurrent load**

With the dev server running, open several tabs simultaneously (or use a quick load
tool) hitting a few different routes at once.
Expected: no `prepared statement "..." does not exist` or similar errors in the
server log — this is the most common transaction-mode migration failure named in
`database-hosting.md`, and the reason `prepare: false` is mandatory (Task 2, Step 3).

- [ ] **Step 4: Record latency before/after**

Compare a few representative query timings (via the existing `withDbLogging`
structured logs) against local docker Postgres baseline numbers, if available from
before this branch. Expected: within the 5–15ms RTT range `database-hosting.md`
already predicted for a managed provider — not a regression beyond that.

---

## Task 4: Local development via `supabase start`

**Files:**

- Modify: `.claude/wiki/architecture/local-development.md`
- Modify: `.env` (local dev values)

**Interfaces:**

- Consumes: the Supabase CLI (`supabase` binary — confirm installed: `supabase
--version`; install per `https://supabase.com/docs/guides/local-development` if
  missing).
- Produces: a local Postgres + Realtime + Studio stack any contributor can start
  without touching the shared cloud project.

- [ ] **Step 1: Initialize the local Supabase config (if not already present)**

Run: `supabase init` (skip if `supabase/config.toml` already exists in the repo —
check first with `Glob`).

- [ ] **Step 2: Start the local stack**

Run: `supabase start`
Expected output includes (per the current CLI docs, confirmed this session):

```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

- [ ] **Step 3: Restore the same dump from Task 1 into the local stack**

Reuses `pdm-dev-dump.dump` from Task 1, Step 7 — so local dev and the cloud project
start from the same populated data, not an empty schema:

```bash
pg_restore --no-owner --no-privileges \
  -d "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  pdm-dev-dump.dump
```

Expected: same tables + row counts as Task 1's cloud restore. (`yarn db:migrate`
against the local `DIRECT_DATABASE_URL` is _not_ needed here — the dump already
carries the full schema; running migrations afterward would be redundant, and only
matters again the next time a _new_ migration is generated post-restore.)

- [ ] **Step 4: Point local `.env` at the local stack**

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
PUBLIC_SUPABASE_STUDIO_URL="http://127.0.0.1:54323"
```

- [ ] **Step 5: Verify**

Run: `yarn dev`, confirm the app works exactly as in Task 3 but against the local
stack. Open `http://127.0.0.1:54323` (Studio) and confirm the schema is visible.

- [ ] **Step 6: Update the local-development wiki page**

Replace `docker-compose up -d` / pgAdmin instructions in
`.claude/wiki/architecture/local-development.md` with `supabase start` /
`supabase stop`, and note that the observability stack (`docker-compose.yml`) is
still started separately (`yarn logging:up` or equivalent — check the page's current
wording for the exact command name).

- [ ] **Step 7: Commit**

```bash
git add .claude/wiki/architecture/local-development.md
git commit -m "docs: local dev via supabase start, replacing docker-compose postgres"
```

(Run from inside `.claude/`, per the nested-repo convention — `git -C .claude add ... && git -C .claude commit ...` — this file lives in the separate `pdm-claude` repo, not the main one.)

---

## Task 5: Fix the e2e harness's schema-clone step

**Files:**

- Modify: `e2e/setup-test-db.mjs`
- Modify: `e2e/test-db.mjs` (drop the now-unused `POSTGRES_CONTAINER` export)

**Interfaces:**

- Consumes: `DIRECT_DATABASE_URL` (needs session-level connection for DDL, same
  reasoning as Task 2).
- Produces: the same `pdm_e2e` throwaway database e2e tests already expect —
  `TEST_DATABASE_URL` (unchanged export) is what `e2e/comments.spec.ts` and the
  planned `e2e/chat.spec.ts` both import.

`setup-test-db.mjs` currently runs `docker exec pdm-postgres pg_dump | psql` to clone
the dev schema into `pdm_e2e` — this breaks the moment `docker-compose.yml`'s
`postgres` service is gone (already removed on this branch), since there's no
container named `pdm-postgres` to exec into anymore. Its own comment says drizzle's
migration journal used to be out of sync, which is why it avoided `drizzle-kit
migrate` for this — but that drift was fixed in PR #35 (issue #25, closed 2026-08-18
per project history), so migrating is trustworthy again.

- [ ] **Step 1: Rewrite `setup-test-db.mjs` to migrate instead of clone**

```js
import { execFileSync } from 'node:child_process';
import postgres from 'postgres';
import { ADMIN_DATABASE_URL, TEST_DATABASE_URL, TEST_DB_NAME } from './test-db.mjs';

// Spins up the ephemeral e2e database right before the Playwright run:
//   1. DROP + CREATE a fresh `pdm_e2e` (nothing lingers between runs)
//   2. apply the real migration history via drizzle-kit (trustworthy since the
//      journal drift fixed in PR #35 / issue #25 — no more docker exec pg_dump
//      into a named container, which doesn't exist once local dev runs on
//      `supabase start` instead of docker-compose Postgres)
// The database is dropped again in e2e/global-teardown.ts.

const admin = postgres(ADMIN_DATABASE_URL, { max: 1 });
try {
	await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE)`);
	await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
} finally {
	await admin.end();
}

execFileSync('yarn', ['drizzle-kit', 'migrate'], {
	stdio: 'inherit',
	env: { ...process.env, DIRECT_DATABASE_URL: TEST_DATABASE_URL }
});

console.log(`[e2e] test database ${TEST_DB_NAME} created and migrated`);
```

- [ ] **Step 2: Remove the now-dead `POSTGRES_CONTAINER`/`DEV_DB_NAME`/`DB_USER`
      exports from `test-db.mjs`** if nothing else imports them (`Grep` to confirm
      before deleting — `DEV_DB_NAME`/`DB_USER` may still be used elsewhere in `e2e/`).

- [ ] **Step 3: Verify**

Run: `yarn test:e2e -- e2e/comments.spec.ts`
Expected: PASS — this is the existing test that already exercises the full
`pdm_e2e` create/migrate/drop cycle, so it's the right smoke test for this change
without needing a new one.

- [ ] **Step 4: Commit**

```bash
git add e2e/setup-test-db.mjs e2e/test-db.mjs
git commit -m "fix(e2e): migrate the test db instead of docker-exec pg_dump cloning"
```

---

## Task 6: Nightly backup + retention (`pg_dump` → dedicated archival storage)

**Files:**

- Create: the backup script, location per whatever convention
  `.claude/wiki/architecture/scheduled-jobs.md` already documents for cron-style
  jobs in this repo — check it before picking a new pattern.

**Interfaces:**

- Consumes: `DIRECT_DATABASE_URL`, credentials for a **new, separate** storage
  target — **not** the existing R2 media bucket (`PUBLIC_R2_IMAGES_BUCKET`/
  `CLOUDFLARE_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`). Per review feedback, the user is
  provisioning this storage themselves (their words: "что-то типа архивного, а не
  R2" — likely R2's own Infrequent Access storage class on a dedicated bucket
  distinct from the media bucket, rather than a different provider entirely, but
  **don't assume — confirm the actual bucket/endpoint/credentials with the user
  before writing Step 2**, since this task can't be completed blind).
- Produces: a nightly `pdm-backup-<date>.dump` object in that storage, **with
  automatic expiry** — not just an unbounded pile of dumps.

**Correction from the first pass of this plan:** the original version only wrote the
backup, with no cleanup — per review feedback, old dumps need to expire or R2 (or
whatever target) fills up with backup clutter indefinitely.

- [ ] **Step 1: Confirm the actual storage target with the user** — bucket name,
      endpoint, credentials, and specifically whether it's a separate R2 bucket
      (Infrequent Access class) or something else entirely. Do not proceed to Step 2
      on an assumption.

- [ ] **Step 2: Read `scheduled-jobs.md`** to find the existing cron mechanism
      (`pg_cron`? an external scheduler? a Vercel Cron Job, now that hosting is
      confirmed as Vercel?) rather than inventing a new one.

- [ ] **Step 3: Write the backup script**, shape depends on Step 2's finding — likely
      a small Node script (`pg_dump` isn't available as a JS API; shell out to it).
      Check `get_project`/dashboard first for whether Supabase's own Pro-tier daily
      backups already cover this, before building a second, redundant mechanism —
      Free tier has **no** built-in backups (per `database-hosting.md`), so this is
      load-bearing only while on Free; if/when the project moves to Pro, revisit
      whether this script is still needed at all.

- [ ] **Step 4: Configure retention — prefer a bucket lifecycle rule over a
      hand-rolled delete step.** If the target is R2 (or any S3-compatible store),
      it supports native object-expiration lifecycle rules — configuring "expire
      objects with prefix `pdm-backup-` after N days" on the bucket itself is
      zero-maintenance and can't have an off-by-one bug that deletes the wrong
      thing. Only fall back to deleting old objects from inside the backup script
      itself if the chosen target has no lifecycle-rule support. Pick N (e.g. 14 or
      30 days) with the user before finalizing — not decided in this plan.

- [ ] **Step 5: Verify** by running the backup once manually and restoring the dump
      into a scratch database (`createdb pdm_backup_test && pg_restore -d
  pdm_backup_test pdm-backup-test.dump`), confirming row counts match the
      source. Separately verify the retention rule actually fires — either by
      checking the lifecycle-rule config took effect (dashboard/API), or, if
      script-based, by running the delete path against a fake old-dated test object
      rather than waiting N real days to find out.

- [ ] **Step 6: Commit**

```bash
git add <backup script path>
git commit -m "feat(db): nightly pg_dump with retention to dedicated archival storage"
```

---

## Task 7: Update decision docs and GitHub issue #24

**Files:**

- Modify: `.claude/wiki/decisions/supabase-managed-postgres.md`
- GitHub issue #24 (comment + scope edit, via `gh`)

**Interfaces:** none — documentation/tracking only.

- [ ] **Step 1: Amend the decision doc**

In `.claude/wiki/decisions/supabase-managed-postgres.md`:

- Change _"Supabase Auth, Storage, Realtime and Edge Functions are explicitly out of
  scope"_ to _"Supabase Auth, Storage and Edge Functions are explicitly out of
  scope; Realtime was added to scope 2026-08-18 for the fan-chat feature — see
  `2026-08-18-supabase-migration-design.md`."_
- Change the closing **Status** line from _"decided, not scheduled... low-priority
  (P2)"_ to reflect that this is now in progress, with the date.
- Add a line under **Staged rollout** noting the single-project decision (§1.1 of
  the spec) supersedes the original two-project (Free dev/staging + Pro prod) plan
  for now, with a note to revisit the split once real users exist.

- [ ] **Step 2: Commit the wiki change**

```bash
git -C .claude add wiki/decisions/supabase-managed-postgres.md
git -C .claude commit -m "docs: amend Supabase decision — Realtime in scope, migration in progress"
git -C .claude push
```

(Per `CLAUDE.md`: `.claude/` is a separate nested repo, gitignored in the main repo —
commit/push it from inside `.claude/`, never through the main repo.)

- [ ] **Step 3: Update issue #24**

```bash
gh issue edit 24 --remove-label "P2" 2>/dev/null || true
gh issue comment 24 --body "Scope amended 2026-08-18: Realtime is now in scope (needed for the fan-chat feature), and this is being worked now rather than deferred — see feature/supabase-migration and docs/superpowers/specs/2026-08-18-supabase-migration-design.md."
```

(Check the issue's actual current labels first with `gh issue view 24 --json
labels` — the `--remove-label` call above is a guess at the label name; confirm
before running.)

---

## Self-Review Notes

- **Spec coverage:** §3.1–3.3 (connections) → Task 2; §3.4 (baseline) → Task 1;
  §3.5 (backup) → Task 6; §4 (local dev) → Task 4; §5 (fallback JWT) → documented in
  the spec only, no task needed since it's explicitly not being built.
- **Real regression caught during planning, not assumed away:** `e2e/setup-test-db.mjs`'s
  `docker exec pdm-postgres` dependency would have silently broken the moment
  `docker-compose.yml`'s `postgres` service was removed (already done, this branch)
  — Task 5 exists specifically because this was found by reading the actual file,
  not inferred from the spec.
- **Ordering:** Task 1 (dump + restore) must complete before Task 2 (repoint app) —
  reversing them would point the app at Supabase before any data exists there.
  Task 4 (local `supabase start`) depends on both Task 1 (reuses its dump file) and
  Task 2 (connection-string shape) being settled first.
- **Second-pass corrections from review feedback (this revision):** Task 1 changed
  from an empty `yarn db:migrate` to a real schema-scoped `pg_dump`/`pg_restore`
  carrying local dev data into Supabase (and Task 4 now restores that same dump
  locally, instead of a second empty migrate); Task 6 gained retention/expiry and a
  dedicated (non-media) storage target instead of writing backups with no cleanup
  into the R2 bucket already used for media; Task 2 gained an explicit answer,
  backed by a grep across `src/`, to "do `db/services/*` calls go through the
  pooler too" (yes, automatically, and nothing in the codebase conflicts with
  transaction-mode pooling).
