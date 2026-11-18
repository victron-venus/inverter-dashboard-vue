# Documentation

The shared Vue UI used by both inverter dashboard backends, with its contracts,
localization rules and the wiki that describes it.

## Understand it

- [Inverter Dashboard documentation](wiki/Home.md) — the wiki home for the browser UI and the backends that serve it.
- [Development and architecture](wiki/Development.md) — how `src/App.vue` assembles the dashboard.
- [Configuration](wiki/Configuration.md) — serving the SPA, `/api/*` and `/ws` from one origin.
- [Alerts and system notifications](wiki/Notifications.md) — why a replayed event must not change its time.
- [Troubleshooting](wiki/Troubleshooting.md) — checking DNS, VPN, TLS and ingress before the application.
- [Process and results](wiki/Process-and-results.md) — how a shared UI change reaches both backends.
- [Wiki navigation](wiki/_Sidebar.md) — the wiki sidebar links.

## Contracts

- [Native telemetry and controls](controller-contract.md) — the state shape both backends expose over WebSocket.
- [Localization contract](localization.md) — the six supported locales and what each backend must adopt.
- [Electricity tariff editor](electricity-tariffs.md) — the controller as the default price source.
- [Browser acceptance](browser-compatibility.md) — the shared browser gate in `ci.yml`.
- [Screenshot artwork](images/README.md) — the genuine v2.2.9 release SPA the images were captured from.
- [Process and results: the shared dashboard UI](process-and-results.md) — the delivery steps that make a UI change visible.

## Assurance

- [Architecture, security evidence and roadmap](project-assurance.md) — the evidence scope and planned work.
- [OpenSSF Best Practices evidence: inverter-dashboard-vue](openssf-evidence.md) — the index behind the assessment.

## Releases

- [Release version inputs](release-versioning.md) — the `versioning` fields that identify a release.
- [CI and release operations](release-workflow.md) — `.release-policy.json` and the required status.
- [CI orchestration](CI-ORCHESTRATION.md) — how the quality gate and release pipeline divide the events.
- [Version plans and manifest synchronization](VERSIONING.md) — the versioning opt-in.
- [Release-candidate fuzzing](fuzzing.md) — the illustrated RC fuzzing process.
- [Fuzzing release candidates](rc-fuzzing.md) — the reusable bounded fuzz workflow.
- [Release read recovery and rerun validation](release-read-safety.md) — the two fixes carried from the shared toolkit.
- [Early final-build runner check](runner-preflight.md) — why the check runs before the final build.
