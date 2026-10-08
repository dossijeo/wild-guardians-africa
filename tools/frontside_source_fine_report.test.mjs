import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSourceFineReport} from './lib/frontside-source-fine-report-data.mjs';
import {sourceFineIdentity,sourceFineReportPrefix} from './lib/frontside-source-fine-report.mjs';
const mapping=JSON.parse(fs.readFileSync('content/manifests/web-assets.json')).records.find(r=>r.source===sourceFineIdentity.source);
const metadata=JSON.parse(fs.readFileSync('docs/qa/frontside-model-pilot/maize-mature-supported-field-tables.json'));
const report=()=>({sourceOriginal:mapping.source,runtimeSource:mapping.runtime,sourceMapping:sourceFineIdentity,status:'SOURCE_FINE_FIELD_TRAINING_NOT_APPROVED',viewProfile:'SOURCE_FINE_FIELD_TRAINING_V1',metricPolicyVersion:2,cropVisual:true,source:'/assets/be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef.glb',sourceField:{source:metadata.source,runtime:metadata.runtime,runtimeSha256:metadata.runtimeSha256,sourceSha256:'be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef',payloadSha256:'1046256f5f432fe479e62a563e5bcb38225f6e9f453c1e03e34b48cbdeab9233',mesh:'maiz_05_maduro'},arms:['original DoubleSide','fine original and fallback DoubleSide','same fine source direct field DoubleSide','same fine source grid field DoubleSide'],prospectiveCase:{growth:1,clock:1.75,biome:'sabana',night:0,elevation:32.5,azimuth:26.25},controls:[{},{},{}],comparisons:[{arm:1,passes:false}],cleanup:{closed:true,disposed:[],errors:[]},contextLost:true});
test('fixed field route preserves failed comparisons and invalid control reports',()=>{
 const r=report();assert.equal(sourceFineReportPrefix(r),'crop-source-fine-field-training');assert.equal(r.comparisons[0].passes,false);
 r.invalidControl=true;r.comparisons=[];assert.equal(sourceFineReportPrefix(r),'crop-source-fine-field-training');assert.equal(r.invalidControl,true);
});
test('different profile, policy, source, payload or training pose is rejected',()=>{
 const mutate=[r=>r.status='APPROVED',r=>r.viewProfile='SOURCE_FINE_FIELD_V2',r=>r.metricPolicyVersion=3,r=>r.source+='?different',r=>r.sourceField.payloadSha256='0'.repeat(64),r=>r.prospectiveCase.clock=2,r=>r.cleanup.closed=false];
 for(const change of mutate){const r=report();change(r);assert.throws(()=>sourceFineReportPrefix(r),error=>error.message.includes('Unexpected')&&Array.isArray(error.validationFailures)&&error.validationFailures.length>0);}
});

test('real original and web manifest URLs share explicit mapping without conflating hashes',()=>{
 for(const source of ['/'+mapping.source,mapping.runtime]){
  const r=createSourceFineReport({source,mappingRecord:mapping,metadata,sample:report().prospectiveCase});
  Object.assign(r,{controls:[{},{},{}],cleanup:{closed:true,disposed:[],errors:[]},contextLost:true});
  assert.equal(sourceFineReportPrefix(JSON.parse(JSON.stringify(r))),'crop-source-fine-field-training');
  assert.equal(r.source,source);assert.equal(r.sourceOriginal,mapping.source);assert.equal(r.runtimeSource,mapping.runtime);assert.notEqual(r.sourceMapping.sourceSha256,r.sourceMapping.runtimeSha256);
 }
 for(const change of [r=>r.runtimeSource='assets/web/other.glb',r=>r.sourceMapping={...r.sourceMapping,runtimeSha256:r.sourceMapping.sourceSha256},r=>r.sourceField={...r.sourceField,runtimeSha256:r.sourceField.sourceSha256}]){const r=report();change(r);assert.throws(()=>sourceFineReportPrefix(r));}
 assert.throws(()=>createSourceFineReport({source:mapping.runtime,mappingRecord:{...mapping,runtimeSha256:mapping.sourceSha256},metadata}),/mapping mismatch/);
});
