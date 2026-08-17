# LLM Wiki for PDM — Design Spec

**Date:** 2026-06-30
**Status:** Approved (design), pending implementation
**Author:** Ivan Izobov (with Claude Code)

## 1. Goal

Instantiate the LLM-wiki pattern (described in `.claude/LLM-wiki.md`) for the PDM
project. Turn the currently scattered documentation (`.claude/business/`, `doc/`,
root specs) into a single, interlinked, LLM-maintained knowledge base that
compounds over time instead of a pile of static documents.

The LLM owns and maintains the wiki. The human curates sources, asks questions,
and directs analysis. The wiki is a persistent, compounding artifact: cross-
references, contradictions, and synthesis are kept current, not re-derived per
query.

## 2. Decisions (from brainstorming)

| Decision               | Choice                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**              | Whole project — business/strategy + product/UX + technical architecture + domain concepts.                                                      |
| **Existing docs**      | Absorbed into the wiki. Wiki becomes the single source of truth.                                                                                |
| **Migration strategy** | Big-bang — all existing docs absorbed in one pass.                                                                                              |
| **Workflow / tooling** | Obsidian vault: `[[wiki-links]]`, YAML frontmatter, `index.md` + `log.md`. Human browses in Obsidian while LLM edits.                           |
| **Originals**          | Not preserved verbatim. The essence is captured in wiki pages; git history is the fallback archive. Originals are deleted after absorption.     |
| **Language**           | English (chosen for future team growth and global scale), even though some sources are RU or mixed. RU content is translated during absorption. |

## 3. Architecture — three layers

1. **Raw sources** — not kept as a verbatim layer. Originals are absorbed and then
   removed; git history is the archive. `log.md` records which wiki pages came
   from which original document.
2. **The wiki** — LLM-generated, LLM-owned markdown under `.claude/wiki/`.
3. **The schema** — `.claude/wiki/WIKI.md`, the maintainer's manual that makes the
   LLM a disciplined wiki editor. Co-evolves with the project.

## 4. Directory structure

```
.claude/wiki/
  WIKI.md            # schema / maintainer's manual (ingest/query/lint, conventions)
  home.md            # entry point / Map of Content
  index.md           # catalog of all pages, grouped by category (content-oriented)
  log.md             # append-only chronological record (migrate/ingest/query/lint)
  strategy/          # economic model, positioning, monetization, phases
  product/           # features, UX flows, surfaces, wireframes, design system
  architecture/      # system design, services, data model, auth, media, observability
  concepts/          # cross-cutting domain & product concepts (one concept per page)
  entities/          # the nouns: Artist, Track, Subscription, Fan, Post, Album, …
  decisions/         # ADR-style decision records
  ideas/             # interesting ideas to keep (product, technical, monetization)
  marketing/         # analytical data, marketing campaigns and plans
```

## 5. Page conventions (Obsidian-friendly)

- Filenames: `kebab-case.md`. One page = one entity / concept / topic.
- Every page carries YAML frontmatter:
  ```yaml
  ---
  title: Artist Subscription Model
  type: concept # overview|strategy|product|architecture|concept|entity|decision|idea|marketing|source
  tags: [monetization, subscription, core]
  status: current # current|draft|superseded
  sources: [pdm-concept-v1] # provenance
  updated: 2026-06-30
  ---
  ```
- Links via `[[wiki-links]]`, used liberally. A dangling link marks a page worth
  creating later — not an error.
- `index.md`: grouped by category; each line `[[page]] — one-line summary`.
- `log.md`: entries prefixed `## [YYYY-MM-DD] <op> | <subject>` (op =
  migrate/ingest/query/lint), so `grep "^## \[" log.md` lists history.

## 6. WIKI.md — the schema (maintainer's manual)

`WIKI.md` is the heart of the system. It contains:

- **Purpose & layers** — raw-source absorption policy, wiki = living layer, schema
  = this file.
- **Directory map** — what belongs in each folder, including `ideas/` and
  `marketing/`.
- **Page conventions** — frontmatter, naming, one-concept-per-page, linking
  discipline.
