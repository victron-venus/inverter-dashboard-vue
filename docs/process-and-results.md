# Process and results: the shared dashboard UI

This guide explains the localization work and the delivery steps that make a shared UI change visible in the Python and Go dashboards. It records the source snapshot [`2b9318be7a22aa68a67dae8e64810f6e959071b2`](https://github.com/victron-venus/inverter-dashboard-vue/commit/2b9318be7a22aa68a67dae8e64810f6e959071b2), dated 16 October 2026, after integrating the validated dependency updates. It is a source and local-validation report; it does **not** establish hosted CI completion, a release or deployment of that source. Earlier validation snapshots remain recorded separately below.

## What changed for the user

Settings offers English, Russian, Ukrainian, German, French and Dutch. An explicit choice persists on this browser and synchronizes with other tabs; System follows the first supported browser language, with English as the fallback. The document language updates for assistive technology. Blocked storage does not prevent an in-session language change.

Application-owned headings, controls, empty states, accessible labels and validation messages use the selected language. This includes ESS and setpoint controls, Home and Water sections, notification settings, alert-age labels and tariff tools. Dates and numeric presentation respect the locale without changing measurement precision, installation time zone or command values. Date-only forecasts retain their calendar day.

Existing application errors update when the language changes, including errors retained across asynchronous work. Configured device names, native alarm text and raw provider diagnostics stay intact. Changing the presentation does not change entity IDs, wire enums, command guards or tariff arithmetic. See the [localization contract](localization.md) for these boundaries and contributor guidance.

The 16 October update also covers malformed JSON imports: tariff and interval errors follow later language changes while preserving the existing tariff draft or saved interval history. Unknown Home Assistant state labels remain literal, including names inherited by JavaScript objects. The theme button describes the destination theme in all six languages.

An open tariff spreadsheet retains its column headings until closed and reopened, preserving unsaved numeric cells. Application-owned editor text supports all six languages. Bundled vendor chrome supports English, Russian, German and French; Ukrainian and Dutch fall back to English there.

## How a change reaches both dashboards

![Six-stage delivery process from reviewed source through checks, official frontend artifact, backend adoption and k3s rollout to browser verification. Completion requires separate evidence for each stage.](assets/delivery-pipeline.svg)

1. **Review the source.** Bind the accepted change and its tests to an exact commit.
2. **Complete the required checks.** Use locked dependencies, required analysis and the declared release build matrix. The [release runbook](release-workflow.md), [release strategy](../RELEASING.md) and repository policy remain authoritative.
3. **Verify the official frontend artifact.** Verify the release manifest, source/run binding and all published payload hashes. A local preview build is not this artifact.
4. **Adopt those bytes in both backends.** Python and Go independently embed the verified SPA and publish their own validated releases and image digests.
5. **Roll out to k3s.** Use the verified images and preserve runtime settings. Workload readiness is one check, not proof of browser reachability.
6. **Verify each served dashboard.** Check the served assets, locale selection and persistence, visible behavior and connection state. Report missing telemetry or unreachable routes separately.

The diagram is a process map, not a checklist marked complete. Neither a source review nor a successful build establishes the later handoffs. System notification delivery also requires separate permission and delivery qualification; localization does not prove an OS banner was shown.

## What the catalog measurement establishes

![Catalog-key parity: English, Russian, Ukrainian, German, French and Dutch each contain the same 500 keys. This is not a translation-quality metric.](assets/locale-coverage.svg)

At this source, every catalog in [`src/i18n/ui`](../src/i18n/ui) contains **500 keys**, and all six key sets exactly match the English baseline. Values are nonempty. The two new theme-destination labels extend the earlier 498-key snapshot. The bars measure catalog-key parity only: adding a key does not prove that a screen uses it, that its wording is correct or that a long label fits. Key and interpolation tests complement, rather than replace, component checks and visual review.

Useful source checks include [locale selection and persistence](../src/i18n/locale.test.ts), [retained messages and catalog interpolation](../src/i18n/messages.test.ts), [localized component behavior](../src/components/Localization.test.ts) and the [public tariff import contract](../src/tariffs/model.test.ts).

## Observed validation and its limits

### Historical snapshot: 15 October

The following observations belong to [`6bcfd8d3351dfdddbb44f6c1d61e9f5840303dd5`](https://github.com/victron-venus/inverter-dashboard-vue/commit/6bcfd8d3351dfdddbb44f6c1d61e9f5840303dd5), before the main-branch integration and import fixes. They are retained as history, not reassigned to the current source.

- **455 tests passed across 50 files in a provisional local run.** The unchanged service-worker test file was excluded because `fake-indexeddb` was unavailable in the shared local dependency environment. This was not a complete locked-dependency test run.
- Subsequent focused checks covered the final public-API and schema-message changes: runs of 19, 2 and 30 tests passed. These scopes overlap; their counts must not be added to the earlier total.
- Direct Vite compilation of the SPA and component library passed with the available shared dependencies. A clean install from the lockfile was blocked by an npm registry network failure. Type checking remained blocked by missing `fake-indexeddb`; no complete type-check pass is claimed. Lint and applicable commit hooks passed, with existing lint warnings retained.
- An isolated static browser preview checked all six language selections, document language, retained errors and persistence, including a Russian reload. It did not connect to live backends or operate hardware.

### Intermediate source: 16 October

These checks belong to [`ad9a64c42c7e8b4b7ad18f0e5f3f1a175772bdbe`](https://github.com/victron-venus/inverter-dashboard-vue/commit/ad9a64c42c7e8b4b7ad18f0e5f3f1a175772bdbe), which integrated the earlier main-branch changes and localization fixes.

- **A clean `npm ci` completed using the merged lockfile** (240 packages), resolving the earlier local dependency-installation blocker.
- **87 tests passed across 11 files in a scoped local run.** The scope covers localization, state labels, header controls, tariffs and interval imports. Before the production fixes, six regression cases failed: four inherited-state-key cases and two malformed-JSON import cases. These are a subset of the 87 tests, not an additional total or a complete repository test run.
- Type checking and both SPA and component-library builds passed. Lint and applicable scoped commit hooks passed; existing warnings remain, with no rule suppression.
- Independent source review confirmed the merged browser-acceptance documentation and theme-button behavior, safe handling of unknown state labels, and retained localized import errors without replacing the tariff draft or saved interval data. This is a source review, not deployed-browser acceptance.

### Full-suite source after dependency integration: 16 October

- At [`2b9318be7a22aa68a67dae8e64810f6e959071b2`](https://github.com/victron-venus/inverter-dashboard-vue/commit/2b9318be7a22aa68a67dae8e64810f6e959071b2), **all 489 tests passed across 51 files, with no skips**, using the integrated dependency lockfile. This full local suite includes the service-worker tests that could not run in the initial provisional environment.
- A fresh `npm ci --ignore-scripts` installed 240 packages from that exact lockfile. Type checking, both SPA and component-library builds, and applicable scoped commit hooks passed.
- The later main-branch integration at [`edc705284aacd6c6e1c3c1909c50c23a2f1cd95e`](https://github.com/victron-venus/inverter-dashboard-vue/commit/edc705284aacd6c6e1c3c1909c50c23a2f1cd95e) has the same complete Git tree, `c160afe2d3e678180155c357956ef2b9a55fd7e4`. This records identical source files, not a second test run. The preceding 455 and 87 counts describe overlapping historical scopes and must not be added to 489.

### Later standalone fuzz integration: 16 October

The standalone fuzz replay initially failed because its isolated build omitted runtime dependencies introduced by localization. The fix at [`0e9e829d50687de3d8461faf1b610f8b00d7a324`](https://github.com/victron-venus/inverter-dashboard-vue/commit/0e9e829d50687de3d8461faf1b610f8b00d7a324) closes that dependency gap without changing application source or the 500-key catalogs.

- A clean, isolated setup using the declared manifest passed the original **153 deterministic fuzz cases** and real locale-format checks for English, German and Russian.
- Three negative dependency fixtures covered a missing dependency, a dynamic import and a runtime re-export. Stale build-output removal was also checked.
- **475 release-contract checks**, workflow-contract checks and applicable commit hooks passed locally. The earlier 489-test application qualification is reused because application source is unchanged; it was not rerun for this integration fix.

These observations describe the named source snapshots, not current hosted CI status. Hosted CI, official artifact verification, backend adoption and deployed-browser acceptance need their own evidence. This report does not claim exhaustive linguistic review, native OS notification delivery, physical-device testing, or a new release or k3s deployment.

For setup, choose a language in the [README navigation](../README.md#languages-and-documentation). For operational troubleshooting, use the [wiki guide](wiki/Troubleshooting.md).
