import {createHash} from 'node:crypto';

// Optional metadata on the existing audit's served modules. Do not wrap GPU
// descriptors/promises or change scheduling: observe the original job and ID.
export async function observeNativePipelineTimings(page,overrides){
 const sha=value=>createHash('sha256').update(value).digest('hex');
 const replace=(body,from,to)=>{if(body.split(from).length!==2)throw Error('Pipeline timing observation seam changed: '+from);return body.replace(from,to);};
 for(const [file,pattern,transform]of [
  ['native-worker-world-audit-worker.js','**/tests/browser/fixtures/native-worker-world-audit-worker.js*',body=>{
   body=replace(body,'scope:allocationScope,stages:','afterFactoryAt:performance.timeOrigin+performance.now(),scope:allocationScope,stages:');
   body=replace(body,"if(name==='createShaderModule'){record.sameSourceAs=","if(name==='createShaderModule'){record.source=descriptor.code;record.sameSourceAs=");
   return replace(body,'record.reference=object?.__remoteGpuId??null;','record.reference=object?.__remoteGpuId??null;record.resolvedAt=performance.timeOrigin+performance.now();');
  }],
  ['remote-webgpu-host.js','**/src/rendering/remote-webgpu-host.js*',body=>{
   body=replace(body,'  function resourceJob(type,stage,run){','  metrics.qaPipelineTimings=[];\n  function resourceJob(type,stage,run){');
   body=replace(body,'    setResource(message.id, entry);',`    setResource(message.id, entry);
    const qaPipelineTiming=/^create(?:Render|Compute)Pipeline(?:Async)?$/.test(entry.kind)?{id:message.id,method:entry.kind,receivedAt:absoluteNow(),descriptor:structuredClone(message.descriptor),startedAt:null,returnedAt:null,finishedAt:null,status:'waiting'}:null;
    if(qaPipelineTiming)metrics.qaPipelineTimings.push(qaPipelineTiming);`);
   body=replace(body,'    const failedJob = error => {',`    const failedJob = error => {
      if(qaPipelineTiming){qaPipelineTiming.finishedAt=absoluteNow();qaPipelineTiming.status='rejected';qaPipelineTiming.error=String(error);performance.mark('native-pipeline-rejected:'+message.id);}`);
   body=replace(body,'    const finished = value => {',`    const finished = value => {
      if(qaPipelineTiming){qaPipelineTiming.finishedAt=absoluteNow();qaPipelineTiming.status='native-resolved';performance.mark('native-pipeline-resolved:'+message.id);}`);
   return replace(body,"        const result = resourceJob(entry.kind,'build',build);",`        if(qaPipelineTiming){qaPipelineTiming.startedAt=absoluteNow();qaPipelineTiming.status='building';performance.mark('native-pipeline-build:'+message.id);}
        const result = resourceJob(entry.kind,'build',build);
        if(qaPipelineTiming){qaPipelineTiming.returnedAt=absoluteNow();qaPipelineTiming.status='native-pending';}`);
  }],
 ])await page.context().route(pattern,async route=>{const response=await route.fetch(),body=await response.text(),annotated=transform(body);overrides.push({file,url:route.request().url(),originalSha256:sha(body),annotatedSha256:sha(annotated),scope:'Optional QA pipeline timings and original encoded descriptor/WGSL identity only; original scheduling, arguments, promises, IDs and admission remain unchanged.'});await route.fulfill({response,body:annotated});});
}
