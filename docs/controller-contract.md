# Native telemetry and controls

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
`"off"`, and `dry_run` with an explicit boolean `value` to the backend.
These actions require a live WebSocket command channel, a connected telemetry
source, and `controller_controls_available` not explicitly false. Unknown flag
and DRY states are disabled. Commands wait for state reported by the controller;
the UI does not apply optimistic changes or call Home Assistant for these flags.

The ESS menu sends `set_ess_mode` with `mode` and a fresh `request_id`. Its six
choices are `off`, `on`, `optimized_with_battery_life`,
`optimized_without_battery_life`, `keep_batteries_charged` and `external_control`.
The current selection comes from `ess_mode.selected` when
`ess_mode.selection_supported` is true; legacy `mode_name` and `is_external`
remain display fallbacks. Unknown selection is not inferred from an unrelated
inverter hardware Mode.

Selection requires the live command channel, current native connection,
controller controls not explicitly unavailable, `ess_mode_controls_available: true`,
supported selection, explicitly disabled
DRY mode and a non-future `ess_mode_observed_at` no older than 30 seconds.
A matching request ID in fresh controller state or a correlated command error
completes the pending request. No response is not a successful mode change.

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

Active loads use native `loads` keyed by instance and `load_names` from Cerbo.
The default threshold is absolute power greater than 2 W, including negative
generation. Rows sort by absolute power, then display name. Explicit
`ui_config.loads.hidden` entries still match instance IDs or legacy names, and
`min_watts: 0` remains a valid override. The main battery tile uses the backend's
`battery_soc` calculation unchanged; the Batteries list contains only actual
`batteries` entries, without a synthetic aggregate Bank or name-based exclusions.

Water appears when tank/pump discovery or native Level/State is present and
remains visible after discovery. `water_level` is already percent: 0.5 is 0.5%.
`pump_switch` and `water_valve` are nullable boolean readbacks; unknown is not off.
`water_pump_mode` is canonical, with `pump_mode` as a legacy alias. Buttons send
`water_mode` with `which: "pump" | "valve"` and mode 0 (automatic), 1 (on), or 2
(off). Opening the city-water valve requires confirmation. Controls require the
live command channel, active native transport, and the relevant
`water_pump_controls_available` or `water_valve_controls_available` capability;
the aggregate `water_controls_available` is a fallback for older backends. These
controls are independent of HA and inverter-control availability. Older IGW
versions without water capability remain read-only. Commands never update the
display optimistically; readback remains authoritative.

`native_connected` reports the selected source; legacy payloads fall back to
`gateway_connected` for `data_source: "igw"` or `mqtt_connected` for direct MQTT.
The footer names this active transport explicitly. It separately displays
`telemetry.quality` (live, stale, unknown), `telemetry.source` and
`telemetry.observed_at` (ISO UTC or epoch milliseconds), alongside web and
controller versions. Timestamp provenance (`timestamp_source`) distinguishes
local receipt from a gateway observation in the tooltip. Missing quality
is unknown even on an open WebSocket; a lost connection marks previously live
data stale.

HTTP fallback can keep telemetry live while the WebSocket command channel is
unavailable. Successful HTTP polls do not reset the WebSocket heartbeat: a
silent socket is retired and reconnected independently. Writes are unavailable
while that command connection is down; recovery does not replay old commands.

Build `npm run build:all` after installing the locked dependencies. The `dist/`
SPA is the shared artifact copied into each backend's static asset directory.
Do not use the export script from an isolated worktree: its relative destination
paths assume sibling canonical checkouts.
