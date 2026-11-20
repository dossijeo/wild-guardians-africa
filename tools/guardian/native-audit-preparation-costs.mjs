import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
const STAGES=['start','validate-operations','references','dependencies-wait','dependencies-ready','snapshot','classify-ownership','replay-analysis','pipeline-identities','initialize-uploads','pin-and-publish-pending','first-use-encode','first-use-submit','first-use-wait','ready'];

// Stage spans are elapsed wall time. Only the Chrome trace can establish CPU
// time; dependency and fence spans explicitly include asynchronous waiting.
export function summarizePreparationCosts(receipt){
 const stages=new Map();
 const visit=o=>{if(!o||typeof o!=='object')return;
  if(Array.isArray(o.qaPreparationStages))for(const s of o.qaPreparationStages){
   if(!Number.isSafeInteger(s.sequence)||!Number.isFinite(s.at)||!STAGES.includes(s.stage))throw Error('Invalid preparation mark');
   const key=s.sequence+':'+s.stage,previous=stages.get(key);
   if(previous&&previous.at!==s.at)throw Error('Conflicting preparation marks');stages.set(key,s);
  }
  for(const value of Object.values(o))if(value&&typeof value==='object')visit(value);
 };visit(receipt.result??receipt.failure);
 if(!stages.size)throw Error('No preparation marks; enable QA_NATIVE_PREPARATION_TRACE');
 const sequences=[...new Set([...stages.values()].map(s=>s.sequence))].map(sequence=>{
  const marks=[...stages.values()].filter(s=>s.sequence===sequence).sort((a,b)=>a.at-b.at);
  if(marks.some((s,i)=>i&&STAGES.indexOf(s.stage)<=STAGES.indexOf(marks[i-1].stage)))throw Error('Out-of-order preparation marks');
  return {sequence,complete:marks.length===STAGES.length,marks,
   spans:marks.slice(1).map((mark,i)=>({stage:marks[i].stage,through:mark.stage,milliseconds:mark.at-marks[i].at,
    adjacent:STAGES.indexOf(mark.stage)===STAGES.indexOf(marks[i].stage)+1,
    includesAsyncWait:STAGES.slice(STAGES.indexOf(marks[i].stage),STAGES.indexOf(mark.stage)).some(stage=>['dependencies-wait','first-use-wait'].includes(stage))}))};
 });
 return {version:1,runOutcome:receipt.error?'failed':'receipt-present-not-revalidated',error:receipt.error??null,sequences,
  limitation:'Phase observations do not certify the functional run. Elapsed time is not CPU time; an incomplete sequence is not READY. Snapshot span also includes clock admission; upload span includes camera selection. No acceptance threshold is relaxed.'};
}

// QA response annotations only. No yield, reordered operation, extra GPU call,
// permission, resource alias, readiness acknowledgement or replacement owner.
export function rewritePreparationCosts(source){
 const replace=(from,to)=>{if(source.split(from).length!==2)throw Error('Preparation observation seam changed: '+from);source=source.replace(from,to);};
 replace('  function resourceJob(type,stage,run){','  metrics.qaPreparationStages=[];\n  function resourceJob(type,stage,run){');
 replace("        const preparing=message.type==='prepare-world-frame';",`        const preparing=message.type==='prepare-world-frame';
        const qaStage=stage=>{if(!preparing)return;const at=absoluteNow();metrics.qaPreparationStages.push({sequence:message.packet.sequence,stage,at,operations:message.packet.operations?.length??null});performance.mark('native-preparation:'+message.packet.sequence+':'+stage);};qaStage('start');`);
 const before=[
  ['        validateOperations(packet.operations);','validate-operations'],
  ['        packet.references = references(packet.operations);','references'],
  ['        if (readiness) await Promise.race([readiness,cancelled]);','dependencies-wait'],
  ['        packet.transportTiming.resourcesReadyAt = absoluteNow();','dependencies-ready'],
  ['        packet.resourceSnapshot = snapshotResources(packet.references);','snapshot'],
  ['        classifyBufferOwnership(packet);','classify-ownership'],
  ['        const writeCounts = new Map();','replay-analysis'],
  ['        packet.drawnPipelines=remoteDrawPipelineEntries(packet.operations,packet.resourceSnapshot,{strict:preparing});','pipeline-identities'],
  ['          initializePreparedWorldFrame(packet);','initialize-uploads'],
  ['        pinSnapshot(packet.resourceSnapshot);','pin-and-publish-pending'],
  ['            firstUse=prepareRemoteFirstUse({device,packet,canvasConfiguration,resolve});','first-use-encode'],
  ['            if(firstUse.buffers.length){device.queue.submit(firstUse.buffers);submitted=true;metrics.firstUseSubmissions++;}','first-use-submit'],
  ['          const firstUseComplete=Promise.all([device.queue.onSubmittedWorkDone(),validation,...firstUse.waiting]).then(([,error])=>{','first-use-wait'],
  ['          packet.preparedUploadsComplete=true;','ready'],
 ];
 for(const [anchor,stage]of before)replace(anchor,`        qaStage('${stage}');\n`+anchor);
 return source;
}

export async function observePreparationCosts(page,overrides){
 const sha=value=>createHash('sha256').update(value).digest('hex');
 await page.context().route('**/src/rendering/remote-webgpu-host.js*',async route=>{
  const response=await route.fetch(),body=await response.text(),annotated=rewritePreparationCosts(body);
  overrides.push({file:'remote-webgpu-host.js',url:route.request().url(),originalSha256:sha(body),annotatedSha256:sha(annotated),scope:'Optional QA preparation phase marks on existing Host; no scheduling or GPU changes. Dependency/fence spans include asynchronous waiting.'});
  await route.fulfill({response,body:annotated});
 });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node native-audit-preparation-costs.mjs receipt.json[.gz] output.json');
 const bytes=readFileSync(input),receipt=JSON.parse(input.endsWith('.gz')?gunzipSync(bytes):bytes);
 const report=summarizePreparationCosts(receipt);report.input={path:input,sha256:createHash('sha256').update(bytes).digest('hex')};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,runOutcome:report.runOutcome,sequences:report.sequences.length}));
}
