# Release-candidate fuzzing

This public repository uses native, coverage-guided [Jazzer.js](https://github.com/CodeIntelligenceTesting/jazzer.js) fuzzing as a required part of an explicit release-candidate (`rc`) dispatch through the shared Venus OS CI toolkit. The two targets each receive 60 seconds of mutation time. The release pipeline records the exact source commit, workflow run and attempt, manifest hash, and target results before permitting RC publication.

Mutation campaigns do not run on pull requests, ordinary commits, nightly builds, beta releases, or stable promotion. The common runner checks both the public repository flag and the explicit RC event. The README badge describes this policy; it is not a passing-run badge, security certification, or enrollment in Google's hosted OSS-Fuzz service.

## What is exercised

- `fuzz/ess-mode.mjs` exercises production ESS selection and the freshness boundaries that govern ESS/setpoint commands. Arbitrary controller strings must never select JavaScript prototype properties or a command outside the known ESS enum. Capability-owned selections override legacy labels. Binary timestamps and signed setpoints exercise stale, future, non-finite, and valid observations with a fixed clock. No command is sent.
- `fuzz/telemetry.mjs` exercises production telemetry normalization, transport selection, and EV power display. It checks nested availability flags, preservation of measured zero, immutable input, idempotent normalization, and finite unit conversions. Arbitrary IEEE-754 values include NaN, infinities and values that overflow when converting kW to W.

`fuzz/build.mjs` transpiles these exact production TypeScript modules to temporary ESM files without bundling or rewriting their logic. Jazzer instruments those files and uses native libFuzzer coverage feedback. TypeScript checking remains in the normal application CI. The fuzzer dependencies have their own exact lockfile under `fuzz/`; they are not browser dependencies or release assets. Installation disables npm lifecycle scripts.

Initial seed runs exposed inherited-property selection (`__proto__`) and finite kW values overflowing to infinite W. Both defects have fixed unit regressions and retained synthetic corpus inputs. These are robustness tests for pure code, not browser rendering, hardware, MQTT/WebSocket integration, or proof of whole-program safety.

## Reproduce locally

Use a supported Node.js LTS release (CI uses Node 24), then:

```sh
npm ci --prefix fuzz --ignore-scripts --no-audit --no-fund
node fuzz/build.mjs
mkdir -p fuzz/.work/ess-mode fuzz/.work/telemetry
node fuzz/node_modules/@jazzer.js/core/dist/cli.js fuzz/ess-mode.mjs --sync fuzz/.work/ess-mode fuzz/corpus/ess-mode -- -max_total_time=60 -timeout=10 -rss_limit_mb=2048 -artifact_prefix=fuzz/.work/
node fuzz/node_modules/@jazzer.js/core/dist/cli.js fuzz/telemetry.mjs --sync fuzz/.work/telemetry fuzz/corpus/telemetry -- -max_total_time=60 -timeout=10 -rss_limit_mb=2048 -artifact_prefix=fuzz/.work/
```

The first corpus directory receives new interesting inputs; the checked-in seed directories stay unchanged. Inputs are bounded to 4 KiB and targets never perform network, filesystem, browser, or device operations. The shared Linux runner downloads tools and transpiles in setup, then executes targets in a network-isolated namespace with bounded time and memory.

For a failed RC, download the `fuzz-diagnostics-<attempt>` artifact from that workflow attempt. It contains each target's `run.log`, copied and grown corpus, crash input, and machine-readable report. Reproduce an individual crash by replacing the corpus arguments with its file path and using `-- -runs=1`. Keep that exact file when reporting a failure; do not substitute production telemetry containing private identifiers. Add a minimized synthetic seed and a focused unit regression with the fix, run ordinary tests, then request a new RC. A missing target, zero executions, crash, timeout or failed invariant blocks RC publication.

See [the shared runner contract](rc-fuzzing.md) and [release procedure](../RELEASING.md) for policy and evidence details.
