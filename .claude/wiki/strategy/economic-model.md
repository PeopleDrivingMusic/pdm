---
title: Economic Model
type: strategy
tags: [monetization, economics, subscription, royalties, core]
status: current
sources: [pdm-concept-v1]
updated: 2026-06-30
---

# Economic Model

## Subscription (artist-centric)

- The user does **not** buy a general platform subscription. They subscribe to a
  **specific artist** for **$1/month**. See [[artist-subscription]].
- **Split:** 80% to the artist, 20% to the platform.
- **Listening revenue:** the subscription pool is distributed across tracks in
  proportion to each user's listening time — a **user-centric** model, not a
  global pro-rata pool. See [[user-centric-royalties]].

This encodes the key shift: from *"pay per number of plays"* to *building and
monetizing a loyal fan base* ([[fan-base-monetization]]).

## Crowdfunding & investment — revenue share (2nd phase)

- An artist can offer a share (e.g. 20%) of a track's **future royalties** via
  crowdfunding; fans buy shares with fiat/crypto.
- Shareholders earn a percentage of the track's revenue **both inside PDM and on
  external platforms** (Spotify, Apple Music, YouTube), where PDM acts as the
  aggregator-licensee.
- Gated behind artist progression ([[artist-grades]]) and a proper legal
  structure — see [[revenue-share-crowdfunding]] and [[defer-investment-layer]].

## Financial logic

- **In:** cards / cryptocurrency.
- **Out:** cryptocurrency only (or an internal PDM token), enabling global payouts
  without cross-border delays.
- Financial state must be strongly consistent and auditable (append-only ledger
  patterns) — see [[system-design]] §Payments and [[subscription-and-purchase]].

## Loyalty tiers

Spending more unlocks platform-wide perks (e.g. $5/mo removes ads across the whole
app; $10/mo adds global merch/event discounts). Detailed in [[loyalty-tiers]].

## User journey (money path)

1. Register → listen free (with limits).
2. Subscribe to an artist ($1) → caching + fan chat unlocked.
3. Invest → buy a 0.1% track share for $5 when the artist opens a raise.
4. Ownership → track releases; PDM + external revenue accrues.
5. Payout → see income in the **Producer cabinet**, withdraw in crypto.

## Industry role — incubator, not competitor

PDM does not compete with major labels; it acts as an **incubator**: it proves an
artist's market fit, and when an artist moves to a major label, fans can take an
**"Exit"** (shares bought out by the label at a multiplier).
