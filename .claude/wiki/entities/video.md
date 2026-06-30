---
title: Video
type: entity
tags: [entity, video, content]
status: current
sources: [studio-content-spec, claude-md]
updated: 2026-06-30
---

# Video

A dedicated video content type (`videos`) — videos need fields posts/photos do not.

Fields: video URL, thumbnail URL, duration, `processing/transcoding status` (later),
captions/subtitles (later), visibility, status, published/scheduled timestamps.
Videos can be grouped via `videoCollections` + `videoCollectionItems`.

MVP stores uploaded URLs without full transcoding, but the schema reserves a
`processing_status` for a future Media service ([[media-storage]],
[[content-and-scale-strategy]]). Managed in [[studio-content]]; projects into
[[artist-feed-item]].