- **Operations** (step-by-step workflows the LLM follows):
  - **Ingest** — read source → discuss key takeaways → create/update pages →
    update `index.md` → add cross-references → append to `log.md`. One source may
    touch many pages.
  - **Query** — read `index.md` first → drill into relevant pages → synthesize
    with citations. Valuable answers are filed back as new pages so explorations
    compound.
  - **Lint** — health-check: contradictions, stale/superseded claims, orphan
    pages, missing concept pages, missing cross-references, data gaps.
- **Index & log maintenance rules.**

## 7. Big-bang migration mapping

Each source maps to one or more wiki areas. Exact page-level breakdown is
finalized during implementation **after reading each source** (only `PDM.md` has
been read in detail so far); this spec defines the target areas and the mapping
rules, not the final page list.

| Source                                                         | Absorbed into                                                                                                                                                                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/business/PDM.md`                                      | `strategy/economic-model`; `concepts/` (artist-subscription, fan-base-monetization, revenue-share-crowdfunding, loyalty-tiers); `product/fan-features`, `product/artist-features`; seeds `home.md` overview |
| `.claude/business/PDM_STRATEGIC_POSITIONING.md`                | `strategy/positioning`                                                                                                                                                                                      |
| `.claude/business/PDM_SYSTEM_DESIGN.md`                        | `architecture/system-design` (+ split as needed)                                                                                                                                                            |
| `.claude/business/PDM_CONTENT_MICROSERVICE_STRATEGY.md`        | `architecture/content-microservice-strategy` + `decisions/microservice-readiness`                                                                                                                           |
| `doc/DATABASE.md`                                              | `architecture/data-model` + `entities/` pages                                                                                                                                                               |
| `doc/LOGGING.md`, `doc/MONITORING.md`                          | `architecture/observability`                                                                                                                                                                                |
| `doc/UI-DESIGN-SYSTEM.md`                                      | `product/design-system`                                                                                                                                                                                     |
| `doc/PDM-frontend-wireframe.md`, `doc/PDM-PENCIL-WIREFRAME.md` | `product/wireframes`                                                                                                                                                                                        |
| `doc/STUDIO-CONTENT-SPEC.md`, `ArtistFlow.md`                  | `product/studio-surfaces`, `product/studio-content`                                                                                                                                                         |
| `StudioMusicPage.spec.md`, `StudioMusicPage.plan.md`           | `product/studio-music`                                                                                                                                                                                      |

Entities to extract across sources: Artist, ArtistAccount/ArtistSession, User,
Track, Album, Subscription, Post/ContentMedia, Fan, Playlist, Purchase, Genre.

After absorption, originals are deleted (recoverable via git); `log.md` records a
single `migrate` entry describing the big-bang pass and the source→page mapping.

## 8. Integration & boundaries

- **CLAUDE.md** — add a short "Project Wiki" section pointing at
  `.claude/wiki/WIKI.md`, with the rule: questions about product/business/
  architecture consult the wiki first; durable knowledge is filed into the wiki
  per `WIKI.md`. Update existing CLAUDE.md references to `.claude/business/...`
  so they point at the new wiki pages.
- **`.claude/README.md`** — its instruction ("store business context under
  `.claude/business`") is superseded; replace it with a pointer to the wiki.
- **Boundary with `memory/`** — the wiki holds _project_ knowledge (product,
  architecture, domain). `memory/` holds facts about the _user_, feedback, and
  cross-session working context. No duplication between them.

## 9. Out of scope (YAGNI)

- No search-engine/CLI tooling (e.g. qmd) yet — `index.md` is sufficient at this
  scale. Revisit if the wiki outgrows it.
- No image/asset handling pipeline — sources are text/markdown.
- No Marp/Dataview deliverables required up front; frontmatter is Dataview-ready
  if needed later.

## 10. Success criteria

- `.claude/wiki/` exists with `WIKI.md`, `home.md`, `index.md`, `log.md` and the
  category folders.
- Every existing doc's essence is represented as one or more wiki pages with
  frontmatter and cross-links; originals removed.
- `index.md` catalogs all pages; `log.md` has the migration entry.
- A future session, reading only `WIKI.md` + `index.md`, can locate knowledge and
  correctly ingest a new source, answer a query, or run a lint pass.
- CLAUDE.md and `.claude/README.md` point at the wiki; no dangling references to
  deleted originals.

```

```
