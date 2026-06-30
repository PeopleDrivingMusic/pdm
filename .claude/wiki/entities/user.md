---
title: User
type: entity
tags: [entity, user, identity]
status: current
sources: [claude-md, database]
updated: 2026-06-30
---

# User

A listener account. May optionally own one [[artist]] profile.

- **`users`** — account + profile (email, username, `hashedPassword`, …).
- **`sessions`** — listener sessions (cookie `session`, validated in hooks). See
  [[auth]].
- Exposed to the app as `SafeUser` (no `hashedPassword`, `src/app.d.ts`).

Relations: owns [[playlist]]s, `userFavorites`, and `purchases`
([[subscription-and-purchase]]). A user becomes a fan by taking an
[[artist-subscription]]; spend unlocks [[loyalty-tiers]]. Listener behavior is scored
by [[trustscore]] to weight [[user-centric-royalties]].
