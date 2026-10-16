# Troubleshooting

## Page unavailable

Check DNS, VPN routes, TLS and ingress before changing the application. A private VPN can route home subnets elsewhere. A Ready Pod or internal API response does not prove browser access. Repair the route or certificate; do not disable certificate validation.

## Stale data

The browser-to-backend WebSocket, backend-to-IGW HTTP connection and IGW-to-Cerbo MQTT connection are separate. Inspect the selected source and freshness indicator, then the failing hop. `Host is unreachable` or HTTP503 upstream is not evidence that rebuilding browser assets will help. Missing measurements correctly produce unavailable values and chart gaps.

## Disabled controls

Check source identity, current state, capability, direct HA availability for Home, and public mode. Pending commands need matching authoritative results. A reconnect may retire an operation; do not manufacture an acknowledgement or remove a safety check.

## Missing UI update

Check the backend release and embedded frontend identity. Merging source alone does not replace installed assets. Verify the complete official bundle; do not mix a new index with old hashed JavaScript files.

## Language and notifications

Select language explicitly in Settings. If it is lost after reload, check storage availability and origin changes. Device names remain as configured. Report locale, screen and build without credentials. For banners, follow [notification delivery](Notifications.md), distinguishing registration from actual OS display.
