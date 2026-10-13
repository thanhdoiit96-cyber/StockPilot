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
  const measured = [], baselineEligible = [];
  for (const row of rows) {
    if (!verifySnapshot(row) || row.synthetic !== false || row.research_only !== false || row.horizon_sessions !== horizon) throw new Error('Live cohort integrity failed');
    if (!row.outcome) continue;
    const outcome = plain(row.outcome);
    if (outcome.payload_sha256 !== artifactHash(outcome.payload) || outcome.payload?.snapshot_sha256 !== row.payload_sha256 || !CLASSES.includes(outcome.payload?.actual_class)) throw new Error('Live outcome integrity failed');
    const values = Object.fromEntries(row.payload.probabilities.map(item => [item.class, item.value])), truth = outcome.payload.actual_class;
    const model={ brier: CLASSES.reduce((sum, name) => sum + (values[name] - Number(name === truth)) ** 2, 0), log: -Math.log(Math.max(1e-15, values[truth])) }; measured.push(model);
    if(row.payload.version==='forecast_live_shadow_payload_v2'&&row.payload.baseline_snapshot){ const score=items=>{const mapped=Object.fromEntries(items.map(item=>[item.class,item.value]));return{brier:CLASSES.reduce((sum,name)=>sum+(mapped[name]-Number(name===truth))**2,0),log:-Math.log(Math.max(1e-15,mapped[truth]))}}; baselineEligible.push({model,frequency:score(row.payload.baseline_snapshot.frequency_probabilities),persistence:score(row.payload.baseline_snapshot.persistence_probabilities)}); }
  }
  const mean = key => measured.length ? measured.reduce((sum, item) => sum + item[key], 0) / measured.length : null;
  const eligible=baselineEligible.length>=minimumSamples, baselineMean=(type,key)=>baselineEligible.reduce((sum,item)=>sum+item[type][key],0)/Math.max(1,baselineEligible.length);
  return { version: 'forecast_live_cohort_summary_v1', status: 'live_cohort', source: 'snapshot_store', provider: rows[0]?.provider || 'vnstock', horizon_sessions: horizon,
    synthetic: false, research_only: false, live: true, market_accuracy_verified: false, minimum_samples: minimumSamples,
    predictions: rows.length, measured: measured.length, pending: rows.length - measured.length, date_range: { from: rows[0]?.as_of || null, to: rows.at(-1)?.as_of || null },
    baseline_eligible_measured:baselineEligible.length, score_gate: eligible ? { status:'available', samples:baselineEligible.length, minimum_samples:minimumSamples }
      : measured.length >= minimumSamples ? { status: 'awaiting_baseline', reason: 'contemporaneous_baseline_not_sealed', samples: baselineEligible.length, minimum_samples: minimumSamples }
      : { status: 'insufficient_samples', reason: 'minimum_measured_samples_not_met', samples: measured.length, minimum_samples: minimumSamples },
    model_scores: eligible ? { brier_multiclass_sum:baselineMean('model','brier'),log_loss:baselineMean('model','log') } : null,
    baseline_comparison:eligible?{status:'available',convention:'model_minus_baseline; negative_favors_model',frequency:{brier_multiclass_sum:baselineMean('frequency','brier'),log_loss:baselineMean('frequency','log'),brier_delta:baselineMean('model','brier')-baselineMean('frequency','brier'),log_loss_delta:baselineMean('model','log')-baselineMean('frequency','log')},persistence:{brier_multiclass_sum:baselineMean('persistence','brier'),log_loss:baselineMean('persistence','log'),brier_delta:baselineMean('model','brier')-baselineMean('persistence','brier'),log_loss_delta:baselineMean('model','log')-baselineMean('persistence','log')}}:{status:'unavailable',reason:eligible?null:'sample_or_baseline_gate_closed'} };
}
module.exports = { listLiveCohortRows, buildLiveCohortSummary };
