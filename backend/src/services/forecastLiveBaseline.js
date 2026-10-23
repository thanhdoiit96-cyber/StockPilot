'use strict';
const { artifactHash } = require('./forecastArtifact');
const { classifyBreadth } = require('./forecastBreadth');
const CLASSES = ['declining','balanced','advancing'];

function buildContemporaneousLiveBaseline(currentData, horizon, { minimumOutcomes = 20, inputScope } = {}) {
  if (!currentData?.rows?.length || ![1,5].includes(horizon)) throw new Error('Invalid live baseline input');
  let policy;
  if (inputScope) {
    const symbols = inputScope.used_symbols;
    const cutoff = inputScope.as_of_date, issued = Date.parse(currentData.fetched_at);
    if (inputScope.contract_version !== 'vn_observation_dates_v3' || !Array.isArray(symbols) || !symbols.length || new Set(symbols).size !== symbols.length || !/^\d{4}-\d{2}-\d{2}$/.test(cutoff || '') || !Number.isFinite(issued)) throw new Error('Invalid live baseline scope');
    const seen = new Map();
    const selected = currentData.rows.filter(row => symbols.includes(row.instrument?.symbol)).map(row => {
      const observed = Date.parse(row.observed_at), fetched = Date.parse(row.fetched_at);
      const shifted = observed + 7 * 3600000;
      if (!Number.isFinite(shifted) || Math.abs(shifted) > 8640000000000000 || !Number.isFinite(fetched)) throw new Error('Invalid live baseline availability');
      const day = new Date(shifted).toISOString().slice(0, 10), close = Number(row.quote?.close);
      if (day > cutoff || fetched > issued || fetched < Math.max(observed, Date.parse(`${day}T15:00:00+07:00`))) throw new Error('Invalid live baseline availability');
      if (!Number.isFinite(close) || close <= 0) throw new Error('Invalid live baseline price');
      const key = `${row.instrument.symbol}:${day}`;
      if (seen.has(key) && seen.get(key) !== close) throw new Error('Conflicting live baseline prices');
      seen.set(key, close);
      return { ...row, observed_at: `${day}T00:00:00Z` };
    });
    if (symbols.some(symbol => !seen.has(`${symbol}:${cutoff}`))) throw new Error('Incomplete live baseline scope');
    currentData = { ...currentData, rows: selected };
    policy = { input_contract_version: inputScope.contract_version, symbols: [...symbols].sort(), as_of_date: cutoff, availability_policy: 'fetched_after_close_before_issuance_v1' };
  }
  const symbols = [...new Set(currentData.rows.map(row => row.instrument?.symbol).filter(Boolean))].sort(), maps = new Map(symbols.map(symbol => [symbol,new Map()]));
  currentData.rows.forEach(row => { const symbol=row.instrument?.symbol, day=String(row.observed_at||'').slice(0,10), close=Number(row.quote?.close); if (maps.has(symbol) && /^\d{4}-\d{2}-\d{2}$/.test(day) && close>0) maps.get(symbol).set(day,close); });
  const sessions=[...new Set(currentData.rows.map(row=>String(row.observed_at||'').slice(0,10)))].filter(day=>symbols.every(symbol=>maps.get(symbol).has(day))).sort();
  const outcomes=[];
  for(let index=0;index+horizon<sessions.length;index+=1){ const origin=sessions[index],target=sessions[index+horizon]; let positive=0; symbols.forEach(symbol=>{ if(maps.get(symbol).get(target)>maps.get(symbol).get(origin)) positive+=1; }); const breadth=positive/symbols.length; outcomes.push({origin,target,breadth,label:classifyBreadth(breadth)}); }
  if(outcomes.length<minimumOutcomes) throw new Error('Insufficient completed outcomes for live baseline');
  const counts=CLASSES.map(name=>outcomes.filter(item=>item.label===name).length), frequency=counts.map(count=>(count+1)/(outcomes.length+3)), latest=outcomes.at(-1), persistence=CLASSES.map(name=>name===latest.label?.8:.1);
  return { version:'forecast_live_baseline_v1', ...(policy ? { input_policy: policy } : {}), fit_cutoff:new Date(currentData.fetched_at).toISOString(), horizon_sessions:horizon, classes:CLASSES, smoothing_alpha:1,
    completed_outcomes:outcomes.length, training_from:outcomes[0].origin, training_to:latest.target, training_hash:artifactHash(outcomes),
    frequency_probabilities:CLASSES.map((name,index)=>({class:name,value:frequency[index]})), persistence_version:'forecast_persistence_baseline_v1',
    persistence_source:{origin:latest.origin,target:latest.target,label:latest.label}, persistence_probabilities:CLASSES.map((name,index)=>({class:name,value:persistence[index]})) };
}
module.exports={buildContemporaneousLiveBaseline};
