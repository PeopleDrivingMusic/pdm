---
title: Artist Page (home base)
type: product
tags: [product, artist, hub, core]
status: current
sources: [pdm-positioning, studio-content-spec]
updated: 2026-06-30
---

# Artist Page (home base)

The artist page is the real hub — the place where the listener→fan→supporter
relationship deepens ([[positioning]]). It brings together:

- music;
- posts;
- photo gallery;
- video gallery;
- fan community (chat);
- shop / merch (later);
- funding / support;
- events;
- analytics-driven signals (in [[studio-overview]]).

## Public views

Clear, separate tabs instead of one filtered feed (see [[specific-content-tables]]):
Overview / feed · Posts · Music · Photos · Videos · Shop (later). The overview/feed
reads the lightweight [[artist-feed-item]] projection; each specific tab reads its
own tables ([[post]], [[gallery]], [[video]], catalog [[track]]/[[album]]).

The page sits behind the [[persistent-music-layer]] so music keeps playing as fans
explore. Artists manage all of this from the [[studio-overview]].
