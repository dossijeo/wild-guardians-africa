// CPU-only construction and private-server JSON transport. No renderer/GPU.
import fs from 'node:fs';
import {createSourceFineReport} from './lib/frontside-source-fine-report-data.mjs';
import {createQaResourceScope} from './lib/frontside-qa-resource-scope.mjs';
import {sourceFineReportPrefix} from './lib/frontside-source-fine-report.mjs';
const folder='docs/qa/frontside-model-pilot/';
const metadata=JSON.parse(fs.readFileSync(folder+'maize-mature-supported-field-tables.json'));
const source=JSON.parse(fs.readFileSync('public/content/models.json')).find(m=>m.source.includes('Cultivos')).url;
const scope=createQaResourceScope();scope.defer('CPU preflight placeholder owner',()=>{});
const report=createSourceFineReport({source,metadata,sample:{growth:1,clock:1.75,biome:'sabana',night:0,elevation:32.5,azimuth:26.25},cpuCampaigns:'CPU_EXPORT_PREFLIGHT_NO_DRAWS',contextAttributes:null});
// Dynamic fields explicitly contain placeholders, without pixel metrics.
report.controls=[{preflightPlaceholder:true},{preflightPlaceholder:true},{preflightPlaceholder:true}];report.comparisons=[1,2,3].map(arm=>({arm,preflightPlaceholder:true}));report.cleanup=scope.cleanup();report.contextLost=true;
const encoded=JSON.stringify({status:'SOURCE_FINE_EXPORT_PREFLIGHT_ONLY',gpuDraws:0,report}),decoded=JSON.parse(encoded);
const prefix=sourceFineReportPrefix(decoded.report);
const response=await fetch('http://127.0.0.1:5284/__frontside_export_preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:encoded});
const text=await response.text(),result={status:response.ok?'CPU_EXPORT_PREFLIGHT_PASS_NOT_NATIVE':'CPU_EXPORT_PREFLIGHT_FAILED_NOT_NATIVE',gpuDraws:0,prefix,httpStatus:response.status,response:text,bodyBytes:Buffer.byteLength(encoded),source,payloadSha256:metadata.payloadSha256,limitations:['Placeholder controls/comparisons/context flag contain no native observation or metric.','The lost825 POST is not reconstructed; cause remains unknown until an actual rejected request is retained.','No quality artifact is written by the preflight endpoint.']};
fs.writeFileSync(folder+'crop-source-fine-export-preflight.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(!response.ok)process.exitCode=1;
