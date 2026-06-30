# WIKI.md — PDM Knowledge Base (maintainer's manual)

This file configures how an LLM maintains the PDM wiki. Read it before
ingesting a source, answering a question against the wiki, or running a lint
pass. The pattern this implements is described in `.claude/LLM-wiki.md`.

## What this wiki is

A single, interlinked, LLM-maintained knowledge base for the **whole PDM
project** — business/strategy, product/UX, technical architecture, and domain
concepts. It is a persistent, compounding artifact: cross-references,
contradictions, and synthesis are kept current, not re-derived per question.

- **You (the human)** curate sources, ask questions, direct analysis.
- **The LLM** writes and maintains every page: summarizing, cross-referencing,
  filing, and bookkeeping.

## Three layers

1. **Raw sources** — original documents are *absorbed*, not kept as a verbatim
   layer. After a source is absorbed, the original is removed; git history is the
   archive. `log.md` records which pages came from which source.
2. **The wiki** — the LLM-owned markdown under `.claude/wiki/`.
3. **The schema** — this file. Co-evolves with the project; update it when
   conventions change.

## Directory map

```
.claude/wiki/
  WIKI.md            # this file
  home.md            # entry point / Map of Content
  index.md           # catalog of every page, grouped by category
  log.md             # append-only chronological record
  strategy/          # economic model, positioning, roadmap, monetization
  product/           # features, UX flows, surfaces, studio, design system
  architecture/      # system design, storage, services, auth, media, observability
  concepts/          # cross-cutting domain & product concepts (one per page)
  entities/          # the nouns of the system (Artist, Track, Post, …)
  decisions/         # ADR-style decision records (why X over Y)
  ideas/             # interesting ideas to keep (product, technical, monetization)
  marketing/         # analytics, campaigns, growth plans
```

What goes where:
- **strategy/** — why PDM exists, how it makes money, what order it ships.
- **product/** — what users and artists experience; surfaces and flows.
- **architecture/** — how it is built and how it scales.
- **concepts/** — a named idea that recurs across pages (glossary-grade).
- **entities/** — a domain noun with fields, relations, and lifecycle.
- **decisions/** — a choice made, the alternatives, and the reasoning.
- **ideas/** — not-yet-decided sparks worth keeping.
- **marketing/** — market data, campaign plans, channel notes.

## Page conventions

- Filenames: `kebab-case.md`. One page = one entity / concept / topic.
- Every page starts with YAML frontmatter:
  ```yaml
  ---
  title: Artist Subscription Model
  type: concept        # overview|strategy|product|architecture|concept|entity|decision|idea|marketing|source
  tags: [monetization, subscription, core]
  status: current      # current|draft|superseded
  sources: [pdm-concept-v1]   # provenance slugs (see log.md)
  updated: 2026-06-30
  ---
  ```
- Link related pages liberally with `[[wiki-links]]` (Obsidian style). A dangling
  link to a page that does not exist yet is fine — it marks a page worth writing.
- Language: **English**, even when a source is in another language (translate).
- Keep pages focused; when a page grows past ~1 topic, split it and cross-link.

## index.md

Content-oriented catalog. Grouped by category. Each line:
`[[page]] — one-line summary`. Update it on every ingest. When answering a query,
read `index.md` first to locate pages, then drill in.

## log.md

Append-only, chronological. Each entry is prefixed so it is greppable:
`## [YYYY-MM-DD] <op> | <subject>` where `<op>` ∈ {migrate, ingest, query, lint}.
`grep "^## \[" log.md` lists history. Record source→page mappings on ingest.

## Operations

### Ingest (add a source)
1. Read the source fully.
2. Discuss key takeaways with the human (unless batch mode).
3. Create or update the relevant pages — usually several across categories.
4. Add cross-references both ways (new page ↔ existing pages).
5. Update `index.md`.
6. Append a `log.md` entry: source, date, pages touched.
7. If the source is a project doc being absorbed, remove the original.

### Query (answer a question)
1. Read `index.md` to find candidate pages.
2. Read those pages; follow `[[links]]` as needed.
3. Synthesize an answer with citations to page names.
4. If the answer is durable and reusable, file it back as a new page (and index
   it) so the exploration compounds. Append a `query` log entry for notable ones.

### Lint (health-check)
Periodically scan for:
- contradictions between pages;
- stale/superseded claims newer sources have overturned (mark `status: superseded`
  and link the replacement);
- orphan pages with no inbound links;
- important concepts mentioned but lacking their own page;
- missing cross-references;
- data gaps worth a web search or a new source.
Report findings and suggested next questions/sources; fix what is mechanical.

## Boundary with other context

- **`.claude/wiki/`** (this wiki) — knowledge about the *project*: product,
  architecture, domain, strategy.
- **`memory/`** (Claude Code memory) — facts about the *user*, feedback, and
  cross-session working context. Do not duplicate between them.
- **`CLAUDE.md`** — operational guidance for agents working in the repo; it points
  here for product/business/architecture questions.
