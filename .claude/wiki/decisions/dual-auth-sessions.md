---
title: Decision — Dual session systems
type: decision
tags: [decision, auth, sessions]
status: current
sources: [claude-md]
updated: 2026-06-30
---

# Decision — Dual session systems

**Context.** PDM has two audiences with different security/UX needs: listeners
(the public app) and artists (the Studio).

**Decision.** Run two parallel session systems — listener `session` (validated in
hooks for every request) and artist `artist_session` (validated lazily in Studio
loads, auto-minted for users who own an artist). See [[auth]].

**Alternatives.** A single session with a role flag; or RBAC on one session.

**Consequences.** Clear separation of listener vs artist surfaces and cookies; Studio
gating is explicit. Cost: two code paths to keep correct, and the `user ↔ artist ↔
artistAccount` relationship must be understood before touching auth. Stateless
token-in-cookie design keeps it horizontally scalable.
