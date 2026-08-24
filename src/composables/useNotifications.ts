import { ref, watch } from 'vue'
import { state } from './useInverterState'

// Banner + history notifications fed from the notifications[] array that
// both dashboards broadcast (inverter/notifications pushes + Victron alarm
// transitions, cleared server-side when an alarm returns to 0).
// Logic ported from inverter-desktop's useInverterState.

export interface BannerNotification {
  id: string
  level: 'info' | 'warning' | 'alarm'
  title: string
  body: string
  source?: string
  ts?: string
}

export interface HistoryEntry extends BannerNotification {
  timestamp: number
  read: boolean
}

const MAX_HISTORY = 100

export const bannerNotifications = ref<BannerNotification[]>([])
export const historyNotifications = ref<HistoryEntry[]>([])

// ---------------------------------------------------------------------------
// Dismissal persistence — dismissed banners stay hidden until a new id arrives
// ---------------------------------------------------------------------------

const DISMISSED_KEY = 'dismissed_banner_ids'
const MAX_DISMISSED = 200

function loadDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    const arr: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(arr)
      ? new Set(arr.filter((x): x is string => typeof x === 'string'))
      : new Set()
  } catch {
    return new Set()
  }
}

const dismissedIds = loadDismissedIds()

function saveDismissedIds() {
  const arr = [...dismissedIds].slice(-MAX_DISMISSED)
  dismissedIds.clear()
  for (const id of arr) dismissedIds.add(id)
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr))
  } catch {
    /* private mode etc. — dismissals just won't persist */
  }
}

/** User dismissed the banner — hidden until a new notification reuses a fresh id. */
export function dismissBanner(id: string) {
  dismissedIds.add(id)
  saveDismissedIds()
  clearBanner(id)
}

/** Add or replace by id (dedupe for re-published notifications). */
export function upsertBanner(notification: BannerNotification) {
  if (dismissedIds.has(notification.id)) return
  const idx = bannerNotifications.value.findIndex((b) => b.id === notification.id)
  if (idx >= 0) {
    bannerNotifications.value[idx] = notification
  } else {
    bannerNotifications.value = [...bannerNotifications.value, notification]
  }
}

/** Alarm resolved / removed upstream — drop without recording a dismissal. */
export function clearBanner(id: string) {
  bannerNotifications.value = bannerNotifications.value.filter((b) => b.id !== id)
}

// ---------------------------------------------------------------------------
// History panel
// ---------------------------------------------------------------------------

export function markNotificationRead(id: string) {
  const entry = historyNotifications.value.find((n) => n.id === id)
  if (entry) entry.read = true
}

export function markAllNotificationsRead() {
  for (const n of historyNotifications.value) n.read = true
}

export function clearNotifications() {
  historyNotifications.value = []
}

export function unreadNotificationCount(): number {
  return historyNotifications.value.filter((n) => !n.read).length
}

// ---------------------------------------------------------------------------
// Server sync
// ---------------------------------------------------------------------------

function normalize(n: {
  id: string
  level: string
  title: string
  body?: string
  source?: string
  ts?: string
}): BannerNotification {
  return {
    id: n.id,
    level: n.level === 'alarm' || n.level === 'warning' ? n.level : 'info',
    title: n.title,
    body: n.body || '',
    source: n.source,
    ts: n.ts,
  }
}

let seenIds = new Set<string>()

watch(
  () => state.value.notifications,
  (list) => {
    const incoming = list || []
    const ids = new Set(incoming.map((n) => n.id))

    for (const n of incoming) upsertBanner(normalize(n))
    // Server dropped ids (alarm cleared / ring eviction) -> close their banners.
    for (const b of [...bannerNotifications.value]) {
      if (!ids.has(b.id)) clearBanner(b.id)
    }

    const fresh = incoming.filter((n) => n.id && !seenIds.has(n.id))
    if (fresh.length > 0) {
      if (seenIds.size > 500) seenIds = new Set(incoming.map((n) => n.id))
      for (const n of fresh) seenIds.add(n.id)
      historyNotifications.value = [
        ...fresh.map((n) => ({ ...normalize(n), timestamp: Date.now(), read: false })),
        ...historyNotifications.value,
      ].slice(0, MAX_HISTORY)
    }
  }
)
