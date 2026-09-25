'use strict';

function key(record) { return `${record.instrument.symbol.toUpperCase()}|${record.observed_at}|${record.interval}`; }
function relativeDifference(a, b) { const denominator = Math.max(Math.abs(Number(a)), Math.abs(Number(b)), 1); return Math.abs(Number(a) - Number(b)) / denominator; }

async function reconcileMarketData({ adapterA, adapterB, symbols, from, to, closeTolerance = 0.001, volumeTolerance = 0.02, corporateActionRatioTolerance = 0.01, volumePolicy = 'normalized', ReconciliationRun = null } = {}) {
  if (!adapterA?.fetchQuotes || !adapterB?.fetchQuotes) throw new TypeError('two market data adapters are required');
  const expected = [...new Set((symbols || []).map(symbol => String(symbol).trim().toUpperCase()).filter(Boolean))];
  if (!expected.length) throw new TypeError('symbols must contain at least one symbol');
  const startedAt = new Date();
  const base = { provider_a: adapterA.provider, source_a: adapterA.source, provider_b: adapterB.provider, source_b: adapterB.source, interval: '1d', from_date: from || null, to_date: to || null, symbols: expected };
  try {
    const [recordsA, recordsB] = await Promise.all([
      adapterA.fetchQuotes({ symbols: expected, from, to }),
      adapterB.fetchQuotes({ symbols: expected, from, to })
    ]);
    const [actionsA, actionsB] = await Promise.all([
      adapterA.fetchCorporateActions ? adapterA.fetchCorporateActions({ symbols: expected, from, to }) : [],
      adapterB.fetchCorporateActions ? adapterB.fetchCorporateActions({ symbols: expected, from, to }) : []
    ]);
    const actionFor = (actions, symbol, observedAt) => actions.find(action => String(action.symbol).toUpperCase() === symbol && String(observedAt).slice(0, 10) < String(action.effective_date).slice(0, 10));
    const mapA = new Map(recordsA.map(record => [key(record), record]));
    const mapB = new Map(recordsB.map(record => [key(record), record]));
    const keys = [...new Set([...mapA.keys(), ...mapB.keys()])];
    const results = keys.map(itemKey => {
      const a = mapA.get(itemKey); const b = mapB.get(itemKey);
      if (!a) return { key: itemKey, status: 'missing_a', symbol: b.instrument.symbol, observed_at: b.observed_at };
      if (!b) return { key: itemKey, status: 'missing_b', symbol: a.instrument.symbol, observed_at: a.observed_at };
      const closeDiff = a.quote.close != null && b.quote.close != null ? relativeDifference(a.quote.close, b.quote.close) : null;
      const closeRatio = Number(a.quote.close) && Number(b.quote.close) ? Number(b.quote.close) / Number(a.quote.close) : null;
      const corporateAction = actionFor(actionsA, a.instrument.symbol, a.observed_at) || actionFor(actionsB, a.instrument.symbol, a.observed_at) || null;
      const adjustmentFactor = volumePolicy === 'normalized' && corporateAction?.ratio > 0 ? corporateAction.ratio : 1;
      const rawCloseA = a.quote.close == null ? null : Number(a.quote.close);
      const rawCloseB = b.quote.close == null ? null : Number(b.quote.close);
      const normalizedCloseA = rawCloseA == null ? null : rawCloseA;
      const normalizedCloseB = rawCloseB == null ? null : rawCloseB / adjustmentFactor;
      const normalizedCloseDifference = normalizedCloseA != null && normalizedCloseB != null ? relativeDifference(normalizedCloseA, normalizedCloseB) : null;
      const rawVolumeA = a.quote.volume == null ? null : Number(a.quote.volume);
      const rawVolumeB = b.quote.volume == null ? null : Number(b.quote.volume);
      const normalizedVolumeA = rawVolumeA == null ? null : rawVolumeA;
      const normalizedVolumeB = rawVolumeB == null ? null : rawVolumeB / adjustmentFactor;
      const rawVolumeDifference = rawVolumeA != null && rawVolumeB != null ? relativeDifference(rawVolumeA, rawVolumeB) : null;
      const volumeDiff = normalizedVolumeA != null && normalizedVolumeB != null ? relativeDifference(normalizedVolumeA, normalizedVolumeB) : null;
      const volumeRatio = normalizedVolumeA && normalizedVolumeB ? normalizedVolumeB / normalizedVolumeA : null;
      const ratioDifference = closeRatio != null && volumeRatio != null ? relativeDifference(closeRatio, volumeRatio) : null;
      const corporateActionMismatch = corporateAction && closeDiff != null && closeDiff > closeTolerance && rawVolumeDifference != null && rawVolumeDifference > volumeTolerance;
      const matchedAfterCorporateAction = corporateAction && closeDiff != null && closeDiff > closeTolerance && normalizedCloseDifference <= closeTolerance && volumeDiff != null && volumeDiff <= volumeTolerance;
      const volumeMismatchStatus = volumeDiff != null && volumeDiff > volumeTolerance ? (volumePolicy === 'advisory' ? 'volume_warning' : 'volume_mismatch') : null;
      const status = matchedAfterCorporateAction ? 'matched_after_corporate_action'
        : corporateActionMismatch ? 'corporate_action_mismatch'
        : closeDiff != null && closeDiff > closeTolerance ? 'close_mismatch'
        : volumeMismatchStatus || 'matched';
      return { key: itemKey, status, symbol: a.instrument.symbol, observed_at: a.observed_at, close_a: a.quote.close, close_b: b.quote.close, close_a_normalized: normalizedCloseA == null ? null : String(normalizedCloseA), close_b_normalized: normalizedCloseB == null ? null : String(normalizedCloseB), close_difference: closeDiff, normalized_close_difference: normalizedCloseDifference, volume_a: a.quote.volume, volume_b: b.quote.volume, volume_a_normalized: normalizedVolumeA == null ? null : String(normalizedVolumeA), volume_b_normalized: normalizedVolumeB == null ? null : String(normalizedVolumeB), raw_volume_difference: rawVolumeDifference, volume_difference: volumeDiff, close_ratio: closeRatio, volume_ratio: volumeRatio, ratio_difference: ratioDifference, corporate_action: corporateAction, volume_policy: volumePolicy };
    });
    const counts = results.reduce((output, result) => { output[result.status] = (output[result.status] || 0) + 1; return output; }, {});
    const report = { ...base, status: (counts.close_mismatch || counts.volume_mismatch || counts.corporate_action_mismatch || counts.missing_a || counts.missing_b) ? 'fail' : 'pass', received_a: recordsA.length, received_b: recordsB.length, compared: results.length, counts, close_tolerance: closeTolerance, volume_tolerance: volumeTolerance, corporate_action_ratio_tolerance: corporateActionRatioTolerance, volume_policy: volumePolicy, results, errors: [], started_at: startedAt, completed_at: new Date() };
    if (ReconciliationRun) await ReconciliationRun.create({ ...report, updated_at: new Date() });
    return report;
  } catch (error) {
    if (ReconciliationRun) await ReconciliationRun.create({ ...base, status: 'failed', received_a: 0, received_b: 0, compared: 0, counts: {}, close_tolerance: closeTolerance, volume_tolerance: volumeTolerance, results: [], errors: [{ message: error.message }], started_at: startedAt, completed_at: new Date(), updated_at: new Date() });
    throw error;
  }
}

module.exports = { reconcileMarketData, relativeDifference };
