'use strict';
const crypto = require('node:crypto');

const normalizeSymbol = value => String(value || '').trim().toUpperCase();
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function buildOfficialVn30MembershipManifest(input = {}) {
  const sourceUrl = new URL(input.source_url);
  const host = sourceUrl.hostname.toLowerCase();
  if (sourceUrl.protocol !== 'https:' || (host !== 'hsx.vn' && !host.endsWith('.hsx.vn'))) throw new Error('OfficialVN30 source URL must be an HTTPS HOSE URL');
  const symbols = [...new Set((input.symbols || []).map(normalizeSymbol))].sort();
  if (symbols.length !== 30 || symbols.some(symbol => !/^[A-Z0-9]{1,12}$/.test(symbol))) throw new Error('OfficialVN30 requires exactly 30 unique valid symbols');
  const dateOnly = value => new Date(value).toISOString().slice(0, 10);
  input = { ...input, effective_from: dateOnly(input.effective_from), effective_to: input.effective_to ? dateOnly(input.effective_to) : null, source_published_at: new Date(input.source_published_at).toISOString() };
  if (input.effective_to && input.effective_to < input.effective_from) throw new Error('Invalid membership effective range');
  const canonicalMembership = JSON.stringify({ index_code: 'VN30', effective_from: input.effective_from, effective_to: input.effective_to || null, symbols });
  const canonicalSource = JSON.stringify({ source_identifier: input.source_identifier, source_url: sourceUrl.toString(), source_published_at: input.source_published_at, effective_from: input.effective_from, effective_to: input.effective_to || null });
  return {
    index_code: 'VN30', status: 'sealed', effective_from: input.effective_from, effective_to: input.effective_to || null,
    source_identifier: input.source_identifier, source_url: sourceUrl.toString(), source_published_at: input.source_published_at,
    member_count: symbols.length, membership_sha256: digest(canonicalMembership), source_sha256: digest(canonicalSource),
    usage_scope: 'internal_research_only', rights_evidence_ref: String(input.rights_evidence_ref || 'owner-attested-internal-research-pending').trim(), symbols
  };
}

module.exports = { buildOfficialVn30MembershipManifest };
