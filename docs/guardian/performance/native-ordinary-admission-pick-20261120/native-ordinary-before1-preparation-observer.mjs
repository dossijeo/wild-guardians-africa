import {createHash} from 'node:crypto';
import {rewriteMutationCosts} from './native-audit-mutation-costs.mjs';
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
export function rewritePreparationCosts(source,{resources=false,ordinary=false}={}){
 const replace=(from,to)=>{if(source.split(from).length!==2)throw Error('Preparation observation seam changed: '+from);source=source.replace(from,to);};
 replace('  function resourceJob(type,stage,run){','  metrics.qaPreparationStages=[];\n  function resourceJob(type,stage,run){');
 replace("        const preparing=message.type==='prepare-world-frame';",`        const preparing=message.type==='prepare-world-frame';
        const qaStage=stage=>{if(!preparing)return;const at=absoluteNow();metrics.qaPreparationStages.push({sequence:message.packet.sequence,stage,at,operations:message.packet.operations?.length??null});performance.mark('native-preparation:'+message.packet.sequence+':'+stage);};qaStage('start');`);
 const before=[
  ['        if(preparing)await inspect(operationValidationSteps(packet.operations));','validate-operations'],
  ['        packet.references = preparing?await inspect(packetReferenceSteps(packet.operations)):references(packet.operations);','references'],
  ['        if (readiness) await Promise.race([readiness,cancelled]);','dependencies-wait'],
  ['        packet.transportTiming.resourcesReadyAt = absoluteNow();','dependencies-ready'],
  ['        packet.resourceSnapshot = snapshotResources(packet.references);','snapshot'],
  ['        classifyBufferOwnership(packet);','classify-ownership'],
  ['        const writeCounts = new Map();','replay-analysis'],
  ['        packet.drawnPipelines=remoteDrawPipelineEntries(packet.operations,packet.resourceSnapshot,{strict:preparing});','pipeline-identities'],
  ['          await initializePreparedWorldFrame(packet,checkpoint);','initialize-uploads'],
  ['        pinSnapshot(packet.resourceSnapshot);','pin-and-publish-pending'],
  ['            firstUse=prepareRemoteFirstUse({device,packet,canvasConfiguration,resolve});','first-use-encode'],
  ['            if(firstUse.buffers.length){device.queue.submit(firstUse.buffers);submitted=true;metrics.firstUseSubmissions++;}','first-use-submit'],
  ['          const firstUseComplete=Promise.all([device.queue.onSubmittedWorkDone(),validation,...firstUse.waiting]).then(([,error])=>{','first-use-wait'],
  ['          packet.preparedUploadsComplete=true;','ready'],
 ];
 for(const [anchor,stage]of before)replace(anchor,`        qaStage('${stage}');\n`+anchor);
 if(ordinary){
  replace('  metrics.qaPreparationStages=[];','  metrics.qaPreparationStages=[];metrics.qaOrdinaryFrameStages=[];');
  replace('if(!preparing)return;const at=absoluteNow();metrics.qaPreparationStages.push({sequence:message.packet.sequence,stage,at,operations:message.packet.operations?.length??null});performance.mark(\'native-preparation:\'+message.packet.sequence+\':\'+stage);',"const at=absoluteNow(),row={sequence:message.packet.sequence,stage,at,operations:message.packet.operations?.length??null,activeSequence:active?.sequence??null,holdId:nativeMutationHold?.holdId??null};if(preparing){metrics.qaPreparationStages.push(row);performance.mark('native-preparation:'+message.packet.sequence+':'+stage);}else{metrics.qaOrdinaryFrameStages.push(row);performance.mark('native-ordinary-frame:'+stage,{detail:row});}");
  for(const [anchor,stage] of [
   ['        if(preparing)await inspect(packetByteSteps(message.packet));','packet-bytes'],
   ['        const packet = { ...message.packet,','retained-preparations'],
   ['        if(packet.operations.some(op=>!drawCommandsCurrent','draw-world-checks'],
   ['        if(preparing)await inspect(packetByteSteps(packet));','combined-bytes'],
   ['        if (packet.metadata?.clock) evaluateRemoteClock','clock-contract'],
   ['        const nativeBindings=Array.from(clockBindings.values())','control-rendezvous'],
   ['        try{packet.admittedClockBindings=admitClockBindings(packet,preparing);}','clock-admission'],
  ])replace(anchor,`        if(!preparing)qaStage('${stage}');\n`+anchor);
  replace('        packet.transportTiming.admittedAt = absoluteNow();',"        packet.transportTiming.admittedAt = absoluteNow();if(!preparing)qaStage('admitted');");
 }
 if(resources){
  replace('  metrics.qaPreparationStages=[];',`  metrics.qaPreparationStages=[];metrics.qaReceipts={counts:{},slow:[]};metrics.qaImages=[];`);
  replace('    const message = event.data;',`    const qaReceiveAt=absoluteNow();const message = event.data;const qaReceiveMs=absoluteNow()-qaReceiveAt;
    const qaKind=[message.type,message.method??message.op?.method??''].join(':');metrics.qaReceipts.counts[qaKind]=(metrics.qaReceipts.counts[qaKind]??0)+1;
    if(qaReceiveMs>.5&&metrics.qaReceipts.slow.length<256)metrics.qaReceipts.slow.push({at:qaReceiveAt,ms:qaReceiveMs,kind:qaKind,id:message.id??null,label:message.descriptor?.label??null,image:message.op?.args?.[0]?.source?{width:message.op.args[0].source.width,height:message.op.args[0].source.height}:null});`);
  replace('      device.queue[op.method](...resolve(op.args)); metrics.queueWrites++;',`      const qaImage=op.method==='copyExternalImageToTexture'?{at:absoluteNow(),width:op.args[0].source?.width,height:op.args[0].source?.height,sourceOrigin:op.args[0].origin??null,flipY:op.args[0].flipY??false,destination:op.args[1],extent:op.args[2],label:(resolutionResources??resources).get(op.args[1].texture?.[REF])?.descriptor?.label??null}:null;
      device.queue[op.method](...resolve(op.args)); metrics.queueWrites++;
      if(qaImage){qaImage.ms=absoluteNow()-qaImage.at;metrics.qaImages.push(qaImage);}`);
 }
 return source;
}

