---
title: Authentication (dual sessions)
type: architecture
tags: [architecture, auth, sessions, security, core]
status: current
sources: [claude-md, pdm-system-design]
updated: 2026-06-30
---

# Authentication (dual sessions)

PDM runs **two parallel session systems**. Understand this before touching auth or
the Studio. Rationale and trade-offs in [[dual-auth-sessions]].

## Listener sessions
- Cookie `session`, validated in `src/hooks.server.ts` for **every** request →
  populates `event.locals.user` / `event.locals.session`.
- Logic in `src/lib/server/session.ts`. `locals.user` is a `SafeUser` (no
  `hashedPassword`, see `src/app.d.ts`).
- Login: email/password (Argon2) or Google OAuth (Arctic).

## Artist sessions (Studio)
- Cookie `artist_session`, validated **lazily** in route loads via
  `getArtistByCookie()` (`src/lib/server/artist-session.ts`) — **not** in hooks.
- If no artist cookie exists but the logged-in user owns an artist, a fresh artist
  session is minted automatically. `src/routes/studio/+layout.server.ts` redirects
  to `/artist/login` when there is no artist.

## Identity shapes
A `user` may own one `artist` (public profile). An `artistAccount` is the credential
record; one artist → many artist accounts/sessions. See [[artist]], [[user]].

Tokens are SHA-256 hashed before storage; sessions live in Postgres (the
identity/authz domain in [[system-design]]). Stateless request handling keeps the
app horizontally scalable ([[service-boundaries]]).
