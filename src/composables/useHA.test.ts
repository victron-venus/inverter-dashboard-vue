import { describe, expect, it } from 'vitest'
import type { HaWeatherDisplay } from '../types/ha'
import { state } from './useInverterState'
import { useHA } from './useHA'

describe('useHA rich entity population', () => {
  it('starts with empty sections', () => {
    const { haSensors, haCovers, haScenes, haNumbers, haMediaPlayers, haWeather } = useHA()
    expect(haSensors.value).toEqual([])
    expect(haCovers.value).toEqual([])
    expect(haScenes.value).toEqual([])
    expect(haNumbers.value).toEqual([])
    expect(haMediaPlayers.value).toEqual([])
    expect(haWeather.value).toBeNull()
  })

  it('populates from state.ha_filtered and clears when it disappears', async () => {
    const ha = useHA()

    state.value = {
      ...state.value,
      ha_filtered: {
        sensors: [{ entity_id: 'sensor.t', name: 'T', state: '21', unit: '°C' }],
        covers: [{ entity_id: 'cover.b', name: 'B', position: 40 }],
        scenes: [{ entity_id: 'scene.m', name: 'M' }],
        numbers: [],
        media_players: [
          { entity_id: 'media_player.s', name: 'S', state: 'playing' },
        ],
        weather: {
          entity_id: 'weather.h',
          name: 'H',
          state: 'sunny',
          temperature: 20,
          unit: '°C',
          forecast: [],
        },
      },
    }
    await Promise.resolve()
    expect(ha.haSensors.value).toHaveLength(1)
    expect(ha.haCovers.value[0].position).toBe(40)
    expect((ha.haWeather.value as HaWeatherDisplay | null)?.temperature).toBe(20)

    // Backend stops sending (HA disconnected) → sections empty again
    const cleared = { ...state.value }
    delete cleared.ha_filtered
    state.value = cleared
    await Promise.resolve()
    expect(ha.haSensors.value).toEqual([])
    expect(ha.haCovers.value).toEqual([])
    expect(ha.haWeather.value).toBeNull()
  })
})
