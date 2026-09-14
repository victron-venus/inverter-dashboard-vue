import { describe, expect, it } from 'vitest'
import { resolveGatewaySnapshotUrl } from './publicMode'

describe('gateway snapshot transport', () => {
  const origin = 'https://dashboard.example.com'

  it.each([
    ['/api/gateway/snapshot', '', '/api/gateway/snapshot'],
    ['api/gateway/snapshot', '', '/api/gateway/snapshot'],
    ['/snapshot', '/proxy/', '/proxy/snapshot'],
    ['/snapshot', 'https://proxy.example.com/', 'https://proxy.example.com/snapshot'],
    ['/snapshot', 'https://proxy.example.com:9151', 'https://proxy.example.com:9151/snapshot'],
  ])('resolves safe snapshot route %s with base %s', (path, base, expected) => {
    expect(resolveGatewaySnapshotUrl(path, base, origin)).toBe(expected)
  })

  it('retains the local development proxy without putting IGW credentials in the browser', () => {
    expect(resolveGatewaySnapshotUrl('/snapshot', '', 'http://localhost:5173')).toBe('/snapshot')
  })

  it.each([
    ['/snapshot', 'http://gateway.example.com:9150'],
    ['/snapshot', 'http://dashboard.example.com'],
    ['/snapshot', '//gateway.example.com'],
    ['//gateway.example.com/snapshot', ''],
    ['https://gateway.example.com/snapshot', ''],
    ['/snapshot', 'https://user:secret@gateway.example.com'],
    ['/snapshot', 'https://gateway.example.com?token=secret'],
    ['/snapshot', 'https://gateway.example.com#fragment'],
    ['/snapshot#fragment', ''],
    ['/snapshot', 'https:\\gateway.example.com'],
    ['/\\gateway.example.com/snapshot', ''],
    ['/snapshot', 'https://gateway.example.com\n'],
    ['/snapshot', 'javascript:alert(1)'],
  ])('rejects unsafe route %s with base %s before fetch', (path, base) => {
    expect(() => resolveGatewaySnapshotUrl(path, base, origin)).toThrow()
  })
})
