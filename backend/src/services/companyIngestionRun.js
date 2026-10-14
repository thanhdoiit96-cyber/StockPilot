'use strict';
const EXPANSION_MIN_SCHEDULED_RUNS=3;
const EXPANSION_SCOPES=['people','capital','financials','news'];
function parseScopes(value='profile'){if(value===undefined||value===null||String(value).trim()==='')return['profile'];return String(value).split(',').map(scope=>scope.trim().toLowerCase()).filter(Boolean).filter((scope,index,all)=>all.indexOf(scope)===index)}
function runStatus(report){if(report.failed||report.circuit_open)return report.valid?'partial':'failed';if(report.valid===0)return'partial';return'completed'}
async function saveCompanyIngestionRun({CompanyDataIngestionRun,report,startedAt,completedAt=new Date(),trigger='manual'}){return CompanyDataIngestionRun.create({trigger,status:runStatus(report),symbols:report.requested_symbols,datasets:report.scopes,valid_count:report.valid,stored_count:report.stored,skipped_count:report.skipped,failed_count:report.failed,circuit_open:Boolean(report.circuit_open),duration_ms:report.duration_ms,report,started_at:startedAt,completed_at:completedAt})}
function summarizeCompanyRuns(rows){const runs=rows.map(row=>row.toJSON?row.toJSON():row);const completed=runs.filter(row=>row.status==='completed').length,partial=runs.filter(row=>row.status==='partial').length,failed=runs.filter(row=>row.status==='failed').length;const scheduled=runs.filter(row=>row.trigger==='scheduled');const scheduledCompleted=scheduled.filter(row=>row.status==='completed'&&!row.circuit_open).length;const expansionReady=scheduled.length>=EXPANSION_MIN_SCHEDULED_RUNS&&scheduledCompleted===scheduled.length;return{sample_size:runs.length,completed,partial,failed,stable_rate_pct:runs.length?Number((completed/runs.length*100).toFixed(1)):null,circuit_open_runs:runs.filter(row=>row.circuit_open).length,latest_completed_at:runs[0]?.completed_at||null,expansion_gate:{status:expansionReady?'ready':'blocked',minimum_scheduled_runs:EXPANSION_MIN_SCHEDULED_RUNS,scheduled_runs:scheduled.length,scheduled_completed:scheduledCompleted,reason:expansionReady?null:'requires_three_completed_scheduled_runs_without_circuit_open'}}}
async function readCompanyExpansionGate({
  CompanyDataIngestionRun,
  requiredScopes = EXPANSION_SCOPES,
  currentScopes = process.env.COMPANY_DATA_SCOPES || 'profile',
  limit = 30
} = {}) {
  const normalizedScopes = parseScopes(currentScopes);
  const requestedScopes = normalizedScopes.length ? normalizedScopes : ['profile'];
  const defaultRequired = requiredScopes || EXPANSION_SCOPES;

  if (!CompanyDataIngestionRun || typeof CompanyDataIngestionRun.findAll !== 'function') {
    return {
      allowed: false,
      required_scopes: defaultRequired,
      current_scopes: requestedScopes,
      summary: {
        expansion_gate: {
          status: 'blocked',
          minimum_scheduled_runs: EXPANSION_MIN_SCHEDULED_RUNS,
          scheduled_runs: 0,
          scheduled_completed: 0,
          reason: 'company_ingestion_run_model_unavailable'
        }
      },
      reason: 'company_ingestion_run_model_unavailable'
    };
  }

  const recentRuns = await CompanyDataIngestionRun.findAll({
    where: { trigger: 'scheduled' },
    order: [['completed_at', 'DESC']],
    limit
  });

  const summary = summarizeCompanyRuns(recentRuns);
  const gate = summary.expansion_gate || {};
  const allowed = gate.status === 'ready';

  return {
    allowed,
    required_scopes: defaultRequired,
    current_scopes: requestedScopes,
    summary,
    reason: gate.reason || null
  };
}
module.exports={EXPANSION_MIN_SCHEDULED_RUNS,EXPANSION_SCOPES,parseScopes,runStatus,saveCompanyIngestionRun,summarizeCompanyRuns,readCompanyExpansionGate};
