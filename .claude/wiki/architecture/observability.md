---
title: Observability (logging & metrics)
type: architecture
tags: [architecture, observability, logging, metrics, monitoring]
status: current
sources: [logging, monitoring, claude-md]
updated: 2026-06-30
---

# Observability (logging & metrics)

## Request pipeline
`src/hooks.server.ts` chains middleware via `sequence()`:
`sessionHandle` → `loggingHandle` → `mainHandle`. Every request gets a `requestId`
(in `locals`) and structured logs via `src/lib/utils/logger.ts`; HTTP/DB/error
metrics via `src/lib/utils/metrics.ts` (`MetricsCollector`).

## Logging
- `logger.debug/info/warn/error(msg, { component, requestId, metadata })`.
- Stack: **Loki** (storage, :3100) + **Promtail** (collection) + **Grafana**
  (viz, :3000, admin/admin). Configs: `loki-config.yaml`, `promtail-config*.yaml`.

## Metrics
- App metrics exposed at **`/api/metrics`** (prom-client) for **Prometheus** (:9090).
- **Node Exporter** (:9100) and **cAdvisor** for host/container metrics.
- Grafana dashboards: "PDM Application Overview" and "System & Docker Monitoring".

## Running it
`yarn docker:up` (everything) · `yarn logging:up` (Loki/Promtail/Grafana/Prometheus/
exporters) · `yarn monitoring:up` (Prometheus + node-exporter + Grafana). See
[[local-development]]. Ports: Grafana 3000, Prometheus 9090, Loki 3100, app metrics
`:4173/api/metrics`.
