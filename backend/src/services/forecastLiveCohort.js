'use strict';
const { artifactHash } = require('./forecastArtifact');
const { verifySnapshot } = require('./forecastSnapshotStore');
const CLASSES = ['declining', 'balanced', 'advancing'];
const plain = value => value?.get ? value.get({ plain: true }) : value;

async function listLiveCohortRows({ ForecastSnapshot, ForecastOutcomeEvent }, { horizon, maximumRows = 5000 } = {}) {
  if (![1, 5].includes(horizon) || !Number.isInteger(maximumRows) || maximumRows < 1 || maximumRows > 10000) throw new Error('Invalid live cohort query');
  const rows = await ForecastSnapshot.findAll({ where: { horizon_sessions: horizon, synthetic: false, research_only: false }, include: [{ model: ForecastOutcomeEvent, as: 'outcome', required: false }], order: [['as_of','ASC'],['id','ASC']], limit: maximumRows + 1 });
  if (rows.length > maximumRows) throw new Error('Live cohort row limit exceeded');
  return rows.map(plain);
}

function buildLiveCohortSummary(rows, { horizon, minimumSamples = 20 } = {}) {
  if (!Array.isArray(rows) || ![1, 5].includes(horizon) || !Number.isInteger(minimumSamples) || minimumSamples < 2 || minimumSamples > 1000) throw new Error('Invalid live cohort summary');
  const measured = [];
  for (const row of rows) {
    if (!verifySnapshot(row) || row.synthetic !== false || row.research_only !== false || row.horizon_sessions !== horizon) throw new Error('Live cohort integrity failed');
    if (!row.outcome) continue;
    const outcome = plain(row.outcome);
    if (outcome.payload_sha256 !== artifactHash(outcome.payload) || outcome.payload?.snapshot_sha256 !== row.payload_sha256 || !CLASSES.includes(outcome.payload?.actual_class)) throw new Error('Live outcome integrity failed');
    const values = Object.fromEntries(row.payload.probabilities.map(item => [item.class, item.value])), truth = outcome.payload.actual_class;
    measured.push({ brier: CLASSES.reduce((sum, name) => sum + (values[name] - Number(name === truth)) ** 2, 0), log: -Math.log(Math.max(1e-15, values[truth])) });
  }
  const mean = key => measured.length ? measured.reduce((sum, item) => sum + item[key], 0) / measured.length : null;
  return { version: 'forecast_live_cohort_summary_v1', status: 'live_cohort', source: 'snapshot_store', provider: rows[0]?.provider || 'vnstock', horizon_sessions: horizon,
    synthetic: false, research_only: false, live: true, market_accuracy_verified: false, minimum_samples: minimumSamples,
    predictions: rows.length, measured: measured.length, pending: rows.length - measured.length, date_range: { from: rows[0]?.as_of || null, to: rows.at(-1)?.as_of || null },
    score_gate: measured.length >= minimumSamples ? { status: 'awaiting_baseline', reason: 'contemporaneous_baseline_not_sealed', samples: measured.length, minimum_samples: minimumSamples }
      : { status: 'insufficient_samples', reason: 'minimum_measured_samples_not_met', samples: measured.length, minimum_samples: minimumSamples },
    model_scores: measured.length >= minimumSamples ? { brier_multiclass_sum: mean('brier'), log_loss: mean('log') } : null };
}
module.exports = { listLiveCohortRows, buildLiveCohortSummary };
