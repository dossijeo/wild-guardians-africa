import {build} from 'esbuild';
import {resolve} from 'node:path';
import {createWorkerGameRuntime} from '../../src/simulation/worker-game-runtime.js';
import {createMainSnapshotDecoder} from '../../src/simulation/main-thread-snapshot-transport.js';
import {nativeIdleStrollGameSave} from './native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority} from './native-production-authority.js';
import {createPlant} from '../../src/simulation/crops.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
export async function untilNativeRecovery(predicate,pump=turn){const end=Date.now()+5000;while(!predicate()){if(Date.now()>end)throw Error('Native recovery host fixture timed out');await pump();await turn();}}
export const recoveryEffects=(sequence,elapsed)=>({sequence,presentationCheckpoint:{version:1,sequence,elapsed,...Object.fromEntries(['guardian','agriculture','blessing'].map(key=>[key,{version:1,sequence,elapsed}]))},workCheckpoint:{version:1,sequence,elapsed,effects:[]}});
let generation=0;
export async function nativeRecoveryHost({inactive=false,holdPreparation=false,failPreparation=false,withHarvestTarget=false,timeoutMs=1000}={}){
 const state=nativeIdleStrollGameSave().state;if(inactive)delete state.workers[0].nativeRouteAdmission;let targetId=null;if(withHarvestTarget){const worker=state.workers[0],plant=createPlant(`plant-${state.nextId++}`,'mijo',worker.x+1,worker.z,worker.centerId);plant.growth=999999;state.plants.push(plant);targetId=plant.id;}
 let releasePreparation;const preparing=new Promise(resolve=>{releasePreparation=resolve;});
 const native=await nativeProductionAuthority(state,{attach:false,compactPausedAcks:true,onReady:()=>{if(failPreparation)throw Error('native checkpoint preparation fixture failed');return holdPreparation?preparing:undefined;}}),messages=[],commands=[],controls=[],timers=new Map(),channels=[],heldAcks=[],publications=[];let handler,closed=false,runtime,now=0,timerId=0,sequence=0,manifest=null,held=null,lastControlId=0,holdAcks=false,releaseError=null,releaseGate=null,releaseAck=null,deferCheckpoint=false,terrainGate=null;
 function presentation(){const decoder=createMainSnapshotDecoder();const port={sent:[],postMessage(message){port.sent.push(message);if(message.kind!=='publication')return;const p=decoder.decode(message).publication;publications.push(p);const ack=()=>{port.onmessage?.({data:{kind:'publicationReceipt',session:'s',sequence:p.sequence}});port.onmessage?.({data:{kind:'publicationAck',session:'s',sequence:p.sequence,...(p.terrainCheckpoint&&!message.skipWorkCheckpoint?(deferCheckpoint?{checkpointUnavailable:true}:recoveryEffects(p.sequence,p.elapsed)):{})}});};if(holdAcks&&p.terrainCheckpoint)heldAcks.push(ack);else queueMicrotask(ack);},start(){},close(){decoder.dispose();}};return port;}
 const harness={self:{},postMessage(message){messages.push(message);if(message.kind==='publication')queueMicrotask(()=>handler?.({data:{kind:'publicationAck',session:'s',sequence:message.publication.sequence}}));},close(){closed=true;},createRuntime(options){runtime=createWorkerGameRuntime({...options,now:()=>now,schedule:fn=>{timers.set(++timerId,fn);return timerId;},cancel:id=>timers.delete(id)});return runtime;},createClient(options){return {
  ready:Promise.resolve(),terrainBlocked:()=>false,
  submit(command){const p=native.command(command);sequence=p.sequence;commands.push({...command,sequence});if(p.terrainCheckpoint){manifest={epoch:'native-recovery-host',chunks:p.terrainCheckpoint.chunks.map(c=>({cx:c.cx,cz:c.cz,revision:1}))};p.terrainCheckpoint.terrainManifest=manifest;}return {accepted:true,sequence,result:Promise.resolve({...p,session:'s'})};},
  async quiesceNativeIntentProduction(id,options){if(!Number.isSafeInteger(id)||id<=lastControlId||held)throw Error('Native recovery fixture control identity or hold invalid');lastControlId=id;controls.push({kind:'quiesce',id,options});const item={id,receipt:null};held=item;item.receipt=await native.authority.quiesceNativeIntentProduction();const drained=await native.authority.flushNativeResourcePreparation({allowRetired:options?.forLostDraw===true});
   if(drained?.terminal&&options?.forLostDraw)item.actor=await native.authority.terminalWorkerRoute();
   return {version:1,holdId:id,...(item.actor?{terminal:true}:{}),publicationFloor:item.receipt===null?null:native.authority.nativeIntentProductionStatus().publicationSequence};},
  async resumeNativeIntentProduction(holdId,id){if(!held||held.id!==holdId||!Number.isSafeInteger(id)||id<=lastControlId)throw Error('Native recovery fixture release identity invalid');lastControlId=id;controls.push({kind:'resume',id,holdId});if(releaseError)throw releaseError;
   if(held.actor)await native.authority.checkHeldDraw(holdId,held.receipt,held.actor);
   native.authority.resumeNativeIntentProduction(held.receipt);held=null;if(releaseGate)await releaseGate;return {version:1,holdId};},
  attachNativeIntentControl:(port,options)=>options?.recoveryHold?native.authority.attachHeldWorkerRoute(port,'production-control',options.recoveryHold,held.receipt,held.actor):native.authority.attachNativeIntentControl(port,'production-control'),
  async attachNativeResourcePreparation(port,options){if(options?.recoveryHold)await native.authority.checkHeldDraw(options.recoveryHold,held.receipt,held.actor);return native.authority.attachNativeResourcePreparation(port,'production-resources');},
  inspectTerrainRecoveryHandoff:through=>Promise.resolve({epoch:manifest.epoch,lastSequence:through,chunks:manifest.chunks}),reattachTerrain:()=>terrainGate??Promise.resolve(),dispose(){native.authority.dispose();},status:()=>({state:'ready',inflight:null,queued:0})
 };}};
 const prior=globalThis.__nativeRecoveryHost;globalThis.__nativeRecoveryHost=harness;
 try{
  const result=await build({entryPoints:[resolve('src/simulation/worker-runtime-host.js')],bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':'{"DEV":false,"MODE":"production"}'},banner:{js:'const __nativeRecoveryHost=globalThis.__nativeRecoveryHost;const self=__nativeRecoveryHost.self;const postMessage=(...args)=>__nativeRecoveryHost.postMessage(...args);const close=()=>__nativeRecoveryHost.close();'},plugins:[{name:'native-recovery-existing-owners',setup(p){
   p.onResolve({filter:/simulation-authority-client\.js$/},()=>({path:'client',namespace:'native-recovery'}));p.onResolve({filter:/worker-game-runtime\.js$/},()=>({path:'runtime',namespace:'native-recovery'}));
   p.onLoad({filter:/.*/,namespace:'native-recovery'},args=>({contents:args.path==='client'?'export const createSimulationAuthorityClient=options=>__nativeRecoveryHost.createClient(options);':'export const createWorkerGameRuntime=options=>__nativeRecoveryHost.createRuntime(options);',loader:'js'}));
  }}]});
  await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64')+'#native-recovery-host-'+generation++);handler=harness.self.onmessage;
 }finally{globalThis.__nativeRecoveryHost=prior;}
 const send=data=>handler({data:{session:'s',...data}}),initial=presentation(),hello=port=>port.onmessage({data:{kind:'presentationTimelineHello',session:'s',version:1,maxPublications:16,maxBytes:100000000}});
 const dispose=async()=>{releasePreparation();releaseAck?.();holdAcks=false;for(const ack of heldAcks.splice(0))ack();try{if(!closed)await send({kind:'dispose'});}finally{initial.close();for(const port of channels)port.close();await native.close();}};
 try{
  const starting=send({kind:'initialize',clientOptions:{snapshot:'{}',chunkKeys:[],terrainHistory:{maxPending:16,maxRetainedBytes:4096,maxBatchBytes:4096,maxBatchRevisions:8}},terrainPort:{},presentationPort:initial,runtimeOptions:{startupSuspended:false,presentationTimeline:true,historicalRecovery:true,mainThreadProjection:true,coalescePublications:true,visualRecovery:{enabled:true,work:true},visualRecoveryTimeouts:{idleMs:timeoutMs,totalMs:timeoutMs*3}}});await untilNativeRecovery(()=>typeof initial.onmessage==='function');hello(initial);await starting;
  await send({kind:'command',id:20,command:{kind:'pause',reason:'menu'}});await untilNativeRecovery(()=>!runtime.status().busy&&runtime.status().queued===0);await turn();
  if(messages.some(m=>m.kind==='failure'))throw Error(JSON.stringify(messages.filter(m=>m.kind==='failure')));
  await send({kind:'attachNativeIntentControl',id:21,port:native.controlPort});await send({kind:'attachNativeResourcePreparation',id:22,port:native.resourcePort});
  return {native,targetId,messages,commands,controls,publications,heldAcks,initial,send,hello,presentation,runtime,releasePreparation,holdAcks(value=true){holdAcks=value;},releaseAcks(){for(const ack of heldAcks.splice(0))ack();},terrainGate(value){terrainGate=value;},deferCheckpoint(value=true){deferCheckpoint=value;},rejectRelease(error){releaseError=error;},holdReleaseAck(){releaseGate=new Promise(resolve=>{releaseAck=resolve;});},releaseAck:()=>releaseAck?.(),elapse(ms){now+=ms;},async tick(){const entry=timers.entries().next().value;if(!entry)throw Error('Native recovery clock not scheduled');timers.delete(entry[0]);now+=50;entry[1]();await untilNativeRecovery(()=>!runtime.status().busy);await turn();},async pump(){await native.present();await turn();},track:port=>channels.push(port),dispose};
 }catch(error){await dispose();throw error;}
}
