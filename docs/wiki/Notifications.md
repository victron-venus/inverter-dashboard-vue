# Alerts and system notifications

## Source time

Native Victron events carry occurrence time. Reconnecting and receiving an old event must not change that time to now. Missing time is explicitly unavailable; future time is not silently clamped. Dismissal, acknowledgement and physical alarm state are distinct. History and replay suppression are bounded, not a permanent alarm archive.

![Event lifecycle](../assets/event-lifecycle.svg)

## System delivery

1. Serve a private dashboard from a supported secure origin.
2. Enable backend Web Push with durable private subscription and key storage.
3. Opt in through Settings and choose categories.
4. Check browser permission and successful server registration.
5. Use the explicit test action, then inspect the actual OS banner or notification center.

A queued test is not proof of delivery. Focus/Do Not Disturb, browser policy and OS background restrictions can delay or suppress it. OS delivery age may differ from source occurrence time in the body. The worker handles notification events; it does not cache application assets or intercept normal requests.

iOS/iPadOS Home Screen web apps have their own platform requirements. Desktop's native notification API is separate. Check the backend's Web Push guide for exact storage and configuration. Never publish subscription endpoints, private keys or credentials in diagnostics. Do not acknowledge/silence a physical alarm merely to obtain a screenshot.
