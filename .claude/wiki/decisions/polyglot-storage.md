---
title: Decision — Polyglot storage, Postgres as canonical core
type: decision
tags: [decision, storage, scale]
status: current
sources: [pdm-system-design]
updated: 2026-06-30
---

# Decision — Polyglot storage, Postgres as canonical core

**Context.** Global-scale targets with very different access patterns (catalog,
events, feeds, comments, chat, search, payments).

**Decision.** Use PostgreSQL as the canonical relational/authz core, and route
high-volume or flexible patterns to purpose-fit stores (object storage/CDN, document
store, Redis, OLAP, search engine, wide-column). Split by **bounded context and
access pattern**, not by fashion. See [[system-design]].

**Alternatives.** All-Postgres (simplest, but it becomes the bottleneck for feeds/
comments/chat/events); all-NoSQL (loses transactional/authz guarantees for
money/identity).

**Consequences.** More moving parts long-term, but each surface scales independently
and Postgres stays correct for identity/catalog/finance. The important near-term move
is not adopting every DB now — it is designing code so data can move later without a
rewrite ([[microservice-readiness]], [[post-document-repository]]).
