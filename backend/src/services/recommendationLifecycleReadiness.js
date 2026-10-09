'use strict';

function lifecycleReadiness({ expectedSession, latestEodSession, run, integrity } = {}) {
  if (!expectedSession || latestEodSession !== expectedSession) return {
    status: 'awaiting_eod', expected_session: expectedSession || null, latest_eod_session: latestEodSession || null,
    can_generate: false, can_evaluate: false,
  };
  if (!run) return { status: 'ready_to_generate', expected_session: expectedSession, latest_eod_session: latestEodSession, can_generate: true, can_evaluate: false };
  if (!run.snapshot_sha256) return { status: 'snapshot_missing_hash', run_id: run.id, as_of: run.as_of, can_generate: false, can_evaluate: false };
  if (!integrity?.valid) return { status: 'snapshot_integrity_failed', run_id: run.id, as_of: run.as_of, can_generate: false, can_evaluate: false };
  return { status: 'ready_to_evaluate', run_id: run.id, as_of: run.as_of, can_generate: false, can_evaluate: true };
}

module.exports = { lifecycleReadiness };
