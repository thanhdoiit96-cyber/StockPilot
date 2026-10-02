import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { AUTH_STORAGE_KEY, authFromResponse, isStoredAuth, readStoredAuth } from './authSession.mjs'

const originalLocalStorage = globalThis.localStorage

function storageWith(value) {
  const values = new Map(value == null ? [] : [[AUTH_STORAGE_KEY, value]])
  return {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    value: key => values.get(key) ?? null
  }
}

afterEach(() => { globalThis.localStorage = originalLocalStorage })

test('accepts only a complete stored auth contract', () => {
  const valid = { token: 'token', user: { email: 'investor@example.com', role: 'user' } }
  assert.equal(isStoredAuth(valid), true)
  for (const invalid of [null, [], {}, { token: '' }, { token: 'token' }, { token: 'token', user: {} }, { token: 'token', user: { email: '', role: 'user' } }, { token: 'token', user: { email: 'a@b.c', role: '' } }]) {
    assert.equal(isStoredAuth(invalid), false)
  }
})

test('reads a valid session without mutating storage', () => {
  const auth = { token: 'token', user: { email: 'investor@example.com', role: 'user' } }
  const storage = storageWith(JSON.stringify(auth))
  globalThis.localStorage = storage
  assert.deepEqual(readStoredAuth(), auth)
  assert.equal(storage.value(AUTH_STORAGE_KEY), JSON.stringify(auth))
})

test('removes malformed JSON and invalid auth objects during bootstrap', () => {
  for (const serialized of ['{bad json', 'null', '[]', '{}', JSON.stringify({ token: 'token', user: {} })]) {
    const storage = storageWith(serialized)
    globalThis.localStorage = storage
    assert.equal(readStoredAuth(), null)
    assert.equal(storage.value(AUTH_STORAGE_KEY), null)
  }
})

test('normalizes a valid auth response and rejects incomplete 2xx payloads', () => {
  assert.deepEqual(
    authFromResponse({ success: true, token: ' token ', user: { id: 'u1', email: ' investor@example.com ', role: ' user ' } }),
    { token: 'token', user: { id: 'u1', email: 'investor@example.com', role: 'user' } }
  )
  for (const payload of [null, {}, { success: true }, { token: 'token', user: {} }, { token: '', user: { email: 'a@b.c', role: 'user' } }]) {
    assert.throws(() => authFromResponse(payload), /phiên đăng nhập không hợp lệ/)
  }
})
