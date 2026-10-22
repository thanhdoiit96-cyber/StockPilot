'use strict';
const session = value => value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === 'string' ? value.slice(0, 10) : null;
const validClose = row => Number.isFinite(Number(row?.close ?? row?.price)) && Number(row.close ?? row.price) > 0;

function buildOfficialIndexReadiness({ snapshot = null, prices = [], indexCode = 'VN30', minimumCoverage = .95 } = {}) {
  if (!snapshot || snapshot.index_code !== indexCode || snapshot.status !== 'sealed') return { version: 'official_index_readiness_v1', status: 'unavailable', reason: 'membership_snapshot_unavailable', index_code: indexCode, distribution: 'internal_research_only' };
  if (snapshot.usage_scope !== 'internal_research_only' || !String(snapshot.rights_evidence_ref || '').trim() || snapshot.rights_evidence_ref === 'pending-verification') return { version: 'official_index_readiness_v1', status: 'unavailable', reason: 'membership_rights_unverified', index_code: indexCode, distribution: 'internal_research_only' };
  const constituents = Array.isArray(snapshot.constituents) ? snapshot.constituents : [];
  const symbols = [...new Set(constituents.map(item => String(item.symbol || '').trim().toUpperCase()).filter(Boolean))];
  if (symbols.length !== 30 || Number(snapshot.member_count) !== 30 || !/^[a-f0-9]{64}$/i.test(String(snapshot.membership_sha256 || ''))) return { version: 'official_index_readiness_v1', status: 'unavailable', reason: 'membership_snapshot_invalid', index_code: indexCode, distribution: 'internal_research_only' };
  const asOf = prices.map(row => session(row.observed_at)).filter(Boolean).sort().at(-1) || null;
  if (!asOf) return { version: 'official_index_readiness_v1', status: 'unavailable', reason: 'eod_session_unavailable', index_code: indexCode, distribution: 'internal_research_only' };
  const bySymbol = new Map(prices.filter(row => session(row.observed_at) === asOf && validClose(row)).map(row => [String(row.symbol || '').toUpperCase(), row]));
  const observed = symbols.filter(symbol => bySymbol.has(symbol)); const coverage = observed.length / symbols.length;
  if (coverage < minimumCoverage) return { version: 'official_index_readiness_v1', status: 'unavailable', reason: 'member_eod_coverage_below_threshold', index_code: indexCode, distribution: 'internal_research_only', as_of: asOf, coverage: { observed: observed.length, universe: symbols.length, ratio: Number(coverage.toFixed(6)), minimum: minimumCoverage } };
  return { version: 'official_index_readiness_v1', status: 'ready_for_shadow', index_code: indexCode, as_of: asOf, scope: 'official_membership', research_only: true, distribution: 'internal_research_only', publication_permitted: false, coverage: { observed: observed.length, universe: symbols.length, ratio: Number(coverage.toFixed(6)), minimum: minimumCoverage }, membership: { effective_from: snapshot.effective_from, effective_to: snapshot.effective_to || null, source_identifier: snapshot.source_identifier, membership_sha256: snapshot.membership_sha256 } };
}
module.exports = { buildOfficialIndexReadiness };
