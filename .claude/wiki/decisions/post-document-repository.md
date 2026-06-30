---
title: Decision — Post body behind a document repository
type: decision
tags: [decision, content, storage, tiptap]
status: current
sources: [pdm-system-design, studio-content-spec]
updated: 2026-06-30
---

# Decision — Post body behind a document repository

**Context.** Post bodies are flexible Tiptap JSON (rich blocks, drafts, possibly edit
history) — a good fit for a document store later, but we want Postgres now.

**Decision.** Access post bodies through a `PostDocumentRepository` interface
(`getPostDocument` / `savePostDocument` / `deletePostDocument`). The first adapter
stores documents in **Postgres JSONB**; a future adapter can use MongoDB/another
document store. All create/update/delete/read flows go through the repository. See
[[post-document-repository|this page]] · entity [[post]].

**Alternatives.** Read/write `body_json` directly in routes/services (couples the
product to Postgres JSONB and makes a later move a rewrite).

**Consequences.** A future document-store migration replaces the adapter, not Studio
routes, public artist pages, or content application services. Small indirection now;
large flexibility later ([[polyglot-storage]], [[service-boundaries]]).
