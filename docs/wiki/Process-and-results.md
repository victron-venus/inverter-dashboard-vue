# Process and results

The shared Vue UI supplies both the Python and Go dashboards. The [full visual guide](../process-and-results.md) describes the localization work at source [`6bcfd8d`](https://github.com/victron-venus/inverter-dashboard-vue/commit/6bcfd8d3351dfdddbb44f6c1d61e9f5840303dd5) and distinguishes source validation from release and deployment evidence.

## Delivery needs several independent checks

![Process map: reviewed source, required checks, official frontend artifact, backend adoption, k3s rollout and browser verification. These stages are not marked complete.](../assets/delivery-pipeline.svg)

The backends must adopt the verified official SPA before a deployed dashboard receives a UI change. Each backend has its own release and image. A Ready pod or successful compilation alone does not prove that the browser receives the intended files or live telemetry.

## Six locales, matching key sets

![Each of six catalogs contains the same 498 keys; the chart measures key parity, not translation quality.](../assets/locale-coverage.svg)

English, Russian, Ukrainian, German, French and Dutch each contain 498 keys. Settings can remember the user's choice; System follows a supported browser language and otherwise falls back to English. Configured names, wire values and raw source diagnostics remain unchanged. See the [localization contract](../localization.md) for the tariff editor's vendor-language limits.

The source work recorded 455 passing provisional tests, excluding the service-worker suite because `fake-indexeddb` was unavailable. A clean lockfile install was network-blocked; full type checking was not qualified. Later focused API/schema tests and an isolated six-locale browser preview passed. These results do not establish a release, backend adoption, live k3s acceptance or OS notification delivery. The [full guide](../process-and-results.md#observed-validation-and-its-limits) preserves the validation details.

Return to [Documentation home](Home.md), [Development](Development.md) or [Troubleshooting](Troubleshooting.md).
