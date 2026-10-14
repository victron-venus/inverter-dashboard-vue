# Changelog

## [2.2.8] - Development line

### Changed

- Qualify this release with a bounded RC fuzz campaign, offline target execution, and deterministic seed replay checks.
- Bind release evidence to the exact source and toolkit revision, validate seed corpora, and retain engine execution counts and diagnostic artifacts.
- Document the fuzzing scope, resource limits, and the distinction between synthetic checks and target acceptance.

### Upgrade

Use the existing installation or update procedure. This release changes validation
and release tooling; existing user configuration and data formats are preserved.
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
