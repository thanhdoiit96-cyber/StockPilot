'use strict';
const cron=require('node-cron');
const {spawn}=require('node:child_process');
const path=require('node:path');
function runCompanyDataIngestion(){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.resolve(__dirname,'../../scripts/ingest-company-data.cjs')],{cwd:path.resolve(__dirname,'../..'),env:process.env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>{stdout+=chunk});child.stderr.on('data',chunk=>{stderr+=chunk});child.on('error',reject);child.on('close',code=>code===0?resolve(stdout.trim()):reject(new Error(`company data ingestion exited ${code}: ${stderr.trim()||stdout.trim()}`)))})}
function startCompanyDataSnapshotJob({logger=console,run=runCompanyDataIngestion,schedule=process.env.COMPANY_DATA_CRON||'30 18 * * 1-5'}={}){if(process.env.NODE_ENV!=='development'||process.env.COMPANY_DATA_SYNC_ENABLED!=='true')return null;let running=false;return cron.schedule(schedule,async()=>{if(running){logger.warn('[Company data] skipped overlapping run');return}running=true;try{logger.info(`[Company data] ${await run()}`)}catch(error){logger.error(`[Company data] ${error.stack||error.message}`)}finally{running=false}},{timezone:process.env.COMPANY_DATA_TIMEZONE||'Asia/Ho_Chi_Minh'})}
module.exports={startCompanyDataSnapshotJob,runCompanyDataIngestion};
