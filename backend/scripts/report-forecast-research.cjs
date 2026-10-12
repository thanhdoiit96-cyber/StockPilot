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
  console.log(JSON.stringify({ ...report, summary: summarizeForecastReport(report), samples: report.samples.map(({ as_of, status, reasons, membership_hash, input_hash, evidence_manifest, excluded, labels }) => ({ as_of, status, reasons, membership_hash, input_hash, evidence_manifest, excluded, labels })),
    interpretation: report.synthetic ? 'Synthetic pipeline verification only; these metrics are not market forecasting performance.' : 'Research replay of supplied evidence. Input integrity is not independent validation of provider evidence or model quality.' }, null, 2));
} catch (error) {
  console.error('Forecast research report failed:', error.code || error.message);
  process.exitCode = 2;
}
