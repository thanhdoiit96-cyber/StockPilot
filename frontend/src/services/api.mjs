import { notifySessionExpired } from './authSession.mjs'
import { sessionFetch } from './cookieSession.mjs'

export class ApiError extends Error {
  constructor(message, status = null) { super(message); this.name = 'ApiError'; this.status = status }
}

export async function requestJson(url, { signal, method = 'GET', body, token, timeoutMs = 15000 } = {}) {
  const deadline = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : null
  const requestSignal = signal && deadline ? AbortSignal.any([signal, deadline]) : signal || deadline
  let response
  try {
    response = await sessionFetch(url, { token, ...(requestSignal ? { signal: requestSignal } : {}), method, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') throw error
    throw new ApiError('Không thể kết nối máy chủ. Vui lòng thử lại.')
  }
  if (!response.ok) {
    let serverMessage = ''
    try { serverMessage = (await response.clone().json()).message || '' } catch (_) {}
    const message = (response.status === 401 && /Invalid or expired token/i.test(serverMessage)) ? 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' : serverMessage || (response.status === 404 ? 'Không tìm thấy dữ liệu được yêu cầu.' : response.status === 429 ? 'Có quá nhiều yêu cầu. Vui lòng chờ một chút rồi thử lại.' : 'Máy chủ không thể xử lý yêu cầu. Vui lòng thử lại.')
    if (response.status === 401 && token) notifySessionExpired(message)
    throw new ApiError(`${message} (HTTP ${response.status})`, response.status)
  }
  if (response.status === 204) return { success: true, data: null }
  let payload
  try { payload = await response.json() } catch (error) { if (signal?.aborted || error.name === 'AbortError') throw error; throw new ApiError('Phản hồi máy chủ không phải JSON hợp lệ.') }
  if (!payload || typeof payload !== 'object' || payload.success === false) throw new ApiError('Máy chủ trả về dữ liệu không hợp lệ hoặc yêu cầu thất bại.')
  return payload
}

export function stockList(payload) {
  if (payload.success !== true || !Array.isArray(payload.data) || payload.data.some(stock => !stock || typeof stock.id !== 'string')) throw new ApiError('Danh sách cổ phiếu trả về không đúng định dạng.')
  if (payload.pagination) Object.defineProperty(payload.data, 'pagination', { value: payload.pagination, enumerable: false })
  return payload.data
}
export function stockDetail(payload) {
  if (payload.success !== true || !payload.data || typeof payload.data.id !== 'string' || !Array.isArray(payload.data.price_history)) throw new ApiError('Chi tiết cổ phiếu trả về không đúng định dạng.')
  return payload.data
}
export function stockQuote(payload) {
  if (payload.success !== true || !payload.data || typeof payload.data.price !== 'number') throw new ApiError('Báo giá hiện tại trả về không đúng định dạng.')
  return payload.data
}
export function stockQuotes(payload) {
  if (payload.success !== true || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data) || Object.values(payload.data).some(quote => !quote || !Number.isFinite(quote.price) || quote.price <= 0 || !quote.observed_at || !Number.isFinite(Date.parse(quote.fetched_at)))) throw new ApiError('Danh sách báo giá hiện tại trả về không đúng định dạng.')
  return payload.data
}
export function marketDataQuality(payload) {
  if (payload.success !== true || !payload.data || typeof payload.data.session_date !== 'string' || !Number.isInteger(payload.data.listed) || !Number.isInteger(payload.data.covered) || !Number.isInteger(payload.data.missing) || !Array.isArray(payload.data.missing_symbols) || typeof payload.data.ready !== 'boolean') throw new ApiError('Trạng thái chất lượng dữ liệu trả về không đúng định dạng.')
  return payload.data
}
export function stockAnalysis(payload) {
  if (payload.success !== true || !payload.data || !payload.data.indicators || typeof payload.data.observations !== 'number' || !payload.data.quality || !payload.data.risk_plan || !payload.data.expert_guidance || !Array.isArray(payload.data.expert_guidance.score_breakdown)) throw new ApiError('Phân tích kỹ thuật trả về không đúng định dạng.')
  return payload.data
}
export function aiGateStatus(payload) {
  if (payload.success !== true || !payload.data || typeof payload.data.enabled !== 'boolean' || !Array.isArray(payload.data.reasons)) throw new ApiError('Trạng thái AI Gate trả về không đúng định dạng.')
  return payload.data
}
export function recommendationStatus(payload) {
  if (payload.success !== true || !payload.data || !Array.isArray(payload.data.recommendations)) throw new ApiError('Đề xuất cổ phiếu trả về không đúng định dạng.')
  return payload.data
}
export function recommendationHistory(payload) {
  if (payload.success !== true || !payload.data || !Array.isArray(payload.data)) throw new ApiError('Lịch sử đề xuất trả về không đúng định dạng.')
  return payload.data
}

export function recommendationReadiness(payload) {
  if (payload.success !== true || !payload.data || !Array.isArray(payload.data.coverage)) throw new ApiError('Trạng thái dữ liệu đề xuất trả về không đúng định dạng.')
  return payload.data
}
export function startRequest(url, select, onState) {
  const controller = new AbortController(); onState({ status: 'loading', data: null, error: '' })
  const done = requestJson(url, { signal: controller.signal }).then(payload => { if (controller.signal.aborted) return; const data = select(payload); if (!controller.signal.aborted) onState({ status: 'success', data, error: '' }) }).catch(error => { if (!controller.signal.aborted) onState({ status: 'error', data: null, error: error.message }) })
  return { cancel: () => controller.abort(), done }
}
