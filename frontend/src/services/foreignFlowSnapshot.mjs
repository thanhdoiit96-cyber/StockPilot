import { ApiError } from './api.mjs'

export function foreignFlowSnapshot(payload) {
  const data = payload?.data
  if (payload?.success !== true || !data || data.version !== 'foreign_flow_snapshot_v1' || !['available', 'partial', 'unavailable'].includes(data.status) || !data.coverage || typeof data.policy?.scored !== 'boolean') throw new ApiError('Dữ liệu dòng tiền khối ngoại không đúng định dạng.')
  if (data.status === 'unavailable' && data.totals !== null) throw new ApiError('Dữ liệu dòng tiền khối ngoại không nhất quán.')
  if (!Array.isArray(data.sectors) || !Array.isArray(data.symbols)) throw new ApiError('Danh sách dòng tiền khối ngoại không đúng định dạng.')
  return data
}

export const shouldShowForeignFlow = data => Boolean(data && data.status !== 'unavailable' && data.coverage?.observed > 0 && data.totals)
