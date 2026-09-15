import { describe, expect, it } from 'vitest'
import { controlBooleanState, inverterControlFlagKey, resolveHeaderToggleState } from './utils'

describe('inverter-control ownership and unknown state', () => {
  it('accepts only canonical keys and the documented legacy alias', () => {
    expect(inverterControlFlagKey('only_charging')).toBe('only_charging')
    expect(inverterControlFlagKey('input_boolean.only_charging')).toBe('only_charging')
    expect(inverterControlFlagKey('switch.only_charging')).toBeNull()
    expect(inverterControlFlagKey('sensor.no_feed')).toBeNull()
  })

  it('uses the canonical flag even when saved button IDs and aliases disagree', () => {
    const button = { id: 'charging', entity: 'input_boolean.only_charging', state_key: 'charging' }
    expect(resolveHeaderToggleState(button, { only_charging: false, charging: true })).toBe('off')
    expect(resolveHeaderToggleState(button, { only_charging: null, 'input_boolean.only_charging': true })).toBe('unavailable')
    expect(resolveHeaderToggleState(button, {})).toBe('unavailable')
  })

  it.each([undefined, null, '', 'unknown', 'unavailable', 'garbage', 2, Number.NaN])(
    'does not present %s as a confirmed off state', (value) => {
      expect(controlBooleanState(value)).toBe('unavailable')
    }
  )

  it.each([false, 0, '0', 'false', 'off'])('preserves explicit off %s', (value) => {
    expect(controlBooleanState(value)).toBe('off')
  })
  it.each([true, 1, '1', 'true', 'on'])('preserves explicit on %s', (value) => {
    expect(controlBooleanState(value)).toBe('on')
  })
})
