import {readFileSync} from 'node:fs';
import {MessageChannel} from 'node:worker_threads';
import {createSimulationAuthority} from '../../src/simulation/simulation-authority.js';
import {serialize} from '../../src/persistence/snapshots.js';
import {attachNativeResourcePreparationEndpoint} from '../../src/rendering/native-resource-preparation-receiver.js';
import {nativeResourceAdmissionProfile} from '../../src/world/native-resource-admission-profiles.js';
import {pair,fixture,flush,preparedWorldDraw} from './remote-webgpu-fixture.js';
import {prepareHomeAbsenceDraw} from './native-home-arrival-remote.js';
import {NATIVE_STOP_POSE_FIELDS} from '../../src/world/native-worker-route-stop-codec.js';

const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const kinds={prepareNativeAnimalCropRouteResources:['animal-crop-route'],prepareNativeAnimalCropStrikeResources:['animal-crop-strike'],prepareNativeFarmArrivalResources:['farm-arrival','farmArrivalTemplate','nativeFarmArrival'],prepareNativeIdleStrollResources:['idle-stroll','strollTemplate','nativeStroll'],prepareNativeIdleCycleResources:['idle-cycle','cycleTemplate','nativeIdleCycle'],prepareNativeInitialIdleBodyResources:['initial-idle-body','initialBodyTemplate','nativeInitialIdleBody'],prepareNativeHomeRouteResources:['home-route','homeTemplate','nativeHome'],prepareNativeHomeArrivalResources:['home-arrival'],prepareNativeTaskStartResources:['task-start','startTemplate','nativeStart'],prepareNativeTaskActionResources:['task-action','actionTemplate','nativeAction'],prepareNativeTaskConsequenceResources:['task-consequence','consequenceTemplate','nativeConsequence'],prepareNativeTaskSettlementResources:['task-settlement','settlementTemplate','nativeSettlement']};

