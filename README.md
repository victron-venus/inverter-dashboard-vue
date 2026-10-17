# Inverter Dashboard UI

[English](README.md) · [Русский](README.ru.md) · [Українська](README.uk.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Nederlands](README.nl.md)

[![CI](https://github.com/victron-venus/inverter-dashboard-vue/actions/workflows/ci.yml/badge.svg)](https://github.com/victron-venus/inverter-dashboard-vue/actions/workflows/ci.yml)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/15476/badge)](https://www.bestpractices.dev/en/projects/15476)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

One Vue interface for the [Python dashboard](https://github.com/victron-venus/inverter-dashboard) and [Go dashboard](https://github.com/victron-venus/inverter-dashboard-go): energy readings, native Victron warnings, Home Assistant controls and electricity tariffs. This repository builds the browser application and an optional component library. It does not contain an MQTT broker or a standalone backend.

**Start here:** install a backend using its README, then open that backend's URL. Use this repository to develop the interface, build a custom integration or maintain translations.

## Features and data ownership

- Grid, consumption, solar, battery, phase, backup and daily energy readings preserve unavailable values and source freshness.
- Six ESS choices, seven controller header flags and a persistent setpoint override require current backend capabilities and authoritative results. An open browser connection alone cannot authorize a write.
- Native Victron banners and history use the event's occurrence time. Receiving a replay does not make the event new.
- Home buttons come from operator configuration. Device names are not hardcoded. Disabled/inactive appliances stay hidden; unknown state stays unavailable.
- Water, EV, batteries, solar sources and Active Loads have configurable visibility and availability-aware readings.
- The daily strip stays compact. Tariff editing and interval-cost analysis live in Settings; estimates are not utility invoices.
- Optional server-backed Web Push requires explicit consent. Registration and a queued test do not prove OS delivery.
- English, Russian, Ukrainian, German, French and Dutch interface translations include language selection. Configured device labels and raw external diagnostics retain their original language.

![Data ownership and browser trust boundary](docs/assets/architecture.svg)

[Inverter Desktop](https://github.com/victron-venus/inverter-desktop) is the reference for shared behavior, but maintains its own native application and source tree. Building this SPA does not automatically update Desktop. Installers, tray integration, biometrics and native plugin execution are separate features.

## Development quick start

Use the Node toolchain declared by current CI and the checked-in npm lockfile. [package.json](package.json) and [scripts/ci.sh](scripts/ci.sh) are authoritative for commands and versions.

```sh
npm ci
npm run dev
```

Vite normally uses port 5173. Private mode expects `/ws` and `/api/*` on the **same origin**. Vite alone has no live data or command backend: use a local reverse proxy or serve the built SPA through a development Python/Go backend. See [the HTTPS profile](deploy/https/README.md). Never put gateway credentials in `VITE_*` variables.

```sh
npm run typecheck
npm run lint
npm test
npm run build:all
```

The [browser acceptance suite](docs/browser-compatibility.md) exercises the built SPA in pinned Chromium, Firefox and WebKit generations on Linux, Windows and macOS. Its compact matrix is required for PRs; packaged release qualification uses the full 35-target inventory against the same built SPA archive.

Outputs: `dist/` is the SPA; `dist-lib/` is the component library. [src/lib.ts](src/lib.ts) defines exports. Library hosts supply Vue, vue-i18n, ECharts, vue-echarts and a translation context. This is not a claim that a corresponding public npm package is published.

## Configuration

The backend owns connections, credentials, discovery and allowed Home entities. Settings provides language, visibility, tariff tools and notification preferences. Installation-specific Home entries belong in ignored local/private backend configuration. A privacy helper should expose a normal `switch.*` entity with its semantics defined once in Home Assistant; do not invert it again in the UI.

Read [the controller contract](docs/controller-contract.md), [tariff guide](docs/electricity-tariffs.md) and [configuration guide](docs/wiki/Configuration.md). No documentation or translation test should operate physical equipment.

## Alerts, reconnects and history

![Event occurrence and display sequence](docs/assets/event-lifecycle.svg)

Banner ages use source occurrence time. Missing time is unavailable; future time is explicit rather than clamped to “just now”. The OS may separately label notification delivery time. Connection changes retire earlier asynchronous work. Source identity, freshness and acknowledgements are separate checks. An HTTP fallback replaces removed devices as well as adding current ones.

Charts show gaps for missing measurements. History is a session buffer capped at 1800 points, not a durable 24-hour archive. Notification history/replay suppression is also bounded; it is not a permanent alarm audit log.

## Languages and documentation

[Localization](docs/localization.md) covers selection, fallback, interpolation and tests. Six localized READMEs provide setup and operating guidance; detailed developer references remain in English. Entity IDs, command values and operator labels must not be translated into different wire values.

The [documentation hub](docs/wiki/Home.md) links configuration, notifications, troubleshooting and development. `docs/wiki/` is the reviewable source for the GitHub wiki. See [CONTRIBUTING](CONTRIBUTING.md) and [SECURITY](SECURITY.md) for contributions and private reports.

## Public read-only mode

```sh
VITE_PUBLIC_MODE=true npm run build:spa
```

Public mode polls a sanitized proxy at `/api/gateway/snapshot` by default and has no private command channel. [Configuration](docs/wiki/Configuration.md) describes HTML/runtime alternatives. IGW bearer and Cloudflare Access credentials stay on the proxy. Remote proxies require HTTPS; redirects and URL credentials are rejected. A public view still needs a reachable data source.

## Delivering a UI update

Both backends embed a particular built SPA. A merged UI change reaches users only after reviewed asset adoption, backend rebuilding and deployment. Record frontend source, artifact identity and backend release together; verify served assets and actual browser behavior.

[scripts/export_dist.sh](scripts/export_dist.sh) assumes canonical sibling checkouts. Do not run it from an isolated worktree or overwrite another project's assets with an unreviewed local build. Follow the backend's official asset procedure.

<!-- ci-release-process:start -->
## Release process

See the [release strategy](RELEASING.md) for validation, nightly, beta, RC and stable promotion rules, and the [operator runbook](docs/release-workflow.md) for local commands.
<!-- ci-release-process:end -->

## Troubleshooting

- **Page unavailable:** check DNS, VPN routes, TLS, ingress and service endpoints. A Ready Pod does not prove browser reachability.
- **Stale readings:** distinguish browser-to-backend connectivity from backend-to-IGW and IGW-to-Cerbo connectivity.
- **Disabled control:** inspect current state, capability and source freshness; Home additionally requires direct HA availability. Do not remove the guard.
- **Missing system banner:** verify permission, subscription, server availability and actual OS delivery separately.
- **Wrong language:** reselect it in Settings, check browser storage restrictions and report the exact locale, screen and build.

More: [troubleshooting](docs/wiki/Troubleshooting.md), [notifications](docs/wiki/Notifications.md), [development](docs/wiki/Development.md).

## License

[MIT](LICENSE). Third-party dependencies retain their own licenses.
