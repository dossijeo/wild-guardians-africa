import {createSourceFineReport} from '../../tools/lib/frontside-source-fine-report-data.mjs';
import {sourceFineReportPrefix} from '../../tools/lib/frontside-source-fine-report.mjs';
const status=document.querySelector('#status');
try{
 const [manifest,metadata]=await Promise.all([fetch('/content/models.json').then(r=>r.json()),fetch('/docs/qa/frontside-model-pilot/maize-mature-supported-field-tables.json').then(r=>r.json())]);
 const source=manifest.find(m=>m.source.includes('Cultivos')).url;
 const report=createSourceFineReport({source,metadata,sample:{growth:1,clock:1.75,biome:'sabana',night:0,elevation:32.5,azimuth:26.25},cpuCampaigns:'BROWSER_EXPORT_PREFLIGHT_NO_GPU',contextAttributes:null});
 report.controls=[{preflightPlaceholder:true},{preflightPlaceholder:true},{preflightPlaceholder:true}];report.comparisons=[1,2,3].map(arm=>({arm,preflightPlaceholder:true}));report.cleanup={closed:true,disposed:[],errors:[],preflightPlaceholder:true};report.contextLost=true;
 const decoded=JSON.parse(JSON.stringify(report)),prefix=sourceFineReportPrefix(decoded);
 const response=await fetch('/__frontside_export_preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'SOURCE_FINE_EXPORT_PREFLIGHT_ONLY',gpuDraws:0,report:decoded})});
 status.textContent=JSON.stringify({status:response.ok?'BROWSER_EXPORT_PREFLIGHT_PASS_NOT_NATIVE':'BROWSER_EXPORT_PREFLIGHT_FAILED_NOT_NATIVE',gpuContextCreated:false,gpuDraws:0,source,payloadSha256:metadata.payloadSha256,prefix,httpStatus:response.status,serverResponse:await response.text(),limitations:'Placeholders only; no real825 payload, image or visual metric recovered.'},null,2);
}catch(error){status.textContent=error.stack+'\nDetails '+JSON.stringify(error.validationFailures??[]);}
