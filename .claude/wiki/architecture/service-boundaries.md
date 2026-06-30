---
title: Service Boundaries (extraction seams)
type: architecture
tags: [architecture, boundaries, microservices, code]
status: current
sources: [pdm-content-microservice, pdm-system-design, claude-md]
updated: 2026-06-30
---

# Service Boundaries (extraction seams)

PDM is a SvelteKit monolith built to **split into services later with minimal
rework** ([[microservice-readiness]]). The seams are explicit application-service
boundaries that routes call instead of reaching into DB code directly.

## The layers
1. UI (Svelte 5 components) →
2. SvelteKit routes / form actions / `+server.ts` →
3. **Application-service boundary** (`src/lib/server/content`, `src/lib/server/media`) →
4. DB services (`src/lib/db/services/*`, `src/lib/db/queries.ts`) →
5. Storage (Postgres via Drizzle; R2 for media).

## Key boundaries in code
- `ContentApplicationService` (`src/lib/server/content`) — the Content seam; Studio
  routes depend on it so the in-process DB implementation can later become a remote
  Content service client. Wraps `PostService`, `GalleryService`, `VideoService`,
  `StudioContentService`, etc. ([[studio-content]]).
- `MediaUploadService` (`src/lib/server/media`) — the Media seam; issues upload
  targets, will front a future Media service ([[media-storage]]).
- `PostDocumentRepository` (`src/lib/db/services/PostDocumentRepository.ts`) — the
  document-storage seam; Postgres JSONB now, document store later
  ([[post-document-repository]]).

## Discipline (so the seams stay real)
- No leaking Drizzle types or DB sessions across a boundary.
- No cross-domain transactions assuming one database.
- Stateless request handling; heavy I/O goes direct-to-storage (R2 presigned).
- Add outbox events for publish/update/delete/reaction/vote ([[content-and-scale-strategy]]).

New feature logic goes **behind/along** these boundaries, not inward into the
monolith.
