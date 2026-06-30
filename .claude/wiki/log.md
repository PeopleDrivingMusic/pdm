# Wiki Log

Append-only, chronological. Entry prefix `## [YYYY-MM-DD] <op> | <subject>`
(op = migrate | ingest | query | lint). `grep "^## \[" log.md` lists history. See
`WIKI.md` for conventions.

## [2026-06-30] migrate | Big-bang absorption of PDM docs

Instantiated the wiki and absorbed all existing project docs into pages (English,
Obsidian-friendly). Originals were **not** deleted in this pass (they live on
`feature/studio-content`, not on `main`; removal deferred per the design spec). This
PR is additive.

Source → pages:
- `business/PDM.md` (slug `pdm-concept-v1`) → [[economic-model]], [[fan-features]],
  concepts [[artist-subscription]], [[user-centric-royalties]],
  [[fan-base-monetization]], [[revenue-share-crowdfunding]], [[loyalty-tiers]],
  [[trustscore]], [[artist-grades]]; seeded [[home]].
- `business/PDM_STRATEGIC_POSITIONING.md` (`pdm-positioning`) → [[positioning]],
  [[surfaces-overview]], [[artist-page]], [[track-release-context]],
  [[persistent-music-layer]], [[defer-investment-layer]].
- `business/PDM_SYSTEM_DESIGN.md` (`pdm-system-design`) → [[system-design]],
  [[data-model]], [[polyglot-storage]], [[post-document-repository]], [[playlist]].
- `business/PDM_CONTENT_MICROSERVICE_STRATEGY.md` (`pdm-content-microservice`) →
  [[content-and-scale-strategy]], [[service-boundaries]], [[microservice-readiness]],
  [[shard-not-only-by-artist-id]].
- `doc/DATABASE.md` (`database`) → [[data-model]], [[local-development]], entities.
- `doc/LOGGING.md` + `doc/MONITORING.md` (`logging`, `monitoring`) → [[observability]].
- `doc/UI-DESIGN-SYSTEM.md` (`ui-design-system`) → [[design-system]].
- `doc/STUDIO-CONTENT-SPEC.md` (`studio-content-spec`) → [[studio-content]], [[post]],
  [[gallery]], [[video]], [[artist-feed-item]], [[content-media]],
  [[specific-content-tables]].
- `ArtistFlow.md` (`artistflow`) → [[studio-overview]].
- `StudioMusicPage.spec.md` / `.plan.md` (`studio-music-spec`) → [[studio-music]].
- `CLAUDE.md` (`claude-md`) → [[auth]], [[media-storage]], [[service-boundaries]],
  [[data-model]] (cross-referenced).

Notes captured during absorption (superseded facts flagged on their pages):
- Local `static/uploads/` (old Studio Music MVP) is superseded by Cloudflare R2
  ([[media-storage]], [[studio-music]]).
