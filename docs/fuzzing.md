# Release-candidate fuzzing

See the [illustrated RC fuzzing process and verified rollout results](https://github.com/victron-venus/venus-os-ci-toolkit/blob/main/docs/rc-fuzzing-results.md)
for the shared release flow, evidence requirements and a dated cross-project
snapshot. The project-specific scope and reproduction guidance below still apply.

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

## Deterministic target-contract checks

Ordinary CI now replays the real fuzz target exports using the checked-in
synthetic corpus, fixed malformed inputs and a bounded deterministic byte matrix.
It awaits asynchronous targets and propagates assertion failures. This catches
harness/production API drift without starting Jazzer or a mutation campaign.
The RC preflight repeats this check after its locked setup.

Run locally from the repository root:

```sh
npm ci --prefix fuzz --ignore-scripts --no-audit --no-fund
node fuzz/build.mjs
node fuzz/replay.mjs
```

The replay preserves the same offline boundaries as the targets above; it does
not qualify a release or substitute for the RC's isolated campaign.

## Release workflow retries

Fresh release inputs are selected by the exact GitHub workflow run ID and run
attempt.

Before publication starts, use **Re-run all jobs** only if the allocator and
release policy permit reuse of that run's reservation. Recreate every required
input in the same attempt; failed-only or individual retries can leave inputs
missing, and older artifacts must not fill those gaps.

For a fresh candidate or final build, once publication has started
(`begin_publication`), or its external publication result is partial or uncertain,
inspect the existing release, tags and assets before retrying. A consumed build
number requires a new workflow run and reservation authorized by the release
policy; an existing immutable tag may also require a new base version. Never
reset the release ledger, overwrite assets or retag to force a retry. Historical
byte promotion of an accepted RC keeps its reserved number and follows the
existing promotion policy.

Artifacts from older attempts may remain available for diagnostics; they are not
inputs to the new attempt and do not need to be deleted. Filtering artifact names
alone does not prove package completeness or receipt identity. Complete package
inventory and receipt identity checks remain separate release requirements.

See the shared [package identity and retry contract](https://github.com/victron-venus/venus-os-ci-toolkit/blob/main/docs/VERSIONING.md#package-identity-across-reruns).

### Package receipt identity

Fresh publication verifies each staged package receipt against the independently
supplied repository, source commit, workflow run and attempt. Receipts created
before this migration, or offline without an Actions identity, cannot qualify a
fresh publication. Run all required producers in one complete workflow attempt
after migration; an earlier attempt cannot fill missing inputs.

Historical promotion and retained-evidence validation keep their existing checks.
Receipt coverage validates the staged files; the expected packages and platforms
still require a separate completeness check. Existing release approval and device
acceptance policies continue to apply.

See the shared [receipt migration guide](https://github.com/victron-venus/venus-os-ci-toolkit/blob/main/docs/release-workflow.md#migrate-package-receipt-identity-without-replacing-the-release-engine).

### Complete package producer inventory

`versioning.required_build_receipts` declares the exact package and signature
receipt filenames required by this project's final publisher. Each authenticated
receipt must match the repository, source commit, workflow run and attempt. A
missing producer or an unexpected receipt stops fresh publication, even when the
remaining packages are valid. RC fuzz evidence is checked separately; pre-signing
checks do not require a signature receipt that has not been created yet.

Before publication begins, rerun all required producers only when the allocator
and release policy permit reusing that reservation. After publication begins or
its outcome is uncertain, inspect existing tags, releases and assets before a
policy-authorized new run; never reset the ledger or mix earlier-attempt packages.
Historical RC promotion keeps its accepted source policy. Keep this explicit
inventory aligned with producer changes; it does not replace package-format,
signature or device acceptance checks.
