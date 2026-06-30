---
title: Subscription & Purchase (finance)
type: entity
tags: [entity, finance, subscription, purchase, ledger]
status: current
sources: [database, pdm-system-design, pdm-concept-v1]
updated: 2026-06-30
---

# Subscription & Purchase (finance)

The finance domain — strongly consistent and auditable, isolated from high-volume
social data ([[system-design]] §Payments).

- **`purchases`** — purchase history; references a [[user]] and a [[track]]/[[album]].
- **Subscriptions** — the $1/mo [[artist-subscription]] records and entitlements
  (`public/followers/subscribers/investors` gating, [[fan-features]]).
- **Future** — revenue-share/funding state, payout requests, financial audit
  records ([[revenue-share-crowdfunding]]).

Rules: use append-only **ledger** patterns where money or rights are involved; don't
mix financial tables with social data; the investment layer will require KYC/AML,
rights accounting, and legal boundaries ([[defer-investment-layer]]). Money in via
cards/crypto; out via crypto only ([[economic-model]]).
