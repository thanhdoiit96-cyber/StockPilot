const { buildContemporaneousLiveBaseline }=require('./forecastLiveBaseline');
const rows=[]; for(let day=1;day<=30;day+=1) for(const symbol of ['FPT','HPG','VHM']) rows.push({instrument:{symbol},observed_at:`2026-09-${String(day).padStart(2,'0')}T00:00:00Z`,quote:{close:100+day+(symbol==='VHM'?-day*.1:day*.1)}});
const data={rows,fetched_at:'2026-09-30T10:00:00Z'};

const scope = { contract_version: 'vn_observation_dates_v3', used_symbols: ['FPT'], as_of_date: '2026-09-30' };
const readyData = () => ({ ...data, rows: rows.map(row => ({ ...row, fetched_at: `${row.observed_at.slice(0, 10)}T09:00:00Z` })) });

test('v3 baseline uses only participating symbols and seals temporal policy', () => {
  const input = readyData();
  input.rows.push({ instrument: { symbol: 'EXCLUDED' }, observed_at: 'invalid' });
  const result = buildContemporaneousLiveBaseline(input, 5, { inputScope: scope });
  expect(result.input_policy).toMatchObject({ symbols: ['FPT'], as_of_date: '2026-09-30', availability_policy: 'fetched_after_close_before_issuance_v1' });
  expect(result.completed_outcomes).toBe(25);
  const clean = buildContemporaneousLiveBaseline({ ...input, rows: input.rows.filter(row => row.instrument.symbol === 'FPT') }, 5);
  expect(result.frequency_probabilities).toEqual(clean.frequency_probabilities);
});

test.each([undefined, 'invalid', '2026-10-01T09:00:00Z', '2026-09-01T07:00:00Z'])('v3 rejects unavailable training evidence (%s)', fetched_at => {
  const input = readyData(); input.rows[0].fetched_at = fetched_at;
  expect(() => buildContemporaneousLiveBaseline(input, 5, { inputScope: scope })).toThrow('availability');
});

test('v3 rejects post-cutoff observations and conflicting prices', () => {
  const input = readyData();
  input.rows.push({ ...input.rows[0], observed_at: '2026-10-01T00:00:00Z' });
  expect(() => buildContemporaneousLiveBaseline(input, 5, { inputScope: scope })).toThrow('availability');
  input.rows.pop(); input.rows.push({ ...input.rows[0], quote: { close: 999 } });
  expect(() => buildContemporaneousLiveBaseline(input, 5, { inputScope: scope })).toThrow('Conflicting');
});
test('seals frequency and persistence only from completed pre-issuance outcomes',()=>{const result=buildContemporaneousLiveBaseline(data,5,{minimumOutcomes:20}); expect(result).toMatchObject({version:'forecast_live_baseline_v1',horizon_sessions:5,completed_outcomes:25,training_to:'2026-09-30'}); expect(result.frequency_probabilities.reduce((sum,item)=>sum+item.value,0)).toBeCloseTo(1); expect(result.training_hash).toMatch(/^[a-f0-9]{64}$/);});
