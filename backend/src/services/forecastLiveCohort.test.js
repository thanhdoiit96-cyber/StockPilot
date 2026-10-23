const { artifactHash } = require('./forecastArtifact');
const { buildLiveCohortSummary } = require('./forecastLiveCohort');
const row = (outcome = null) => { const payload = { version:'forecast_live_shadow_payload_v1', probabilities:[{class:'declining',value:.2},{class:'balanced',value:.3},{class:'advancing',value:.5}] }; const stored={ id:'1',provider:'vnstock',horizon_sessions:5,as_of:'2026-10-13',synthetic:false,research_only:false,payload,payload_sha256:artifactHash(payload),outcome }; return stored; };
test('keeps current-data scoring closed below the measured sample gate', () => expect(buildLiveCohortSummary([row()], { horizon:5, minimumSamples:20 })).toMatchObject({ status:'live_cohort',synthetic:false,predictions:1,measured:0,pending:1,score_gate:{status:'insufficient_samples',samples:0,minimum_samples:20},model_scores:null }));

test('hashed but malformed historical baselines cannot unlock scores', () => {
  const rows = Array.from({ length: 20 }, () => {
    const stored = row();
    stored.payload.version = 'forecast_live_shadow_payload_v2';
    stored.payload.baseline_snapshot = { version: 'forecast_live_baseline_v1' };
    stored.payload_sha256 = artifactHash(stored.payload);
    const payload = { snapshot_sha256: stored.payload_sha256, actual_class: 'advancing' };
    stored.outcome = { payload, payload_sha256: artifactHash(payload) };
    return stored;
  });
  expect(buildLiveCohortSummary(rows, { horizon: 5 })).toMatchObject({ measured: 20, baseline_eligible_measured: 0, baseline_ineligible_measured: 20, model_scores: null, score_gate: { status: 'awaiting_baseline' } });
});

test('partitions legacy and versioned input contracts without pooled scores', () => {
  const legacy = row(), current = row();
  current.payload = { ...current.payload, provenance: { input_contract_version: 'vn_observation_dates_v3' } };
  current.payload_sha256 = artifactHash(current.payload);
  const result = buildLiveCohortSummary([legacy, current], { horizon: 5 });
  expect(result.score_gate.status).toBe('mixed_cohorts');
  expect(result.model_scores).toBeNull();
  expect(result.cohorts).toHaveLength(2);
  expect(result.cohorts.map(item => item.cohort_identity[2])).toEqual(['legacy_unspecified', 'vn_observation_dates_v3']);
  expect(result.cohorts.map(item => item.predictions)).toEqual([1, 1]);
});
test('keeps scores closed when 20 outcomes exist without sealed contemporaneous baselines', () => { const rows=Array.from({length:20},(_,i)=>{ const base=row(); const payload={version:'forecast_live_outcome_payload_v1',snapshot_sha256:base.payload_sha256,actual_class:'advancing'}; return {...base,id:String(i),outcome:{payload,payload_sha256:artifactHash(payload)}}; }); const result=buildLiveCohortSummary(rows,{horizon:5,minimumSamples:20}); expect(result).toMatchObject({measured:20,baseline_eligible_measured:0,score_gate:{status:'awaiting_baseline'},model_scores:null}); });
