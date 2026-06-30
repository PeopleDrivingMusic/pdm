---
title: User-Centric Royalties
type: concept
tags: [royalties, monetization, economics]
status: current
sources: [pdm-concept-v1]
updated: 2026-06-30
---

# User-Centric Royalties

Listening revenue is distributed **per user**: the pool from a user's
subscriptions is split among the tracks **in proportion to that user's own
listening time**, not pooled platform-wide and divided pro-rata across all streams.

Why it matters:
- a fan's money flows to the artists *that fan* actually listens to;
- it resists stream-farming that dilutes a global pool;
- it reinforces [[fan-base-monetization]] over raw play counts.

Royalty accounting consumes **listening events**, which are an analytics/OLAP
concern, not Postgres rows — see [[system-design]] §Playback. Manipulation is
further dampened by [[trustscore]] weighting. Part of the [[economic-model]].
