# Changelog

## [2.2.12] - 2026-10-27

### Changed

- Update the coordinated Univer spreadsheet packages to 1.2.0 and Lucide Vue icons to 1.61.0.
- Refresh the Vite build tool to 8.3.5 and retain the full browser compatibility checks.


- Complete the browser test fixture's WebSocket close handshake, preserving valid
  client close metadata, and exercise close/reconnect across a real browser reload.
  Allow up to 30 seconds for hosted browser navigation while retaining the separate
  10-second application readiness checks and the full compatibility matrix.

## [2.2.11] - 2026-10-20

### Fixed

- Recover a silent WebSocket even when HTTP fallback continues to deliver live dashboard data. HTTP responses no longer reset the socket heartbeat, so the existing reconnect path can restore the command channel after a network interruption.
- Preserve fresh HTTP telemetry when the command socket closes or errors. An independent 15-second deadline disconnects expired fallback data; newer WebSocket telemetry and cleanup cancel that deadline. Regression tests cover recovery, expiry and retired callbacks.

### Changed

- Update Lucide Vue to 1.58.0, Vitest to 5.0.5 and fake-indexeddb to 6.2.6 with their reviewed lockfile entries.
- Refresh pinned CI actions and reject incomplete Scorecard check results instead of accepting incomplete reports.
- Clarify the separate telemetry and command connections, and document the current six-option ESS selection contract.

### Upgrade

Use the existing update procedure and retain local configuration and data. Python and Go packages must import the official SPA and its release evidence before rebuilding their backend image. No API, configuration or stored-data migration is required. Reload an existing browser tab to load the new frontend.

### Security

Connection recovery keeps the existing command availability checks and does not replay commands automatically. This maintenance release makes no claim of verified delivery to physical equipment or of operating-system notification delivery; those require separate acceptance on the intended deployment.

## [2.2.10] - 2026-10-18

### Fixed

- Limit tariff cost intervals to 1–366 inclusive calendar dates. Reject a 367th date consistently across leap years and daylight-saving transitions while retaining local-day pricing.
- Cover invalid, reversed and skipped calendar dates in the tariff regression tests.

### Changed

- Route Dependabot metadata approval through the trusted default branch while preserving the existing author and review policy.
- Refresh the documented dashboard preview and pinned shared CI workflows.

### Upgrade

Use the existing update procedure and preserve configuration. Python and Go deployments must import the official SPA and its release evidence before rebuilding their backend image. No data migration is required.

### Security

This maintenance release changes date-range validation and CI dependencies. It introduces no new authentication behavior or claim of physical-device acceptance.

## [2.2.9] - Development line

### Changed

- Complete the English, Russian, Ukrainian, German, French and Dutch dashboard catalogs, including settings, validation messages, tariff tools and accessible control labels. Persist the selected language and synchronize it across tabs.
- Format dates and numbers for the selected locale, and update existing application-owned errors when the language changes. Keep operator device names and external diagnostics intact.
- Add six-language operating documentation and illustrated localization, release and validation guides.
- Update Vitest to 5.0.4, Happy DOM to 21.0.1 and the pinned shared CI workflows. Keep standalone fuzz builds connected to the real production modules, JSON catalogs and lockfile-bound runtime dependencies.
- Make browser acceptance wait for the current fixture telemetry and connected state after document load, including public read-only telemetry. Retain the existing deadlines and eleven application scenarios; add eight isolated controls that reject incomplete or incorrect readiness and verify reverse request arrival order.
- Run readiness controls sequentially in fresh browser contexts so deliberately pending requests cannot exhaust another control's shared connection pool. Preserve per-control traffic diagnostics on failure.

### Upgrade

Use the documented update procedure and retain existing local configuration,
credentials and data. No configuration or data migration is required. The new
language preference is stored locally in the browser; system language selection
remains available. For Python and Go deployments, import the official SPA and
its release evidence before building the backend image. Keep the previous
immutable release for rollback and validate the candidate on the intended target.

### Security

Localized label lookup rejects inherited object properties, and malformed JSON
imports retain safe application-owned validation errors. Browser readiness
fixtures serve precomputed HTML only; unknown fixture modes return 404, and
external requests remain blocked. Fuzz replay uses the actual production import
graph rather than substituted implementations. These synthetic checks do not
establish deployment authentication, physical hardware acceptance or the safety
of commands sent to real equipment.

## [2.2.8] - Development line

### Changed

- Qualify this release with a bounded RC fuzz campaign, offline target execution, and deterministic seed replay checks.
- Bind release evidence to the exact source and toolkit revision, validate seed corpora, and retain engine execution counts and diagnostic artifacts.
- Document the fuzzing scope, resource limits, and the distinction between synthetic checks and target acceptance.
- Refresh frontend dependencies and their lockfile, including Lucide icons, Univer sheets, Vue type checking, and Vue I18n.

### Upgrade

Use the existing installation or update procedure. Existing user configuration
and data formats are preserved.
Keep the previous immutable release for rollback. Test the exact RC package on the
intended target before accepting a stable promotion.

### Security

Fuzz targets and deterministic preflight commands run offline on synthetic
inputs. Setup and dependency installation may use the runner network. The
campaign rejects missing or invalid seed corpora and incomplete execution
evidence. These checks do not establish untested hardware, integrations,
credentials, or deployment behavior.

## Unreleased

- Require bounded, coverage-guided ESS and telemetry fuzzing for public release candidates through the shared toolkit; add synthetic corpora and reproduction documentation.
- Reject inherited JavaScript object properties as ESS mode aliases.
- Treat legacy EV charging power that overflows during kW-to-W conversion as unavailable instead of displaying infinity.

## [2.2.7] - Development line

### Release overview

Provides the shared Vue dashboard SPA and reusable UI components. The existing README documents configuration and external interfaces for this development line.

### Maintenance

- Add a tested same-origin Caddy hosting profile with TLS1.3, P-256 keys and a restrictive connection policy.

- Restrict private state polling to the page origin and reject redirects before forwarding a page token.

- Publish reviewed release notes from the exact source commit used to build each candidate, preserving build provenance.
- Document contribution checks, confidential security reporting and the project-specific trust boundaries.

### Upgrade

Camera playback now starts muted; use its media controls to enable audio.

Private polling now rejects cross-origin API bases; use a same-origin reverse proxy for private dashboards. Public snapshot mode retains its documented HTTPS proxy support. No data migration is required. Retain local configuration and credentials when using the documented update procedure. Validate the candidate on an isolated system before production use; automated checks do not establish hardware acceptance.

### Security

Private vulnerability reporting and response policy are documented in SECURITY.md. This maintenance update strengthens release evidence and review instructions; it does not replace deployment authentication, network isolation or independent equipment safeguards. No new project CVE is announced by these changes.
