---
title: Decision — Modular monolith, microservice-ready
type: decision
tags: [decision, architecture, microservices]
status: current
sources: [pdm-content-microservice, pdm-system-design]
updated: 2026-06-30
---

# Decision — Modular monolith, microservice-ready

**Context.** PDM targets Spotify/Instagram/YouTube scale but is a small project
today; premature microservices would slow it down.

**Decision.** Build a **modular monolith** with explicit application-service
boundaries so it can split into independent services on separate servers with
minimal rework. UI → routes → application boundary → DB services → storage. See
[[service-boundaries]], [[content-and-scale-strategy]].

**Alternatives.** Microservices now (operational overhead, premature); a tangled
monolith (cheap now, expensive to split later).

**Consequences.** Slight indirection today (routes call boundaries, not DB directly),
in exchange for cheap future extraction of Content/Media/Feed/etc. Requires
discipline: no Drizzle types/DB sessions across boundaries, no cross-domain
transactions, stateless handlers, outbox events. The stable thing is the **contract
between services**, not the storage.
