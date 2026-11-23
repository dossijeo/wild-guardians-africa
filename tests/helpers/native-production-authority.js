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
const kinds={prepareNativeFarmArrivalResources:['farm-arrival','farmArrivalTemplate','nativeFarmArrival'],prepareNativeIdleStrollResources:['idle-stroll','strollTemplate','nativeStroll'],prepareNativeIdleCycleResources:['idle-cycle','cycleTemplate','nativeIdleCycle'],prepareNativeInitialIdleBodyResources:['initial-idle-body','initialBodyTemplate','nativeInitialIdleBody'],prepareNativeHomeRouteResources:['home-route','homeTemplate','nativeHome'],prepareNativeHomeArrivalResources:['home-arrival'],prepareNativeTaskStartResources:['task-start','startTemplate','nativeStart'],prepareNativeTaskActionResources:['task-action','actionTemplate','nativeAction'],prepareNativeTaskConsequenceResources:['task-consequence','consequenceTemplate','nativeConsequence'],prepareNativeTaskSettlementResources:['task-settlement','settlementTemplate','nativeSettlement']};

// Actual authority and both production ports, existing remote draw Host and
// retained packets; the GPU queue is deterministic, not hardware/visual QA.
export async function nativeProductionAuthority(state,{chunkKeys=Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),nativeBootstrap=null,onPrepare=()=>{},onReady=()=>{},onCommit=null,attach=true,transportSession=null,onNativeIntentControlError=()=>{},compactPausedAcks=false,compactViewAcks=false,observeWorldMotion=false,getTerrainManifest=()=>({epoch:'deterministic-host-test',chunks:[]})}={}){
 const controlSession=transportSession??'production-control',resourceSession=transportSession??'production-resources';
 const faults=[],authority=createSimulationAuthority(module,serialize(state),chunkKeys,{nativeBootstrap,getTerrainManifest,compactPausedAcks,compactViewAcks,observeWorldMotion,onNativeIntentControlError:e=>{faults.push(String(e));onNativeIntentControlError(e);}});
 const [sourcePort,drawPort]=pair(),graphics=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeTaskRouteStopVersion:1,nativeTaskRouteStopClockVersion:1,nativeBarrierAdditionVersion:1,nativeBarrierAdditionClockVersion:1,nativeRestoredWallRepairVersion:1,nativeFarmArrivalVersion:1,nativeFarmArrivalStopVersion:1,nativeFarmArrivalStopClockVersion:1,nativeFarmArrivalStopGateVersion:1,nativeTaskStartVersion:1,nativeTaskSettlementVersion:1,nativeInitialIdleBodyVersion:1,nativeIdleCycleVersion:1,nativeTaskConsequenceVersion:1,nativeDeferredResumeVersion:1,nativeTaskActionVersion:1,nativeTaskActionRestoreVersion:1,nativeTaskActionClockVersion:1,nativeResumeVersion:1,nativeSuspendedVersion:1,nativeHomeRouteVersion:1,nativeIdleStrollVersion:1,nativeIdleStrollStopVersion:1,nativeIdleStrollStopClockVersion:1,nativeHomeArrivalVersion:1}},{intentControl:{port:drawPort,session:controlSession},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
 const {port1,port2}=new MessageChannel(),records=[];
 const clock={version:1,epoch:0,elapsed:state.elapsed,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:false,segments:[{start:state.elapsed,end:Number.MAX_SAFE_INTEGER,rate:1,realDuration:Number.MAX_SAFE_INTEGER-state.elapsed}]};
 const endpoint=attachNativeResourcePreparationEndpoint({port:port2,session:resourceSession,isRunning:()=>true,onError:e=>faults.push(String(e)),prepare:async(method,resources,options)=>{
  const barrier=method==='prepareNativeBarrierAdditionResources';
  const [kind,template,clockField]=barrier?['barrier-addition']:method==='prepareNativeGateResources'&&resources.kind===12?['idle-stroll-stop']:method==='prepareNativeGateResources'&&resources.kind===25?['task-route-stop']:method==='prepareNativeGateResources'&&resources.kind===24?['farm-arrival-stop']:kinds[method],profile=nativeResourceAdmissionProfile(kind),reference=profile.reference(resources),record={kind,resources,minSequence:options.minSequence,terrainManifest:options.terrainManifest,...(barrier?{nativeBarrierWallEntities:options.nativeBarrierWallEntities}:{}),committed:false,aborted:false};records.push(record);
  await onPrepare(record);
  if(options.signal.aborted)throw new DOMException('Preparation cancelled','AbortError');
  // Same single-generation backpressure used by the real WorldSurface.
  await graphics.client.whenFrameSettled();
  if(options.signal.aborted)throw new DOMException('Preparation cancelled','AbortError');
  const stationary=['initial-idle-body','idle-cycle','task-settlement'].includes(kind),acting=kind==='task-action',arrival=kind==='home-arrival';
  const stopped=['farm-arrival-stop','task-route-stop','idle-stroll-stop'].includes(kind);
  if(!arrival&&!stopped&&!barrier)graphics.client.registerClockBinding(graphics.buffer,{byteOffset:0,semantic:'relative',epoch:stationary?resources.worldBoundary.effectiveTime:resources.startTime,...(stationary||acting?{}:{resourceEnd:resources.endTime}),[clockField]:reference});
  const metadata=barrier?{nativeBarrierAdditionTemplate:reference}:undefined;
  const previousStop=barrier?records.findLast(prior=>prior.kind==='farm-arrival-stop'&&prior.committed):null;
  if(previousStop)await previousStop.packet.presented;
  const packet=stopped?await prepareWorkerStoppedDraw(graphics,reference,records,record,options.signal):arrival?await prepareHomeAbsenceDraw({...graphics,clock},resources):previousStop?await prepareExistingGroup(graphics,previousStop.stoppedGroup,{clock,nativeWorldBoundary:resources.worldBoundary,...metadata},options.signal):await preparedWorldDraw({...graphics,clock,[template]:reference},resources.worldBoundary,0,options.signal,metadata);packet.presented.catch(()=>{});record.packet=packet;
  try{await onReady(record);}catch(error){packet.abort();throw error;}
  return {...(stopped?{canonicalPropsUnmasked:true}:{}),preparedWorldBoundary:packet.preparedWorldBoundary,[profile.templateField]:reference,valid:packet.valid,commit(data){record.committed=packet.commit(data.worldBoundary,data[profile.bindingField]);if(record.committed)onCommit?.(record,data);return record.committed;},abort(){record.aborted=true;packet.abort();}};
 }});
 let sequence=0;
 const result={authority,...graphics,records,faults,clock,controlPort:sourcePort,resourcePort:port1,
  command(command){return authority.execute({...command,sequence:++sequence});},
  async structureCommand(command){const captured={...command,sequence:++sequence};await authority.beginNativeStructureCommand(captured);return authority.execute(captured);},
  snapshot(){return JSON.parse(authority.execute({kind:'snapshot',sequence:++sequence}).snapshot);},
  advance(seconds=.05){return JSON.parse(authority.execute({kind:'advance',sequence:++sequence,seconds,nightFastForward:false,steps:2}).snapshot);},
  async attach(){result.snapshot();await authority.attachNativeIntentControl(sourcePort,controlSession);await authority.attachNativeResourcePreparation(port1,resourceSession);},
  async present(){await flush();await new Promise(resolve=>setImmediate(resolve));await graphics.host.idle();graphics.host.present();await flush();},
  async close(){authority.dispose();endpoint.dispose();port1.close();port2.close();graphics.client.dispose();await graphics.host.dispose();}
 };
 try{if(attach)await result.attach();return result;}catch(error){await result.close();throw error;}
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
