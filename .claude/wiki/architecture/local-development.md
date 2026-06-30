---
title: Local Development
type: architecture
tags: [architecture, dev, docker, database, setup]
status: current
sources: [database, monitoring, claude-md]
updated: 2026-06-30
---

# Local Development

Package manager is **yarn**.

## Database
- `yarn db:up` — Postgres + pgAdmin via docker-compose. Postgres on `localhost:5433`
  (user `postgres`, db `pdm_db`); pgAdmin at `http://localhost:8080`.
- `.env` needs `DATABASE_URL` (see `.env.example`).
- Migrations: `yarn db:generate` → review `drizzle/migrations/` → `yarn db:migrate`
  (or `yarn db:push` for dev). `yarn db:studio` opens Drizzle Studio. Full schema
  workflow in [[data-model]].

## App
- `yarn dev` (Vite dev server) · `yarn build` · `yarn preview` (:4173).
- `yarn check` — `svelte-kit sync` + `svelte-check` (type check), run after changes.
- `yarn lint` (prettier + eslint) · `yarn format`.

## Tests
- `yarn test` — unit (`vitest --run`) then e2e (Playwright).
- Dual vitest projects: `client` (browser, `*.svelte.{test,spec}.ts`) and `server`
  (node). Single file: `yarn test:unit -- --run src/path/file.spec.ts`.

## Observability stack
`yarn docker:up` / `yarn logging:up` / `yarn monitoring:up` — see [[observability]].

Secrets live in `.env` / `$env/static/private` (DB, R2/Cloudflare — [[media-storage]]).
Never commit them.
