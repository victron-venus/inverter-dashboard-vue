import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n } from '../i18n'
import StatusBar from './StatusBar.vue'

const props = { haEnabled: false, haConnected: false, mqttConnected: true, appVersion: '2.2.2', stateVersion: '1.0.0' }
describe('native transport footer', () => {
  it('separates selected transport connection, telemetry freshness and application/controller versions', async () => {
    const wrapper = mount(StatusBar, { props: {
      ...props, dataSource: 'igw', uptime: 0,
      telemetry: { source: 'mqtt', observed_at: '2026-09-14T12:00:00Z', quality: 'stale' },
    }, global: { plugins: [i18n] } })
    expect(wrapper.get('[data-testid="transport-status"]').text()).toBe('IGW')
    expect(wrapper.get('[data-testid="transport-status"]').attributes('data-connected')).toBe('true')
    expect(wrapper.get('[data-testid="telemetry-quality"]').text()).toBe('Stale data')
    expect(wrapper.get('[data-testid="telemetry-quality"]').attributes('title')).toContain('MQTT · Received at:')
    expect(wrapper.text()).toContain('Web 2.2.2')
    expect(wrapper.text()).toContain('Control 1.0.0')
    await wrapper.setProps({ dataSource: 'mqtt', mqttConnected: false, telemetry: { quality: 'unknown' } })
    expect(wrapper.get('[data-testid="transport-status"]').text()).toBe('MQTT')
    expect(wrapper.get('[data-testid="transport-status"]').attributes('data-connected')).toBe('false')
    expect(wrapper.get('[data-testid="telemetry-quality"]').text()).toBe('Data unknown')
    wrapper.unmount()
  })

  it('does not infer fresh data or zero uptime from a live connection', async () => {
    const wrapper = mount(StatusBar, { props, global: { plugins: [i18n] } })
    expect(wrapper.get('[data-testid="uptime"]').findAll('span').map(span => span.text())).toEqual(['Uptime:', '—'])
    expect(wrapper.get('[data-testid="telemetry-quality"]').text()).toBe('Data unknown')
    await wrapper.setProps({ telemetry: { quality: 'live', observed_at: 'invalid' } })
    expect(wrapper.get('[data-testid="telemetry-quality"]').text()).toBe('Live data')
    expect(wrapper.get('[data-testid="telemetry-quality"]').attributes('title')).not.toContain('Invalid Date')
    await wrapper.setProps({ mqttConnected: false })
    expect(wrapper.get('[data-testid="telemetry-quality"]').text()).toBe('Stale data')
    wrapper.unmount()
  })

  it.each([0, 1789387200000, '2026-09-14T12:00:00Z'])('renders numeric milliseconds or ISO observation time %s with its provenance', (observed) => {
    const wrapper = mount(StatusBar, { props: {
      ...props, telemetry: { source: 'igw', observed_at: observed, quality: 'live', timestamp_source: 'local_receipt' },
    }, global: { plugins: [i18n] } })
    const title = wrapper.get('[data-testid="telemetry-quality"]').attributes('title')
    expect(title).toContain(new Date(observed).toLocaleString())
    expect(title).toContain('Local receipt time')
    expect(title).not.toContain('Data unknown')
    wrapper.unmount()
  })
})
