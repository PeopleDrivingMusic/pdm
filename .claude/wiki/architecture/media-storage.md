---
title: Media Storage (Cloudflare R2)
type: architecture
tags: [architecture, media, storage, r2, uploads]
status: current
sources: [claude-md, pdm-system-design]
updated: 2026-06-30
---

# Media Storage (Cloudflare R2)

Media delivery is **infrastructure, not database traffic** ([[system-design]]).
PDM uses **Cloudflare R2** (S3-compatible) via `src/lib/db/services/R2Service.ts`.

- **Buckets:** `music` (audio) and `images` (covers/photos), chosen by content type
  via `bucketForContentType()`.
- **Uploads:** presigned single `PUT` and **multipart** uploads (8 MB parts) for
  large audio; presigned read URLs with TTLs. Browser uploads go **direct-to-R2** via
  targets issued by `api/studio/media/upload-target` and `MediaUploadService`
  ([[service-boundaries]]) — keeping heavy I/O off the app server.
- **Track status:** tracks carry an upload `status`; only `uploaded`/`ready` are
  playable (`playableTrackStatus()` in `queries.ts`). See [[track]].

Secrets (`CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) come
from `$env/static/private` and must stay server-only. The Media seam is designed to
become a standalone **Media Service** later (transcoding, image variants, video
processing — [[content-and-scale-strategy]]).

> Historical note: the original Studio Music MVP spec used local `static/uploads/`;
> that approach is **superseded** by R2 ([[studio-music]]).
