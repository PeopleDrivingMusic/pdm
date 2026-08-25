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
  Task 1 pushes a schema-scoped `pg_dump` via `supabase db push --include-seed`
  (tracked in `supabase_migrations.schema_migrations`), not a fresh `yarn db:migrate`
  baseline and not a manual `execute_sql` replay (spec §3.4, twice-revised).
- Backup storage is a dedicated target the user provisions separately, with
  retention/expiry — never the R2 media bucket (spec §3.5, revised).
- Local dev uses `supabase start`, not docker-compose Postgres — already removed
  from `docker-compose.yml` on this branch (spec §1.2, §4).
- **Migration authority, decided after Task 2 (locked in conversation):** Drizzle
  (`yarn db:generate`/`yarn db:migrate` against `DIRECT_DATABASE_URL`) is the _only_
  tool used for schema changes from this point forward — cloud or local, same
  `drizzle/migrations/*.sql` files applied directly to whichever Postgres
  `DIRECT_DATABASE_URL` points at. `supabase/migrations/` +
  `supabase_migrations.schema_migrations` were a **one-time bootstrap only**, from
  Task 1, and are not touched again — there is no second database to keep in sync
  (Supabase's Postgres _is_ the database now), so the only place this actually
  matters is local dev: Task 4's `supabase db reset` replays the frozen baseline,
  then `yarn db:migrate` catches local up on anything Drizzle has added since.

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

## Task 1: Carry the local dev data into Supabase, properly tracked via `supabase db push`

**Files:**

- Create: `supabase/config.toml`, `supabase/migrations/<timestamp>_baseline.sql`,
  `supabase/seed.sql` (all via the Supabase CLI, not hand-written from scratch)

**Interfaces:**

- Consumes: the running local `pdm-postgres` container (still present — only the
  `docker-compose.yml` _service definition_ was removed this branch), the Supabase
  CLI authenticated against the PDM account (separate from any personal-account CLI
  session already on the machine), the Supabase MCP tools for verification.
- Produces: a Supabase Postgres instance with PDM's real dev data in it, **and** a
  `supabase/` directory in the repo (migration + seed file) that `supabase start`/
  `db reset` (Task 4) and any future `db push` reuse — not a one-off manual load.

**Second correction (this revision) — the real "normal world" way, not manual
`execute_sql` chunking.** The first version of this task (and an earlier live
attempt) loaded schema + data by hand-chunking a `pg_dump` into ~12 pieces and
replaying each through the `execute_sql` MCP tool — a workaround for not having the
database password, not a recommended pattern. Per direct review feedback, redone via
the standard Supabase CLI migration flow instead:

1. **`supabase login --name pdm`** — the CLI may already be authenticated to a
   _different_ personal account on the same machine (this happened live: it listed
   unrelated projects — `Izobov's Project`, `AI Travel Agent`, etc.). `--profile`
   requires a pre-existing config and fails with "Unsupported Config Type" — use
   `--name` instead. Non-interactive shells can't do the browser flow
   ("Cannot use automatic login flow inside non-TTY environments") — this step has
   to be run by the user directly in their own terminal, not via an agent-run Bash
   call. Verify with `supabase projects list`.
2. **`supabase link --project-ref falcoioeiutzoselpnhe`** — no password prompt in
   practice; the authenticated session covers it.
3. **`supabase init`** — creates `supabase/config.toml` + `.gitignore` (excludes
   `.temp/`, which holds the linked-project cache/pooler-url, not secrets — safe to
   leave ungitignored-checked, it's already covered).
4. **Generate the migration (schema-only) and seed file (data-only) separately** —
   don't reuse the earlier mixed schema+data dump as-is; regenerate clean:

   ```bash
   MSYS_NO_PATHCONV=1 docker exec pdm-postgres pg_dump -U admin -d pdm_db \
     --schema=users --schema=artist --schema=content --schema=catalog \
     --schema=engagement --schema=finance --schema=messages --schema=drizzle \
     --no-owner --no-privileges --schema-only \
     --file=/tmp/pdm-schema-only.sql
   MSYS_NO_PATHCONV=1 docker cp pdm-postgres:/tmp/pdm-schema-only.sql ./pdm-schema-only.sql

   MSYS_NO_PATHCONV=1 docker exec pdm-postgres pg_dump -U admin -d pdm_db \
     --schema=users --schema=artist --schema=content --schema=catalog \
     --schema=engagement --schema=finance --schema=messages --schema=drizzle \
     --no-owner --no-privileges --data-only --inserts --column-inserts \
     --file=/tmp/pdm-data-only.sql
   MSYS_NO_PATHCONV=1 docker cp pdm-postgres:/tmp/pdm-data-only.sql ./pdm-data-only.sql
   ```

   Strip the `\restrict`/`\unrestrict` psql meta-commands both files start/end with
   (`grep -v "restrict"` — confirmed the only lines containing that word) before
   using either file — they aren't valid outside an actual `psql` session and the
   CLI's migration runner doesn't expect them either.

5. **`supabase migration new baseline`** → copy the cleaned schema-only dump into
   the generated `supabase/migrations/<timestamp>_baseline.sql`. Copy the cleaned
   data-only dump into `supabase/seed.sql`.
6. **`supabase db push --dry-run`** first (no password prompt, previews what would
   apply), then **`supabase db push --include-seed`**. `--include-seed` is the
   documented mechanism for loading `seed.sql` into a **dev/staging** remote —
   confirmed via Supabase's own docs (never on production, which this project isn't
   yet).

**A real gap this caught, worth keeping as a documented lesson:** the first push
attempt failed — `function public.set_artist_active_on_approved() does not exist`.
The `--schema=...` scoping (7 app schemas + `drizzle`) missed a trigger function that
lives in `public` (confirmed via `\df public.*` locally: one real function plus 10
`uuid-ossp` extension functions, which aren't needed — the schema uses
`gen_random_uuid()`, core in Postgres 13+, confirmed via
`grep -c uuid_generate\|gen_random_uuid` returning `0`/`30`). The function is already
tracked in Drizzle's own `drizzle/migrations/0000_baseline.sql` — pulled the
canonical definition from there and inserted it into the Supabase migration file,
directly before the `CREATE TRIGGER` statement that depends on it. `supabase db push`
runs each migration file in a transaction — the failed attempt rolled back cleanly
(`information_schema.schemata` confirmed empty after), so no partial-state cleanup
was needed before retrying.

- [x] **Step 1: `supabase login --name pdm`** (run by the user directly, not via Bash)

- [x] **Step 2: `supabase link --project-ref falcoioeiutzoselpnhe`**

- [x] **Step 3: `supabase init`**

- [x] **Step 4: Generate schema-only + data-only dumps, strip psql meta-commands**

- [x] **Step 5: `supabase migration new baseline`, populate it + `seed.sql`**

- [x] **Step 6: `supabase db push --include-seed`** — failed once (missing `public`
      function), fixed by adding the function definition (sourced from
      `drizzle/migrations/0000_baseline.sql`) before the trigger, retried, succeeded.

- [x] **Step 7: Verify**

Row counts compared directly against the local source for `users.users`,
`artist.artists`, `catalog.tracks`, `content.posts`,
`drizzle.__drizzle_migrations`, `artist.artist_onboarding_requests` — **exact match
on every table** (3, 2, 9, 8, 24, 2 respectively).

- [x] **Step 8: Run advisors**

`get_advisors(type: "security")` — clean, zero findings. `get_advisors(type:
"performance")` — INFO-level only: unindexed foreign keys and a few unused indexes,
all pre-existing schema design from before this migration, not introduced by it and
not a blocker for this task. Worth a future indexing pass, not urgent.

- [x] **Step 9: Clean up temp files**

Deleted all intermediate `pdm-chunk-*.sql`, `pdm-part-*.sql`, `pdm-remainder.sql`,
`pdm-dev-dump*.sql`, `pdm-schema-only.sql`, `pdm-data-only.sql` — their content now
lives properly in `supabase/migrations/` and `supabase/seed.sql`, which **are**
committed (Task 1's actual deliverable, not scratch files).

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

- [x] **Step 1: Split `.env.example`'s `DATABASE_URL` into two vars**

**Correction from what this step originally guessed:** the actual pooler hostname is
**not** `db.{ref}.supabase.co` — it's a separate shared pooler host
(`aws-1-ap-south-1.pooler.supabase.com` for this project's region), with the
project ref folded into the _username_ (`postgres.{ref}`), confirmed directly from
the Supabase dashboard's "Connect" panel:

```
DATABASE_URL="postgresql://postgres.{project-ref}:{password}@{pooler-host}:6543/postgres"
DIRECT_DATABASE_URL="postgresql://postgres.{project-ref}:{password}@{pooler-host}:5432/postgres"
```

**Second correction:** `DIRECT_DATABASE_URL` above is the **session-mode pooler**
(port 5432, same pooler host), not the dashboard's literal "Direct connection" host
(`db.{ref}.supabase.co:5432`) — that host is **IPv6-only** and was unreachable
("Network is unreachable") from this machine/network when tested, exactly the risk
`database-hosting.md` already named ("Direct connections are IPv6-first... An
IPv4-only host needs session mode"). Session mode on the pooler host is IPv4 and
supports everything `drizzle-kit` needs; confirmed working (`select version()`
succeeded, `yarn db:generate` reports zero drift against `schema.ts`).

Removed the now-unused `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_NAME`
block (confirmed unread by any file under `src/` — spec §2).

- [x] **Step 2: Set the same two vars in local `.env`**

Pointed at the real Supabase project for now (both pooler URLs above, with the
real password from the dashboard) so Task 3's verification runs against a real
target — will be repointed at `127.0.0.1:54322` once Task 4 sets up
`supabase start`.

- [x] **Step 3: Update `src/lib/db/index.ts`**

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

- [x] **Step 4: Update `drizzle.config.ts`**

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

- [x] **Step 5: Verify**

`yarn check` (the yarn script) turned out not to actually invoke `svelte-check` on
this machine — a pre-existing tooling quirk unrelated to this change (worth a
separate look, not fixed here). Ran `npx svelte-check --tsconfig ./tsconfig.json`
directly instead: **0 errors**, 68 pre-existing warnings (unused CSS selectors,
deprecated `on:submit`, etc.) — none related to this change.

`yarn db:generate` against the session-mode `DIRECT_DATABASE_URL`: **"No schema
changes, nothing to migrate"** — confirms Task 1's push matches `schema.ts` exactly,
zero drift.

- [x] **Step 6: Commit**

```bash
git add src/lib/db/index.ts drizzle.config.ts .env.example
git commit -m "feat(db): point app + drizzle-kit at Supabase (pooler + session-mode)"
```

(`.env` itself is gitignored — not committed.)

---

## Task 3: Verify the app against Supabase

**Files:** none (verification task, matches issue #24's acceptance criteria)

**Interfaces:**

- Consumes: Task 2's connection config.
- Produces: confidence that nothing regressed — this is the gate before local dev
  workflow and e2e get rewired in Tasks 4–5.

- [x] **Step 1: Run the unit suite**

`yarn test:unit -- --run`: **53 test files, 369 tests, all passed.** Logs confirm
the app genuinely connected via Supabase — `"Database connection established" |
{"database":"aws-1-ap-south-1.pooler.supabase.com:6543/postgres"}` — not the old
local Postgres. (Two unrelated `TypeError: ... wrapDynamicImport` stderr lines
appeared from what looks like a stale `.svelte-kit` dev-server artifact; zero
tests failed because of it — not chased further, unrelated to this migration.)

- [x] **Step 2: Smoke-test the dev server**

`yarn dev` → `127.0.0.1:5173`. `/` → 200, `/listen` → 200,
`/artist/ivan-izobau` → 200, `/artist/metallica` → 200 (both real artists from
the restored data). `/api/db/health` returned real, correct stats matching the
row counts already verified in Task 1: `{"totalUsers":3,"totalArtists":2,
"totalTracks":9,"activeArtists":2,"publishedTracks":4}`.

- [x] **Step 3: Confirm no prepared-statement errors under concurrent load**

Fired 60 concurrent requests (15× across 4 different routes) — all 60 returned 200. Grepped the dev server log for `prepared statement`/`does not exist`/`ERROR`
— **zero matches.** `prepare: false` (Task 2) is doing its job.

- [x] **Step 4: Record latency**

No pre-migration baseline number was captured before this branch started, so a
strict before/after comparison isn't possible — noted honestly rather than
fabricated. Per-query `dbQuery` timing logs weren't visible at the log level this
session ran at (not chased further — not blocking). What was measured: warm
(post-compile) full SSR artist-page loads — several sequential queries each
(artist + tracks + albums + viewer flags, per `CLAUDE.md`) — completed in
0.55–0.8s in **dev mode** (unoptimized, not representative of production RTT).
Nothing pathological; no timeouts, no errors, across repeated and concurrent
requests.

---

## Task 4: Local development via `supabase start`

**Files:**

- Modify: `.claude/wiki/architecture/local-development.md`
- Modify: `.env` (local dev values)
- Modify: `package.json` (`db:up` was broken, referenced the removed
  `postgres`/`pgadmin` docker-compose services — found and fixed along the way)
- Modify: `CLAUDE.md` (Commands block, to match)

**Interfaces:**

- Consumes: the Supabase CLI (`supabase` binary — confirm installed: `supabase
--version`; install per `https://supabase.com/docs/guides/local-development` if
  missing).
- Produces: a local Postgres + Realtime + Studio stack any contributor can start
  without touching the shared cloud project.

- [x] **Step 1: Initialize the local Supabase config** — done in Task 1 (`supabase
init`); `supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql`
      already exist in the repo, so this step is already satisfied for anyone
      picking up the branch fresh (they'd just run `supabase start`, next step).

- [x] **Step 2: Start the local stack**

`supabase start` — first run pulled ~13 Docker images (a few minutes); output
matched what was predicted, plus extra services (`kong`, `gotrue`, `postgrest`,
`storage-api`, `mailpit`, `imgproxy`, `logflare`, `vector`, `edge-runtime`) that
come bundled but aren't used by this app.

- [x] **Step 3: Apply migrations + seed data locally**

`supabase db reset` applied the migration + seed, but then failed at the very end
("Restarting containers... context deadline exceeded" hitting `storage-api`'s
bucket endpoint) — a transient timing issue on first cold start with many
containers, not a real failure. Verified directly (`docker exec supabase_db_pdm
psql ...`): row counts matched Task 1's cloud numbers exactly (`users.users`=3,
`artist.artists`=2, `catalog.tracks`=9, `content.posts`=8,
`drizzle.__drizzle_migrations`=24) — the migration/seed itself succeeded, only the
post-reset health check timed out. `docker ps` confirmed all containers healthy
shortly after. One container (`supabase_vector_pdm`, the Logflare log-shipper
feeding Studio's local analytics panel) restart-loops on "Network unreachable"
trying to reach the Docker socket — a known Windows/Docker Desktop networking
quirk, unrelated to this migration, doesn't affect DB/Auth/Storage/Realtime/Studio
(all confirmed healthy) — not fixed, not blocking.

- [x] **Step 4: Point local `.env` at the local stack**

Done — cloud values kept as a commented-out reference block in the same file
(password not stored anywhere else; re-fetch from the dashboard if needed) rather
than deleted outright, so testing against the real project stays easy later.

- [x] **Step 5: Catch up on any Drizzle migrations added after the baseline**

`yarn db:migrate` — clean no-op as expected (two idempotent NOTICEs: schema/table
already exist), confirming nothing's drifted since Task 1's bootstrap and the
mechanism itself works locally.

- [x] **Step 6: Verify**

`yarn dev` against the local stack: `/` → 200, `/artist/ivan-izobau` → 200,
`/api/db/health` returned the same correct stats as Task 3's cloud run. Local
Studio (`:54323`) responded 307 (a normal redirect to its default view) —
confirmed reachable.

- [x] **Step 7: Update the local-development wiki page**

Rewrote the Database section: `supabase start`/`supabase db reset`/`yarn db:migrate`
onboarding sequence, the migration-authority rule restated (Drizzle only, ongoing),
and an explicit note not to reach for `supabase migration new` for routine schema
changes.

**Extra, found along the way and fixed:** `package.json`'s `db:up` script still
read `docker-compose up -d postgres pgadmin` — the exact services removed earlier
on this branch. A real gap from that cleanup, not something this task set out to
fix, but leaving it broken would have been worse. Repointed to `supabase start`,
added a matching `db:down` (`supabase stop`) for symmetry with `logging:down`/
`monitoring:down`/`docker:down`, and fixed `CLAUDE.md`'s Commands block to match.

- [x] **Step 8: Commit**

Wiki change committed and pushed from `.claude/` (nested repo, per convention).
`package.json`/`CLAUDE.md` committed separately in the main repo.

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

- [x] **Step 1: Rewrite `setup-test-db.mjs` to migrate instead of clone**

  Before writing this, verified the load-bearing assumption the whole task
  depends on: that Supabase managed Postgres actually allows `CREATE
DATABASE`/`DROP DATABASE` for the `postgres` role (some managed providers
  restrict this). Confirmed both locally (`supabase_db_pdm` container) and
  directly against the live cloud project (`falcoioeiutzoselpnhe`) via
  `execute_sql` — `CREATE DATABASE pdm_e2e_probe` succeeded, visible in
  `pg_database`, cleaned up with `DROP DATABASE IF EXISTS`. Confirmed safe to
  proceed.

  Applied as planned, with one refinement: `execFileSync('yarn', …)` needs
  `shell: true` on Windows — without it, `spawnSync yarn ENOENT` (yarn is a
  `.cmd` shim, not directly executable via `execFileSync`'s default
  no-shell spawn). Added `shell: true` to the options object; everything
  else matches the plan verbatim.

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

- [x] **Step 2: Remove the now-dead `POSTGRES_CONTAINER`/`DEV_DB_NAME`/`DB_USER`
      exports from `test-db.mjs`** if nothing else imports them (`Grep` to confirm
      before deleting — `DEV_DB_NAME`/`DB_USER` may still be used elsewhere in `e2e/`).

  Grep confirmed all three were only ever imported by the old clone pipeline in
  `setup-test-db.mjs` — safe to delete outright. Additionally re-derived
  `TEST_DATABASE_URL`/`ADMIN_DATABASE_URL` from `DIRECT_DATABASE_URL` instead of
  `DATABASE_URL` (was not explicit in the original plan snippet): `CREATE`/`DROP
DATABASE` and `drizzle-kit migrate` both need a session-capable connection, same
  reasoning already applied to `drizzle.config.ts` in Task 2 — `DATABASE_URL` is
  the transaction-mode pooler in the cloud config. Locally both env vars point at
  the same `127.0.0.1:54322` so this made no observable difference in this task's
  verification, but it's the correct base going forward if e2e is ever pointed at
  a remote/pooled target. Also dropped the now-unused `const url = new URL(base)`
  line eslint flagged as unused once the destructured exports were removed.

- [x] **Step 3: Verify**

Ran: `yarn test:e2e -- e2e/comments.spec.ts`
Result: PASS — all 5 tests green (1.2m). Confirms the full `pdm_e2e`
create/migrate/drop cycle works end to end against `supabase start`.

- [x] **Step 4: Commit**

Committed as `4f241c7`: "fix(e2e): migrate the test db instead of docker-exec
pg_dump cloning" (`e2e/setup-test-db.mjs`, `e2e/test-db.mjs`).

---

## Task 6: Nightly backup + retention (`pg_dump` → dedicated archival storage)

**Files:**

- Create: the backup script, location per whatever convention
  `.claude/wiki/architecture/scheduled-jobs.md` already documents for cron-style
  jobs in this repo — check it before picking a new pattern.

**Interfaces:**

- Consumes: `DIRECT_DATABASE_URL`, credentials for the **`bd-dump` R2 bucket**
  (account `09959f0d1512f7913baacf1ebd4b1337`, endpoint
  `https://09959f0d1512f7913baacf1ebd4b1337.r2.cloudflarestorage.com/bd-dump`) —
  confirmed by the user, a bucket dedicated to this purpose, separate from the
  existing media bucket (`PUBLIC_R2_IMAGES_BUCKET`/`CLOUDFLARE_ACCOUNT_ID`/
  `R2_ACCESS_KEY_ID`). Needs its own R2 API token (Access Key ID + Secret Access
  Key) — not yet in hand as of this revision, confirm before Step 3.
- Produces: a nightly `pdm-backup-<date>.dump` object in that bucket, **with
  automatic expiry** — not just an unbounded pile of dumps.

**Correction from the first pass of this plan:** the original version only wrote the
backup, with no cleanup — per review feedback, old dumps need to expire or the
bucket fills up with backup clutter indefinitely.

**Second correction (this revision):** the storage target is settled — R2 bucket
`bd-dump`, separate account/bucket from media, per the user directly. What's still
open is the R2 API token for that bucket specifically.

- [x] **Step 1: Get an R2 API token scoped to the `bd-dump` bucket**

  Bucket ended up named `bd_dumps` (underscore, user-provisioned directly —
  `R2_BD_DUMPS_BUCKET` in `.env`), not `bd-dump` as this plan originally assumed.
  User added a scoped token: `R2_BD_DUMP_API_TOKEN`, `R2_BD_DUMP_ACCESS_KEY_ID`,
  `R2_BD_DUMP_SECRET_ACCESS_KEY` — separate from the media credentials, matching
  the least-privilege intent (confirmed later in Step 4: this token can PUT/GET
  objects but correctly cannot alter bucket-level config like lifecycle rules).
  Mirrored into GitHub Actions secrets (`R2_BD_DUMP_ACCESS_KEY_ID`,
  `R2_BD_DUMP_SECRET_ACCESS_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `DIRECT_DATABASE_URL` —
  the last one set by the user directly via `gh secret set` so the raw DB password
  never passed through the agent).

- [x] **Step 2: Read `scheduled-jobs.md`**

  Confirmed the documented pattern (service method → thin authenticated endpoint →
  external scheduler, Vercel Cron now that hosting is confirmed) — but that pattern
  assumes job logic expressible as an app endpoint. `pg_dump` is a native Postgres
  binary, not available in Vercel's serverless runtime (no system Postgres tools,
  and vendoring a static binary into a function is exactly the kind of fragile
  hand-rolled infra this project has been avoiding all session). Flagged this
  conflict to the user directly rather than silently picking a workaround; user
  chose a **GitHub Actions scheduled workflow** instead of Vercel Cron + endpoint —
  CI already runs there, and `apt-get`/PGDG installs `postgresql-client` in
  seconds. This is a deliberate one-off exception to the scheduled-jobs.md pattern
  for jobs that need a native binary, not a reversal of the pattern itself.

- [x] **Step 3: Write the backup script**

  Not a Node script — a GitHub Actions workflow (`.github/workflows/nightly-backup.yml`,
  `schedule: '0 3 * * *'` + `workflow_dispatch`). Installs `postgresql-client-17`
  via the official PGDG apt repo (matches Supabase's Postgres 17, not the
  older client Ubuntu ships by default), dumps with `pg_dump --format=custom`
  (custom format, so `pg_restore` — not plain SQL — is the restore path, matching
  Step 5's verification command), then uploads via `aws s3 cp` against R2's
  S3-compatible endpoint (`aws-cli` is preinstalled on `ubuntu-latest` runners, no
  extra install needed). Dump scope is the 7 app schemas + `drizzle` + **`public`**
  — `public` is included deliberately: `set_artist_active_on_approved()` lives
  there (same gap Task 1 hit bootstrapping Supabase), and a schema-scoped dump that
  skipped it would restore with a missing-function error on that trigger.
  Confirmed via dashboard context earlier in this migration that the project is
  still on **Free tier** (no built-in backups) — this script is load-bearing, not
  redundant with anything Supabase already provides.

- [x] **Step 4: Configure retention**

  Attempted via the R2 S3 API (`PutBucketLifecycleConfigurationCommand`, reusing
  the project's existing `@aws-sdk/client-s3` dependency) using the new scoped
  token — got `AccessDenied`: the token's Object Read & Write scope correctly
  doesn't extend to bucket-level configuration. Rather than widen the token's
  permissions just for this one-time action, asked the user, who configured the
  lifecycle rule directly in the Cloudflare dashboard instead (prefix
  `pdm-backup-`, expire after **30 days** — user's choice over the plan's 14-day
  option, more margin if a problem isn't noticed right away). Token stays
  minimally scoped.

- [~] **Step 5: Verify** — **partially blocked, deferred to post-PR-merge.**

  `workflow_dispatch` cannot target a workflow that only exists on an unmerged
  branch — GitHub requires the workflow file to be present on the default branch
  before it's dispatchable via API/CLI, confirmed live (`HTTP 404: workflow
nightly-backup.yml not found on the default branch`). Local verification was
  also unavailable at this point: Docker was down after an unrelated Windows
  crash/restart mid-session (no local Postgres container, no local `pg_dump`
  binary on this machine either). Rather than fabricate a result or force a
  workaround, surfaced this to the user directly; decision: open the PR now, user
  reviews and merges, then dispatch the real workflow on `main` and confirm a
  restore afterward — real CI-runner verification (the `apt-get`/PGDG install
  path especially) rather than a local approximation.

- [x] **Step 6: Commit**

  Committed as `4485239` ("feat(db): nightly pg_dump with retention to dedicated
  archival storage"). One unplanned follow-up commit (`0320b0d`) was needed first:
  the very first push of this branch was blocked by the `pre-push` hook's `yarn
lint` failing on pre-existing untracked files unrelated to this task
  (`.agents/`, `.mcp.json`, `skills-lock.json` — local skill/agent tooling — and
  `supabase/.temp/linked-project.json`, gitignored via a nested `supabase/.gitignore`
  that prettier doesn't read). Asked the user rather than guessing intent; they
  said gitignore them — added `.agents/`, `.mcp.json`, `skills-lock.json` to the
  root `.gitignore` and `supabase/.temp/` to `.prettierignore`, committed
  separately, then the real push succeeded (`yarn lint`/`yarn test:unit` — 369
  tests — both green in the hook).

---

## Task 7: Update decision docs and GitHub issue #24

**Files:**

- Modify: `.claude/wiki/decisions/supabase-managed-postgres.md`
- GitHub issue #24 (comment + scope edit, via `gh`)

**Interfaces:** none — documentation/tracking only.

- [x] **Step 1: Amend the decision doc**

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

- [x] **Step 2: Commit the wiki change**

  Committed and pushed to `pdm-claude` as `a61d574` ("docs: amend Supabase
  decision — Realtime in scope, migration in progress") on 2026-08-19, ahead of
  this task actually being reached in plan order — the doc content matches this
  step's requirements verbatim (Realtime scope note, in-progress status line,
  single-project note under Staged rollout).

- [x] **Step 3: Update issue #24**

  Already done ahead of this task, verified now via `gh issue view 24 --json
labels,comments,state`: issue is `OPEN`, only carries the `enhancement` label
  (no `P2` present — either never applied or already removed, moot either way),
  and carries a comment posted 2026-08-19 covering the scope amendment (Realtime
  in scope, single-project rollout, links to the design/plan docs and the
  decision-doc amendment). Matches this step's intent; nothing further needed.

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