// Actual authority and both production ports, existing remote draw Host and
// retained packets; the GPU queue is deterministic, not hardware/visual QA.
export async function nativeProductionAuthority(state,{chunkKeys=Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),nativeWorkerLifecycle=false,qualifyFarmFlee=false,qualifyAnimalCrop=false,qualifyRaidEncounter=false,recoverEncounterLoss=false,qualifyShieldExpiry=false,qualifyRunningShield=false,emptyBeastPhysics=false,nativeBootstrap=null,onPrepare=()=>{},onReady=()=>{},onCommit=null,attach=true,transportSession=null,onNativeIntentControlError=()=>{},compactPausedAcks=false,compactViewAcks=false,observeWorldMotion=false,captureHistoricalEvents=false,drawAllFarmActors=false,prepareNativeTerrainResources=null,onTerrainChunk=null,getTerrainManifest=()=>({epoch:'deterministic-host-test',chunks:[]})}={}){
 const controlSession=transportSession??'production-control',resourceSession=transportSession??'production-resources';
 const faults=[],authority=createSimulationAuthority(module,serialize(state),chunkKeys,{nativeWorkerLifecycle,qualifyFarmFlee,qualifyAnimalCrop,qualifyRaidEncounter,recoverEncounterLoss,qualifyShieldExpiry,qualifyRunningShield,nativeBootstrap,getTerrainManifest,prepareNativeTerrainResources,onTerrainChunk,compactPausedAcks,compactViewAcks,observeWorldMotion,captureHistoricalEvents,onNativeIntentControlError:e=>{faults.push(String(e));onNativeIntentControlError(e);}});
 const [sourcePort,drawPort]=pair();
 let graphics=await fixture({capabilities:{nativeAnimalCropVersion:1,width:20,height:10,format:'rgba8unorm',nativeTaskRouteStopVersion:1,nativeTaskRouteStopClockVersion:1,nativeBarrierAdditionVersion:1,nativeBarrierAdditionClockVersion:1,nativeRestoredWallRepairVersion:1,nativeFarmArrivalVersion:1,nativeFarmArrivalStopVersion:1,nativeFarmArrivalStopClockVersion:1,nativeFarmArrivalStopGateVersion:1,nativeTaskStartVersion:1,nativeTaskSettlementVersion:1,nativeInitialIdleBodyVersion:1,nativeIdleCycleVersion:1,nativeTaskConsequenceVersion:1,nativeDeferredResumeVersion:1,nativeTaskActionVersion:1,nativeTaskActionRestoreVersion:1,nativeTaskActionClockVersion:1,nativeResumeVersion:1,nativeSuspendedVersion:1,nativeHomeRouteVersion:1,nativeIdleStrollVersion:1,nativeIdleStrollStopVersion:1,nativeIdleStrollStopClockVersion:1,nativeHomeArrivalVersion:1}},{intentControl:{port:drawPort,session:controlSession},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
 const originalGraphics=graphics,records=[];
 let resourcePorts=new MessageChannel();
 const farmGroups=new Map();
 const clock={version:1,epoch:0,elapsed:state.elapsed,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:false,segments:[{start:state.elapsed,end:Number.MAX_SAFE_INTEGER,rate:1,realDuration:Number.MAX_SAFE_INTEGER-state.elapsed}]};
 const openEndpoint=port=>attachNativeResourcePreparationEndpoint({port,session:resourceSession,isRunning:()=>true,onError:e=>faults.push(String(e)),prepare:async(method,resources,options)=>{
  if(method==='prepareNativeShieldGeometry'){
   const record={kind:'shield-geometry',resources,committed:false,aborted:false};records.push(record);
   await onReady(record);
   return {shield:resources,abort(){record.aborted=true;}};
  }
  if(method==='prepareNativeGateResources'&&resources.kind==='native-center-ruin-proposal'){
   const record={kind:'center-ruin',resources,minSequence:options.minSequence,committed:false,aborted:false};
   records.push(record);
   await onPrepare(record);
   await graphics.client.whenFrameSettled();
   if(options.signal.aborted)throw new DOMException('Preparation cancelled','AbortError');
   const center=resources.nativeCenterRuin,start=center.boundary.effectiveTime,end=center.end;
   const retreat=records.findLast(item=>item.kind==='animal-crop-route'&&item.committed);
   if(retreat?.resources.reference.purpose!=='retreat')throw Error('Center fixture has no Retreat rig');
   const metadata={nativeWorldBoundary:center.boundary,preparedCenterRuin:center,
    clock:{...clock,elapsed:start,safeUntil:end,segments:[{start,end,rate:1,realDuration:end-start}]}};
   const packet=await prepareExistingGroup(graphics,retreat.cropGroup,metadata,options.signal);
   packet.presented.catch(()=>{});record.packet=packet;
   try{await onReady(record);}catch(error){packet.abort();throw error;}
   return {preparedWorldBoundary:packet.preparedWorldBoundary,preparedCenterRuin:center,valid:packet.valid,
    commit(data){record.commit=data;record.committed=packet.commit(data.worldBoundary,data.nativeCenterRuin);if(record.committed)onCommit?.(record,data);return record.committed;},
    abort(){record.aborted=true;packet.abort();}};
  }
  if(method==='prepareNativeGateResources'&&[3,4].includes(resources.kind)){
   const record={kind:'shield',resources,minSequence:options.minSequence,committed:false,aborted:false};
   if(options.shieldGeometry&&(options.shieldGeometry.shield.spell.id!==resources.nativeShield.spell.id||resources.kind!==3))throw Error('Invalid fixture Shield geometry');
   records.push(record);
   await onPrepare(record);
   await graphics.client.whenFrameSettled();
   if(options.signal.aborted)throw new DOMException('Preparation cancelled','AbortError');
   const lastActorPacket=records.findLast(item=>item.committed&&item.kind!=='shield');
   const stopped=records.findLastIndex(item=>item.committed&&item.resources.nativeShieldCropStop)>records.indexOf(lastActorPacket);
   const packet=resources.nativeShieldCropStop?
    await prepareExistingGroup(graphics,[],{clock,nativeWorldBoundary:resources.worldBoundary,preparedShieldCropStop:resources.nativeShieldCropStop},options.signal):
    resources.nativeShieldCropExpiry?await prepareExistingGroup(graphics,[],{clock,nativeWorldBoundary:resources.worldBoundary,preparedShieldCropExpiry:resources.nativeShieldCropExpiry},options.signal):
    stopped?await prepareExistingGroup(graphics,[],{clock,nativeWorldBoundary:resources.worldBoundary},options.signal):lastActorPacket?.cropGroup?await prepareExistingGroup(graphics,lastActorPacket.cropGroup,{clock,nativeWorldBoundary:resources.worldBoundary},options.signal):drawAllFarmActors?await prepareExistingGroup(graphics,[...farmGroups.values()],{clock,nativeWorldBoundary:resources.worldBoundary},options.signal):lastActorPacket?.kind==='home-arrival'?
    await prepareExistingGroup(graphics,[],{clock,nativeWorldBoundary:resources.worldBoundary},options.signal):
    await preparedWorldDraw({...graphics,clock},resources.worldBoundary,0,options.signal);
   packet.presented.catch(()=>{});record.packet=packet;
   try{await onReady(record);}catch(error){packet.abort();throw error;}
   return {preparedWorldBoundary:packet.preparedWorldBoundary,valid:packet.valid,
    commit(data){record.committed=packet.commit(data.worldBoundary);if(record.committed)onCommit?.(record,data);return record.committed;},
    abort(){record.aborted=true;packet.abort();}};
  }
  const barrier=method==='prepareNativeBarrierAdditionResources';
  const [kind,template,clockField]=barrier?['barrier-addition']:method==='prepareNativeGateResources'&&resources.kind===12?['idle-stroll-stop']:method==='prepareNativeGateResources'&&resources.kind===25?['task-route-stop']:method==='prepareNativeGateResources'&&resources.kind===24?['farm-arrival-stop']:kinds[method],profile=nativeResourceAdmissionProfile(kind),reference=profile.reference(resources),record={kind,resources,minSequence:options.minSequence,terrainManifest:options.terrainManifest,...(barrier?{nativeBarrierWallEntities:options.nativeBarrierWallEntities}:{}),committed:false,aborted:false};records.push(record);
  await onPrepare(record,options);
  if(options.signal.aborted)throw new DOMException('Preparation cancelled','AbortError');
  // Same single-generation backpressure used by the real WorldSurface.
  await graphics.client.whenFrameSettled();
  if(options.signal.aborted)throw new DOMException('Preparation cancelled','AbortError');
  const stationary=['initial-idle-body','idle-cycle','task-settlement'].includes(kind),acting=kind==='task-action',arrival=kind==='home-arrival';
  const stopped=['farm-arrival-stop','task-route-stop','idle-stroll-stop'].includes(kind);
  const crop=kind.startsWith("animal-crop-");
  let farmGroup=null;
  if(!crop&&!arrival&&!stopped&&!barrier){
   let buffer=graphics.buffer;
   if(drawAllFarmActors&&kind==='farm-arrival'){
    buffer=graphics.client.device.createBuffer({size:16,usage:72});
    graphics.client.device.queue.writeBuffer(buffer,0,new Float32Array(4));
    farmGroup=graphics.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
   }
   graphics.client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch:stationary?resources.worldBoundary.effectiveTime:resources.startTime,...(stationary||acting?{}:{resourceEnd:resources.endTime}),[clockField]:reference});
  }
  const metadata=barrier?{nativeBarrierAdditionTemplate:reference}:undefined;
  const previousStop=barrier?records.findLast(prior=>prior.kind==='farm-arrival-stop'&&prior.committed):null;
  if(previousStop)await previousStop.packet.presented;
  let cropGroup;
  if(crop){
   const {nativeClockResourceEnd}=await import('../../src/rendering/native-clock-resource-end.js');
   const ref=reference,epoch=ref.worldBoundary.effectiveTime,resourceEnd=ref.kind===26?nativeClockResourceEnd(epoch,ref.endTime):ref.endTime;
   const buffer=graphics.client.device.createBuffer({size:16,usage:72});graphics.client.device.queue.writeBuffer(buffer,0,new Float32Array(4));
   cropGroup=graphics.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
   record.cropGroup=cropGroup;record.cropBuffer=buffer;
   for(const byteOffset of ref.purpose==='retreat'?[0,4]:[0])
    graphics.client.registerClockBinding(buffer,{byteOffset,semantic:'relative',epoch,resourceEnd,nativeAnimalCrop:ref});
  }
  const homeSource=kind==='home-route'?reference.sourceRequest:arrival?reference.sourceHome.reference.sourceRequest:null;
  const peer=homeSource?.raidSpawnSequence&&!homeSource.recoveryHit&&records.findLast(r=>r.kind==='animal-crop-route'&&r.committed);
  if(kind==='home-route'&&resources.gates.length)record.gateGroups=resources.gates.map(gate=>{
   const buffer=graphics.client.device.createBuffer({size:16,usage:72});
   graphics.client.device.queue.writeBuffer(buffer,0,new Float32Array(4));
   graphics.client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch:resources.startTime,
    nativeGate:{gateId:gate.gateId,worldBoundary:resources.worldBoundary}});
   return graphics.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
  });
  const activeHome=records.findLast(r=>r.committed&&(r.kind==='home-route'||r.kind==='home-arrival'));
  const gateGroups=record.gateGroups??(activeHome?.kind==='home-route'?activeHome.gateGroups:null);
  const cropWithHome=kind==='animal-crop-route'&&reference.purpose==='center'&&activeHome?.kind==='home-route'&&
   activeHome.resources.sourceRequest?.raidSpawnSequence;
  let packet;
  if(farmGroup){
   const groups=new Map(farmGroups);groups.set(reference.actorId,farmGroup);
   packet=await prepareExistingGroup(graphics,[...groups.values()],{clock,nativeWorldBoundary:resources.worldBoundary,nativeFarmArrivalTemplate:reference},options.signal);
  }else if(gateGroups?.length&&(kind==='home-route'||arrival)){
   const groups=arrival?[...gateGroups]:[graphics.group,...gateGroups];
   if(peer)groups.push(peer.cropGroup);
   packet=await prepareExistingGroup(graphics,groups,
    {clock,nativeWorldBoundary:resources.worldBoundary,[arrival?'nativeHomeArrivalTemplate':'nativeHomeRouteTemplate']:reference},options.signal);
  }else packet=peer?await prepareExistingGroup(graphics,arrival?peer.cropGroup:[peer.cropGroup,graphics.group],
    {clock,nativeWorldBoundary:resources.worldBoundary,[arrival?'nativeHomeArrivalTemplate':'nativeHomeRouteTemplate']:reference},options.signal):crop?await prepareExistingGroup(graphics,cropWithHome?[cropGroup,graphics.group,...(gateGroups??[])]:cropGroup,{nativeAnimalCropTemplate:reference,nativeWorldBoundary:resources.worldBoundary,
   ...(options.encounterRetreat?{encounterRetreatDraft:options.encounterRetreat.source}:{}),
   clock:{...clock,safeUntil:resources.worldBoundary.effectiveTime,elapsed:resources.worldBoundary.effectiveTime,segments:[],paused:true}},options.signal):stopped?await prepareWorkerStoppedDraw(graphics,reference,records,record,options.signal):arrival?await prepareHomeAbsenceDraw({...graphics,clock},resources):previousStop?await prepareExistingGroup(graphics,previousStop.stoppedGroup,{clock,nativeWorldBoundary:resources.worldBoundary,...metadata},options.signal):await preparedWorldDraw({...graphics,clock,[template]:reference},resources.worldBoundary,0,options.signal,metadata);packet.presented.catch(()=>{});record.packet=packet;
  try{await onReady(record,options);}catch(error){packet.abort();throw error;}
  return {...(stopped?{canonicalPropsUnmasked:true}:{}),...(options.encounterRetreat?{preparedFrameSequence:packet.sequence,presented:packet.presented}:{}),
   preparedWorldBoundary:packet.preparedWorldBoundary,[profile.templateField]:reference,valid:packet.valid,commit(data){record.committed=packet.commit(data.worldBoundary,data[profile.bindingField]);if(record.committed){if(farmGroup)farmGroups.set(reference.actorId,farmGroup);onCommit?.(record,data);}return record.committed;},abort(){record.aborted=true;packet.abort();}};
 }});
 let endpoint=openEndpoint(resourcePorts.port2),sequence=0;
 const result={retireResourceEndpoint:()=>endpoint.dispose(),authority,...graphics,records,faults,clock,controlPort:sourcePort,resourcePort:resourcePorts.port1,
  command(command){return authority.execute({...command,sequence:++sequence});},
  async structureCommand(command){const captured={...command,sequence:++sequence};await authority.beginNativeStructureCommand(captured);return authority.execute(captured);},
  snapshot(){return JSON.parse(authority.execute({kind:'snapshot',sequence:++sequence}).snapshot);},
  advance(seconds=.05){return JSON.parse(authority.execute({kind:'advance',sequence:++sequence,seconds,nightFastForward:false,steps:2}).snapshot);},
  async attach(){result.snapshot();await authority.attachNativeIntentControl(sourcePort,controlSession);await authority.attachNativeResourcePreparation(resourcePorts.port1,resourceSession);},
  async attachRecoveredResources(replacement){
   const ports=new MessageChannel(),nextEndpoint=openEndpoint(ports.port2),previous=graphics;
   graphics=replacement;
   try{await authority.attachNativeResourcePreparation(ports.port1,resourceSession);}
   catch(error){graphics=previous;nextEndpoint.dispose();ports.port1.close();ports.port2.close();throw error;}
   resourcePorts.port1.close();resourcePorts.port2.close();resourcePorts=ports;endpoint=nextEndpoint;
  },
  async present(){await flush();await new Promise(resolve=>setImmediate(resolve));await graphics.host.idle();graphics.host.present();await flush();},
  async close(){
   authority.dispose();endpoint.dispose();resourcePorts.port1.close();resourcePorts.port2.close();
   originalGraphics.client.dispose();await originalGraphics.host.dispose();
   if(graphics!==originalGraphics){graphics.client.dispose();await graphics.host.dispose();}
  }
 };
 try{
  if(emptyBeastPhysics){
   const fetchOriginal=globalThis.fetch;
   globalThis.fetch=async path=>new Response(readFileSync(new URL('../../public'+path,import.meta.url)));
   try{await authority.enableBeastPhysics(undefined,{allowEmpty:true});}finally{globalThis.fetch=fetchOriginal;}
  }
  if(attach)await result.attach();
  return result;
 }catch(error){await result.close();throw error;}
}

