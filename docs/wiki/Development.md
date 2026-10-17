# Development and architecture

`src/App.vue` assembles the dashboard. Components render sections; composables manage connections, HA, charts and settings. `src/i18n/` owns locale selection and messages. `src/tariffs/` owns tariff models and UI. `public/notifications-sw.js` handles notification events. `src/lib.ts` defines library exports and `vite.config.ts` defines build outputs.

![Trust boundaries](../assets/architecture.svg)

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build:all
```

Read [CONTRIBUTING](../../CONTRIBUTING.md), [the controller contract](../controller-contract.md) and [localization](../localization.md). Fixtures should exercise source replacement, stale readings, absent capabilities and failed acknowledgements. Tests and documentation previews must not operate real equipment.

`dist/` is the SPA and `dist-lib/` the library. A development copy is not a release receipt. Backend adoption records official artifacts and rebuilds the backend. [Release strategy](../../RELEASING.md) and [the operator runbook](../release-workflow.md) remain authoritative for allocation and promotion rules.

Keep SVGs self-contained and accessible with titles, descriptions and readable text. These diagrams show architecture and event ordering, not performance measurements. Update all README languages when setup changes. Validate links and SVG XML, render the diagrams, and publish reviewed wiki content without private deployment details.
