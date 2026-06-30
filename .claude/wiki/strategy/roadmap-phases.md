---
title: Roadmap & Rollout Sequence
type: strategy
tags: [roadmap, phases, sequencing]
status: current
sources: [pdm-positioning, pdm-content-microservice, pdm-system-design]
updated: 2026-06-30
---

# Roadmap & Rollout Sequence

## Product rollout (safe sequence)

The funding/ownership idea is a major differentiator but carries securities,
KYC/AML, rights-accounting, fraud, and compliance risk, so it ships **last**:

1. Streaming + artist pages.
2. Exclusive content.
3. Comments and fan community.
4. Direct subscriptions / support.
5. Artist CRM and analytics.
6. Perks, badges, early-support identity.
7. Regulated crowdfunding / revenue-share via a proper legal structure or partner.

See [[positioning]] and [[defer-investment-layer]].

## Technical migration phases

The build is a modular monolith now, designed to split into services later
(see [[microservice-readiness]], [[content-and-scale-strategy]], [[system-design]]):

- **Phase 1 — Modular monolith.** Postgres canonical data; post body as JSONB
  behind [[post-document-repository]]; Content/Feed/Engagement/Community
  boundaries represented in code; no comments embedded in posts.
- **Phase 2 — Outbox & read models.** Add `content.outbox_events`; move feed-item
  creation to event consumers; add idempotency keys; separate counters from
  canonical reaction records.
- **Phase 3 — Extract hot services.** Content, Media, Feed, Recommendation, Search
  become independent; main app keeps auth/session + Studio UI.
- **Phase 4 — Hot-artist infrastructure.** Dedicated hot partitions, cached first
  pages, hybrid fanout, isolated comments/chats/polls, multi-region cache/CDN.

The product roadmap and the technical phases run in parallel: shipping
subscriptions (product step 4) does not require waiting for service extraction
(technical phase 3).
