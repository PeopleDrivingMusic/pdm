# Migrate to Supabase (DB + Realtime) — Design

**Date:** 2026-08-18
**Branch:** `feature/supabase-migration` (from `main`)
**Status:** Design approved pending user review

## 1. Goal & Scope

Move PDM's Postgres from local docker-compose to **Supabase managed Postgres**, and
bring **Supabase Realtime** into scope alongside it — both amendments to
`.claude/wiki/decisions/supabase-managed-postgres.md`, which currently reads
_"Supabase Auth, Storage, Realtime and Edge Functions are explicitly out of scope"_
and tracks the DB move itself as a deferred, not-scheduled, P2 issue (#24). This work
pulls #24 forward and widens it, because the realtime fan chat feature
(`docs/superpowers/specs/2026-08-18-realtime-fan-chat-design.md`) needs exactly what
Supabase Realtime provides (see that spec's transport revision), and Realtime
Authorization needs `subscriptions`/`users`/`artists` to live in the _same_ Postgres
it runs against — otherwise RLS policies have nothing to check against directly.

This is a **prerequisite** to the fan-chat plan, not part of it: `messages.chat`
(fan-chat Task 1) should be created directly in Supabase, not created locally and
migrated a second time.

### Locked decisions (from conversation)

1. **One Supabase project for everything, for now** — dev = staging = prod, on the
   project already provisioned (`falcoioeiutzoselpnhe`, org `PDM`, `ap-south-1`,
   Postgres 17). Not the two-project (Free dev/staging + Pro prod) split issue #24
   originally sketched — that split is deferred until real users exist; a single
   project is acceptable pre-launch risk (dev experiments and prod data share a
   database) per the user's explicit call.
2. **Local dev runs on `supabase start`** (Supabase CLI's local stack: Postgres on
   `127.0.0.1:54322`, API gateway on `:54321`, Studio on `:54323`, Realtime bundled
   in), not the docker-compose `postgres`/`pgadmin` services, which are **removed**
   (already done in this branch). This matters specifically because it mirrors prod
   — Realtime + Postgres + RLS all present locally — where hitting the remote
   project from local dev would not let entitlement/RLS be tested offline.
3. **Scope stays DB + Realtime only.** Supabase Auth and Storage remain explicitly
   out of scope, unchanged from the original decision — PDM's dual-session auth
   (`session` + `artist_session`) and R2 media storage are untouched. This is a
   narrowing of the exclusion list, not its removal.
4. **Pooler settings from `database-hosting.md`, applied now, not deferred:**
   transaction-mode pooler (port 6543) for the app's `DATABASE_URL`, a separate
   direct connection (port 5432) for `drizzle-kit` migrations, `prepare: false` in
   `postgres-js` (transaction mode doesn't support prepared statements), and raising
   `max` from `1` to ~5–10.
5. **Chat entitlement RLS reads `subscriptions` directly** — no custom-minted JWT
   workaround. A background investigation (`mcp__plugin_supabase_supabase__search_docs`
   against `https://supabase.com/docs/guides/realtime/authorization`) confirmed the
   custom-JWT approach _would_ have worked (RLS on `realtime.messages` can read a
   JWT claim via `current_setting('request.jwt.claims')` with no table lookup at
   all — quoted verbatim in §5 below), but it's now unnecessary since the tables
   live in the same database. Documented here as a fallback in case DB and Realtime
   ever end up split again.
6. **Nightly `pg_dump` with retention, to a dedicated archival storage target the
   user provisions separately** (not the existing R2 media bucket) — from day one
   (~$0), per the existing decision, amended per review feedback to require
   automatic expiry of old dumps (§3.5) rather than an unbounded pile.
7. **docker-compose cleanup** (done in this branch): `postgres` and `pgadmin`
   services removed; `postgres-exporter` repointed at `host.docker.internal:54322`
   (supabase start's local Postgres lives in a separate CLI-managed compose stack,
   not this network); the commented-out future `app` service's `DATABASE_URL`
   placeholder updated to the pooler shape; `/admin` page's pgAdmin link swapped for
   `PUBLIC_SUPABASE_STUDIO_URL`.
8. **Every `db/services/*`/`db/queries.ts` caller rides the pooler automatically,
   with zero per-service changes.** They all share the single `db`/`client` export
   from `src/lib/db/index.ts` — once that one file points at the pooler, everything
   does. Confirmed nothing in `src/` would conflict with transaction-mode pooling
   (grepped for `.transaction(`, `pg_advisory`, `LISTEN `/`NOTIFY `, raw `.unsafe(` —
   zero matches; every existing query is a plain single-statement call).

### Out of scope (explicitly)

- Supabase Auth, Storage, Edge Functions — unchanged from the original decision.
- The two-project (Free dev/staging + Pro prod) split — single project for now.
- PITR (+$100/mo) — separate trigger (Stripe integration), per the existing decision.
- Read replicas — not until hot-artist mode needs them.
- Anything in the fan-chat feature itself (schema, `ChatService`, UI, Realtime
  Authorization _policy_ for chat specifically) — that's the fan-chat plan's job,
  resumed after this lands. This spec only gets the database and Realtime _platform_
  in place.

## 2. Current State (grounding)

- `src/lib/db/index.ts:11-12` — `postgres(process.env.DATABASE_URL!, { max: 1, ... })`.
  No `prepare: false`.
- `drizzle.config.ts` — single `dbCredentials.url` from `DATABASE_URL`; no separate
  direct-connection URL for migrations.
- `docker-compose.yml` — `postgres`/`pgadmin` services removed this branch;
  `postgres-exporter` repointed at `host.docker.internal:54322`.
- `docker/postgres/init/01-init.sql` — only bootstraps `uuid-ossp` and sets timezone;
  not needed on Supabase (`gen_random_uuid()` is core in Postgres 13+, which is what
  Drizzle's `defaultRandom()` already emits — confirmed by every schema file using
  `.defaultRandom()`, never `uuid_generate_v4()`). Left in place, unused by Supabase.
- Supabase project confirmed live and empty: `list_tables` returned `[]`. Project URL
  `https://falcoioeiutzoselpnhe.supabase.co`; a legacy `anon` key and a
  `sb_publishable_...` key already exist (fetched via `get_publishable_keys`, not
  reproduced here — pull fresh via the MCP tool or Supabase dashboard when wiring
  env vars, don't hardcode a key value into a committed file).
- `.env.example` — `PUBLIC_PGADMIN_URL` replaced with `PUBLIC_SUPABASE_STUDIO_URL`
  this branch; `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_NAME` are unused
  stragglers (grep found no reader) — worth deleting during this work, not before
  confirming nothing reads them.
- `src/routes/(app)/admin/+page.svelte` — pgAdmin link swapped for Supabase Studio
  this branch; still says "PostgreSQL 15" (fixed) and `docker-compose up -d` (fixed
  to `supabase start`).

## 3. Migration Mechanics

### 3.1 Connection strings

Two env vars replace the current single `DATABASE_URL`:

```
DATABASE_URL="postgresql://postgres:[password]@db.falcoioeiutzoselpnhe.supabase.co:6543/postgres?sslmode=require"
DIRECT_DATABASE_URL="postgresql://postgres:[password]@db.falcoioeiutzoselpnhe.supabase.co:5432/postgres?sslmode=require"
```

Local dev keeps the same two-var shape, pointed at `supabase start`'s stack instead
(both `DATABASE_URL` and `DIRECT_DATABASE_URL` can be the same local URL — there's no
pooler distinction locally, `supabase start` doesn't run Supavisor):

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

### 3.2 `src/lib/db/index.ts`

```ts
const client = postgres(process.env.DATABASE_URL!, {
	max: Number(process.env.DATABASE_POOL_MAX ?? 10),
	prepare: false
	// ...existing onnotice/debug options unchanged
});
```

`prepare: false` is required unconditionally (harmless locally, mandatory against the
pooler) — it's simpler to always set it than to branch on environment.

### 3.3 `drizzle.config.ts`

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

`drizzle-kit` runs DDL needing session state — must go through the direct connection
(5432), never the transaction-mode pooler (6543).

### 3.4 Baseline migration and dev data

**Revised per review feedback — this is a real data carry-over, not a fresh
baseline apply.** The Supabase database is empty, but the _local_ Docker Postgres
has real dev fixtures worth keeping so testing doesn't restart from zero. The move
is a `pg_dump`/`pg_restore` (schema + data), scoped to PDM's own 7 Postgres schemas
only (`users`, `artist`, `content`, `catalog`, `engagement`, `finance`, `messages`)
— never a blanket dump of the whole local database, which would collide with
Supabase's own reserved schemas/roles (`auth`, `storage`, `realtime`, `public`,
`anon`/`authenticated`/`service_role`). The same dump seeds both the cloud project
and local `supabase start` (§4), so all three environments start from the same
populated state. Mechanics (exact commands) live in the plan, not re-derived here.

### 3.5 Nightly backup

A scheduled job (`pg_dump` to a dedicated storage target) with **automatic
retention/expiry** — not just an ever-growing pile of dumps. Two things changed from
the original decision doc's "R2" framing, per review feedback:

- **Not the existing R2 media bucket.** The user is provisioning a separate,
  dedicated archival storage target themselves (likely a distinct R2 bucket on the
  Infrequent Access storage class, but not assumed — confirmed with them before the
  plan's backup task is implemented).
- **Retention is load-bearing, not optional.** Old dumps must expire (prefer a
  native bucket lifecycle rule over hand-rolled deletion logic) so backup storage
  doesn't grow unbounded. Retention window (days) is picked with the user at
  implementation time.

Cron host/script mechanism is decided in the plan, not re-derived here; this spec
only locks that a nightly backup with retention must exist from day one, not
deferred to a later PITR trigger.

## 4. Local Development Workflow

Replaces `yarn db:up` (docker-compose Postgres) with the Supabase CLI:

```bash
supabase start   # Postgres :54322, API :54321, Studio :54323, Realtime bundled
supabase stop     # tear down
```

`docker-compose.yml` keeps only the observability stack (Prometheus, Grafana, Loki,
Promtail, node-exporter, cadvisor) plus `postgres-exporter`, now pointed at
`supabase start`'s Postgres via `host.docker.internal:54322` rather than an
in-network service name, since that Postgres lives in the Supabase CLI's own
separately-orchestrated compose stack.

## 5. Fallback Reference — Custom-JWT Realtime Authorization

Not used (§1, decision 5), kept here in case DB and Realtime ever end up on separate
databases again. Confirmed via Supabase's own docs
(`https://supabase.com/docs/guides/realtime/authorization`):

RLS policies on `realtime.messages` can check a JWT claim with **no table lookup**:

```sql
create policy "authenticated with supabase.io email can read all"
on "realtime"."messages"
for select
to authenticated
using (
  (((current_setting('request.jwt.claims'))::json ->> 'email') ~~ '%@supabase.io')
);
```

"Regardless if it's public or private, the Realtime service connects to your
database as the authenticated Supabase Admin role" — the check runs against the
token's claims, not the caller's own DB role. The client sets an arbitrary bearer
token before subscribing via `supabase.realtime.setAuth(token)`, which accepts any
valid JWT — not only ones issued by Supabase Auth's own login flow. A backend could
mint a short-lived JWT (`sub` = its own user id, a custom claim like
`subscribed_artist_id`, short `exp`) signed with the project's JWT secret, and the
RLS policy would check that claim directly — no cross-database query needed. This is
the fallback if the single-project decision (§1.1) is ever reversed.

## 6. Related

`.claude/wiki/decisions/supabase-managed-postgres.md` (to be amended) ·
`.claude/wiki/architecture/database-hosting.md` ·
`.claude/wiki/architecture/hosting-and-deployment.md` ·
`docs/superpowers/specs/2026-08-18-realtime-fan-chat-design.md` · GitHub issue #24
