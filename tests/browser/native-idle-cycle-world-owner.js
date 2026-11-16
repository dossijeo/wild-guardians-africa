import {nativeIdleCycleReferenceFromProposal,nativeIdleCycleWatchKnot} from '../../src/world/native-idle-cycle.js';
import {captureNativeRoutePickFrame} from '../../src/rendering/native-route-pick-frame.js';
import {cancelIdle} from '../../src/simulation/idle.js';

// Component acceptance through the real original-actor Surface/ports/Host.
// This fixture mirrors native private phase explicitly; it is not the pending
// ordinary Game21 producer or a full-game/healthy3123 recovery measurement.
export async function auditNativeIdleCycleWorldOwner(c,{repeat=false,home=false}={}){
 const {state,planner,w,client,publisher,publication,preparer,resourceConnection,b,starts,ends,waitStart,waitEnd,now,errors,pick,commit}=c,worker=state.workers[0],rng=state.rng,records=[];
 const body=()=>{const count=w.spatial_bodies_near(0,0,1e6),rows=new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),count*6);for(let i=0;i<count;i++)if(rows[i*6]===1)return Array.from(rows.slice(i*6,i*6+6));return null;},heldBody=body(),pose=planner.nativeInitialIdleBodyBinding(worker.id).reference.sourceRequest.pose;
 const shape=o=>o.actors.map(a=>({root:a.root,bones:a.bones,meshes:a.meshes.map(m=>[m.id,m.geometry])})),publish=sequence=>{publisher.commit(sequence);client.presentationPort.postMessage({kind:'publication',session:c.transportSession,publication:{session:c.transportSession,sequence,elapsed:state.elapsed,physicsPose:null,snapshot:c.serialize(state),events:[]}});};
 let issued=false,preparingNext=false,homeRequested=false,inputPaused=false,pump,sequence=2;
 function project(){
  if(homeRequested){if(!planner.projectNativeHomeExecution(state,worker))throw Error('Cycle Home lost its native body');return;}
  if(!issued){if(!planner.projectNativeInitialIdleBody(state,worker))throw Error('Cycle preparation lost its admitted source20');return;}
  const view=planner.nativeIdleCycleExecution(worker.id);if(!view)throw Error('Cycle lost its current native phase');
  if(!preparingNext)worker.idleState=structuredClone(view.idleState);
 }
 function startPump(){commit(false);pump=setInterval(()=>{if(inputPaused)return;try{const previous=state.elapsed;state.elapsed+=.02;const result=planner.advanceNativeRouteExecution(state.elapsed);if(result.status!=='advanced'){state.elapsed=previous;throw Error('Cycle cohort stopped '+JSON.stringify(result));}commit(false);project();if(!homeRequested&&JSON.stringify(body())!==JSON.stringify(heldBody)||state.rng!==rng)throw Error('Cycle changed physical body or world RNG');}catch(e){if(pump)clearInterval(pump);pump=null;errors.push(String(e));}},20);}
 async function stage(index,kind='cycle'){
  const before=await client.inspect(),peerBefore=planner.nativeRouteExecution(b),first=waitStart(index),firstEnd=waitEnd(index),second=waitStart(index+1),secondEnd=waitEnd(index+1);let ready,reference,committedAt,calls=0;
  preparer.postMessage({kind:'block-control-preparation',durationMs:1800});await first;
  const invoke=kind==='cycle'?'startNativeIdleCycleAfterGpuQuiescence':'startNativeHomeRouteAfterGpuQuiescence',prepare=kind==='cycle'?'prepareNativeIdleCycleResources':'prepareNativeHomeRouteResources',template=kind==='cycle'?'preparedIdleCycleTemplate':'preparedHomeRouteTemplate';
  const admitted=await planner[invoke]({actorId:worker.id,getPublication:()=>publication,prepareResources:async({resources,signal,deferredStart})=>{
   calls++;reference=kind==='cycle'?nativeIdleCycleReferenceFromProposal(resources):resources.nativeHome;const handle=await resourceConnection[prepare](resources,{signal,minSequence:0,deferredStart,terrainManifest:publisher.manifest()});ready=await client.inspect();
   if(Object.values(ready.qaLastRenderFactories??{missing:1}).some(Boolean)||JSON.stringify(body())!==JSON.stringify(heldBody))throw Error('Cycle preparation rendered factories or moved the held body');
   preparer.postMessage({kind:'block-control-preparation',durationMs:1800});await second;
   return {preparedWorldBoundary:handle.preparedWorldBoundary,[template]:handle[template],valid:handle.valid,abort:handle.abort,commit(data){
    committedAt=now();issued=true;preparingNext=false;
    if(kind==='cycle'&&home){
     // Publish the acquisition before issuing the genuine trusted Home ABI.
     // Ordinary Game21 Home projection remains a separate migration task.
     commit(false);const village=state.villages.find(v=>v.id===worker.villageId),goal=village.entry,source=data.nativeIdleCycleBinding.reference.sourceBody;worker.contractDay=state.day-1;
     if(w.nav_intent_initial_idle_home_request(Number(worker.id.split('-').at(-1)),w.nav_intent_session(),source.bodySequence,Number(village.id.split('-').at(-1)),goal.x,goal.z)!==1)throw Error('Cycle immediate Home request rejected');
     cancelIdle(worker);Object.assign(worker,{status:'returning',nativeRouteAdmission:'pending-home-resources'});homeRequested=true;commit(false);
    }
    const result=handle.commit(data);if(kind==='cycle'&&!homeRequested)project();if(kind==='home')planner.projectNativeHomeExecution(state,worker);publish(sequence++);return result;
   }};
  }});
  if(admitted.status!=='committed')throw Error('Cycle graphical admission failed '+JSON.stringify({kind,status:admitted.status,error:admitted.error,errors}));
  await new Promise(r=>setTimeout(r,900));await window.nativeFirstTaskCheckpoint?.('cycle-'+kind+'-'+index+'-blocked');await secondEnd;await firstEnd;
  const after=await client.inspect();await publication.fenceGpu();const consumer=after.drawExecution.consumer,frame=captureNativeRoutePickFrame(consumer),binding=kind==='cycle'?admitted.nativeIdleCycleBinding:admitted.nativeHomeRouteBinding;
  const samples=consumer.samples.filter(f=>f.at>=committedAt&&f.at<ends[index+1].end&&f.nativeWorldBoundary?.ticket===admitted.worldBoundary.ticket),prior=consumer.samples.filter(f=>f.at>=starts[index].start&&f.at<ends[index].end),peerReference={actorId:900012,routeHandle:b,assignmentSequence:planner.nativeRouteTiming(b).assignmentSequence},peerAfter=planner.sampleNativeRoute(b,frame.getTime(peerReference,planner.nativeRouteTiming(b).startTime));
  // The verified corridor doubles back: accumulated native route distance,
  // rather than endpoint displacement, proves progress across a turn.
  if(calls!==1||samples.length<4||prior.length<4||Math.max(...samples.map(f=>f.clockElapsed))-Math.min(...samples.map(f=>f.clockElapsed))<.5||peerAfter.distance-peerBefore.distance<.5)throw Error('Cycle did not preserve independent drawing/progress '+JSON.stringify({index,calls,issuedFrames:samples.length,priorFrames:prior.length,clocks:samples.map(f=>f.clockElapsed),peerBefore,peerAfter,errors}));
  if(after.drawExecution.resourcesCreated!==ready.drawExecution.resourcesCreated||JSON.stringify(ready.qaCumulativeFactories)!==JSON.stringify(after.qaCumulativeFactories))throw Error('Cycle allocated after READY');
  for(const key of ['uniformForks','bindingForks','bufferForks','textureForks'])if((consumer[key]??0)!==(ready.drawExecution.consumer[key]??0))throw Error('Cycle forked after READY '+key);
  if(JSON.stringify(shape(before.qaResidentOwners))!==JSON.stringify(shape(after.qaResidentOwners))||JSON.stringify(before.qaResidentOwners.instances)!==JSON.stringify(after.qaResidentOwners.instances)||JSON.stringify(ready.qaResidentOwners)!==JSON.stringify(after.qaResidentOwners))throw Error('Cycle replaced an unchanged actor/geometry/instance');
  if(after.qaNativeRig.poseHash!==ready.qaNativeRig.poseHash||after.inspectionGeneration!==before.inspectionGeneration||consumer.failed||consumer.gpuErrors||errors.length||state.rng!==rng)throw Error('Cycle altered source ownership '+JSON.stringify({errors,after}));
  // Input-oracle checkpoint after the uninterrupted block. A live peer can
  // move away while the first asynchronous actor pick completes; hold only
  // the test source's watermark, let Host reach that issued horizon, and use
  // its actual submitted frame for both picks. No playback policy change.
  inputPaused=true;await publication.fenceGpu();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const inputFrame=captureNativeRoutePickFrame((await client.inspect()).drawExecution.consumer),age=kind==='cycle'?inputFrame.getIdleCycleElapsed(reference):inputFrame.getHomeElapsed(reference),pickPose=kind==='cycle'?pose:planner.sampleNativeRoute(binding.reference.expectedRouteHandle,inputFrame.getHomeExecutionTime(reference)),peerPickPose=planner.sampleNativeRoute(b,inputFrame.getTime(peerReference,planner.nativeRouteTiming(b).startTime)),inputPick=await pick(pickPose,worker.id),peerPick=await pick(peerPickPose,'worker-900012');
  const beforeTrace=before.qaResourceTrace??[],alreadyRemoved=new Set(beforeTrace.filter(r=>r.kind==='destroy').map(r=>r.reference)),delta=Object.fromEntries(Object.entries(ready.qaCumulativeFactories).map(([k,v])=>[k,v-(before.qaCumulativeFactories?.[k]??0)])),trace=(after.qaResourceTrace??[]).slice(beforeTrace.length),immutableBefore=beforeTrace.filter(r=>!alreadyRemoved.has(r.reference)&&(r.kind==='createTexture'||r.kind==='createBuffer'&&(r.usage&48)!==0)),removed=new Set(trace.filter(r=>r.kind==='destroy').map(r=>r.reference));
  if(trace.some(r=>r.kind==='createBuffer'&&(r.usage&48)!==0)||immutableBefore.some(r=>removed.has(r.reference)))throw Error('Cycle reconstructed or retired immutable resident geometry/banks');
  const forkKeys=['uniformForks','uniformForkBytes','bindingForks','bufferForks','bufferForkBytes','textureForks'],hostAllocations=Object.fromEntries([['before',before],['ready',ready],['after',after]].map(([key,value])=>[key,Object.fromEntries(forkKeys.map(k=>[k,value.drawExecution.consumer[k]??0]))]));
  if(hostAllocations.ready.bufferForks!==hostAllocations.before.bufferForks||hostAllocations.ready.textureForks!==hostAllocations.before.textureForks)throw Error('Cycle copied a resident native buffer or texture '+JSON.stringify({index,kind,hostAllocations,buffer:ready.drawExecution.consumer.bufferForkLastResource,texture:ready.drawExecution.consumer.textureForkLastResource,owners:[before,ready].map(value=>value.qaNativeBufferOwners?.filter(owner=>owner.reference===ready.drawExecution.consumer.bufferForkLastResource?.reference))}));
  const entry={kind,reference,binding,worldBoundary:admitted.worldBoundary,age,...(kind==='cycle'?{watchKnot:nativeIdleCycleWatchKnot(reference,binding.reference.worldBoundary.effectiveTime)}:{}),inputPick,peerPick,peer:{before:peerBefore,after:peerAfter},before:{resourcesCreated:before.drawExecution.resourcesCreated,owners:before.qaResidentOwners},ready:{resourcesCreated:ready.drawExecution.resourcesCreated,owners:ready.qaResidentOwners},after:{resourcesCreated:after.drawExecution.resourcesCreated,owners:after.qaResidentOwners},resourcesPrepared:ready.drawExecution.resourcesCreated-before.drawExecution.resourcesCreated,resourcesAfterReady:after.drawExecution.resourcesCreated-ready.drawExecution.resourcesCreated,factoriesPrepared:delta,preparationBlock:{start:starts[index].start,end:ends[index].end,drawFrames:prior.length},block:{start:starts[index+1].start,end:ends[index+1].end,committedAt,drawFrames:samples.length},frames:samples};
  entry.resourceIdentity={retainedGeometryAndBankIds:immutableBefore.map(r=>r.reference),createdOrRetired:trace};entry.hostAllocations=hostAllocations;entry.inputCheckpoint={sourceWatermarkHeld:true,peerPickPose};if(kind==='cycle'&&(delta.createTexture??0)!==0)throw Error('Cycle rebuilt resident clip textures '+JSON.stringify(delta));
  if(repeat&&index===4&&['createShaderModule','createRenderPipeline','createRenderPipelineAsync','createPipelineLayout'].some(k=>delta[k]))throw Error('Following cycle recompiled an unchanged programme '+JSON.stringify(delta));
  records.push(entry);await window.nativeFirstTaskCheckpoint?.('cycle-'+kind+'-'+index+'-confirmed');inputPaused=false;return entry;
 }
 try{
  startPump();await stage(2);
  if(repeat){const next=planner.nativeIdleCycleNextRequest(worker.id);if(next?.idleState.mode!=='rest')throw Error('Repeat fixture must reach a genuine pending REST');preparingNext=true;worker.idleState=structuredClone(next.idleState);publish(sequence++);await stage(4);}
  if(home)await stage(4,'home');
  clearInterval(pump);pump=null;commit(true);
  // Stop only the preparer's ordinary draw loop through its existing visibility
  // input. Leave Host replay visible so its last producer packet can settle
  // before the parent drains/retires control on the independent native port.
  preparer.postMessage({kind:'presentation-visibility',hidden:true});const deadline=performance.now()+2000;
  for(;;){const settled=await client.inspect();if(!settled.drawExecution.pendingFrame&&!settled.drawExecution.openFrame)break;if(performance.now()>deadline)throw Error('Cycle producer did not settle before retirement');await new Promise(requestAnimationFrame);}
  await publication.fenceGpu();
  const final=await client.inspect();return {scope:'Original resident actor/geometry/clip banks through actual Surface, ports, Host and hardware; semantic phase fixture only, not ordinary Game/full policy/full3123 recovery.',repeat,immediateHome:home,records,adapter:final.drawExecution.consumer.adapterInfo,final:{gpuErrors:final.drawExecution.consumer.gpuErrors},errors};
 }finally{if(pump)clearInterval(pump);commit(true);}
}
