# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**PDM (People Driven Music)** is first and foremost a **music-social platform** — everything is built around music and musical content. Anyone can listen for free; a fan who wants more subscribes to a specific artist for **$1/mo** to unlock exclusive content and platform perks (the artist's shared fan chat, offline caching of that artist, no ads on that artist, ticket presale access, etc.).

The core mechanics the product is built around:

- **Listening** — music playback with all its features.
- **Content & social layer** — artist posts, videos, polls, fan interaction.
- **Recommendations.**

A later phase adds **fintech** (royalty crowdfunding / micro-investment in tracks, merch store, crypto payouts) — present in the data model (`finance` schema, `purchases`) and business docs, but not the current focus. Don't let fintech framing drive day-to-day decisions; the music + social + recommendation loop is the product today.

Two distinct audiences share one app: **listeners** (the public app) and **artists** (the Studio dashboard).

## Project Knowledge Base & Memory (`.claude/`)

The **`.claude/` directory is the project's AI knowledge base — the user's "second brain" for this project** (LLM-maintained wiki, business docs, and Claude Code memory, plus any future agents/skills). It is **gitignored in this repo** and version-controlled **separately** in the private repo **`PeopleDrivingMusic/pdm-claude`** — a nested git repo living inside `.claude/`. Commit/push anything under `.claude/` from **inside** that folder (`git -C .claude …`), never through the main repo (which ignores it, including `.claude/.git`).

**Wiki** — product, business, architecture, and domain knowledge live at **`.claude/wiki/`**, the single source of truth for the "why" behind PDM (strategy, economic model, system design, decisions). Read `.claude/wiki/WIKI.md` for how it is organized, `.claude/wiki/index.md` to locate pages.

- For questions about product/business/architecture, **consult the wiki first** (start at `.claude/wiki/home.md`).
- When you learn something durable about the project, **file it into the wiki** per `.claude/wiki/WIKI.md` (project knowledge, distinct from memory below).

**Memory (hard rule)** — Claude Code memory **lives in the project at `.claude/memory/`, NOT only on the local machine.** The harness's machine-local memory path is a **directory symlink → `.claude/memory/`** (part of the `pdm-claude` repo), so every memory write lands directly in the repo folder — no manual mirroring. After **any** memory change, just **commit/push `pdm-claude`** so nothing ever lives only locally. (If the symlink is ever missing, recreate it with `cmd /c mklink /D` — not PowerShell 5.1's `New-Item`.)

## Commands

```bash
yarn dev                  # vite dev server
yarn build                # production build
yarn check                # svelte-kit sync + svelte-check (type check) — run after changes
yarn lint                 # prettier --check + eslint
yarn format               # prettier --write .

yarn test                 # unit (vitest --run) then e2e (playwright)
yarn test:unit            # vitest watch mode
yarn test:unit -- --run src/path/to/file.spec.ts   # single unit test file
yarn test:e2e             # playwright e2e (e2e/ dir)

yarn db:up                # start local Supabase (Postgres + Realtime + Studio) via `supabase start`
yarn db:down               # stop it (`supabase stop`)
yarn db:generate          # generate migration from schema changes
yarn db:migrate           # apply migrations — use this, not db:push (see below)
yarn db:push              # AVOID against the shared dev DB — see below
yarn db:studio            # drizzle studio
yarn logging:up           # start Grafana/Loki/Promtail/Prometheus stack
```

Package manager is **yarn** (`yarn.lock` is the source of truth). Vitest runs two projects: `client` (browser env via Playwright, matches `*.svelte.{test,spec}.ts`) and `server` (node env, everything else; `src/lib/server/**` excluded from client).

## Stack

SvelteKit 2 + **Svelte 5 (runes)** · TypeScript · SCSS · Drizzle ORM + Postgres (`postgres-js`) · Cloudflare R2 for media · Argon2 + Arctic (Google OAuth) for auth · TipTap for rich text · prom-client for metrics.

Path aliases: `$lib` (src/lib), `$styles` (src/styles, auto-injects `variables` into all SCSS — see `vite.config.ts`). Server-only secrets come from `$env/static/private` (R2/Cloudflare creds); DB uses `process.env` via `dotenv`.

## Architecture

### Guiding principle: build for scale and microservice-readiness

PDM aims to operate at Spotify / Instagram / YouTube scale, so every architectural decision is made with **horizontal scalability and fault tolerance** in mind. The target is a microservice architecture; the codebase today is a SvelteKit monolith, but it must stay **ready to split into independent services on separate servers** with minimal rework. Concretely:

- Keep clear service boundaries (e.g. `src/lib/server/content/`, `src/lib/server/media/`) that routes call instead of reaching into DB code directly — these are the seams along which the app will be carved into services (Content, Media, …). See `.claude/wiki/architecture/content-and-scale-strategy.md` and `.claude/wiki/architecture/system-design.md`.
- Treat each boundary as if its implementation could become a remote (HTTP/RPC) client tomorrow: no leaking of Drizzle types or DB sessions across it, no cross-domain transactions that assume one database.
- Prefer stateless request handling (sessions are token-in-cookie + DB lookup, no server memory), and design media/heavy I/O to go direct-to-storage (R2 presigned uploads) rather than through the app server.

When adding a feature, place new logic behind/along these boundaries rather than expanding the monolith inward.

### Dual authentication — two parallel session systems

This is the most important thing to understand before touching auth or the Studio.

