import { randomUUID } from 'node:crypto'

const origin = 'http://127.0.0.1:4173'
function client() {
  const cookies = new Map()
  const request = async (path, { method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(origin + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookies.size ? { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
    for (const raw of response.headers.getSetCookie()) { const [pair] = raw.split(';'); const at = pair.indexOf('='); const name = pair.slice(0, at); const value = pair.slice(at + 1); if (value) cookies.set(name, value); else cookies.delete(name) }
    let payload = null; try { payload = await response.json() } catch {}
    return { status: response.status, payload }
  }
  return { request, csrf: () => decodeURIComponent(cookies.get('sp_csrf') || '') }
}
async function register(label) {
  const result = client(); const response = await result.request('/api/auth/register', { method: 'POST', headers: { 'X-Auth-Mode': 'cookie-v1' }, body: { email: `event-${label}-${randomUUID()}@example.invalid`, password: randomUUID() } })
  if (response.status !== 201 || !result.csrf()) throw new Error(`Registration failed: HTTP ${response.status}`)
  return result
}

const owner = await register('owner'); const other = await register('other'); const headers = { 'X-CSRF-Token': owner.csrf() }
const eventBody = { event_type: 'STOCK_SPLIT', symbol: 'FPT', record_date: '2026-09-20', effective_date: '2026-09-21', entitlement_quantity: 100, payload: { ratio_numerator: 2, ratio_denominator: 1 }, source_type: 'PROVIDER', verification_status: 'SOURCE_VERIFIED' }
const created = await owner.request('/api/portfolio/events', { method: 'POST', headers, body: eventBody })
if (created.status !== 201 || created.payload.data.status !== 'PENDING' || created.payload.data.source_type !== 'MANUAL' || created.payload.data.verification_status !== 'UNVERIFIED') throw new Error(`Manual event contract failed: HTTP ${created.status}`)
const event = created.payload.data
if ((await other.request('/api/portfolio/events')).payload.data.events.length !== 0) throw new Error('Event leaked across portfolio owners')
const confirmed = await owner.request(`/api/portfolio/events/${event.id}/confirm`, { method: 'POST', headers, body: { confirmed: true } })
if (confirmed.status !== 200 || confirmed.payload.data.verification_status !== 'USER_CONFIRMED') throw new Error(`Confirm lifecycle failed: HTTP ${confirmed.status}`)
const corrected = await owner.request(`/api/portfolio/events/${event.id}/correct`, { method: 'POST', headers, body: { ...eventBody, payload: { ratio_numerator: 3, ratio_denominator: 2 } } })
if (corrected.status !== 201 || corrected.payload.data.status !== 'PENDING' || corrected.payload.data.supersedes_event_id !== event.id) throw new Error(`Correction lifecycle failed: HTTP ${corrected.status}`)
const replacement = corrected.payload.data
const cancelled = await owner.request(`/api/portfolio/events/${replacement.id}/cancel`, { method: 'POST', headers, body: { confirmed: true } })
if (cancelled.status !== 200 || cancelled.payload.data.status !== 'CANCELLED') throw new Error(`Cancel lifecycle failed: HTTP ${cancelled.status}`)
const timeline = (await owner.request('/api/portfolio/events')).payload.data.events
if (timeline.length !== 2 || !timeline.some(item => item.id === event.id && item.status === 'SUPERSEDED') || !timeline.some(item => item.id === replacement.id && item.status === 'CANCELLED')) throw new Error('Persisted correction chain is inconsistent')
console.log('Real development portfolio event ledger passed: pending/manual enforcement, confirmation, atomic correction chain, cancellation and ownership isolation. Two isolated smoke accounts retained; no credentials persisted.')
