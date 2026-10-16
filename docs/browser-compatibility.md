# Browser acceptance

The required `Quality gate` calls `ci.yml`, which includes the shared browser
acceptance workflow. A failed browser target fails that reusable CI call and the
required `CI gate`; browser jobs do not use `continue-on-error`.

Source checks test the current pinned Chromium, Firefox and WebKit on Linux,
Chromium on Windows and WebKit on macOS. Scheduled source audits and manual
audits without a release channel run all 35 targets. The existing `release-build.yml` also
qualifies beta and nightly packages on those five targets, and RC packages on
all 35 targets. Stable promotes the accepted RC bytes without rebuilding.
The full matrix adds
two previous pinned Playwright generations on all three operating systems,
Chrome/Edge Stable on each OS, and their Beta channels on Linux.
No extra release workflow or runner switch is needed. Hosted runners remain the
default; only supported Linux targets may use the already configured reserve.

The release job builds once and passes the exact upload artifact ID to the shared
workflow. Each browser target downloads that artifact from the same workflow run.
`scripts/prepare_browser_candidate.py` checks its source SHA, archive size and
SHA-256 against the build receipt, then verifies the complete packaged file
inventory against `build-info.json`. It rejects traversal, links, duplicate paths
and an existing destination. The tests serve those unpacked bytes directly;
there is no application reinstall or rebuild in the release browser targets. A failed
target fails `release-build.yml` and therefore the required `Release gate` before
publication. Browser evidence records the candidate version and archive digest.

`scripts/browser-acceptance.cjs` builds on the actual production SPA, served from
`dist/` on an ephemeral loopback port. It uses the selected isolated Playwright
installation from `CI_PLAYWRIGHT_MODULE`, not an application dependency. HTTP and
WebSocket fixtures contain synthetic telemetry; requests outside the local
fixture origin are blocked. Vue components and ECharts are not stubbed.

Every target asserts these complete user flows:

- Live telemetry, ordered loads, negative generation values and a rendered chart.
- Incoming telemetry updates without reloading the page.
- Theme selection surviving a reload.
- Native settings dialog focus, Escape and focus restoration.
- Invalid form input staying local, then a valid typed settings command.
- Saved section visibility surviving a reload.
- A server-rejected command displaying an error without changing state.
- Connection loss and recovery updating the live indicator.
- Settings and keyboard interaction at a narrow viewport without horizontal overflow.
- Public telemetry with no write controls or commands.
- No uncaught browser errors or unexpected external requests.

The scenario list is written only after assertions succeed. A failed scenario
exits unsuccessfully and leaves diagnostics, a screenshot and a trace. The shared
workflow checks actual browser identity, source SHA, run ID/attempt, and nonempty
unique scenario counts. Evidence from a different version or run cannot satisfy
the check. Download `browser-compatibility-*` artifacts to inspect an individual
target; packaged-release results use `browser-release-*`. Local artifacts under
`.compatibility/` and `browser-candidate/` are ignored by Git.

For a local run after building the app:

```bash
npm ci --ignore-scripts
npm run build --ignore-scripts
npm ci --prefix tools/browser-compatibility/playwright-1-64-0 --ignore-scripts --omit=optional
node tools/browser-compatibility/playwright-1-64-0/node_modules/playwright/cli.js install chromium
CI_PLAYWRIGHT_MODULE="$PWD/tools/browser-compatibility/playwright-1-64-0/node_modules/playwright" \
  CI_BROWSER_ENGINE=chromium node scripts/browser-acceptance.cjs
```

Use `firefox` or `webkit` after installing that engine to exercise another target.
The pinned toolchain lockfiles deliberately preserve historical browser versions;
application dependencies retain their normal update policy.

Playwright WebKit is not native Safari, and Playwright Firefox is its patched
engine, not native Firefox ESR. Narrow viewport testing is not an iOS/Android
device test. This suite does not claim physical controller, GPU-driver or native
webview coverage. Those require their own acceptance evidence.
