'use strict';
const { artifactHash } = require('./forecastArtifact');
const { createForecastSnapshot } = require('./forecastSnapshotStore');
const CLASSES = ['declining', 'balanced', 'advancing'];
const KEYS = ['return_1', 'return_5', 'return_20'];
const validTime = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
function vector(sample) {
  const rows = [...(sample.features || [])].sort((a, b) => String(a.stock_id).localeCompare(String(b.stock_id)));
  if (!rows.length || rows.some(row => KEYS.some(key => !Number.isFinite(row[key])))) return null;
  return KEYS.map(key => rows.reduce((sum, row) => sum + row[key] / rows.length, 0));
}
function softmax(weights, input) {
  const logits = weights.map(row => row.reduce((sum, value, index) => sum + value * input[index], 0));
  const top = Math.max(...logits), values = logits.map(value => Math.exp(value - top)), total = values.reduce((sum, value) => sum + value, 0);
  return values.map(value => value / total);
}
function buildRollingForecastEntries({ report, asOf, cutoff } = {}) {
  if (report?.synthetic !== true || report?.research_only !== true || !/^\d{4}-\d{2}-\d{2}$/.test(asOf || '') || !validTime(cutoff) || Date.parse(cutoff) < Date.parse(`${asOf}T15:00:00+07:00`)) throw new Error('Invalid rolling forecast context');
  const origin = report.samples?.find(sample => sample.as_of === asOf);
  const targetVector = vector(origin);
  if (!origin || origin.status !== 'features_available' || !targetVector || origin.synthetic !== true) throw new Error('Rolling forecast origin unavailable');
  return [1, 5].map(horizon => {
    const training = report.samples.filter(sample => sample.as_of < asOf && vector(sample)).map(sample => {
      const label = sample.labels?.find(item => item.horizon_sessions === horizon);
      return { sample, label, input: vector(sample) };
    }).filter(item => item.label?.status === 'available' && CLASSES.includes(item.label.label) && validTime(item.label.label_available_at) && Date.parse(item.label.label_available_at) <= Date.parse(cutoff) && item.label.target_session < asOf);
    if (training.length < 10 || new Set(training.map(item => item.label.label)).size < 2) throw new Error(`Insufficient rolling training evidence for horizon ${horizon}`);
    const means = KEYS.map((_, index) => training.reduce((sum, item) => sum + item.input[index] / training.length, 0));
    const scales = KEYS.map((_, index) => Math.sqrt(training.reduce((sum, item) => sum + (item.input[index] - means[index]) ** 2 / training.length, 0)) || 1);
    const normalize = input => [1, ...input.map((value, index) => (value - means[index]) / scales[index])];
    const xs = training.map(item => normalize(item.input)), weights = CLASSES.map(() => [0, 0, 0, 0]);
    for (let iteration = 0; iteration < 300; iteration++) {
      const gradient = CLASSES.map(() => [0, 0, 0, 0]);
      xs.forEach((input, rowIndex) => {
        const probabilities = softmax(weights, input), truth = CLASSES.indexOf(training[rowIndex].label.label);
        gradient.forEach((row, classIndex) => input.forEach((value, index) => { row[index] += (probabilities[classIndex] - Number(classIndex === truth)) * value / xs.length; }));
      });
      weights.forEach((row, classIndex) => row.forEach((value, index) => { row[index] -= .05 * (gradient[classIndex][index] + (index ? .01 * value : 0)); }));
    }
    const probabilities = softmax(weights, normalize(targetVector));
    const counts = CLASSES.map(name => training.filter(item => item.label.label === name).length);
    const frequency = counts.map(count => (count + 1) / (training.length + CLASSES.length));
    const latest = [...training].sort((a, b) => a.label.label_available_at.localeCompare(b.label.label_available_at) || a.sample.as_of.localeCompare(b.sample.as_of)).at(-1);
    const persistence = CLASSES.map(name => name === latest.label.label ? .8 : .1);
    const target = origin.labels?.find(item => item.horizon_sessions === horizon);
    if (!target?.target_session || target.target_session <= asOf) throw new Error(`Rolling target session unavailable for horizon ${horizon}`);
    const trainingManifest = training.map(item => [item.sample.as_of, item.label.target_session, item.label.label, item.label.label_available_at, item.input]);
    return { synthetic: true, research_only: true, live: false, market_accuracy_verified: false, provider: origin.provider,
      model_version: 'forecast_softmax_rolling_v1', horizon_sessions: horizon, as_of: asOf, target_session: target.target_session,
      split_hash: artifactHash({ version: 'rolling_cutoff_split_v1', as_of: asOf, cutoff: new Date(cutoff).toISOString(), horizon_sessions: horizon }),
      training_hash: artifactHash(trainingManifest), probabilities: CLASSES.map((name, index) => ({ class: name, value: probabilities[index] })),
      baseline_snapshot: { version: 'forecast_frequency_baseline_v1', fit_cutoff: new Date(cutoff).toISOString(), frequency_probabilities: CLASSES.map((name, index) => ({ class: name, value: frequency[index] })),
        persistence_version: 'forecast_persistence_baseline_v1', persistence_probabilities: CLASSES.map((name, index) => ({ class: name, value: persistence[index] })) },
      issuance: { version: 'forecast_rolling_issuance_v1', status: 'pending', training_samples: training.length, source: 'synthetic_fixture_replay' } };
  });
}
async function materializeRollingForecast({ report, asOf, cutoff, models, env = process.env, now = new Date(), retentionDays = 180 } = {}) {
  if (env.NODE_ENV !== 'development' || env.FORECAST_RESEARCH_PREVIEW === 'false') throw new Error('Rolling forecast is development-only');
  const entries = buildRollingForecastEntries({ report, asOf, cutoff }), counts = { created: 0, existing: 0, legacy_existing: 0 };
  for (const entry of entries) {
    const result = await createForecastSnapshot(models, entry, { now, retentionDays });
    counts[result.status === 'created' ? 'created' : result.status === 'snapshot_legacy_exists' ? 'legacy_existing' : 'existing']++;
  }
  return { status: 'rolling_materialized', synthetic: true, research_only: true, as_of: asOf, cutoff: new Date(cutoff).toISOString(), predictions: entries.length, ...counts };
}
module.exports = { buildRollingForecastEntries, materializeRollingForecast };
