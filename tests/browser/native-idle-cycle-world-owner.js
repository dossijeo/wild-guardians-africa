import {nativeHomeRequestContinuesHeldIdleStroll} from '../../src/world/native-home-request-reference.js';
import {auditNativeIdleStrollStopWorldOwner} from './native-idle-stroll-stop-world-owner.js';
import {enqueue} from '../../src/simulation/tasks.js';
import {nativeTaskStartReferenceFromProposal} from '../../src/world/native-task-start-reference.js';
import {nativeIdleCycleBodyState} from '../../src/world/native-idle-cycle-body-source.js';
import {nativeIdleCycleReferenceFromProposal,nativeIdleCycleWatchKnot} from '../../src/world/native-idle-cycle.js';
import {captureNativeRoutePickFrame} from '../../src/rendering/native-route-pick-frame.js';

// Component acceptance through the real original-actor Surface/ports/Host.
// Uses actual Game projection/contract API; ordinary Game producer scheduling
// and full-game/healthy3123 recovery remain separate acceptance requirements.
export async function auditNativeIdleCycleWorldOwner(c,{repeat=false,home=false,stroll=false,strollRest=false,strollRestHome=false,strollRestTask=false,strollStop=false,strollStopHome=false}={}){
 const {state,planner,w,client,publisher,publication,preparer,resourceConnection,b,starts,ends,waitStart,waitEnd,now,errors,pick,commit}=c,worker=state.workers[0],rng=state.rng,records=[];
 const body=()=>{const count=w.spatial_bodies_near(0,0,1e6),rows=new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),count*6);for(let i=0;i<count;i++)if(rows[i*6]===1)return Array.from(rows.slice(i*6,i*6+6));return null;},heldBody=body(),pose=planner.nativeInitialIdleBodyBinding(worker.id).reference.sourceRequest.pose;
 const visibleSelection=o=>({...o,actors:o.actors.map(a=>({...a,meshes:a.meshes.map(m=>({...m,material:m.effectiveVisible?m.material:null}))}))});
 const shape=o=>o.actors.map(a=>({root:a.root,bones:a.bones,meshes:a.meshes.map(m=>[m.id,m.geometry])})),publish=sequence=>{publisher.commit(sequence);client.presentationPort.postMessage({kind:'publication',session:c.transportSession,publication:{session:c.transportSession,sequence,elapsed:state.elapsed,physicsPose:null,snapshot:c.serialize(state),events:[]}});};
 let stopped=false,issued=false,homeRequested=false,taskRequested=false,taskMoving=false,strollMoving=false,inputPaused=false,pump,sequence=2,stationaryBody=heldBody;
 function project(){
  if(stopped)return;
  if(taskRequested){if(taskMoving&&!planner.projectNativeTaskExecution(state,worker))throw Error('Cycle TaskStart lost its native execution');return;}
  if(strollMoving){if(!planner.projectNativeIdleStroll(state,worker))throw Error('Stroll lost its actual native Game view');return;}
  if(homeRequested){if(!planner.projectNativeHomeExecution(state,worker))throw Error('Cycle Home lost its native body');return;}
  if(!issued){if(!planner.projectNativeInitialIdleBody(state,worker))throw Error('Cycle preparation lost its admitted source20');return;}
  if(!planner.projectNativeIdleCycle(state,worker))throw Error('Cycle lost its current native Game phase');
 }
 function startPump(){commit(false);pump=setInterval(()=>{if(inputPaused)return;try{const previous=state.elapsed;state.elapsed+=.02;const result=planner.advanceNativeRouteExecution(state.elapsed);if(result.status!=='advanced'){state.elapsed=previous;throw Error('Cycle cohort stopped '+JSON.stringify(result));}commit(false);project();if(!homeRequested&&!strollMoving&&!taskMoving&&JSON.stringify(body())!==JSON.stringify(stationaryBody)||state.rng!==rng)throw Error('Cycle changed physical body or world RNG');}catch(e){if(pump)clearInterval(pump);pump=null;errors.push(String(e));}},20);}
 async function stage(index,kind='cycle'){
  const heldStageBody=body(),previousStroll=kind==='cycle'?planner.nativeIdleStrollBinding(worker.id):null,previousHeld=kind==='home'&&strollStopHome?planner.nativeIdleStrollHeldExecution(worker.id):null,before=await client.inspect(),peerBefore=planner.nativeRouteExecution(b),first=waitStart(index),firstEnd=waitEnd(index),second=waitStart(index+1),secondEnd=waitEnd(index+1);let ready,reference,committedAt,calls=0;
  preparer.postMessage({kind:'block-control-preparation',durationMs:1800});await first;
  const invoke=kind==='task'?'startNativeTaskRouteAfterGpuQuiescence':kind==='stroll'?'startNativeIdleStrollAfterGpuQuiescence':kind==='cycle'?'startNativeIdleCycleAfterGpuQuiescence':'startNativeHomeRouteAfterGpuQuiescence',prepare=kind==='task'?'prepareNativeTaskStartResources':kind==='stroll'?'prepareNativeIdleStrollResources':kind==='cycle'?'prepareNativeIdleCycleResources':'prepareNativeHomeRouteResources',template=kind==='task'?'preparedTaskStartTemplate':kind==='stroll'?'preparedIdleStrollTemplate':kind==='cycle'?'preparedIdleCycleTemplate':'preparedHomeRouteTemplate';
  const admitted=await planner[invoke]({actorId:worker.id,...(kind==='task'?{request:planner.pendingTaskRoute(worker.id),policy:{bodyId:1,radius:.28,urgent:false,runRemaining:worker.runRemaining,runPhase:worker.runPhase,walkPhase:worker.walkPhase,carryPhase:worker.carryPhase}}:{}),getPublication:()=>publication,prepareResources:async({resources,signal,deferredStart})=>{
   calls++;reference=kind==='task'?nativeTaskStartReferenceFromProposal(resources):kind==='stroll'?resources.nativeIdleStroll:kind==='cycle'?nativeIdleCycleReferenceFromProposal(resources):resources.nativeHome;const handle=await resourceConnection[prepare](resources,{signal,minSequence:0,deferredStart,terrainManifest:publisher.manifest()});ready=await client.inspect();
   if(Object.values(ready.qaLastRenderFactories??{missing:1}).some(Boolean)||JSON.stringify(body())!==JSON.stringify(heldStageBody))throw Error('Cycle preparation rendered factories or moved the held body');
   preparer.postMessage({kind:'block-control-preparation',durationMs:1800});await second;
   return {preparedWorldBoundary:handle.preparedWorldBoundary,[template]:handle[template],valid:handle.valid,abort:handle.abort,commit(data){
    committedAt=now();issued=true;if(kind==='task'){taskMoving=true;planner.reconcileWorkerRoutes(state,{navVersion:1});}if(kind==='stroll'){strollMoving=true;if(strollStop)inputPaused=true;}else if(kind==='cycle'){strollMoving=false;stationaryBody=body();}
    if(kind==='cycle'&&(home||strollRestHome&&index===6)){
     // Publish the acquisition before issuing the genuine trusted Home ABI.
     // The existing Game API requests Home from that actual cycle owner.
     commit(false);worker.contractDay=state.day-1;planner.requestNativeIdleHome(state,worker);homeRequested=true;commit(false);
    }
    const result=handle.commit(data);if(kind==='cycle'&&!homeRequested||kind==='stroll')project();if(kind==='home')planner.projectNativeHomeExecution(state,worker);if(kind==='task')project();publish(sequence++);return result;
   }};
  }});
  if(admitted.status!=='committed')throw Error('Cycle graphical admission failed '+JSON.stringify({kind,status:admitted.status,error:admitted.error,errors}));
  await new Promise(r=>setTimeout(r,900));
  // This WALK is setup for the separate stop audit: hold its initial source
  // horizon until that audit resumes it before its own 1800ms preparation.
  await window.nativeFirstTaskCheckpoint?.('cycle-'+kind+'-'+index+'-blocked');await secondEnd;await firstEnd;
  const after=await client.inspect();await publication.fenceGpu();const consumer=after.drawExecution.consumer,frame=captureNativeRoutePickFrame(consumer),binding=kind==='task'?planner.nativeTaskStartBinding(worker.id):kind==='cycle'?admitted.nativeIdleCycleBinding:kind==='stroll'?admitted.nativeIdleStrollBinding:admitted.nativeHomeRouteBinding;
  if(after.nativeFrameReadiness!=='ready'||after.state.sequence<=ready.state.sequence)throw Error('Native phase did not adopt its genuine new Game publication '+JSON.stringify({kind,before:ready.state.sequence,after:after.state.sequence,readiness:after.nativeFrameReadiness}));
  const samples=consumer.samples.filter(f=>f.at>=committedAt&&f.at<ends[index+1].end&&f.nativeWorldBoundary?.ticket===admitted.worldBoundary.ticket),prior=consumer.samples.filter(f=>f.at>=starts[index].start&&f.at<ends[index].end),peerReference={actorId:900012,routeHandle:b,assignmentSequence:planner.nativeRouteTiming(b).assignmentSequence},peerAfter=planner.sampleNativeRoute(b,frame.getTime(peerReference,planner.nativeRouteTiming(b).startTime));
  // The verified corridor doubles back: accumulated native route distance,
  // rather than endpoint displacement, proves progress across a turn.
  if(calls!==1||samples.length<4||prior.length<4||(!(strollStop&&kind==='stroll')&&Math.max(...samples.map(f=>f.clockElapsed))-Math.min(...samples.map(f=>f.clockElapsed))<.5)||peerAfter.distance-peerBefore.distance<.5)throw Error('Cycle did not preserve independent drawing/progress '+JSON.stringify({index,calls,issuedFrames:samples.length,priorFrames:prior.length,clocks:samples.map(f=>f.clockElapsed),peerBefore,peerAfter,errors}));
  if(after.drawExecution.resourcesCreated!==ready.drawExecution.resourcesCreated||JSON.stringify(ready.qaCumulativeFactories)!==JSON.stringify(after.qaCumulativeFactories))throw Error('Cycle allocated after READY');
  for(const key of ['uniformForks','bindingForks','bufferForks','textureForks'])if((consumer[key]??0)!==(ready.drawExecution.consumer[key]??0))throw Error('Cycle forked after READY '+key);
  if(JSON.stringify(shape(before.qaResidentOwners))!==JSON.stringify(shape(after.qaResidentOwners))||JSON.stringify(before.qaResidentOwners.instances)!==JSON.stringify(after.qaResidentOwners.instances)||JSON.stringify(strollStop?visibleSelection(ready.qaResidentOwners):ready.qaResidentOwners)!==JSON.stringify(strollStop?visibleSelection(after.qaResidentOwners):after.qaResidentOwners)){window.nativeIdleCycleFailure={kind,index,owners:{before:before.qaResidentOwners,ready:ready.qaResidentOwners,after:after.qaResidentOwners}};throw Error('Cycle replaced an unchanged actor/geometry/instance');}
  if(after.qaNativeRig.poseHash!==ready.qaNativeRig.poseHash||after.inspectionGeneration!==before.inspectionGeneration||consumer.failed||consumer.gpuErrors||errors.length||state.rng!==rng)throw Error('Cycle altered source ownership '+JSON.stringify({errors,after}));
  // Input-oracle checkpoint after the uninterrupted block. A live peer can
  // move away while the first asynchronous actor pick completes; hold only
  // the test source's watermark, let Host reach that issued horizon, and use
  // its actual submitted frame for both picks. No playback policy change.
  inputPaused=true;await publication.fenceGpu();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const retired=await client.inspect(),inputFrame=captureNativeRoutePickFrame(retired.drawExecution.consumer);
  const executionTime=kind==='cycle'?null:kind==='task'?inputFrame.getStartExecutionTime(reference,reference.worldBoundary.effectiveTime):kind==='stroll'?inputFrame.getStrollExecutionTime(reference):inputFrame.getHomeExecutionTime(reference),age=kind==='cycle'?inputFrame.getIdleCycleElapsed(reference):executionTime-binding.reference.worldBoundary.effectiveTime;
  const pickPose=kind==='cycle'?nativeIdleCycleBodyState(reference.sourceBody).pose:planner.sampleNativeRoute(binding.reference.expectedRouteHandle,executionTime),peerPickPose=planner.sampleNativeRoute(b,inputFrame.getTime(peerReference,planner.nativeRouteTiming(b).startTime)),inputPick=await pick(pickPose,worker.id),peerPick=await pick(peerPickPose,'worker-900012');
  const inactiveMaterialRestorations=[];
  if(strollStop)for(const actor of ready.qaResidentOwners.actors)for(const mesh of actor.meshes){const next=after.qaResidentOwners.actors.find(a=>a.root===actor.root)?.meshes.find(m=>m.id===mesh.id);if(next&&JSON.stringify(mesh.material)!==JSON.stringify(next.material)){if(mesh.effectiveVisible||next.effectiveVisible)throw Error('Retirement changed an active prepared material');inactiveMaterialRestorations.push({phase:'ready-to-after',root:actor.root,mesh:mesh.id,before:mesh.material,after:next.material});}}
  for(const actor of after.qaResidentOwners.actors){const current=retired.qaResidentOwners.actors.find(value=>value.root===actor.root);if(!current)throw Error('Retirement removed a resident actor');for(const mesh of actor.meshes){const next=current.meshes.find(value=>value.id===mesh.id);if(!next||mesh.geometry!==next.geometry||typeof mesh.effectiveVisible!=='boolean'||typeof next.effectiveVisible!=='boolean'||mesh.effectiveVisible!==next.effectiveVisible)throw Error('Retirement changed resident geometry or visibility');if(JSON.stringify(mesh.material)!==JSON.stringify(next.material)){if(mesh.effectiveVisible)throw Error('Retirement changed an active motion material');inactiveMaterialRestorations.push({root:actor.root,mesh:mesh.id,before:mesh.material,after:next.material});}}}
  if(retired.drawExecution.resourcesCreated!==after.drawExecution.resourcesCreated||JSON.stringify(retired.qaCumulativeFactories)!==JSON.stringify(after.qaCumulativeFactories)||JSON.stringify(shape(retired.qaResidentOwners))!==JSON.stringify(shape(after.qaResidentOwners))||JSON.stringify(retired.qaResidentOwners.instances)!==JSON.stringify(after.qaResidentOwners.instances)){
   window.nativeIdleCycleFailure={kind,index,reference,previousStroll,resources:{ready:ready.drawExecution.resourcesCreated,after:after.drawExecution.resourcesCreated,retired:retired.drawExecution.resourcesCreated},factories:{after:after.qaCumulativeFactories,retired:retired.qaCumulativeFactories},owners:{after:after.qaResidentOwners,retired:retired.qaResidentOwners},trace:(retired.qaResourceTrace??[]).slice((after.qaResourceTrace??[]).length),preparation:retired.preparation,host:{after:after.drawExecution.consumer,retired:retired.drawExecution.consumer}};
   throw Error('Post-fence checkpoint changed resources or resident owners');
  }
  const beforeTrace=before.qaResourceTrace??[],alreadyRemoved=new Set(beforeTrace.filter(r=>r.kind==='destroy').map(r=>r.reference)),delta=Object.fromEntries(Object.entries(ready.qaCumulativeFactories).map(([k,v])=>[k,v-(before.qaCumulativeFactories?.[k]??0)])),trace=(retired.qaResourceTrace??[]).slice(beforeTrace.length),immutableBefore=beforeTrace.filter(r=>!alreadyRemoved.has(r.reference)&&(r.kind==='createTexture'||r.kind==='createBuffer'&&(r.usage&48)!==0)),removed=new Set(trace.filter(r=>r.kind==='destroy').map(r=>r.reference));
  // Only the declared obsolete stroll program may retire. Match its real
  // owner/decision label; never exempt arbitrary textures or magic GPU IDs.
  const changedSource=previousHeld?.sourceReference??previousStroll?.reference,changedLabel=changedSource?`wg-native-idle-stroll-route:${changedSource.actorId}:${changedSource.sourceDecisionSequence}`:null,changedMotionData=changedLabel?immutableBefore.filter(r=>r.kind==='createTexture'&&r.label===changedLabel):[],changedIds=new Set(changedMotionData.map(r=>r.reference)),unchangedImmutable=immutableBefore.filter(r=>!changedIds.has(r.reference));
  if(previousHeld&&(changedMotionData.length!==1||!nativeHomeRequestContinuesHeldIdleStroll(reference.sourceRequest,previousHeld)))throw Error('Home lacks its exact stopped22 source and motion data');
  if(previousStroll&&(changedMotionData.length!==1||reference.sourceBody.sourceSequence!==previousStroll.assignmentSequence))throw Error('Cycle lacks its exact replaced native motion data');
  if(trace.some(r=>r.kind==='createBuffer'&&(r.usage&48)!==0)||unchangedImmutable.some(r=>removed.has(r.reference)))throw Error('Cycle reconstructed or retired immutable resident geometry/banks');
  if(changedMotionData.some(r=>!removed.has(r.reference))){window.nativeIdleCycleFailure={kind,index,previousStroll,reference,changedMotionData,trace,preparation:retired.preparation,owners:retired.qaResidentOwners,ready:ready.drawExecution.consumer,after:retired.drawExecution.consumer};throw Error('Obsolete stroll data was not retired after its GPU handoff');}
  const forkKeys=['uniformForks','uniformForkBytes','bindingForks','bufferForks','bufferForkBytes','textureForks'],hostAllocations=Object.fromEntries([['before',before],['ready',ready],['after',after]].map(([key,value])=>[key,Object.fromEntries(forkKeys.map(k=>[k,value.drawExecution.consumer[k]??0]))]));
  if(hostAllocations.ready.bufferForks!==hostAllocations.before.bufferForks||hostAllocations.ready.textureForks!==hostAllocations.before.textureForks)throw Error('Cycle copied a resident native buffer or texture '+JSON.stringify({index,kind,hostAllocations,buffer:ready.drawExecution.consumer.bufferForkLastResource,texture:ready.drawExecution.consumer.textureForkLastResource,owners:[before,ready].map(value=>value.qaNativeBufferOwners?.filter(owner=>owner.reference===ready.drawExecution.consumer.bufferForkLastResource?.reference))}));
  const entry={kind,...(strollStop&&kind==='stroll'?{setupForMovingStop:true,sourceClockHeldAfterAcquisition:true}:{}),reference,binding,worldBoundary:admitted.worldBoundary,age,...(kind==='cycle'?{watchKnot:nativeIdleCycleWatchKnot(reference,binding.reference.worldBoundary.effectiveTime)}:{}),inputPick,peerPick,peer:{before:peerBefore,after:peerAfter},before:{resourcesCreated:before.drawExecution.resourcesCreated,owners:before.qaResidentOwners},ready:{resourcesCreated:ready.drawExecution.resourcesCreated,owners:ready.qaResidentOwners},after:{resourcesCreated:after.drawExecution.resourcesCreated,owners:after.qaResidentOwners},resourcesPrepared:ready.drawExecution.resourcesCreated-before.drawExecution.resourcesCreated,resourcesAfterReady:after.drawExecution.resourcesCreated-ready.drawExecution.resourcesCreated,factoriesPrepared:delta,preparationBlock:{start:starts[index].start,end:ends[index].end,drawFrames:prior.length},block:{start:starts[index+1].start,end:ends[index+1].end,committedAt,drawFrames:samples.length},frames:samples};
  entry.inactiveMaterialRestorations=inactiveMaterialRestorations;entry.resourceIdentity={retainedGeometryAndBankIds:unchangedImmutable.map(r=>r.reference),replacedMotionData:changedMotionData.map(r=>({reference:r.reference,label:r.label,retired:removed.has(r.reference)})),createdOrRetired:trace};entry.hostAllocations=hostAllocations;entry.adoption={readiness:after.nativeFrameReadiness,preparedPublicationSequence:ready.state.sequence,adoptedPublicationSequence:after.state.sequence};entry.inputCheckpoint={sourceWatermarkHeld:true,peerPickPose};if(kind==='cycle'&&(delta.createTexture??0)!==0)throw Error('Cycle rebuilt resident clip textures '+JSON.stringify(delta));
  if((repeat&&index===4||strollRest&&index===6)&&['createShaderModule','createRenderPipeline','createRenderPipelineAsync','createPipelineLayout'].some(k=>delta[k])){window.nativeIdleCycleFailure={kind,index,delta,trace,allShaders:retired.qaResourceTrace.filter(r=>r.kind==='createShaderModule')};throw Error('Following cycle recompiled an unchanged programme '+JSON.stringify(delta));}
  const duplicateShaders=trace.filter(r=>r.kind==='createShaderModule'&&r.sameSourceAs!==null);entry.duplicateShaderSources=duplicateShaders;if(((strollRestHome||strollRestTask)&&index===8||strollStopHome&&kind==='home')&&duplicateShaders.length){window.nativeIdleCycleFailure={kind,index,delta,duplicateShaders,trace,allShaders:retired.qaResourceTrace.filter(r=>r.kind==='createShaderModule')};throw Error('Movement recompiled an already prepared shader source '+JSON.stringify(delta));}
  records.push(entry);await window.nativeFirstTaskCheckpoint?.('cycle-'+kind+'-'+index+'-confirmed');inputPaused=false;return entry;
 }
 try{
  startPump();await stage(2);
  if(repeat){const next=planner.nativeIdleCycleNextRequest(worker.id);if(next?.idleState.mode!=='rest')throw Error('Repeat fixture must reach a genuine pending REST');project();publish(sequence++);await stage(4);}
  if(home)await stage(4,'home');
  if(stroll){const next=planner.nativeIdleCycleNextRequest(worker.id);if(next?.idleState.mode!=='walk')throw Error('Stroll must follow a genuine native WALK decision');project();publish(sequence++);await stage(4,'stroll');}
  if(strollStop){inputPaused=true;const sourceSequence=sequence++;publish(sourceSequence);const sourceDeadline=performance.now()+10000;for(;;){const current=await client.inspect();if(current.state.sequence>=sourceSequence&&current.nativeFrameReadiness==='ready')break;if(performance.now()>sourceDeadline)throw Error('Current moving source was not adopted before stop preparation');await new Promise(requestAnimationFrame);}records.push(await auditNativeIdleStrollStopWorldOwner({...c,records,publishStop:(resources,worldBoundary)=>{stopped=true;strollMoving=false;stationaryBody=body();commit(false);publisher.commit(sequence);client.presentationPort.postMessage({kind:'publication',session:c.transportSession,publication:{session:c.transportSession,sequence:sequence++,elapsed:state.elapsed,physicsPose:null,snapshot:c.serialize(state),events:[],terrainChanged:true,nativeWorldResources:[{version:1,kind:12,worldBoundary,chunks:[],removed:[]}]}});},resume:()=>{inputPaused=false;},pause:()=>{inputPaused=true;}}));}
  if(strollStopHome){
   // Expire by the game clock; keep the worker's pinned contract unchanged.
   state.time=600;planner.projectNativeIdleStroll(state,worker);const held=planner.nativeIdleStrollHeldExecution(worker.id),request=planner.requestNativeIdleHome(state,worker);
   if(!nativeHomeRequestContinuesHeldIdleStroll(request,held))throw Error('Home did not consume the actual stopped22 source');
   stopped=false;homeRequested=true;commit(false);const pendingSequence=sequence++;publish(pendingSequence);
   const deadline=performance.now()+10000;for(;;){const current=await client.inspect();if(current.state.sequence>=pendingSequence&&current.nativeFrameReadiness==='ready')break;if(performance.now()>deadline)throw Error('Pending stopped22 Home publication was not adopted');await new Promise(requestAnimationFrame);}
   inputPaused=false;await stage(7,'home');
  }
  if(strollRest){
   const deadline=performance.now()+10000;while(!planner.nativeIdleStrollExecution(worker.id)?.arrived){if(performance.now()>deadline)throw Error('Native stroll did not reach its actual endpoint');await new Promise(requestAnimationFrame);}
   project();const arrivedSequence=sequence++;publish(arrivedSequence);
   const adoptionDeadline=performance.now()+10000;for(;;){const snapshot=await client.inspect();if(snapshot.state.sequence>=arrivedSequence&&snapshot.nativeFrameReadiness==='ready')break;if(performance.now()>adoptionDeadline)throw Error('Actual endpoint WALK publication was not adopted');await new Promise(requestAnimationFrame);}
   await stage(6,'cycle');if(strollRestHome)await stage(8,'home');
   if(strollRestTask){
    const target=state.plants.find(p=>p.id==='plant-900097');if(!target||target.growth!==999999)throw Error('TaskStart requires its already resident mature crop');target.harvestRequested=true;enqueue(state,worker.centerId,'harvest',target.id);planner.flushWorldEvents();planner.flushTaskEvents();const plan=planner.planIfNeeded(state.elapsed);if(planner.commitTaskBatchToState(state,plan,{navVersion:1,pendingResources:true})!==1)throw Error('Current-cycle task claim failed');taskRequested=true;commit(false);const pendingSequence=sequence++;publish(pendingSequence);
    const adoptionDeadline=performance.now()+10000;for(;;){const snapshot=await client.inspect();if(snapshot.state.sequence>=pendingSequence&&snapshot.nativeFrameReadiness==='ready')break;if(performance.now()>adoptionDeadline)throw Error('Pending TaskStart publication was not adopted');await new Promise(requestAnimationFrame);}
    await stage(8,'task');
   }
  }
  clearInterval(pump);pump=null;commit(true);
  // Stop only the preparer's ordinary draw loop through its existing visibility
  // input. Leave Host replay visible so its last producer packet can settle
  // before the parent drains/retires control on the independent native port.
  preparer.postMessage({kind:'presentation-visibility',hidden:true});const deadline=performance.now()+2000;
  for(;;){const settled=await client.inspect();if(!settled.drawExecution.pendingFrame&&!settled.drawExecution.openFrame)break;if(performance.now()>deadline)throw Error('Cycle producer did not settle before retirement');await new Promise(requestAnimationFrame);}
  await publication.fenceGpu();
  const final=await client.inspect();return {scope:'Original resident actor/geometry/clip banks through actual Surface, ports, Host and hardware; actual Game phase/contract API, not ordinary producer/full policy/full3123 recovery.',repeat,immediateHome:home,stroll,strollRest,strollRestHome,strollRestTask,strollStop,strollStopHome,records,adapter:final.drawExecution.consumer.adapterInfo,final:{gpuErrors:final.drawExecution.consumer.gpuErrors},errors};
 }finally{if(pump)clearInterval(pump);commit(true);}
}
