import {readFileSync} from 'node:fs';
import {MessageChannel} from 'node:worker_threads';
import {createSimulationAuthority} from '../../src/simulation/simulation-authority.js';
import {serialize} from '../../src/persistence/snapshots.js';
import {attachNativeResourcePreparationEndpoint} from '../../src/rendering/native-resource-preparation-receiver.js';
import {nativeResourceAdmissionProfile} from '../../src/world/native-resource-admission-profiles.js';
import {pair,fixture,flush,preparedWorldDraw} from './remote-webgpu-fixture.js';
import {prepareHomeAbsenceDraw} from './native-home-arrival-remote.js';

const module=new WebAssembly.Module(readFileSync(new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const kinds={prepareNativeIdleStrollResources:['idle-stroll','strollTemplate','nativeStroll'],prepareNativeIdleCycleResources:['idle-cycle','cycleTemplate','nativeIdleCycle'],prepareNativeInitialIdleBodyResources:['initial-idle-body','initialBodyTemplate','nativeInitialIdleBody'],prepareNativeHomeRouteResources:['home-route','homeTemplate','nativeHome'],prepareNativeHomeArrivalResources:['home-arrival'],prepareNativeTaskStartResources:['task-start','startTemplate','nativeStart'],prepareNativeTaskActionResources:['task-action','actionTemplate','nativeAction'],prepareNativeTaskConsequenceResources:['task-consequence','consequenceTemplate','nativeConsequence'],prepareNativeTaskSettlementResources:['task-settlement','settlementTemplate','nativeSettlement']};

// Actual authority and both production ports, existing remote draw Host and
// retained packets; the GPU queue is deterministic, not hardware/visual QA.
export async function nativeProductionAuthority(state,{onPrepare=()=>{},onReady=()=>{},attach=true,getTerrainManifest=()=>({epoch:'deterministic-host-test',chunks:[]})}={}){
 const faults=[],authority=createSimulationAuthority(module,serialize(state),Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),{getTerrainManifest,onNativeIntentControlError:e=>faults.push(String(e))});
 const [sourcePort,drawPort]=pair(),graphics=await fixture({capabilities:{width:20,height:10,format:'rgba8unorm',nativeTaskStartVersion:1,nativeTaskSettlementVersion:1,nativeInitialIdleBodyVersion:1,nativeIdleCycleVersion:1,nativeTaskConsequenceVersion:1,nativeDeferredResumeVersion:1,nativeTaskActionVersion:1,nativeTaskActionRestoreVersion:1,nativeTaskActionClockVersion:1,nativeResumeVersion:1,nativeSuspendedVersion:1,nativeHomeRouteVersion:1,nativeIdleStrollVersion:1,nativeIdleStrollStopVersion:1,nativeIdleStrollStopClockVersion:1,nativeHomeArrivalVersion:1}},{intentControl:{port:drawPort,session:'production-control'},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
 const {port1,port2}=new MessageChannel(),records=[];
 const clock={version:1,epoch:0,elapsed:state.elapsed,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:false,segments:[{start:state.elapsed,end:Number.MAX_SAFE_INTEGER,rate:1,realDuration:Number.MAX_SAFE_INTEGER-state.elapsed}]};
 const endpoint=attachNativeResourcePreparationEndpoint({port:port2,session:'production-resources',isRunning:()=>true,onError:e=>faults.push(String(e)),prepare:async(method,resources,options)=>{
  const [kind,template,clockField]=kinds[method],profile=nativeResourceAdmissionProfile(kind),reference=profile.reference(resources),record={kind,resources,minSequence:options.minSequence,terrainManifest:options.terrainManifest,committed:false,aborted:false};records.push(record);
  await onPrepare(record);
  if(options.signal.aborted)throw new DOMException('Preparation cancelled','AbortError');
  // Same single-generation backpressure used by the real WorldSurface.
  await graphics.client.whenFrameSettled();
  if(options.signal.aborted)throw new DOMException('Preparation cancelled','AbortError');
  const stationary=['initial-idle-body','idle-cycle','task-settlement'].includes(kind),acting=kind==='task-action',arrival=kind==='home-arrival';
  if(!arrival)graphics.client.registerClockBinding(graphics.buffer,{byteOffset:0,semantic:'relative',epoch:stationary?resources.worldBoundary.effectiveTime:resources.startTime,...(stationary||acting?{}:{resourceEnd:resources.endTime}),[clockField]:reference});
  const packet=arrival?await prepareHomeAbsenceDraw({...graphics,clock},resources):await preparedWorldDraw({...graphics,clock,[template]:reference},resources.worldBoundary,0,options.signal);packet.presented.catch(()=>{});record.packet=packet;
  try{await onReady(record);}catch(error){packet.abort();throw error;}
  return {preparedWorldBoundary:packet.preparedWorldBoundary,[profile.templateField]:reference,valid:packet.valid,commit(data){record.committed=packet.commit(data.worldBoundary,data[profile.bindingField]);return record.committed;},abort(){record.aborted=true;packet.abort();}};
 }});
 let sequence=0;
 const result={authority,...graphics,records,faults,clock,
  command(command){return authority.execute({...command,sequence:++sequence});},
  snapshot(){return JSON.parse(authority.execute({kind:'snapshot',sequence:++sequence}).snapshot);},
  advance(seconds=.05){return JSON.parse(authority.execute({kind:'advance',sequence:++sequence,seconds,nightFastForward:false,steps:2}).snapshot);},
  async attach(){result.snapshot();await authority.attachNativeIntentControl(sourcePort,'production-control');await authority.attachNativeResourcePreparation(port1,'production-resources');},
  async present(){await flush();await new Promise(resolve=>setImmediate(resolve));await graphics.host.idle();graphics.host.present();await flush();},
  async close(){authority.dispose();endpoint.dispose();port1.close();port2.close();graphics.client.dispose();await graphics.host.dispose();}
 };
 try{if(attach)await result.attach();return result;}catch(error){await result.close();throw error;}
}

export async function untilProduction(f,condition){
 for(let i=0;i<2000;i++){
  if(f.faults.length)throw Error(f.faults.join('\n'));if(condition())return;
  const status=f.authority.nativeIntentProductionStatus();if(status.phase==='idle'&&status.last?.status==='committed')f.snapshot();
  await f.present();await new Promise(resolve=>setImmediate(resolve));
 }
 throw Error('Native authority production did not reach boundary: '+JSON.stringify(f.authority.nativeIntentProductionStatus()));
}
