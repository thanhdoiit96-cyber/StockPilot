'use strict';
const crypto=require('node:crypto');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const hashPayload=payload=>{const content=structuredClone(payload);if(content?.provenance)delete content.provenance.fetched_at;return crypto.createHash('sha256').update(JSON.stringify(stable(content))).digest('hex')};
async function saveCompanySnapshot({CompanyDataSnapshot,stockId,dataset,data}){if(!data||!['available','partial'].includes(data.status)||!data.provenance?.provider)return{stored:false,reason:'no_valid_provider_data'};const source_hash=hashPayload(data);const [row,created]=await CompanyDataSnapshot.findOrCreate({where:{stock_id:stockId,dataset,provider:data.provenance.provider,source_hash},defaults:{schema_version:data.version,status:data.status,payload:data,source_hash,fetched_at:data.provenance.fetched_at||new Date()}});return{stored:created,id:row.id,source_hash}}
async function readLatestCompanySnapshot({CompanyDataSnapshot,stockId,dataset}){const row=await CompanyDataSnapshot.findOne({where:{stock_id:stockId,dataset},order:[['fetched_at','DESC'],['created_at','DESC'],['id','DESC']]});return row?.payload||null}
module.exports={hashPayload,saveCompanySnapshot,readLatestCompanySnapshot};