// Same stopped-value packet as native-farm-arrival-stop-remote.js. The real
// Host must derive every stopped field and validate the typed24/25 template.
function prepareWorkerStoppedDraw(g,stop,records,record,signal){
 const task=stop.kind==='native-task-route-stop-reference',stroll=stop.kind==='native-idle-stroll-stop-reference';
 const prior=records.findLast(r=>r.kind===(task?'task-start':stroll?'idle-stroll':'farm-arrival')&&r.committed&&nativeResourceAdmissionProfile(r.kind).reference(r.resources).actorId===stop.sourceRoute.actorId);if(!prior)throw Error('Stopped worker has no acquired packet');
 const epoch=nativeResourceAdmissionProfile(prior.kind).reference(prior.resources).worldBoundary.effectiveTime,selector={kind:task?'native-task-route-stopped-body':stroll?'native-idle-stroll-stopped-body':'native-farm-arrival-stopped-body',version:1,stop,actorId:stop.sourceRoute.actorId};
 const buffer=g.client.device.createBuffer({label:'worker-authority-stopped-values',size:48,usage:72}),group=g.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});g.client.device.queue.writeBuffer(buffer,0,new Float32Array(12));
 g.client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch,nativeStopped:selector});['age',...Object.keys(NATIVE_STOP_POSE_FIELDS)].forEach((field,i)=>g.client.registerClockBinding(buffer,{byteOffset:(i+1)*4,semantic:'stop-value',epoch,nativeStopped:selector,stopField:field}));
 // A motor has its own physical uniform group, omitted by a later removal.
 // The Host supplies its acquired scalar; this fixture supplies no final value.
 const motorGroups=[];record.motorBuffers=[];
 if(!task&&!stroll)for(const gate of stop.gates){const buffer=g.client.device.createBuffer({label:'worker-authority-stopped-motor',size:16,usage:72}),motor=g.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});g.client.device.queue.writeBuffer(buffer,0,new Float32Array(4));g.client.registerClockBinding(buffer,{byteOffset:0,semantic:'stop-value',epoch:stop.worldBoundary.effectiveTime,nativeStopped:{kind:'native-farm-arrival-stopped-gate',version:1,stop,...gate},stopField:'opening'});motorGroups.push(motor);record.motorBuffers.push(buffer);}
 record.stoppedGroup=group;
 return prepareExistingGroup(g,[group,...motorGroups],{nativeWorldBoundary:stop.worldBoundary,[task?'nativeTaskRouteStopTemplate':stroll?'nativeIdleStrollStopTemplate':'nativeFarmArrivalStopTemplate']:stop,clock:{version:1,epoch:0,elapsed:stop.worldBoundary.effectiveTime,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:true,segments:[]}},signal);
}

function prepareExistingGroup(g,group,metadata,signal){
 g.client.beginFrame({nativeWorldBoundary:metadata.nativeWorldBoundary});
 const encoder=g.client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:g.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.setPipeline(g.pipeline);for(const item of Array.isArray(group)?group:[group]){pass.setBindGroup(0,item);pass.draw(3);}pass.end();g.client.device.queue.submit([encoder.finish()]);
 return g.client.prepareNativeWorldFrame(metadata,{signal});
}

export async function untilProduction(f,condition){
 for(let i=0;i<2000;i++){
  if(f.faults.length)throw Error(f.faults.join('\n'));if(condition())return;
  const status=f.authority.nativeIntentProductionStatus();if(status.phase==='idle'&&status.last?.status==='committed')f.snapshot();
  await f.present();await new Promise(resolve=>setImmediate(resolve));
 }
 throw Error('Native authority production did not reach boundary: '+JSON.stringify(f.authority.nativeIntentProductionStatus()));
}
