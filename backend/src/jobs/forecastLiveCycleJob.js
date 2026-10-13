'use strict';
const cron=require('node-cron');
const { spawn }=require('child_process');
const path=require('path');
function runScript(script){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.resolve(__dirname,'../../scripts',script)],{cwd:path.resolve(__dirname,'../..'),env:{...process.env,NODE_ENV:'development',FORECAST_LIVE_PREVIEW:'true'},stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',chunk=>{out+=chunk});child.stderr.on('data',chunk=>{err+=chunk});child.on('error',reject);child.on('close',code=>code===0?resolve(out.trim()):reject(new Error(`${script} exited ${code}: ${err.trim()}`)));});}
async function runForecastLiveCycle(run=runScript){const materialized=await run('materialize-forecast-live-shadow.cjs');const evaluated=await run('evaluate-forecast-live-shadow.cjs');return{status:'completed',materialized,evaluated};}
function startForecastLiveCycleJob({logger=console,schedule=process.env.FORECAST_LIVE_CYCLE_CRON||'30 16 * * 1-5',run=runScript}={}){if(process.env.NODE_ENV!=='development'||process.env.FORECAST_LIVE_CYCLE_ENABLED!=='true')return null;return cron.schedule(schedule,async()=>{try{const report=await runForecastLiveCycle(run);logger.info(`[Forecast live cycle] ${JSON.stringify(report)}`);}catch(error){logger.error(`[Forecast live cycle] ${error.stack||error.message}`);}}, {timezone:process.env.FORECAST_LIVE_CYCLE_TIMEZONE||'Asia/Ho_Chi_Minh'});}
module.exports={startForecastLiveCycleJob,runForecastLiveCycle};
