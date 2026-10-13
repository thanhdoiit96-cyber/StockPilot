'use strict';

function normalizeForecastModeGate(input = {}) {
  const mode = String(input.mode || (input.live ? 'live' : 'research')).toLowerCase();
  const provider = String(input.provider || '').trim();
  const license = String(input.license || '').trim();
  const synthetic = Boolean(input.synthetic);
  const researchOnly = Boolean(input.research_only);
  const live = Boolean(input.live);
  const localOnly = Boolean(input.local_only ?? input.localOnly ?? false);
  const evidenceIntegrity = Boolean(input.evidence_integrity ?? input.evidenceIntegrity ?? false);
  const coverage = Number.isFinite(Number(input.coverage ?? input.coverage_ratio ?? input.coverageRatio)) ? Number(input.coverage ?? input.coverage_ratio ?? input.coverageRatio) : 0;
  const minimumSamples = Number.isFinite(Number(input.minimum_samples ?? input.minimumSamples ?? 20)) ? Number(input.minimum_samples ?? input.minimumSamples ?? 20) : 20;
  const sampleCount = Number.isFinite(Number(input.sample_count ?? input.sampleCount ?? 0)) ? Number(input.sample_count ?? input.sampleCount ?? 0) : 0;
  const asOf = typeof input.as_of === 'string' && input.as_of ? input.as_of : null;
  const now = input.now ? new Date(input.now) : new Date();
  const maxStalenessDays = Number.isFinite(Number(input.maximum_staleness_days ?? input.maximumStalenessDays ?? 7)) ? Number(input.maximum_staleness_days ?? input.maximumStalenessDays ?? 7) : 7;

  const normalizedMode = mode === 'production' ? 'live' : mode;
  const providerValid = Boolean(provider) && provider.toLowerCase() !== 'fixture';
  const providerStatus = provider.toLowerCase() === 'fixture' ? 'fixture' : providerValid ? 'verified' : provider ? 'unverified' : 'missing';
  const pendingLicenses = new Set(['fixture', 'internal_research_only', 'personal_research_only', 'not_configured', 'unknown', 'unspecified', '']);
  const licenseValid = Boolean(license) && !pendingLicenses.has(license.toLowerCase());
  const coverageOk = coverage >= 0.8;
  const minimumSamplesOk = sampleCount >= minimumSamples;
  const modeFlagsOk = !synthetic && !researchOnly && live;
  const stalenessOk = !asOf || !Number.isFinite(Date.parse(asOf)) ? true : (now.getTime() - Date.parse(asOf)) <= maxStalenessDays * 24 * 60 * 60 * 1000;
  const localLivePreviewAllowed = localOnly && normalizedMode === 'live' && providerValid && evidenceIntegrity && coverageOk && minimumSamplesOk && modeFlagsOk && stalenessOk;
  const licenseStatus = licenseValid ? 'valid' : (localLivePreviewAllowed ? 'pending_local_preview' : (normalizedMode === 'live' ? 'required' : 'pending'));

  let semanticMode = normalizedMode === 'live' ? 'live' : 'research';
  let status = semanticMode === 'live' ? 'live_ready' : 'research_only';
  if (localOnly && normalizedMode === 'live' && !licenseValid && providerValid && evidenceIntegrity && coverageOk && minimumSamplesOk && modeFlagsOk && stalenessOk) {
    semanticMode = 'local_live_preview';
    status = 'local_live_preview';
  }

  return {
    mode: normalizedMode,
    semantic_mode: semanticMode,
    status,
    provider,
    provider_valid: providerValid,
    provider_status: providerStatus,
    license_valid: licenseValid || localLivePreviewAllowed,
    license_status: licenseStatus,
    evidence_integrity: evidenceIntegrity,
    coverage_ok: coverageOk,
    minimum_samples_ok: minimumSamplesOk,
    mode_flags_ok: modeFlagsOk,
    staleness_ok: stalenessOk,
    live_ready: normalizedMode === 'live' && providerValid && (licenseValid || localLivePreviewAllowed) && evidenceIntegrity && coverageOk && minimumSamplesOk && modeFlagsOk && stalenessOk,
    local_live_preview: semanticMode === 'local_live_preview',
    synthetic,
    research_only: researchOnly || semanticMode === 'research',
    live,
    market_accuracy_verified: false,
  };
}

function assertForecastModeGate(input = {}) {
  const gate = normalizeForecastModeGate(input);
  const requiresLiveGate = input.mode === 'live' || input.live === true || gate.mode === 'live';
  if (!requiresLiveGate) return gate;

  const missing = [];
  if (!gate.provider_valid) missing.push('provider');
  if (!gate.license_valid && !(gate.local_live_preview || input.local_only)) missing.push('license');
  if (!gate.evidence_integrity) missing.push('evidence_integrity');
  if (!gate.coverage_ok) missing.push('coverage');
  if (!gate.minimum_samples_ok) missing.push('minimum_samples');
  if (!gate.mode_flags_ok) missing.push('mode_flags');
  if (!gate.staleness_ok) missing.push('staleness');

  if (missing.length) {
    const error = new Error(`live_forecast_gate_not_passed:${missing.join(',')}`);
    error.code = 'live_forecast_gate_not_passed';
    throw error;
  }

  return gate;
}

module.exports = { normalizeForecastModeGate, assertForecastModeGate };
