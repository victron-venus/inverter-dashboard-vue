import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { state } from '../composables/useInverterState'
import DailyStats from './DailyStats.vue'

describe('DailyStats', () => {
  beforeEach(() => {
    state.value = {
      ...state.value,
      daily_stats: {},
      solar_forecast: undefined,
    }
  })

  it('does not throw when hasSolar evaluates prodY (yesterday production)', async () => {
    state.value = {
      ...state.value,
      daily_stats: {
        produced_today: 0,
        produced_yesterday: 12.3,
      },
      solar_forecast: {},
    }

    const w = mount(DailyStats)
    expect(w.text()).toContain('0.00kWh')
    expect(w.text()).toContain('(12.3)')
  })

  it('shows solar strip from forecast alone when today/yesterday are zero', async () => {
    state.value = {
      ...state.value,
      daily_stats: {
        produced_today: 0,
        produced_yesterday: 0,
      },
      solar_forecast: { today_kwh: 18.5, tomorrow_kwh: 20 },
    }

    const w = mount(DailyStats)
    expect(w.text()).toContain('[18.5]')
    expect(w.text()).toContain('[20.0]')
  })
})
