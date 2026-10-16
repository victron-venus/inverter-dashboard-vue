# Process and results: the shared dashboard UI

This guide explains the localization work and the delivery steps that make a shared UI change visible in the Python and Go dashboards. It records the source snapshot [`6bcfd8d3351dfdddbb44f6c1d61e9f5840303dd5`](https://github.com/victron-venus/inverter-dashboard-vue/commit/6bcfd8d3351dfdddbb44f6c1d61e9f5840303dd5), dated 15 October 2026. It is a source and local-validation report; it does **not** record a completed release or deployment of that source.

## What changed for the user

Settings offers English, Russian, Ukrainian, German, French and Dutch. An explicit choice persists on this browser and synchronizes with other tabs; System follows the first supported browser language, with English as the fallback. The document language updates for assistive technology. Blocked storage does not prevent an in-session language change.

Application-owned headings, controls, empty states, accessible labels and validation messages use the selected language. This includes ESS and setpoint controls, Home and Water sections, notification settings, alert-age labels and tariff tools. Dates and numeric presentation respect the locale without changing measurement precision, installation time zone or command values. Date-only forecasts retain their calendar day.

Existing application errors update when the language changes, including errors retained across asynchronous work. Configured device names, native alarm text and raw provider diagnostics stay intact. Changing the presentation does not change entity IDs, wire enums, command guards or tariff arithmetic. See the [localization contract](localization.md) for these boundaries and contributor guidance.

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

![Catalog-key parity: English, Russian, Ukrainian, German, French and Dutch each contain the same 498 keys. This is not a translation-quality metric.](assets/locale-coverage.svg)

At this source, every catalog in [`src/i18n/ui`](../src/i18n/ui) contains **498 keys**, and all six key sets exactly match the English baseline. Values are nonempty. The bars measure catalog-key parity only: adding a key does not prove that a screen uses it, that its wording is correct or that a long label fits. Key and interpolation tests complement, rather than replace, component checks and visual review.

Useful source checks include [locale selection and persistence](../src/i18n/locale.test.ts), [retained messages and catalog interpolation](../src/i18n/messages.test.ts), [localized component behavior](../src/components/Localization.test.ts) and the [public tariff import contract](../src/tariffs/model.test.ts).

## Observed validation and its limits

- **455 tests passed across 50 files in a provisional local run.** The unchanged service-worker test file was excluded because `fake-indexeddb` was unavailable in the shared local dependency environment. This was not a complete locked-dependency test run.
- Subsequent focused checks covered the final public-API and schema-message changes: runs of 19, 2 and 30 tests passed. These scopes overlap; their counts must not be added to the earlier total.
- Direct Vite compilation of the SPA and component library passed with the available shared dependencies. A clean install from the lockfile was blocked by an npm registry network failure. Type checking remained blocked by missing `fake-indexeddb`; no complete type-check pass is claimed. Lint and applicable commit hooks passed, with existing lint warnings retained.
- An isolated static browser preview checked all six language selections, document language, retained errors and persistence, including a Russian reload. It did not connect to live backends or operate hardware.

These observations describe the recorded source work, not current hosted CI status. Exact-lock CI, official artifact verification, backend adoption and deployed-browser acceptance need their own evidence. This report does not claim exhaustive linguistic review, native OS notification delivery, physical-device testing, or a new release or k3s deployment.

For setup, choose a language in the [README navigation](../README.md#languages-and-documentation). For operational troubleshooting, use the [wiki guide](wiki/Troubleshooting.md).