- **User sessions** (listeners): cookie `session`, validated in `src/hooks.server.ts` → populates `event.locals.user` / `event.locals.session` for every request. Logic in `src/lib/server/session.ts`. `locals.user` is a `SafeUser` (no `hashedPassword`, see `src/app.d.ts`).
- **Artist sessions** (Studio): cookie `artist_session`, validated **lazily** in route loads via `getArtistByCookie()` (`src/lib/server/artist-session.ts`), not in hooks. If no artist cookie exists but the logged-in user owns an artist, a fresh artist session is minted automatically. `src/routes/studio/+layout.server.ts` redirects to `/artist/login` when there is no artist.

An `artistAccount` is the credential record; an `artist` is the public profile. One user → one artist → many artist accounts/sessions.

### Route groups

- `src/routes/(app)/` — public listener app (home, listen, artists, profile, crowdfunding). Has `+layout.server.ts` exposing the user.
- `src/routes/(login)/` — login/logout/email/Google OAuth flows.
- `src/routes/(studio)/` — artist auth pages only (`/artist/login`, `/artist/register`).
- `src/routes/studio/` — the actual artist dashboard (`music`, `content`); gated by artist session in its layout.
- `src/routes/api/` — JSON/streaming endpoints (`music/[id]`, `track/[id]/[action]`, `studio/content/*`, `studio/media/*`, health, metrics).

### Database layer

Schema is **split by domain** under `src/lib/db/schemas/` (`users`, `artist`, `content`, `catalog`, `engagement`, `finance`, `user-library`, `core`) and re-aggregated in `src/lib/db/schema.ts`, which also defines all Drizzle `relations` and the `$inferSelect`/`$inferInsert` type exports. **`drizzle.config.ts` points at `schema.ts`** — always add new tables to both their domain file and the aggregator, or migrations/types break.

Access patterns, in increasing abstraction:

1. `src/lib/db/queries.ts` — static class services (`UserService`, `ArtistService`, `TrackService`, `AlbumService`, `AnalyticsService`, …) for core catalog/user data.
2. `src/lib/db/services/` — feature DB services (`ContentService` with `PostService`/`GalleryService`/`VideoService`/`StudioContentService`, `MediaService`, `PlaylistService`, `R2Service`).
3. `src/lib/server/content/` and `src/lib/server/media/` — **application-service boundaries** (`ContentApplicationService`, `MediaUploadService`) that route loads/actions call. These exist deliberately so the in-process DB implementation can later be swapped for a remote Content/Media microservice (see `.claude/wiki/architecture/service-boundaries.md`). Prefer calling these from routes rather than reaching into DB services directly.

Wrap notable DB operations in `withDbLogging(name, fn)` (from `src/lib/db/index.ts`) for structured timing logs.

### Media storage (Cloudflare R2)

`src/lib/db/services/R2Service.ts` wraps the S3 SDK against R2. Two buckets: `music` (audio) and `images` (covers/photos), chosen by content type via `bucketForContentType()`. Supports presigned single PUTs and **multipart uploads** (8 MB parts) for large audio, plus presigned read URLs with TTLs. Tracks carry an upload `status` (`draft`/`uploaded`/`ready`/…); only `uploaded`/`ready` are playable (`playableTrackStatus()` in queries.ts). Browser uploads go direct-to-R2 via presigned targets issued by `api/studio/media/upload-target` and `MediaUploadService`.

### Observability

`hooks.server.ts` chains middleware via `sequence()`: `sessionHandle` → `loggingHandle` → `mainHandle`. Every request gets a `requestId` (in `locals`) and structured logs through `src/lib/utils/logger.ts`; HTTP/DB/error metrics via `src/lib/utils/metrics.ts` (`MetricsCollector`), exposed at `/api/metrics` for Prometheus. The full Grafana/Loki/Promtail/Prometheus stack runs through `docker-compose.yml`.

### UI

Reusable primitives in `src/lib/ui/` (`Button`, `Input`, `Avatar`, `FileUpload`, `Tabs`, `SvgIcon`, etc.), feature components in `src/lib/ui/components/` (notably `MusicPlayer/`). Global player/modal/notification state are **Svelte 5 rune stores** in `src/lib/stores/*.svelte.ts`. Styles/tokens/themes in `src/styles/`. Icons use `@mdi/js` paths through `SvgIcon`.

## Conventions

- New Svelte components use **runes** (`$state`, `$derived`, `$props`, `$effect`) — this is Svelte 5, not legacy stores syntax.
- Keep secret-dependent code in `src/lib/server/` (or `.server.ts` files); it must never reach the client bundle.
- Indentation is **tabs** (see `.prettierrc`); run `yarn format` before committing.
- When changing DB shape: edit the domain schema file → update `schema.ts` aggregator + relations + type exports → `yarn db:generate` → review the SQL in `drizzle/migrations/` → `yarn db:migrate`.
- **Don't use `db:push` against the shared dev DB.** `db:push` applies `schema.ts` directly and writes nothing to `drizzle.__drizzle_migrations`, so it silently reintroduces the exact drift issue #25 (`db:generate`/`db:migrate` desynced from the DB) fixed on 2026-08-17 — CI now has a `db-migrate` job that would catch the resulting drift, but only after you've already pushed. `db:push` is still fine against a throwaway/disposable DB for quick experiments; just never the tracked dev DB the team shares.
