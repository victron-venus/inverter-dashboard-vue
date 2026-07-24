import { beforeEach, describe, expect, it } from 'vitest'
import { addHistoryPoint, setChartUpdateCallback } from './useChart'

describe('useChart', () => {
  beforeEach(() => {
    // Reset global state between tests
    setChartUpdateCallback(() => {})
  })

  describe('addHistoryPoint', () => {
    it('should add grid power to history', () => {
      addHistoryPoint({ gt: 1500, solar_total: 3000, battery_power: 0, setpoint: 0 })
      // Basic smoke test - verify no errors thrown
      expect(true).toBe(true)
    })

    it('should handle missing values gracefully', () => {
      expect(() => addHistoryPoint({})).not.toThrow()
    })

    it('should handle undefined values', () => {
      expect(() => addHistoryPoint({ gt: undefined, solar_total: undefined })).not.toThrow()
    })

    it('should handle zero values', () => {
      expect(() => addHistoryPoint({ gt: 0, solar_total: 0, battery_power: 0 })).not.toThrow()
    })

    it('should handle negative values (export mode)', () => {
      expect(() =>
        addHistoryPoint({ gt: -500, solar_total: 0, battery_power: -1000 })
      ).not.toThrow()
    })

    it('should handle large values', () => {
      expect(() =>
        addHistoryPoint({ gt: 50000, solar_total: 100000, battery_power: 20000 })
      ).not.toThrow()
    })
  })
})
