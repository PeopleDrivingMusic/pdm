---
title: Artist Studio Overview
type: product
tags: [product, studio, artists, dashboard]
status: current
sources: [artistflow]
updated: 2026-06-30
---

# Artist Studio Overview

The Studio is the artist's control center. Sidebar navigation and the purpose of
each surface:

- **Dashboard** — the "snapshot": a Bento-box grid of live stats (online listeners,
  TrustScore, new $1 subscribers), earnings (available balance + month-end forecast),
  and alerts ("song X is going viral", "answer 50+ comments").
- **Music** — catalog, releases, and per-track economics. Track table with
  sparklines; actions: upload WAV/MP3, access rights, launch crowdfunding. Per-track
  data: retention, conversion (listeners → subscribers), ROI. See [[studio-music]].
- **Content** — production & planning: posts, videos, stories, polls; publishing
  calendar and file manager. See [[studio-content]].
- **Community** — fan CRM: active-fan list with filters, comment aggregator, direct
  reply, fan spotlight/rewards. Fan profile data: loyalty/status (Core Fan,
  Investor), achievements/badges, LTV.
- **Analytics** — the AI strategist: heat-maps, conversion funnels, AI advice
  (e.g. "500 paying fans in Berlin — consider a concert, expected revenue $X").
- **Wallet** — earnings, royalties, and crypto payouts ([[economic-model]]).

The Studio is gated by the artist session ([[auth]]). Music and Content are the two
built-out surfaces today; Community/Analytics/Wallet are specified here and ship per
[[roadmap-phases]]. Artist-facing data depends on [[trustscore]] and analytics
pipelines from [[system-design]].
