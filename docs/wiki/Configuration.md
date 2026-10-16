# Configuration

## Private deployment

Install the Python or Go backend and serve its SPA, `/api/*` and `/ws` from one origin. The backend holds MQTT, IGW and Home Assistant credentials. The browser receives state, permitted configuration and capability flags. Use [the HTTPS profile](../../deploy/https/README.md) for a custom host; keep authentication and certificate checks enabled.

Configure Home buttons in the backend with an entity, label, order and enabled flag. Preserve existing entries when adding a device. A privacy helper such as `switch.camera_privacy` has the ON/OFF semantics defined by that HA helper; this UI adds no inversion. Section preferences are in Settings. Disabled or inactive appliances are hidden; unknown states remain unavailable.

## Public snapshot view

Build with `VITE_PUBLIC_MODE=true npm run build:spa`, or provide the following host configuration:

```html
<meta name="inverter-public-mode" content="true">
<meta name="inverter-gateway-snapshot" content="/api/gateway/snapshot">
```

Alternatively set `window.__INVERTER_PUBLIC__ = { enabled: true, snapshotPath: '/api/gateway/snapshot' }` before startup. This is deployment configuration, never a place for tokens. The proxy owns upstream authentication and sanitizes snapshots. Public mode has no private command channel. Cross-origin snapshot proxies require HTTPS; private dashboard APIs stay same-origin.

## Preferences

Settings contains language, visibility, tariff tools and notification preferences. [Localization](../localization.md) covers browser matching and fallback. [Tariffs](../electricity-tariffs.md) covers controller/local plans, seasons and interval data. A language change does not change a controller time zone or tariff.
