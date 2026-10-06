import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ api: vi.fn(), worker: vi.fn(), register: vi.fn(), getRegistration: vi.fn(), getSubscription: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), requestPermission: vi.fn(), enabled: false }))
vi.mock('../notifications/api', async (original) => ({ ...await original<typeof import('../notifications/api')>(), notificationApi: mocks.api }))
vi.mock('../notifications/browser', async (original) => ({ ...await original<typeof import('../notifications/browser')>(), registerNotificationWorker: mocks.register, workerRequest: mocks.worker }))
const endpoint = 'https://push.example/private-capability'
const key = Uint8Array.from(atob('B' + 'A'.repeat(86) + '='), (character) => character.charCodeAt(0)).buffer
const subscription = { options: { applicationServerKey: key }, endpoint, toJSON: () => ({ endpoint, keys: { p256dh: 'test', auth: 'test' } }), unsubscribe: mocks.unsubscribe }
const registration = { scope: location.origin + '/', active: { scriptURL: location.origin + '/notifications-sw.js' }, pushManager: { getSubscription: mocks.getSubscription, subscribe: mocks.subscribe } }
const status = { enabled: true, available: true, publicKey: 'B' + 'A'.repeat(86), preferencesDefaults: { native: true, ev: true, water: true, lowBattery: true } }
let module: typeof import('./useSystemNotifications')
let cleanup: (() => void) | undefined
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); mocks.enabled = false
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('Notification', { permission: 'default', requestPermission: mocks.requestPermission })
  vi.stubGlobal('PushManager', class {})
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: mocks.getRegistration, addEventListener: vi.fn(), removeEventListener: vi.fn() } })
  mocks.getRegistration.mockResolvedValue(undefined)
  mocks.register.mockResolvedValue(registration)
  mocks.getSubscription.mockResolvedValue(subscription)
  mocks.subscribe.mockResolvedValue(subscription)
  mocks.unsubscribe.mockResolvedValue(true)
  mocks.requestPermission.mockResolvedValue('granted')
  mocks.worker.mockImplementation(async (_registration, message) => { if (message.type === 'notification-settings-set') mocks.enabled = message.enabled; return { enabled: mocks.enabled } })
  mocks.api.mockImplementation(async (path, method) => {
    if (path === 'status') return status
    if (path === 'test') return { queued: true }
    return { registered: method !== 'DELETE', preferences: status.preferencesDefaults }
  })
  module = await import('./useSystemNotifications')
})
afterEach(() => { cleanup?.(); cleanup = undefined; vi.unstubAllGlobals() })

