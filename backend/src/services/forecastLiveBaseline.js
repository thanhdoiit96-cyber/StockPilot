'use strict';
const { artifactHash } = require('./forecastArtifact');
const CLASSES = ['declining','balanced','advancing'];

function buildContemporaneousLiveBaseline(currentData, horizon, { minimumOutcomes = 20 } = {}) {
  if (!currentData?.rows?.length || ![1,5].includes(horizon)) throw new Error('Invalid live baseline input');
  const symbols = [...new Set(currentData.rows.map(row => row.instrument?.symbol).filter(Boolean))].sort(), maps = new Map(symbols.map(symbol => [symbol,new Map()]));
  currentData.rows.forEach(row => { const symbol=row.instrument?.symbol, day=String(row.observed_at||'').slice(0,10), close=Number(row.quote?.close); if (maps.has(symbol) && /^\d{4}-\d{2}-\d{2}$/.test(day) && close>0) maps.get(symbol).set(day,close); });
  const sessions=[...new Set(currentData.rows.map(row=>String(row.observed_at||'').slice(0,10)))].filter(day=>symbols.every(symbol=>maps.get(symbol).has(day))).sort();
  const outcomes=[];
  for(let index=0;index+horizon<sessions.length;index+=1){ const origin=sessions[index],target=sessions[index+horizon]; let positive=0; symbols.forEach(symbol=>{ if(maps.get(symbol).get(target)>maps.get(symbol).get(origin)) positive+=1; }); const breadth=positive/symbols.length; outcomes.push({origin,target,breadth,label:breadth<.45?'declining':breadth>.55?'advancing':'balanced'}); }
  if(outcomes.length<minimumOutcomes) throw new Error('Insufficient completed outcomes for live baseline');
  const counts=CLASSES.map(name=>outcomes.filter(item=>item.label===name).length), frequency=counts.map(count=>(count+1)/(outcomes.length+3)), latest=outcomes.at(-1), persistence=CLASSES.map(name=>name===latest.label?.8:.1);
  return { version:'forecast_live_baseline_v1', fit_cutoff:new Date(currentData.fetched_at).toISOString(), horizon_sessions:horizon, classes:CLASSES, smoothing_alpha:1,
    completed_outcomes:outcomes.length, training_from:outcomes[0].origin, training_to:latest.target, training_hash:artifactHash(outcomes),
    frequency_probabilities:CLASSES.map((name,index)=>({class:name,value:frequency[index]})), persistence_version:'forecast_persistence_baseline_v1',
    persistence_source:{origin:latest.origin,target:latest.target,label:latest.label}, persistence_probabilities:CLASSES.map((name,index)=>({class:name,value:persistence[index]})) };
}
module.exports={buildContemporaneousLiveBaseline};
