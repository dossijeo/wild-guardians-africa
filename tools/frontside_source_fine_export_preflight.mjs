// CPU-only construction and private-server JSON transport. No renderer/GPU.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createSourceFineReport} from './lib/frontside-source-fine-report-data.mjs';
import {createQaResourceScope} from './lib/frontside-qa-resource-scope.mjs';
import {sourceFineReportPrefix} from './lib/frontside-source-fine-report.mjs';
const folder='docs/qa/frontside-model-pilot/';
const metadata=JSON.parse(fs.readFileSync(folder+'maize-mature-supported-field-tables.json'));
const source=JSON.parse(fs.readFileSync('public/content/models.json')).find(m=>m.source.includes('Cultivos')).url;
const mappingRecord=JSON.parse(fs.readFileSync('content/manifests/web-assets.json')).records.find(r=>r.source===metadata.source);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const byteEvidence={source:sha(fs.readFileSync('public/'+mappingRecord.source)),runtime:sha(fs.readFileSync('public/'+mappingRecord.runtime))};
if(byteEvidence.source!==mappingRecord.sourceSha256||byteEvidence.runtime!==mappingRecord.runtimeSha256)throw Error('Real source/runtime bytes mismatch');
const servedManifest=await fetch('http://127.0.0.1:5284/content/models.json').then(r=>r.json());
const servedSource=servedManifest.find(m=>m.source.includes('Cultivos')).url;
const results=[];
for(const observedSource of [source,servedSource]){
 const scope=createQaResourceScope();scope.defer('CPU preflight placeholder owner',()=>{});
 const report=createSourceFineReport({source:observedSource,mappingRecord,metadata,sample:{growth:1,clock:1.75,biome:'sabana',night:0,elevation:32.5,azimuth:26.25},cpuCampaigns:'CPU_EXPORT_PREFLIGHT_NO_DRAWS',contextAttributes:null});
 report.controls=[{preflightPlaceholder:true},{preflightPlaceholder:true},{preflightPlaceholder:true}];report.comparisons=[1,2,3].map(arm=>({arm,preflightPlaceholder:true}));report.cleanup=scope.cleanup();report.contextLost=true;
 const encoded=JSON.stringify({status:'SOURCE_FINE_EXPORT_PREFLIGHT_ONLY',gpuDraws:0,report}),decoded=JSON.parse(encoded);
 const prefix=sourceFineReportPrefix(decoded.report);
 const response=await fetch('http://127.0.0.1:5284/__frontside_export_preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:encoded});
 results.push({source:observedSource,sourceOriginal:report.sourceOriginal,runtimeSource:report.runtimeSource,sourceMapping:report.sourceMapping,prefix,httpStatus:response.status,response:await response.text(),bodyBytes:Buffer.byteLength(encoded)});
}
const result={status:results.every(r=>r.httpStatus===200)?'CPU_EXPORT_PREFLIGHT_PASS_NOT_NATIVE':'CPU_EXPORT_PREFLIGHT_FAILED_NOT_NATIVE',gpuDraws:0,byteEvidence,results,payloadSha256:metadata.payloadSha256,limitations:['Placeholder fields contain no native observation or metric.','827 mismatch is observed; lost825 payload remains unrecovered, so same cause there is only probable.','No quality artifact is written by the preflight endpoint.']};
fs.writeFileSync(folder+'crop-source-fine-export-preflight.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(!results.every(r=>r.httpStatus===200))process.exitCode=1;
