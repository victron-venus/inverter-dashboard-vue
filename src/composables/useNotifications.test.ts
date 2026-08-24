import { beforeEach, describe, expect, it, vi } from 'vitest'

// happy-dom + Node experimental localStorage is unreliable in CI shells —
// back it with a Map for the whole file.
const lsStore = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (lsStore.has(k) ? (lsStore.get(k) as string) : null),
  setItem: (k: string, v: string) => void lsStore.set(k, String(v)),
  removeItem: (k: string) => void lsStore.delete(k),
})

import { state } from './useInverterState'
import {
  bannerNotifications,
  clearBanner,
  dismissBanner,
  historyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
  upsertBanner,
} from './useNotifications'

function reset() {
  lsStore.clear()
  bannerNotifications.value = []
  historyNotifications.value = []
}

describe('useNotifications', () => {
  beforeEach(reset)

  it('upserts banners by id (dedupe)', () => {
    upsertBanner({ id: 'a', level: 'warning', title: 'T', body: '' })
    upsertBanner({ id: 'a', level: 'alarm', title: 'T2', body: 'B' })
    expect(bannerNotifications.value).toHaveLength(1)
    expect(bannerNotifications.value[0].level).toBe('alarm')
  })

  it('dismiss hides banner and persists across reload of module state', () => {
    dismissBanner('a')
    upsertBanner({ id: 'a', level: 'info', title: 'T', body: '' })
    expect(bannerNotifications.value).toHaveLength(0)
    expect(lsStore.get('dismissed_banner_ids')).toContain('"a"')
  })

  it('clearBanner removes without recording dismissal', () => {
    // fresh id: the dismissed-id Set lives at module scope across tests
    upsertBanner({ id: 'b', level: 'info', title: 'T', body: '' })
    clearBanner('b')
    upsertBanner({ id: 'b', level: 'info', title: 'T', body: '' })
    expect(bannerNotifications.value).toHaveLength(1)
  })

  it('syncs banners and history from state.notifications, closes cleared ids', async () => {
    state.value = { ...state.value, notifications: [{ id: 'n1', level: 'alarm', title: 'X' }] }
    await Promise.resolve()
    // watcher flush
    await new Promise((r) => setTimeout(r, 0))
    expect(bannerNotifications.value.map((b) => b.id)).toEqual(['n1'])
    expect(historyNotifications.value[0].title).toBe('X')
    expect(unreadNotificationCount()).toBe(1)

    // server clears n1 (alarm back to 0) -> banner closed, history kept
    state.value = { ...state.value, notifications: [] }
    await new Promise((r) => setTimeout(r, 0))
    expect(bannerNotifications.value).toHaveLength(0)
    expect(historyNotifications.value).toHaveLength(1)
  })

  it('read tracking works', () => {
    historyNotifications.value = [
      { id: 'h1', level: 'info', title: 't', body: '', timestamp: 1, read: false },
    ]
    expect(unreadNotificationCount()).toBe(1)
    markNotificationRead('h1')
    expect(unreadNotificationCount()).toBe(0)
    markAllNotificationsRead()
    expect(unreadNotificationCount()).toBe(0)
  })
})
