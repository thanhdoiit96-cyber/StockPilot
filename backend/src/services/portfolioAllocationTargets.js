const MAX_TARGETS = 30;

function normalizeAllocationTargets(payload) {
  const targets = payload?.targets;
  if (!Array.isArray(targets) || targets.length > MAX_TARGETS) return { error: 'Danh sách mục tiêu không hợp lệ.' };
  const seen = new Set();
  const values = [];
  for (const target of targets) {
    const stockId = typeof target?.stock_id === 'string' ? target.stock_id.trim() : '';
    const weight = Number(target?.target_weight_pct);
    const threshold = target?.alert_threshold_pct == null ? 5 : Number(target.alert_threshold_pct);
    if (!stockId || seen.has(stockId) || !Number.isFinite(weight) || weight < 0 || weight > 100 || !Number.isFinite(threshold) || threshold < 0.1 || threshold > 50) {
      return { error: 'Mỗi mục tiêu cần mã chứng khoán, tỷ trọng 0–100% và ngưỡng 0,1–50%.' };
    }
    seen.add(stockId);
    values.push({ stock_id: stockId, target_weight_pct: Number(weight.toFixed(2)), alert_threshold_pct: Number(threshold.toFixed(2)) });
  }
  const total = values.reduce((sum, item) => sum + item.target_weight_pct, 0);
  if (total > 100.0001) return { error: 'Tổng tỷ trọng mục tiêu không được vượt 100%.' };
  return { value: values, total_target_weight_pct: Number(total.toFixed(2)) };
}

function summarizeAllocationTargets({ positions = [], targets = [] }) {
  const total = positions.reduce((sum, position) => sum + Number(position.market_value || 0), 0);
  const byStock = new Map(targets.map(target => [String(target.stock_id), target]));
  const items = positions.map(position => {
    const target = byStock.get(String(position.stock_id));
    const actual = total > 0 ? Number(position.market_value || 0) / total * 100 : null;
    const targetWeight = target ? Number(target.target_weight_pct) : null;
    const deviation = actual != null && targetWeight != null ? Number((actual - targetWeight).toFixed(2)) : null;
    const threshold = target ? Number(target.alert_threshold_pct) : null;
    return { stock_id: position.stock_id, symbol: position.symbol, actual_weight_pct: actual == null ? null : Number(actual.toFixed(2)), target_weight_pct: targetWeight, alert_threshold_pct: threshold, deviation_pct: deviation, status: deviation != null && Math.abs(deviation) >= threshold ? 'outside_target' : 'within_target' };
  });
  const configured = targets.reduce((sum, target) => sum + Number(target.target_weight_pct), 0);
  return { total_target_weight_pct: Number(configured.toFixed(2)), unallocated_target_weight_pct: Number(Math.max(0, 100 - configured).toFixed(2)), alerts: items.filter(item => item.status === 'outside_target'), items };
}

module.exports = { normalizeAllocationTargets, summarizeAllocationTargets };
