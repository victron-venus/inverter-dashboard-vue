# Controller and EV telemetry

The Python and Go dashboard backends provide the same state shape over WebSocket
and `/api/state`, whether they consume Cerbo MQTT directly or use IGW. Home
Assistant is optional and is not the owner of inverter controls or EV telemetry.

`booleans` contains the seven inverter-control flags. `ui_config.header_toggles`
advertises their labels and targets; when the field is absent the UI supplies the
seven canonical controls. An explicit empty list hides them. Only bare flag keys
and the legacy `input_boolean.<flag>` alias route to inverter-control. A different
HA entity such as `switch.no_feed` retains its own routing. Canonical flag state
takes precedence over saved button IDs and aliases; missing, null or invalid
values display as unavailable rather than off.

The UI sends `toggle` with a canonical `entity` and explicit `state: "on"` or
`"off"`, `dry_run` with an explicit boolean `value`, and `ess_mode` to the backend.
These actions require a live WebSocket command channel, a connected telemetry
source, and `controller_controls_available` not explicitly false. Unknown flag
and DRY states are disabled. Commands wait for state reported by the controller;
the UI does not apply optimistic changes or call Home Assistant for these flags.

ESS uses `ess_mode` (`hub4_mode`, `battery_life_state`, `mode_name`,
`is_external`). Hub4 mode 3 means External control. Missing or unknown ESS data
shows `ESS —`; it must not be inferred from the inverter hardware Mode.

EV discovery belongs to the backend. The UI accepts `ev_present`,
`evcharger_present`, and `discovered_water_ev` entries with `kind`, `instance`,
and optional `name`, without hardcoding instance IDs. `ev_charging_power` is
charger power in watts and takes precedence over legacy `ev_charging_kw`, which
is wallbox power in kilowatts. `car_charging_power` is vehicle power in watts,
with legacy `ev_power` as its fallback, converted once to kilowatts for display.
`car_soc` is percent. Measured
zero is valid, and discovery keeps an idle EV visible even when the legacy
feature flag is false. Missing values display a dash. The explicit `show_ev`
user setting remains authoritative.

Build `npm run build:all` after installing the locked dependencies. The `dist/`
SPA is the shared artifact copied into each backend's static asset directory.
Do not use the export script from an isolated worktree: its relative destination
paths assume sibling canonical checkouts.
