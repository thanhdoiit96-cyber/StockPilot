'use strict';
const bounded=(value,fallback,min,max)=>{const parsed=Number(value);return Number.isFinite(parsed)?Math.min(max,Math.max(min,Math.floor(parsed))):fallback};
function companyIngestionLimits(env=process.env){return{request_delay_ms:bounded(env.COMPANY_DATA_REQUEST_DELAY_MS,750,0,60000),failure_cooldown_ms:bounded(env.COMPANY_DATA_FAILURE_COOLDOWN_MS,10000,0,120000),max_consecutive_failures:bounded(env.COMPANY_DATA_MAX_CONSECUTIVE_FAILURES,2,1,10)}}
const wait=ms=>ms>0?new Promise(resolve=>setTimeout(resolve,ms)):Promise.resolve();
module.exports={companyIngestionLimits,wait};