export async function observePreparationCosts(page,overrides){
 const sha=value=>createHash('sha256').update(value).digest('hex');
 const mutations=process.env.QA_NATIVE_MUTATION_TRACE==='true';
 await page.context().route('**/src/rendering/remote-webgpu-host.js*',async route=>{
  const response=await route.fetch(),body=await response.text(),phases=rewritePreparationCosts(body,{resources:process.env.QA_NATIVE_RESOURCE_TRACE==='true',ordinary:process.env.QA_NATIVE_ORDINARY_FRAME_TRACE==='true'}),annotated=mutations?rewriteMutationCosts(phases,'host'):phases;
  overrides.push({file:'remote-webgpu-host.js',url:route.request().url(),originalSha256:sha(body),annotatedSha256:sha(annotated),ordinaryFrames:process.env.QA_NATIVE_ORDINARY_FRAME_TRACE==='true',scope:'Optional QA preparation and ordinary admission phase marks on existing Host; no scheduling or GPU changes. Dependency/fence spans include asynchronous waiting.'});
  await route.fulfill({response,body:annotated});
 });
 if(mutations)for(const [owner,file]of [['publication','simulation/native-intent-control-publication.js'],['admission','world/native-resource-admission.js'],...(process.env.QA_NATIVE_FARM_COMMIT_TRACE==='true'?[['bridge','world/wild-engine/spatial-intent-bridge.js']]:[])])await page.context().route('**/src/'+file+'*',async route=>{
  const response=await route.fetch(),body=await response.text(),annotated=rewriteMutationCosts(body,owner);
  overrides.push({file,url:route.request().url(),originalSha256:sha(body),annotatedSha256:sha(annotated),scope:'Optional QA mutation phase marks only. Original protocol, validation, ordering, queue fences and publication are unchanged; wall spans include waiting.'});
  await route.fulfill({response,body:annotated});
 });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node native-audit-preparation-costs.mjs receipt.json[.gz] output.json');
 const bytes=readFileSync(input),receipt=JSON.parse(input.endsWith('.gz')?gunzipSync(bytes):bytes);
 const report=summarizePreparationCosts(receipt);report.input={path:input,sha256:createHash('sha256').update(bytes).digest('hex')};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,runOutcome:report.runOutcome,sequences:report.sequences.length}));
}
