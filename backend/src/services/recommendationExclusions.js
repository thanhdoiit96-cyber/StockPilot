'use strict';
function summarizeRecommendationExclusions(items = []) {
  const counts = new Map();
  for (const item of items) {
    if (item.measurement_status !== 'excluded') continue;
    const reasons = Array.isArray(item.exclusion_reasons) ? item.exclusion_reasons.filter(reason => typeof reason === 'string' && reason.trim()) : [];
    for (const reason of new Set(reasons.length ? reasons : ['unspecified_evidence_failure'])) counts.set(reason, (counts.get(reason) || 0) + 1);
  }
  return [...counts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}
module.exports = { summarizeRecommendationExclusions };
