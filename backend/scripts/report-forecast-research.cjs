'use strict';
const { replayForecastDataset } = require('../src/services/forecastReplay');
const { forecastResearchFixture } = require('../src/services/forecastResearchFixture');
const { readForecastArtifact } = require('../src/services/forecastArtifact');
const { summarizeForecastReport } = require('../src/services/forecastReport');
const args = process.argv.slice(2);
try {
  let report;
  if (args.length === 1 && args[0] === '--fixture') report = replayForecastDataset(forecastResearchFixture());
  else if (args.length === 2 && args[0] === '--input') report = readForecastArtifact(args[1]);
  else throw new Error('Usage: --fixture OR --input <artifact.json>');
  const summary = summarizeForecastReport(report);
  const f2ModelSummary = summary.horizons.map(item => ({
    horizon_sessions: item.horizon_sessions,
    baseline_status: item.status,
    model_status: item.model.status,
    market_accuracy_verified: false,
    research_only: item.model.summary?.research_only ?? true,
    probability_summary: item.model.summary?.probability_summary || null,
    metric_summary: item.model.summary?.metric_summary || null
  }));
  console.log(JSON.stringify({
    status: report.synthetic ? 'synthetic_research_ready' : 'supplied_evidence_research_ready',
    synthetic: report.synthetic,
    research_only: report.research_only,
    market_accuracy_verified: false,
    summary,
    f2_model_summary: f2ModelSummary,
    interpretation: report.synthetic ? 'Synthetic pipeline verification only; these metrics are not market forecasting performance.' : 'Research replay of supplied evidence. Input integrity is not independent validation of provider evidence or model quality.',
    samples: report.samples.map(({ as_of, status, reasons, membership_hash, input_hash, evidence_manifest, excluded, labels }) => ({ as_of, status, reasons, membership_hash, input_hash, evidence_manifest, excluded, labels })),
    ...report
  }, null, 2));
} catch (error) {
  console.error('Forecast research report failed:', error.code || error.message);
  process.exitCode = 2;
}
