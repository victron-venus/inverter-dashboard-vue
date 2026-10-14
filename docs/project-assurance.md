# Architecture, security evidence and roadmap

## Getting started

Use [build, library integration and deployment](../README.md). The documented [contribution checks](../CONTRIBUTING.md) are the local validation entry point. [Release ownership](../RELEASING.md) separates automated qualification from acceptance on a target deployment.

## Architecture and boundaries

The SPA composes Vue components over normalized state. `useConnection.ts` owns private WebSocket/polling and public snapshot lifecycles, while `telemetry.ts` and `publicGateway.ts` normalize observations. `essMode.ts` validates command selections/freshness and supplies correlation identifiers. The component-library build and SPA build share source but are separate generated products. Backend authorization remains outside this repository and mandatory for real commands.

## Security argument and operating assumptions

The browser and configured backend are distinct trust boundaries. Private polling credentials are sent only to the page origin, and redirects are rejected; system-notification requests use the same restriction. Public remote snapshot proxies require HTTPS and do not receive the private page token. Supported deployment uses a maintained browser and HTTPS/WSS; local HTTP compatibility remains available and is not a secure transport claim. Browser TLS/Web Crypto implementations own cryptography: application code never selects TLS ciphers, performs certificate verification or overrides a rejected certificate. Command UUIDs use `crypto.getRandomValues`; no `Math.random` fallback generates these identifiers. No external-user password verifier is stored by this client. Tokens in page URLs remain sensitive to browser history and server logs, so deployments must restrict logging and sharing.

Connection/authentication/lifecycle tests exercise no-cross-origin credential transmission, redirect rejection, disposal and freshness. Normalization and command tests assert bounded values and known selections. `scripts/ci.sh` installs the lockfile without lifecycle scripts, type-checks, lints, tests and builds both products. RC Jazzer.js targets instrument the actual ESS and telemetry modules for 60 seconds each. [Fuzzing documentation](fuzzing.md) records the two previously fixed seed discoveries and their limits.

These controls limit identified risks; they do not constitute an exhaustive independent security assessment. A passing test or a dependency scan does not establish absence of defects. Keep operator credentials outside source archives and public issue reports. Follow [SECURITY.md](../SECURITY.md) for confidential reports.

## Quality and maintenance policy

Major functionality requires automated tests, bug fixes require focused regressions, and changed interfaces require documentation and release-note updates under [CONTRIBUTING.md](../CONTRIBUTING.md). Review must keep validation enabled and explain narrow exceptions. Use the repository lockfiles and the documented common build tools. Dependabot/dependency review and required source-analysis jobs provide recurring feedback; the maintainer investigates actual findings rather than equating a green job with an empty alert list.

## Roadmap and acknowledged gaps

Generate statement coverage for all maintained client and release-helper code, then close measured gaps. Complete an accessibility audit and verify translation coverage instead of inferring compliance from Vue/i18n dependencies. Review every route, command field and persisted setting before asserting complete input validation. Establish independent maintainer recovery and authenticate both source and generated distributions for Silver.

The [changelog](../CHANGELOG.md) records delivered behavior and upgrade impact; issues and pull requests record decisions. This roadmap is a prioritized maintenance direction, not a release-date promise. Current automated test counts and scans belong to their exact source revision and CI run. No whole-project 80% coverage, complete security assurance case, bit-for-bit reproducible build or comprehensive accessibility certification is claimed by this document.

## OpenSSF assessment

[The evidence index](openssf-evidence.md) connects the public practices to the official assessment. The live assessment is authoritative for the awarded level. Unverified criteria remain unknown or unmet, and Silver continuity remains unmet as documented in [governance](../GOVERNANCE.md).

## Tested HTTPS deployment boundary

[The Caddy profile](../deploy/https/README.md) supplies TLS1.3-only hosting, P-256 automatic keys and same-origin browser connections. Its isolated integration check validates a real trusted P-256 chain and rejects TLS1.2/untrusted roots. This evidence applies to that supported profile, not to every arbitrary web server or browser trust configuration. Private polling additionally rejects cross-origin bases and redirects before forwarding page credentials. Library consumers remain responsible for their embedding application's hosting policy.

## Warning review

Biome now parses complete Vue templates, so template-used imports and handlers are not falsely reported as unused. The remaining warnings are predominantly intentional CSS priority overrides and test non-null assertions (under one warning per 100 source lines in the reviewed snapshot); they remain visible for maintenance and are not broadly suppressed. The two autofocus exceptions identify actual native modal-dialog slots. Camera playback starts muted, and form-adjacent action buttons declare their type. This does not establish complete accessibility conformance or maximal warning strictness.