describe('opt-in system notifications', () => {
  it('never prompts, subscribes or emits OS notifications during startup', async () => {
    cleanup = module.initSystemNotifications()
    await module.useSystemNotifications().refresh()
    expect(mocks.requestPermission).not.toHaveBeenCalled()
    expect(mocks.register).not.toHaveBeenCalled()
    expect(mocks.subscribe).not.toHaveBeenCalled()
    expect(module.useSystemNotifications().ready.value).toBe(false)
  })
  it('requests permission directly on enable, before asynchronous browser setup', async () => {
    const ui = module.useSystemNotifications(); await ui.refresh()
    const enabling = ui.enable()
    expect(mocks.requestPermission).toHaveBeenCalledTimes(1)
    expect(mocks.register).not.toHaveBeenCalled()
    await enabling
    expect(ui.ready.value).toBe(true)
    expect(mocks.api).toHaveBeenCalledWith('subscription', 'POST', expect.objectContaining({ subscription: subscription.toJSON() }))
  })
  it('does not claim ready if server registration is refused', async () => {
    const ui = module.useSystemNotifications(); await ui.refresh()
    mocks.api.mockResolvedValue({ registered: false })
    await ui.enable()
    expect(ui.ready.value).toBe(false)
    expect(mocks.enabled).toBe(false)
    expect(ui.error.value).toContain('not enabled')
  })
  it('does not loop a denied permission request', async () => {
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: mocks.requestPermission })
    const ui = module.useSystemNotifications(); await ui.refresh(); await ui.enable()
    expect(mocks.requestPermission).not.toHaveBeenCalled()
    expect(mocks.register).not.toHaveBeenCalled()
    expect(ui.status.value).toContain('Blocked')
  })
  it('fails softly for insecure or unsupported browser environments', async () => {
    vi.stubGlobal('isSecureContext', false)
    const ui = module.useSystemNotifications(); await ui.refresh(); await ui.enable()
    expect(mocks.api).not.toHaveBeenCalled()
    expect(mocks.requestPermission).not.toHaveBeenCalled()
    expect(ui.status.value).toContain('Unavailable')
  })
  it('reports queued rather than delivered when sending an explicit test', async () => {
    const ui = module.useSystemNotifications(); await ui.refresh(); await ui.enable(); await ui.test()
    expect(mocks.api).toHaveBeenCalledWith('test', 'POST', { endpoint })
    expect(ui.notice.value).toContain('Test queued')
    expect(ui.notice.value).toContain('not yet been confirmed')
  })
  it('stops local display and retains a retry path when server deletion fails', async () => {
    const ui = module.useSystemNotifications(); await ui.refresh(); await ui.enable()
    mocks.api.mockRejectedValue(new Error('private endpoint or token must not be reflected'))
    await ui.disable()
    expect(mocks.enabled).toBe(false)
    expect(mocks.unsubscribe).not.toHaveBeenCalled()
    expect(ui.error.value).toContain('Retry Disable')
    expect(ui.error.value).not.toContain('private endpoint')
    mocks.api.mockResolvedValue({ registered: false })
    await ui.disable()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
    expect(ui.registered.value).toBe(false)
  })
  it('restores only a server-confirmed native subscription after reload', async () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: mocks.requestPermission })
    mocks.getRegistration.mockResolvedValue(registration); mocks.enabled = true
    const ui = module.useSystemNotifications(); await ui.refresh()
    expect(ui.ready.value).toBe(true)
    expect(mocks.api).toHaveBeenCalledWith('subscription/status', 'POST', { endpoint })
    expect(mocks.requestPermission).not.toHaveBeenCalled()
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
async function until(predicate: () => boolean) {
  for (let attempt = 0; attempt < 50 && !predicate(); attempt++) await Promise.resolve()
  expect(predicate()).toBe(true)
}

describe('notification lifecycle races and key rotation', () => {
  it('ignores an old negative subscription status arriving after Enable succeeds', async () => {
    const ui = module.useSystemNotifications(); await ui.refresh()
    mocks.getRegistration.mockResolvedValue(registration)
    const old = deferred<{ registered: boolean }>(); let queried = false
    mocks.api.mockImplementation(async (path) => {
      if (path === 'status') return status
      if (path === 'subscription/status') { queried = true; return old.promise }
      return { registered: true }
    })
    const refreshing = ui.refresh(); await until(() => queried)
    await ui.enable()
    expect(ui.ready.value).toBe(true)
    old.resolve({ registered: false }); await refreshing
    expect(ui.ready.value).toBe(true)
  })
  it('ignores an old positive subscription status arriving after Disable finishes', async () => {
    const ui = module.useSystemNotifications(); await ui.refresh(); await ui.enable()
    mocks.getRegistration.mockResolvedValue(registration)
    const old = deferred<{ registered: boolean }>(); let queried = false
    mocks.api.mockImplementation(async (path, method) => {
      if (path === 'status') return status
      if (path === 'subscription/status') { queried = true; return old.promise }
      return { registered: method !== 'DELETE' }
    })
    const refreshing = ui.refresh(); await until(() => queried)
    await ui.disable()
    old.resolve({ registered: true }); await refreshing
    expect(ui.ready.value).toBe(false)
    expect(ui.optedIn.value).toBe(false)
    expect(ui.registered.value).toBe(false)
  })
  it('replaces a subscription bound to an old VAPID key only on explicit Enable', async () => {
    const changedKey = new Uint8Array(key.slice(0)); changedKey[64] = 1
    const publicKey = btoa(String.fromCharCode(...changedKey)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    mocks.getRegistration.mockResolvedValue(registration); mocks.enabled = true
    mocks.api.mockImplementation(async (path, method) => path === 'status' ? { ...status, publicKey } : { registered: method !== 'DELETE' })
    mocks.subscribe.mockResolvedValue({ ...subscription, options: { applicationServerKey: changedKey.buffer } })
    const ui = module.useSystemNotifications(); await ui.refresh()
    expect(ui.ready.value).toBe(false)
    expect(mocks.unsubscribe).not.toHaveBeenCalled()
    expect(ui.error.value).toContain('key changed')
    await ui.enable()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
    expect(mocks.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: changedKey })
    expect(ui.ready.value).toBe(true)
  })
})
