'use strict';
const { forecastRegimeRankingFixture } = require('../src/services/forecastRegimeRankingFixture');
const { replayForecastDataset } = require('../src/services/forecastReplay');
const { evaluateRegimeAwareRanking } = require('../src/services/forecastRegimeRanking');
try {
  const input = forecastRegimeRankingFixture();
  const report = replayForecastDataset(input);
  const result = evaluateRegimeAwareRanking({ report, rows: input.rows, horizon: Number(process.env.FORECAST_RANKING_HORIZON || 5), topK: Number(process.env.FORECAST_RANKING_TOP_K || 5) });
  const { sessions, ...summary } = result;
  console.log(JSON.stringify({ ...summary, session_manifest: sessions?.map(item => ({ session: item.session, target_session: item.target_session, baseline_symbols: item.baseline_symbols, regime_symbols: item.regime_symbols })) || [] }, null, 2));
} catch (error) {
  console.error('Forecast regime ranking report failed:', error.message);
  process.exitCode = 2;
}
