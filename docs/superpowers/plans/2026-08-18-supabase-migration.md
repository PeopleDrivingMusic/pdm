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
- No data migration — the Supabase project is empty; this is a fresh baseline
  apply, not a `pg_dump`/`pg_restore` from local (spec §3.4).
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

## Task 1: Verify the target Supabase project and apply the baseline migration

**Files:** none (infrastructure step against the live Supabase project)

**Interfaces:**

- Consumes: existing `drizzle/migrations/*.sql` (unchanged), the Supabase MCP tools
  already connected to project `falcoioeiutzoselpnhe`.
- Produces: a Supabase Postgres instance with PDM's full schema applied — everything
  downstream depends on this existing before app code is repointed at it.

- [ ] **Step 1: Confirm the project is still the right one and still empty**

Run (MCP): `list_tables` for project `falcoioeiutzoselpnhe`.
Expected: `[]` (matches the check already done in conversation — reconfirm since
time may have passed).

- [ ] **Step 2: Get the direct-connection string**

Run (MCP): `get_project` for `falcoioeiutzoselpnhe`, or read it from the Supabase
dashboard's Database Settings page. Do not hardcode the password into any committed
file — it goes into local `.env` only (Step 4 of Task 2).

- [ ] **Step 3: Apply the baseline migration**

Run: `DIRECT_DATABASE_URL="<the direct connection string>" yarn db:migrate`
(temporarily set inline, or exported in the shell — not yet wired into
`drizzle.config.ts`, that's Task 2).
Expected: all files in `drizzle/migrations/` apply cleanly against the fresh Supabase
database.

- [ ] **Step 4: Verify**

Run (MCP): `list_tables` again for the same project.
Expected: every table from `src/lib/db/schema.ts`'s aggregator present, grouped
under the `users`/`artist`/`content`/`catalog`/`engagement`/`finance`/`messages`
schemas.

- [ ] **Step 5: Run advisors**

Run (MCP): `get_advisors` for the project.
Expected: no unexpected findings. RLS is not yet enabled on any exposed table at
this point (that's the fan-chat plan's job once it resumes) — if the advisor flags
missing RLS on `public`-schema tables, note it but don't fix it in this task; PDM's
tables aren't in the `public` schema (they're in per-domain schemas per
`data-model.md`), so this is expected to be quiet, but confirm rather than assume.

---

## Task 2: Repoint the app at Supabase (pooler + direct connections)

**Files:**

- Modify: `src/lib/db/index.ts`
- Modify: `drizzle.config.ts`
- Modify: `.env`, `.env.example`

**Interfaces:**

- Consumes: the applied schema from Task 1.
- Produces: `db`/`client` (from `src/lib/db/index.ts`) now talking to Supabase
  through the pooler — every existing `db/services/*` and `db/queries.ts` caller is
  unaffected, since none of them touch connection config directly.

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

- [ ] **Step 3: Apply the baseline migration locally**

Run: `DIRECT_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" yarn db:migrate`
Expected: same schema as Task 1 produced against the cloud project.

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

## Task 6: Nightly backup (`pg_dump` → R2)

**Files:**

- Create: the backup script, location per whatever convention
  `.claude/wiki/architecture/scheduled-jobs.md` already documents for cron-style
  jobs in this repo — check it before picking a new pattern.

**Interfaces:**

- Consumes: `DIRECT_DATABASE_URL`, R2 credentials already used by `R2Service`.
- Produces: a nightly `pdm-backup-<date>.sql.gz` object in R2 — the exit path named
  in the spec (§3.5) and the existing decision doc.

- [ ] **Step 1: Read `scheduled-jobs.md`** to find the existing cron mechanism
      (`pg_cron`? an external scheduler? a Vercel Cron Job, now that hosting is
      confirmed as Vercel?) rather than inventing a new one.

- [ ] **Step 2: Write the backup script**, shape depends on Step 1's finding — likely
      a small Node script (`pg_dump` isn't available as a JS API; shell out to it, or
      use Supabase's own scheduled-backup feature if the found mechanism is "just use
      what Supabase provides" — check `get_project`/dashboard for whether Pro-tier daily
      backups already cover this before building a second, redundant mechanism. Free
      tier has **no** built-in backups (per `database-hosting.md`), so this is
      load-bearing while on Free.

- [ ] **Step 3: Verify** by running it once manually and restoring the dump into a
      scratch database (`createdb pdm_backup_test && psql pdm_backup_test < dump.sql`),
      confirming row counts match the source.

- [ ] **Step 4: Commit**

```bash
git add <backup script path>
git commit -m "feat(db): nightly pg_dump to R2 (Supabase free tier has no backups)"
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
- **Ordering:** Task 1 (baseline apply) must complete before Task 2 (repoint app) —
  reversing them would point the app at Supabase before any schema exists there.
  Task 4 (local `supabase start`) depends on Task 2's connection-string shape being
  settled first, so the local `.env` values in Task 4 Step 4 match the pattern Task
  2 already established.
