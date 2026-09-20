import { describe, expect, it } from 'vitest'
import { controlBooleanState, inverterControlFlagKey } from './utils'
import fixtures from '../contracts/dashboard/v1/fixtures.json'
import lock from '../contracts/dashboard/contract-lock.json'
import fixtureText from '../contracts/dashboard/v1/fixtures.json?raw'
import telemetryText from '../contracts/dashboard/v1/telemetry.schema.json?raw'
import controlText from '../contracts/dashboard/v1/control.schema.json?raw'

describe('shared dashboard v1 contract', () => {
  it('uses unchanged canonical fixture bytes', async () => {
    const files: Record<string, string> = { 'fixtures.json': fixtureText, 'telemetry.schema.json': telemetryText, 'control.schema.json': controlText }
    for (const [name, digest] of Object.entries(lock.sha256)) {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(files[name]))
      expect(Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('')).toBe(digest)
    }
  })
  it('classifies every shared key and value', () => {
    for (const fixture of fixtures.key_cases) {
      expect(inverterControlFlagKey(fixture.input)).toBe(fixture.expected)
    }
    for (const fixture of fixtures.boolean_cases) {
      expect(controlBooleanState(fixture.input)).toBe(fixture.expected === null ? 'unavailable' : fixture.expected ? 'on' : 'off')
    }
  })
})
