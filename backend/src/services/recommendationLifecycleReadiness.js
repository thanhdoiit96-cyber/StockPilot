'use strict';

function lifecycleReadiness({ expectedSession, latestEodSession, run, integrity } = {}) {
  const sessionContext = { expected_session: expectedSession || null, latest_eod_session: latestEodSession || null };
  const runContext = run ? { run_id: run.id, as_of: run.as_of, horizon_days: Number.isFinite(Number(run.horizon_days)) ? Number(run.horizon_days) : null } : null;
  if (!expectedSession || latestEodSession !== expectedSession) return {
    ...sessionContext, status: 'awaiting_eod',
    can_generate: false, can_evaluate: false,
  };
  if (!run) return { ...sessionContext, status: 'ready_to_generate', can_generate: true, can_evaluate: false };
  if (!run.snapshot_sha256) return { ...sessionContext, ...runContext, status: 'snapshot_missing_hash', can_generate: false, can_evaluate: false };
  if (!integrity?.valid) return { ...sessionContext, ...runContext, status: 'snapshot_integrity_failed', can_generate: false, can_evaluate: false };
  return { ...sessionContext, ...runContext, status: 'ready_to_evaluate', can_generate: false, can_evaluate: true };
}

module.exports = { lifecycleReadiness };
