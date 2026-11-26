import {fixture as createRemoteFixture} from './helpers/remote-webgpu-fixture.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {wallVisualAt,WALL_REPAIR_DURATION} from '../src/simulation/structure-presentation.js';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {rational} from '../src/simulation/money.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {MessageChannel} from 'node:worker_threads';
import {attachWebGpuNativeResources} from '../src/app/webgpu-native-startup.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';
import {serialize} from '../src/persistence/snapshots.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority} from './helpers/native-production-authority.js';
import {createPlant,waterPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {centerServicePoint} from '../src/world/centers.js';
import {newGame,plant} from '../src/simulation/game.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate,pump=flush){const end=Date.now()+8000;while(!predicate()){if(Date.now()>end)throw Error('Native production lifecycle fixture timed out');await pump();await flush();}}
function clientFixture(){
 const sent=[],worker={postMessage:m=>sent.push(m),terminate(){this.terminated=true;}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',workerFactory:()=>worker});
 const receive=data=>worker.onmessage({data:{session:'s',...data}});receive({kind:'ready'});return {client,sent,worker,receive,dispose:()=>client.dispose()};
}
function hostedFixture(){
 const sent=[],worker={postMessage:m=>sent.push(m),terminate(){this.terminated=true;}},state={sequence:0},runtime=createWorkerHostedRuntime({world:{createConfirmedReceiver:()=>({accept:p=>(state.sequence=p.sequence,{accepted:true}),acceptUnchanged:p=>(state.sequence=p.sequence,{accepted:true}),status:()=>({sequence:state.sequence,lastElapsed:0})})},session:'s',clientOptions:{snapshot:'{}',chunkKeys:[]},workerFactory:()=>worker});
 const receive=data=>worker.onmessage({data:{session:'s',...data}}),starting=runtime.start();receive({kind:'publication',publication:{sequence:1,elapsed:0,events:[]}});receive({kind:'started',sequence:1,status:{}});return {runtime,sent,worker,receive,starting,dispose:()=>runtime.dispose()};
}

test('authority lifecycle RPC remains outside the command FIFO and never consumes a command sequence',async()=>{
 const f=clientFixture();try{
  await f.client.ready;const first=f.client.submit({kind:'snapshot'});first.result.catch(()=>{});const held=f.client.quiesceNativeIntentProduction(40);held.catch(()=>{});const second=f.client.submit({kind:'snapshot'});second.result.catch(()=>{});
  assert.equal(f.sent.at(-1).kind,'quiesceNativeIntentProduction');assert.equal(f.client.status().inflight,1);assert.equal(f.client.status().next,3);
  f.receive({kind:'nativeIntentProductionQuiesced',id:40,holdId:40,version:1});assert.deepEqual(await held,{version:1,holdId:40});
  f.receive({kind:'result',sequence:1});await first.result;assert.equal(f.sent.at(-1).command.sequence,2);
  const resuming=f.client.resumeNativeIntentProduction(40,41);f.receive({kind:'nativeIntentProductionQuiesced',id:40,holdId:40,version:1});assert.equal(f.client.status().state,'ready');
  f.receive({kind:'nativeIntentProductionResumed',id:41,holdId:40,version:1});await resuming;f.receive({kind:'result',sequence:2});await second.result;
  await assert.rejects(f.client.quiesceNativeIntentProduction(40),/identity|unavailable/i);assert.equal(f.client.status().next,3);
 }finally{f.dispose();}
});

for(const malformed of [{kind:'nativeIntentProductionResumed',holdId:40,version:1},{kind:'nativeIntentProductionQuiesced',holdId:41,version:1},{kind:'nativeIntentProductionQuiesced',holdId:40,version:2}])test(`authority rejects malformed lifecycle response ${JSON.stringify(malformed)}`,async()=>{
 const f=clientFixture();try{await f.client.ready;const held=f.client.quiesceNativeIntentProduction(40),rejected=assert.rejects(held,/response|identity|invalid/i);rejected.catch(()=>{});f.receive({...malformed,id:40});await rejected;assert.equal(f.client.status().state,'failed');assert.equal(f.worker.terminated,true);}finally{f.dispose();}
});

test('failed resume is observable and a later request can release the still-held source',async()=>{
 const f=clientFixture();try{await f.client.ready;let p=f.client.quiesceNativeIntentProduction(8);f.receive({kind:'nativeIntentProductionQuiesced',id:8,holdId:8,version:1});await p;p=f.client.resumeNativeIntentProduction(7,9);f.receive({kind:'nativeIntentProductionControlError',id:9,message:'stale source hold'});await assert.rejects(p,/stale source hold/);assert.equal(f.client.status().state,'ready');p=f.client.resumeNativeIntentProduction(8,10);f.receive({kind:'nativeIntentProductionResumed',id:10,holdId:8,version:1});await p;}finally{f.dispose();}
});

test('authority disposal rejects pending lifecycle work and late success cannot revive it',async()=>{
 const f=clientFixture();await f.client.ready;const p=f.client.quiesceNativeIntentProduction(4),rejected=assert.rejects(p,/disposed/i);rejected.catch(()=>{});f.dispose();f.receive({kind:'nativeIntentProductionQuiesced',id:4,holdId:4,version:1});await rejected;await assert.rejects(f.client.resumeNativeIntentProduction(4,5),/unavailable/i);assert.equal(f.client.status().state,'closed');
});

test('hosted lifecycle operations use the existing RPC map and reject stale response witnesses',async()=>{
 const f=hostedFixture();try{await f.starting;const q=f.runtime.quiesceNativeIntentProduction(),id=f.sent.at(-1).id;assert.equal(f.sent.at(-1).kind,'quiesceNativeIntentProduction');f.receive({kind:'nativeIntentProductionQuiesced',id,holdId:id,version:1});assert.deepEqual(await q,{version:1,holdId:id});const p=f.runtime.resumeNativeIntentProduction(id),next=f.sent.at(-1).id;assert(next>id);f.receive({kind:'nativeIntentProductionQuiesced',id,holdId:id,version:1});f.receive({kind:'nativeIntentProductionResumed',id:next,holdId:id,version:1});await p;assert.equal(f.runtime.status().running,true);}finally{f.dispose();}
});

test('hosted lifecycle validates the hold identity and settles pending requests on close',async()=>{
 const f=hostedFixture();try{await f.starting;await assert.rejects(f.runtime.resumeNativeIntentProduction(0),/invalid|unavailable/i);const p=f.runtime.quiesceNativeIntentProduction(),rejected=assert.rejects(p,/disposed/i);rejected.catch(()=>{});f.dispose();await rejected;assert.equal(f.runtime.status().closed,true);}finally{f.dispose();}
});

const bundles=new Map();let generation=0;
async function bundle(kind){
 if(!bundles.has(kind))bundles.set(kind,(async()=>{
  const entry=kind==='source'?'simulation-authority-worker.js':'worker-runtime-host.js';
  const result=await build({entryPoints:[resolve('src/simulation/'+entry)],bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':'{"DEV":false,"MODE":"production"}'},banner:{js:'const __nativeProductionHarness=globalThis.__nativeProductionHarness;const performance={now:()=>__nativeProductionHarness.now?.()??globalThis.performance.now(),timeOrigin:globalThis.performance.timeOrigin};const self=__nativeProductionHarness.self;const postMessage=(...args)=>__nativeProductionHarness.postMessage(...args);const close=()=>__nativeProductionHarness.close();const fetch=(...args)=>__nativeProductionHarness.fetch(...args);'},plugins:[{name:'native-production-creation-adapters',setup(p){
   if(kind==='source')p.onResolve({filter:/simulation-authority\.js$/},()=>({path:'authority',namespace:'native-lifecycle'}));
   else p.onResolve({filter:/simulation-authority-client\.js$/},()=>({path:'client',namespace:'native-lifecycle'}));
   p.onResolve({filter:/\.wasm\?url$/},()=>({path:'wasm',namespace:'native-lifecycle'}));
   p.onLoad({filter:/.*/,namespace:'native-lifecycle'},args=>({contents:args.path==='wasm'?"export default 'native-lifecycle-wasm';":args.path==='authority'?'export const authoritySnapshotFields=Symbol();export const createSimulationAuthority=(...args)=>__nativeProductionHarness.createAuthority(...args);':'export const createSimulationAuthorityClient=options=>__nativeProductionHarness.createClient(options);',loader:'js'}));
  }}]});return result.outputFiles[0].text;
 })());return bundles.get(kind);
}
async function loadWorker(kind,harness){const prior=globalThis.__nativeProductionHarness;globalThis.__nativeProductionHarness=harness;try{await import('data:text/javascript;base64,'+Buffer.from(await bundle(kind)).toString('base64')+'#native-lifecycle-'+generation++);}finally{globalThis.__nativeProductionHarness=prior;}}
function adapter(harness){
 const api={sent:[],closed:false,terminated:false,postMessage(data,transfer=[]){if(api.closed)throw Error('Fixture worker closed');api.sent.push({data,transfer});queueMicrotask(()=>Promise.resolve(harness.self.onmessage({data})).catch(error=>api.onerror?.({message:error.message})));},terminate(){if(api.terminated)return;api.terminated=true;api.closed=true;queueMicrotask(()=>harness.self.onmessage?.({data:{kind:'dispose',session:'s'}}));}};
 harness.postMessage=data=>{harness.messages.push(data);if(!api.closed)queueMicrotask(()=>api.onmessage?.({data}));};harness.close=()=>{api.closed=true;};return api;
}
async function sourceFixture(options={}){
 const {state=nativeIdleStrollGameSave().state,...nativeOptions}=options,snapshot=serialize(state);let onSourceError=()=>{},created=0;
 const native=await nativeProductionAuthority(state,{...nativeOptions,attach:false,transportSession:'s',onNativeIntentControlError:error=>onSourceError(error)}),wasm=readFileSync('src/world/wild-engine/spatial-savanna.wasm'),originalFetch=globalThis.fetch;
 const source={self:{},messages:[],fetch:async url=>url==='native-lifecycle-wasm'?{ok:true,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}:originalFetch(url),createAuthority(...args){
  assert.equal(args[3].nativeWorkerLifecycle,nativeOptions.nativeWorkerLifecycle===true);
  created++;onSourceError=args[3].onNativeIntentControlError;return native.authority;
 }},sourceWorker=adapter(source);
 await loadWorker('source',source);return {native,source,sourceWorker,snapshot,created:()=>created,async close(){sourceWorker.terminate();await flush();await native.close();}};
}
async function fullFixture(options={}){
 const base=await sourceFixture(options),{native,source,sourceWorker,snapshot}=base;
 const host={self:{},messages:[],fetch:globalThis.fetch,createClient:options=>createSimulationAuthorityClient({...options,workerFactory:()=>sourceWorker})},hostWorker=adapter(host),state=deserializeConfirmedState(snapshot),receiver=createConfirmedStateReceiver(state,'s');
 let runtime;
 const close=async()=>{runtime?.dispose();await flush();await flush();await base.close();};
 try{
  await loadWorker('host',host);
  runtime=createWorkerHostedRuntime({world:{createConfirmedReceiver:()=>receiver},session:'s',clientOptions:{snapshot,nativeWorkerLifecycle:options.nativeWorkerLifecycle===true,nativeAuthorityCheckpoints:options.nativeAuthorityCheckpoints===true,nativeBootstrap:options.nativeBootstrap??null,chunkKeys:options.chunkKeys??Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`)},runtimeOptions:{startupSuspended:true},workerFactory:()=>hostWorker});
  await runtime.start();return {runtime,native,source,host,sourceWorker,hostWorker,state,created:base.created,close};
 }catch(error){await close();throw error;}
}

test('ordinary startup resource wiring admits the real native actor through the existing host and source',async()=>{
 const f=await fullFixture();let attached=false;const graphicsPort={};
 try{
  await f.runtime.attachNativeIntentControl(f.native.controlPort);
  const ready=await attachWebGpuNativeResources({client:{attachNativeResourcePreparation(port){assert.equal(port,graphicsPort);attached=true;}},runtime:f.runtime,isCurrent:()=>f.runtime.status().running,channelFactory:()=>({port1:f.native.resourcePort,port2:graphicsPort})});
  assert.equal(attached,true);assert.deepEqual(ready,{version:1,session:'s'});await until(()=>f.native.records.some(r=>r.committed),()=>f.native.present());await f.runtime.submit({kind:'snapshot'});
  assert.equal(f.state.workers[0].nativeRouteAdmission,'native-idle-stroll');assert.equal(f.created(),1);assert.equal(f.native.authority.nativeResourcePreparationStatus().phase,'running');assert.deepEqual(f.native.faults,[]);
 }finally{await f.close();}
});

test('production hosted/source Worker modules keep the real receipt local while both native ports attach under suspension',async()=>{
 const f=await fullFixture();try{
  const hold=await f.runtime.quiesceNativeIntentProduction();assert.deepEqual(Object.keys(hold).sort(),['holdId','version']);
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);
  await f.runtime.submit({kind:'snapshot'});await f.native.present();assert.equal(f.native.records.length,0);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');
  const wire=f.source.messages.find(m=>m.kind==='nativeIntentProductionQuiesced');assert.deepEqual(Object.keys(wire).sort(),['holdId','id','kind','session','version']);assert.equal(wire.holdId,hold.holdId);
  await f.runtime.resumeNativeIntentProduction(hold.holdId);await until(()=>f.native.records.some(r=>r.committed),()=>f.native.present());
  await f.runtime.submit({kind:'snapshot'});assert.equal(f.state.workers[0].nativeRouteAdmission,'native-idle-stroll');assert.equal(f.native.records[0].resources.bodyId,1);assert.equal(f.created(),1);
  const commands=f.sourceWorker.sent.filter(m=>m.data.kind==='command').map(m=>m.data.command);assert.deepEqual(commands.map(c=>c.sequence),commands.map((_,i)=>i+1));assert.equal(commands.filter(c=>c.kind==='snapshot').length,3);assert(commands.every(c=>['snapshot','addChunk'].includes(c.kind)));
  const second=await f.runtime.quiesceNativeIntentProduction();assert(second.holdId>hold.holdId);await assert.rejects(f.runtime.resumeNativeIntentProduction(hold.holdId),/hold|receipt|stale|unavailable/i);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');await f.runtime.resumeNativeIntentProduction(second.holdId);assert.deepEqual(f.native.faults,[]);
 }finally{await f.close();}
});

for(const rejectCommit of [false,true])test(`source Worker suspension waits for its resource endpoint before replying (commit rejected=${rejectCommit})`,async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const f=await fullFixture({onReady:record=>{if(rejectCommit)record.packet.commit=()=>false;return gate;}});
 const port=f.native.resourcePort,send=port.postMessage.bind(port),withheld=[];let blocked=true,settled=false;
 port.postMessage=message=>{if(blocked&&['commitNativeGateResources','flushNativeResources'].includes(message.kind))withheld.push(message);else send(message);};
 const releaseMessages=()=>{blocked=false;for(const message of withheld.splice(0))send(message);};
 try{
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(port);await until(()=>f.native.records[0]?.packet,()=>f.native.present());
  const waiting=f.runtime.quiesceNativeIntentProduction();waiting.then(()=>{settled=true;},()=>{settled=true;});
  await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='quiescing');release();await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='suspended',()=>f.native.present());
  await flush();await flush();assert.equal(f.native.authority.nativeResourcePreparationStatus().retained,0);assert.equal(f.native.records[0].committed,false);assert.equal(settled,false);
  assert.deepEqual(withheld.map(m=>m.kind),['commitNativeGateResources','flushNativeResources']);
  const lastSequence=f.sourceWorker.sent.filter(m=>m.data.kind==='command').at(-1).data.command.sequence;
  releaseMessages();
  if(rejectCommit){await assert.rejects(waiting,/commit|closed|unavailable|flush/i);await until(()=>f.runtime.status().closed||f.runtime.status().fault);assert.equal(f.source.messages.filter(m=>m.kind==='nativeIntentProductionQuiesced').length,0);assert.equal(f.source.messages.filter(m=>m.kind==='nativeIntentControlFailure').length,1);assert.equal(f.source.messages.filter(m=>m.kind==='nativeIntentProductionControlError').length,0);await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='closed');assert.equal(f.sourceWorker.terminated,true);assert.equal(f.hostWorker.terminated,true);}
  else{const receipt=await waiting;assert.equal(f.native.records[0].committed,true);assert.equal(f.native.authority.nativeResourcePreparationStatus().pending,0);await f.runtime.resumeNativeIntentProduction(receipt.holdId);assert.deepEqual(f.native.faults,[]);}
  assert.equal(f.sourceWorker.sent.filter(m=>m.data.kind==='command').at(-1).data.command.sequence,lastSequence);assert.equal(f.created(),1);
 }finally{release();releaseMessages();await f.close();}
});

test('a failed resource barrier after a completed native commit closes the production chain instead of orphaning a resumable source',async()=>{
 const f=await fullFixture();try{
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);await until(()=>f.native.records.some(r=>r.committed),()=>f.native.present());
  const sequence=f.sourceWorker.sent.filter(m=>m.data.kind==='command').at(-1).data.command.sequence,send=f.native.resourcePort.postMessage.bind(f.native.resourcePort);
  f.native.resourcePort.postMessage=message=>send(message.kind==='flushNativeResources'?{...message,session:'rejected-resource-session'}:message);
  await assert.rejects(f.runtime.quiesceNativeIntentProduction({withPublicationFloor:true}),/drain|session|closed/i);await until(()=>f.runtime.status().fault);await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='closed');
  assert.equal(f.sourceWorker.terminated,true);assert.equal(f.hostWorker.terminated,true);assert.equal(f.source.messages.filter(m=>m.kind==='nativeIntentControlFailure').length,1);assert.equal(f.source.messages.filter(m=>m.kind==='nativeIntentProductionControlError'||m.kind==='nativeIntentProductionQuiesced').length,0);
  await assert.rejects(f.runtime.quiesceNativeIntentProduction(),/failed|unavailable|drain|session|closed/i);await assert.rejects(f.runtime.submit({kind:'snapshot'}),/failed|running|drain|session|closed/i);assert.equal(f.sourceWorker.sent.filter(m=>m.data.kind==='command').at(-1).data.command.sequence,sequence);assert.equal(f.created(),1);
 }finally{await f.close();}
});

test('a failed resource barrier without a native producer stays recoverable and permits a real replacement port and null-hold release',async()=>{
 const state=nativeIdleStrollGameSave().state;delete state.workers[0].nativeRouteAdmission;const f=await fullFixture({state});let endpoint,port;try{
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);const send=f.native.resourcePort.postMessage.bind(f.native.resourcePort);f.native.resourcePort.postMessage=message=>send(message.kind==='flushNativeResources'?{...message,session:'rejected-resource-session'}:message);
  await assert.rejects(f.runtime.quiesceNativeIntentProduction({withPublicationFloor:true}),/session|closed/i);assert.equal(f.runtime.status().running,true);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'inactive');assert.equal(f.source.messages.some(m=>m.kind==='nativeIntentControlFailure'),false);
  const channel=new MessageChannel();port=channel.port1;endpoint=attachNativeResourcePreparationEndpoint({port:channel.port2,session:'s',isRunning:()=>true,prepare:()=>{throw Error('Inactive producer must not prepare resources');}});await f.runtime.attachNativeResourcePreparation(port);
  const hold=await f.runtime.quiesceNativeIntentProduction({withPublicationFloor:true});assert.equal(hold.publicationFloor,null);await f.runtime.resumeNativeIntentProduction(hold.holdId);await f.runtime.submit({kind:'snapshot'});assert.equal(f.native.records.length,0);assert.equal(f.created(),1);assert.equal(f.sourceWorker.terminated,false);assert.equal(f.hostWorker.terminated,false);
 }finally{endpoint?.dispose();port?.close();await f.close();}
});

test('the production chain carries its real publication floor after an unpublished native commit without consuming a source sequence',async()=>{
 const f=await fullFixture();try{
  const before=await f.runtime.quiesceNativeIntentProduction({withPublicationFloor:true}),lastSequence=()=>f.sourceWorker.sent.filter(m=>m.data.kind==='command').at(-1).data.command.sequence;
  assert.equal(before.publicationFloor,lastSequence());assert.equal(f.sourceWorker.sent.at(-1).data.withPublicationFloor,true);
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);await f.runtime.resumeNativeIntentProduction(before.holdId);
  await until(()=>f.native.records[0]?.committed,()=>f.native.present());assert.equal(f.state.workers[0].nativeRouteAdmission,'pending-stroll-resources');
  const held=await f.runtime.quiesceNativeIntentProduction({withPublicationFloor:true});assert.equal(held.publicationFloor,lastSequence());assert.equal(held.publicationFloor,before.publicationFloor);
  assert.equal(f.native.authority.nativeIntentProductionStatus().publicationSequence,held.publicationFloor);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');
  const publication=await f.runtime.submit({kind:'snapshot'});assert.equal(publication.sequence,held.publicationFloor+1);assert.equal(f.state.workers[0].nativeRouteAdmission,'native-idle-stroll');assert.equal(f.created(),1);await f.runtime.resumeNativeIntentProduction(held.holdId);assert.deepEqual(f.native.faults,[]);
 }finally{await f.close();}
});

test('an explicitly requested null floor never fabricates a native producer or releases the existing inactive hold',async()=>{
 const state=nativeIdleStrollGameSave().state;delete state.workers[0].nativeRouteAdmission;const f=await fullFixture({state});try{
  const held=await f.runtime.quiesceNativeIntentProduction({withPublicationFloor:true});assert.equal(held.publicationFloor,null);assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'inactive');
  await assert.rejects(f.runtime.quiesceNativeIntentProduction({withPublicationFloor:true}),/held|suspension/i);await f.runtime.resumeNativeIntentProduction(held.holdId);assert.equal(f.native.records.length,0);assert.equal(f.created(),1);assert.deepEqual(f.native.faults,[]);
 }finally{await f.close();}
});

test('the full hosted protocol waits for active native work while ordinary command sequences continue unchanged',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const f=await fullFixture({onPrepare:()=>gate});
 try{
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);await until(()=>f.native.records.length===1,()=>f.native.present());
  let settled=false;const pending=f.runtime.quiesceNativeIntentProduction();pending.then(()=>{settled=true;},()=>{});await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='quiescing');
  const publication=await f.runtime.submit({kind:'snapshot'});assert.equal(publication.sequence,f.sourceWorker.sent.filter(m=>m.data.kind==='command').at(-1).data.command.sequence);assert.equal(settled,false);await assert.rejects(f.runtime.resumeNativeIntentProduction(999),/unavailable|pending/i);
  release();await until(()=>settled,()=>f.native.present());const hold=await pending;assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');
  const commands=f.sourceWorker.sent.filter(m=>m.data.kind==='command').map(m=>m.data.command);assert.deepEqual(commands.map(c=>c.sequence),commands.map((_,i)=>i+1));assert.equal(commands.filter(c=>c.kind==='snapshot').length,2);assert(commands.every(c=>['snapshot','addChunk'].includes(c.kind)));await f.runtime.resumeNativeIntentProduction(hold.holdId);assert.deepEqual(f.native.faults,[]);
 }finally{release();await f.close();}
});

test('closing the full hosted chain during quiescence rejects the request and cannot publish a late suspension',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const f=await fullFixture({onPrepare:()=>gate});
 try{
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);await until(()=>f.native.records.length===1,()=>f.native.present());
  const pending=f.runtime.quiesceNativeIntentProduction(),rejected=assert.rejects(pending,/disposed/i);rejected.catch(()=>{});await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='quiescing');f.runtime.dispose();release();await rejected;await f.native.present();await flush();assert.equal(f.native.records.some(r=>r.committed),false);assert.equal(f.source.messages.some(m=>m.kind==='nativeIntentProductionQuiesced'),false);
 }finally{release();await f.close();}
});

async function initializeSource(f){await f.source.self.onmessage({data:{kind:'initialize',session:'s',snapshot:f.snapshot,chunkKeys:[]}});assert(f.source.messages.some(m=>m.kind==='ready'));}
async function sendSource(f,data){await f.source.self.onmessage({data:{session:'s',...data}});}
test('a source whose native resource drain failed retains its unsettled hold until disposal and cannot issue a replacement witness',async()=>{
 const f=await sourceFixture();try{
  await initializeSource(f);await f.native.attach();await until(()=>f.native.records.some(r=>r.committed),()=>f.native.present());const send=f.native.resourcePort.postMessage.bind(f.native.resourcePort);f.native.resourcePort.postMessage=message=>send(message.kind==='flushNativeResources'?{...message,session:'rejected-resource-session'}:message);
  await sendSource(f,{kind:'quiesceNativeIntentProduction',id:30});assert.equal(f.source.messages.at(-1).kind,'nativeIntentControlFailure');assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');
  await sendSource(f,{kind:'resumeNativeIntentProduction',id:31,holdId:30});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionControlError');assert.match(f.source.messages.at(-1).message,/stale|unavailable/i);
  await sendSource(f,{kind:'quiesceNativeIntentProduction',id:32});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionControlError');assert.match(f.source.messages.at(-1).message,/held|suspension/i);assert.equal(f.source.messages.some(m=>m.kind==='nativeIntentProductionQuiesced'||m.kind==='nativeIntentProductionResumed'),false);assert.equal(f.created(),1);
 }finally{await f.close();assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'closed');}
});

test('the authority Worker rejects repeated and stale lifecycle identities without releasing its current local receipt',async()=>{
 const f=await sourceFixture();try{
  await initializeSource(f);await sendSource(f,{kind:'quiesceNativeIntentProduction',id:10});assert(f.source.messages.some(m=>m.kind==='nativeIntentProductionQuiesced'&&m.holdId===10));
  await sendSource(f,{kind:'quiesceNativeIntentProduction',id:11});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionControlError');assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');
  await sendSource(f,{kind:'resumeNativeIntentProduction',id:12,holdId:10});await sendSource(f,{kind:'quiesceNativeIntentProduction',id:13});
  await sendSource(f,{kind:'resumeNativeIntentProduction',id:14,holdId:10});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionControlError');
  await sendSource(f,{kind:'resumeNativeIntentProduction',id:13,holdId:13});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionControlError');assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'suspended');
  await sendSource(f,{kind:'resumeNativeIntentProduction',id:15,holdId:13});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionResumed');assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'idle');
 }finally{await f.close();}
});

test('the authority Worker refuses early resume and a second pause while the actual native packet is still preparing',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const f=await sourceFixture({onReady:()=>gate});
 try{
  await initializeSource(f);await f.native.attach();await until(()=>f.native.records[0]?.packet,()=>f.native.present());
  const pending=sendSource(f,{kind:'quiesceNativeIntentProduction',id:20});await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='quiescing');
  await sendSource(f,{kind:'resumeNativeIntentProduction',id:21,holdId:20});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionControlError');
  await sendSource(f,{kind:'quiesceNativeIntentProduction',id:22});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionControlError');assert.equal(f.source.messages.some(m=>m.kind==='nativeIntentProductionQuiesced'),false);
  release();await until(()=>f.source.messages.some(m=>m.kind==='nativeIntentProductionQuiesced'&&m.id===20),()=>f.native.present());await pending;
  await sendSource(f,{kind:'resumeNativeIntentProduction',id:23,holdId:20});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionResumed');assert.deepEqual(f.native.faults,[]);
 }finally{release();await f.close();}
});

test('a failed real preparation cannot produce a Worker suspension witness or be revived by a lifecycle RPC',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});const f=await sourceFixture({async onPrepare(){await gate;throw Error('lifecycle fixture preparation failed');}});
 try{
  await initializeSource(f);await f.native.attach();await until(()=>f.native.records.length===1,()=>f.native.present());
  const pending=sendSource(f,{kind:'quiesceNativeIntentProduction',id:30});await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='quiescing');release();await pending;
  assert(f.source.messages.some(m=>m.kind==='nativeIntentProductionControlError'&&m.id===30&&m.message.includes('lifecycle fixture preparation failed')));assert.equal(f.source.messages.some(m=>m.kind==='nativeIntentProductionQuiesced'),false);
  await sendSource(f,{kind:'resumeNativeIntentProduction',id:31,holdId:30});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionControlError');await sendSource(f,{kind:'quiesceNativeIntentProduction',id:32});assert.equal(f.source.messages.at(-1).kind,'nativeIntentProductionControlError');assert.equal(f.native.authority.nativeIntentProductionStatus().phase,'failed');assert.equal(f.native.records.some(r=>r.committed),false);
 }finally{release();await f.close();}
});

// Reuse the existing source Worker, runtime host, actual authority and retained
// draw fixture. No second runtime/renderer or direct-ABI command shortcut.
import {nativeFarmArrivalRouteFixture as buildFarmFixture} from './helpers/native-farm-arrival-route.js';
import {rational as buildRational} from '../src/simulation/money.js';

test('Build stop RPC remains outside the command FIFO and cannot accept a foreign response',async()=>{
 const f=clientFixture(),command={kind:'buildWallChain',id:'build',material:'zarzas',points:[[0,0],[0,2]]};
 try{
  const first=f.client.submit({kind:'snapshot'}),preparing=f.client.prepareNativeStructureCommand(command);preparing.catch(()=>{});
  assert.equal(f.sent.at(-1).kind,'prepareNativeStructureCommand');assert.equal(f.client.status().next,2);
  const request=f.sent.at(-1);f.receive({kind:'result',sequence:1});await first.result;
  const tick=f.client.submit({kind:'advance',seconds:.05,nightFastForward:false});assert.equal(f.sent.at(-1).command.sequence,2);f.receive({kind:'result',sequence:2});await tick.result;
  f.receive({kind:'nativeStructurePrepared',id:request.id,version:1});assert.deepEqual(await preparing,{version:1});
  await assert.rejects(f.client.prepareNativeStructureCommand(command),/unavailable/);
  const finished=f.client.finishNativeStructureCommand(command),end=f.sent.at(-1);f.receive({kind:'nativeStructurePrepared',id:request.id,version:1});f.receive({kind:'nativeStructureFinished',id:end.id,version:1});await finished;assert.equal(f.client.status().next,3);
 }finally{f.dispose();}
});
test('Build stop RPC rejects closure and an invalid result instead of retaining a false preparation',async()=>{
 const command={kind:'placeStructure',id:'build',structure:{kind:'wall',x:0,z:0}};
 for(const malformed of [false,true]){const f=clientFixture();try{const pending=f.client.prepareNativeStructureCommand(command),rejected=assert.rejects(pending,/disposed|response/);if(malformed)f.receive({kind:'nativeStructurePrepared',id:f.sent.at(-1).id,version:2});else f.dispose();await rejected;}finally{f.dispose();}}
});
test('ordinary hosted Build waits for its stopped Farm packet while Game ticks, then purchases once and resumes',async()=>{
 const origin=buildFarmFixture({peer:false}),state=structuredClone(origin.state),a=origin.point(0,-3),b=origin.point(0,3);state.ledger.balance=buildRational(100000);
 let release;const gate=new Promise(resolve=>{release=resolve;});let f;
 try{
  f=await fullFixture({state,chunkKeys:[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1'],onPrepare:r=>r.kind==='farm-arrival-stop'?gate:undefined});
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);
  await until(()=>f.native.records.some(r=>r.kind==='farm-arrival'&&r.committed),()=>f.native.present());await f.runtime.submit({kind:'snapshot'});await f.runtime.activateClock();
  await until(()=>f.state.elapsed>=state.elapsed+.1,()=>f.native.present());
  const command={kind:'buildWallChain',id:'hosted-build-farm',material:'zarzas',points:[[a.x,a.z],[b.x,b.z]],options:{smooth:false,snap:false}},before=f.state.elapsed;
  let settled=false;const placing=f.runtime.submit(command).then(r=>{settled=true;return r;},e=>{settled=true;throw e;});placing.catch(()=>{});
  await until(()=>f.native.records.some(r=>r.kind==='farm-arrival-stop'),()=>f.native.present());
  const tickCount=()=>f.sourceWorker.sent.filter(m=>m.data.kind==='command'&&m.data.command.kind==='advance').length,start=tickCount();
  await until(()=>tickCount()>=start+3&&f.state.elapsed>before,()=>f.native.present());
  assert.equal(settled,false);assert.equal(f.state.ledger.entries[command.id],undefined);assert.equal(f.sourceWorker.sent.some(m=>m.data.kind==='command'&&m.data.command.kind==='buildWallChain'),false);
  release();await until(()=>settled,()=>f.native.present());const result=await placing;assert.equal(result.value,true);assert.equal(result.events.filter(e=>e.type==='WallChainBuilt').length,1);
  await until(()=>f.native.records.filter(r=>r.kind==='farm-arrival'&&r.committed).length===2,()=>f.native.present());
  const duplicate=f.runtime.submit(command);let duplicated=false;duplicate.then(()=>{duplicated=true;});await until(()=>duplicated,()=>f.native.present());assert.equal((await duplicate).value,false);
  assert.equal(f.created(),1);assert.deepEqual(f.native.faults,[]);const commands=f.sourceWorker.sent.filter(m=>m.data.kind==='command').map(m=>m.data.command.sequence);assert.deepEqual(commands,commands.map((_,i)=>i+1));
 }finally{release();try{await f?.close();}finally{origin.close();}}
});

import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
test('hosted autonomous Repair animates both Repair pairs with finite causal coverage, pauses and continues to Idle',async(t)=>{
 const saved=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false});let f,release,releaseIdle,proof;
 const held=new Promise(r=>{release=r;}),idleHeld=new Promise(r=>{releaseIdle=r;});
 try{
  const state=structuredClone(saved.state),wall=state.structures.find(w=>w.kind==='wall'&&w.status==='intact'&&!w.gate&&w.material==='zarzas');Object.assign(wall,saved.point(1,4),{hp:0,status:'ruined',collapseRemaining:0});state.ledger.balance=rational(100000);
  let preparedAt;
  f=await fullFixture({state,chunkKeys:Array.from({length:12},(_,i)=>`${i%4-1},${Math.floor(i/4)-1}`),async onPrepare(r){
   if(r.kind==='barrier-addition'){
    preparedAt=r.resources.worldBoundary.effectiveTime;
    Object.assign(f.native.clock,{elapsed:preparedAt,safeUntil:preparedAt,paused:true,segments:[]});
    f.native.client.registerClockBinding(f.native.buffer,{byteOffset:4,semantic:'relative',epoch:preparedAt,nativeBarrierAddition:r.resources.nativeBarrierAddition});
    f.native.client.registerClockBinding(f.native.buffer,{byteOffset:8,semantic:'absolute',epoch:0});
   }else if(proof){if(r.kind==='initial-idle-body')await idleHeld;Object.assign(f.native.clock,{elapsed:preparedAt,safeUntil:Number.MAX_SAFE_INTEGER,paused:false,segments:[{start:preparedAt,end:Number.MAX_SAFE_INTEGER,rate:1,realDuration:Number.MAX_SAFE_INTEGER-preparedAt}]});}
  },onReady(r){if(r.kind==='barrier-addition')return held;},onCommit(r,data){if(r.kind==='barrier-addition')proof=data.nativeBarrierAdditionBinding;}});
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);
  await until(()=>f.native.records.some(r=>r.kind==='initial-idle-body'&&r.committed),()=>f.native.present());
  await f.runtime.submit({kind:'requestRepair',id:'finite-ruin',targetId:wall.id});
  let now=performance.now();f.host.now=()=>now;await f.runtime.activateClock();
  const advance=async(ms=100)=>{const goal=f.state.elapsed+ms/1000-.01;now+=ms;await until(()=>f.state.elapsed>=goal,()=>f.native.present());};
  for(let i=0;i<350&&!f.native.records.some(r=>r.kind==='barrier-addition'&&r.packet);i++)await advance();
  const barrier=f.native.records.find(r=>r.kind==='barrier-addition');assert(barrier?.packet);assert(f.native.records.find(r=>r.kind==='task-action')?.committed);
  let presented=false;barrier.packet.presented.then(()=>{presented=true;},()=>{}); // Disposal after a failed assertion may reject.
  for(let i=0;i<6;i++)await advance();assert.equal(presented,false,'READY is not presentation');assert.equal(f.state.structures.find(w=>w.id===wall.id).hp,0);
  release();await until(()=>barrier.committed,()=>f.native.present());for(let i=0;i<8;i++)await f.native.present();
  const at=proof.reference.worldBoundary.effectiveTime,ticket=proof.reference.worldBoundary.ticket;assert(at-preparedAt>.5);
  const sample=f.native.host.inspect().samples.find(s=>s.nativeWorldBoundary?.ticket===ticket);
  assert(sample,'the acquired kind2 must draw; a committed receipt alone cannot release the dependency');
  assert.equal(presented,true,'the actual Host resolves the presentation awaited by Surface');
  assert.equal(sample.clockElapsed,at);assert.equal(sample.safeUntil,at,'only the acquired boundary is added to the finite lease');
  let packetSequence=sample.sequence;const buffer=f.native.gpu.buffers.filter(b=>!b.destroyed&&b.data.length===16).at(-1);let values=new Float32Array(buffer.data.buffer);
  assert.equal(values[1],0,'Repair starts at acquired age zero');assert(values[2]<=preparedAt,'unscoped presentation stays inside its original coverage');
  const ages=[],readAge=()=>{const sample=f.native.host.inspect().samples.findLast(s=>s.sequence===packetSequence);assert(sample.clockElapsed<=f.native.host.inspect().nativeCausalClock.committedThrough);assert(values[2]<=preparedAt,'unscoped clocks retain their original ceiling');assert(values[1]>0,'retained Repair must advance with causal time before Idle');const pick=captureNativeRoutePickFrame(f.native.host.inspect());assert.equal(pick.getBarrierRepairElapsed(proof.preparedReference),values[1]);assert.equal(pick.getBarrierRepairExecutionTime(proof.preparedReference),at+values[1]);assert(pick.getPresentationTime()<=preparedAt);ages.push(values[1]);return values[1];};
  await advance(50);await f.native.present();const lower=readAge();
  assert(lower>0&&lower<.48*(1-Math.cbrt(.5)),'first authored pair must actually animate before the cubic midpoint');
  const repaired={...wall,hp:wall.maxHp,status:'intact',wallPresentation:{from:0,to:1,at}};assert(wallVisualAt(repaired,at+lower)<.5);
  await f.runtime.submit({kind:'pause',reason:'menu'});await f.native.present();const paused=readAge();
  now+=1000;for(let i=0;i<8;i++)await f.native.present();assert.equal(readAge(),paused,'wall time during pause cannot advance Repair');
  const client=f.native.client,physical=client.device.createBuffer({size:16,usage:72}),group=client.device.createBindGroup({entries:[{binding:0,resource:{buffer:physical}}]});
  const actionReference=f.native.host.inspect().nativeRouteFrame.bindings.find(b=>b.nativeAction).nativeAction;
  client.registerClockBinding(physical,{byteOffset:0,semantic:'relative',epoch:actionReference.startTime,nativeAction:actionReference});
  client.registerClockBinding(physical,{byteOffset:4,semantic:'relative',epoch:preparedAt,nativeBarrierAddition:proof.preparedReference});client.registerClockBinding(physical,{byteOffset:8,semantic:'absolute',epoch:0});
  client.beginFrame({clock:f.native.clock,nativeWorldBoundary:proof.reference.worldBoundary});client.device.queue.writeBuffer(physical,0,new Float32Array(4));
  const encoder=client.device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});pass.setPipeline(f.native.pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();client.device.queue.submit([encoder.finish()]);
  const shown=client.endFrame();await f.native.present();await shown;
  packetSequence=f.native.host.inspect().activeSequence;assert.notEqual(packetSequence,sample.sequence);
  const replacement=f.native.gpu.buffers.filter(b=>!b.destroyed&&b.data.length===16).at(-1);assert.notEqual(replacement,buffer,'exercise a real physical uniform fork');values=new Float32Array(replacement.data.buffer);
  assert.equal(readAge(),paused,'replacement and physical fork preserve the acquired origin during pause');
  await f.runtime.submit({kind:'resume',reason:'menu'});await advance(100);await f.native.present();const upper=readAge();
  assert(upper>.48*(1-Math.cbrt(.5))&&upper<.48,'second authored pair must animate before completion');assert(wallVisualAt(repaired,at+upper)>.5);
  for(let i=0;i<5;i++){await advance(100);await f.native.present();readAge();}
  assert.equal(ages.at(-1),Math.fround(WALL_REPAIR_DURATION),'the retained local curve saturates at its finite end');
  assert(ages.every((age,i)=>i===0||age>=ages[i-1]));
  assert.equal(f.native.host.inspect().samples.findLast(s=>s.sequence===packetSequence).clockElapsed,at+WALL_REPAIR_DURATION,'no lease beyond the prepared local curve');
  releaseIdle();for(let i=0;i<30&&f.state.workers[0].nativeRouteAdmission!=='native-idle';i++)await advance();
  assert.equal(f.state.workers[0].nativeRouteAdmission,'native-idle');assert.equal(f.state.structures.find(w=>w.id===wall.id).hp,wall.maxHp);
  assert.equal(f.state.events.filter(e=>e.type==='RepairApplied').length,1);assert.equal(f.created(),1);
  const action=f.native.records.find(r=>r.kind==='task-action').resources.request,idle=f.native.records.findLast(r=>r.kind==='initial-idle-body').resources.nativeInitialIdleBody;assert.equal(idle.bodyId,action.bodyId);
  t.diagnostic(JSON.stringify({preparedAt,acquiredAt:at,ticket,drawSequence:sample.sequence,safeUntil:sample.safeUntil,ages,repairAge:values[1],globalPresentation:values[2],finalAdmission:f.state.workers[0].nativeRouteAdmission}));
  assert.deepEqual(f.native.errors,[]);assert.deepEqual(f.native.faults,[]);
 }finally{release?.();releaseIdle?.();await f?.close();saved.close();}
});

import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
async function terminalRepairSave(savedAge=0){
 const original=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false});let producer;
 try{
  let state;
  if(process.env.QA_TERMINAL_REPAIR_RECEIPT)state=JSON.parse(readFileSync(process.env.QA_TERMINAL_REPAIR_RECEIPT)).result.checkpoint;
  else{
   state=structuredClone(original.state);const wall=state.structures.find(w=>w.kind==='wall'&&w.status==='intact'&&!w.gate&&w.material==='zarzas');
   Object.assign(wall,original.point(1,4),{hp:0,status:'ruined',collapseRemaining:0});state.ledger.balance=rational(100000);
   producer=await nativeProductionAuthority(state,{chunkKeys:Array.from({length:12},(_,i)=>`${i%4-1},${Math.floor(i/4)-1}`)});
   await until(()=>producer.records.some(r=>r.kind==='initial-idle-body'&&r.committed),()=>producer.present());
   assert.equal(producer.command({kind:'requestRepair',id:'resource-boundary-repair',targetId:wall.id}).value,true);
   for(let i=0;i<700&&!producer.records.some(r=>r.kind==='barrier-addition'&&r.committed);i++){if(producer.authority.nativeIntentProductionStatus().phase==='idle')producer.advance(.025);await producer.present();}
   assert(producer.records.some(r=>r.kind==='barrier-addition'&&r.committed));if(savedAge>0){const current=producer.snapshot(),currentWall=current.structures.find(w=>w.id===wall.id),remaining=savedAge-(current.elapsed-currentWall.wallPresentation.at);assert(remaining>-1e-7,'saved curve already passed requested age');if(remaining>1e-7)producer.advance(remaining/2);}producer.command({kind:'pause',reason:'tutorial-action'});
   const saved=prepareWorkerCheckpoint(producer.command({kind:'snapshot',nativeAuthorityCheckpoint:true}),{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:0});assert.equal(saved.saved,true);state=saved.state;
  }
  return state;
 }finally{await producer?.close();original.close();}
}
test('restored terminal Repair publishes Action15 terrain through both Workers and settles without a second consequence',async(t)=>{
 let f;try{const state=await terminalRepairSave();
  assert.equal(state.workers[0].nativeTaskAction.kind,'repair');assert.equal(state.workers[0].nativeTaskAction.duration,0);
  const savedOptions=savedNativeAuthorityOptions(JSON.stringify(state)),balances=structuredClone(state.ledger),barriers=state.workerNativeAuthorityCheckpoint.spatialState.barriers;
  f=await fullFixture({state,chunkKeys:savedOptions.chunkKeys,nativeBootstrap:savedOptions.nativeBootstrap,nativeAuthorityCheckpoints:true});
  await f.runtime.attachNativeIntentControl(f.native.controlPort);await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);
  for(const reason of state.pauses)await f.runtime.submit({kind:'resume',reason});
  let now=performance.now();f.host.now=()=>now;await f.runtime.activateClock();let snapshots=0,sawIdle=false;
  for(let i=0;i<70;i++){
   const goal=f.state.elapsed+.09;now+=100;await until(()=>f.state.elapsed>=goal,()=>f.native.present());
   const result=await f.runtime.submit({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});snapshots++;sawIdle ||= f.state.workers[0].nativeRouteAdmission==='native-idle';
   assert.deepEqual(result.nativeAuthorityCheckpoint.spatialState.barriers,barriers);
  }
  assert(f.native.records.some(r=>r.kind==='task-action'&&r.committed));assert(f.native.records.some(r=>r.kind==='initial-idle-body'&&r.committed));
  assert(!f.native.records.some(r=>r.kind==='barrier-addition'),'a paid Repair must not recur');assert.deepEqual(f.state.ledger,balances);
  assert(sawIdle,'the restored action must reach ordinary Idle before its following idle cycle');assert.equal(f.created(),1);assert.deepEqual(f.native.faults,[]);assert.deepEqual(f.native.errors,[]);
  const action=f.native.records.find(r=>r.kind==='task-action').resources.request,idle=f.native.records.find(r=>r.kind==='initial-idle-body').resources.nativeInitialIdleBody;
  assert.equal(idle.bodyId,action.bodyId);t.diagnostic(JSON.stringify({snapshots,first:'task-action',final:f.state.workers[0].nativeRouteAdmission,bodyId:idle.bodyId,balance:f.state.ledger.balance}));
 }finally{await f?.close();}
});

import {restoredWallRepairReference} from '../src/world/restored-wall-repair-reference.js';
for(const savedAge of [.05,.10])test(`hosted cold Repair ${savedAge} advances only its declared finite scalar across retained READY, pause and replacement`,async(t)=>{
 const state=await terminalRepairSave(savedAge),wall=state.structures.find(w=>w.wallPresentation?.to===1&&!w.gate),ref=restoredWallRepairReference(wall),at=state.elapsed;
 assert(Math.abs(at-ref.at-savedAge)<1e-7,JSON.stringify({at,origin:ref.at,savedAge}));let f,releaseAction,releaseIdle;const actionHeld=new Promise(r=>releaseAction=r),idleHeld=new Promise(r=>releaseIdle=r),submitted=[];
 try{
  f=await fullFixture({state,...savedNativeAuthorityOptions(JSON.stringify(state)),onPrepare:r=>{if(r.kind==='initial-idle-body'){const time=r.resources.worldBoundary.effectiveTime;Object.assign(f.native.clock,{elapsed:time,safeUntil:time,paused:true,segments:[]});}},onReady:r=>r.kind==='task-action'?actionHeld:r.kind==='initial-idle-body'?idleHeld:undefined});
  Object.assign(f.native.clock,{elapsed:at,safeUntil:at,paused:true,segments:[]});
  // Observe the buffer actually bound by each submitted pass, including forks.
  const device=f.native.gpu.device,encoderFactory=device.createCommandEncoder.bind(device),submit=device.queue.submit.bind(device.queue);
  device.createCommandEncoder=(...args)=>{const encoder=encoderFactory(...args),begin=encoder.beginRenderPass.bind(encoder),finish=encoder.finish.bind(encoder),buffers=[];encoder.beginRenderPass=(...passArgs)=>{const pass=begin(...passArgs),bind=pass.setBindGroup.bind(pass);pass.setBindGroup=(slot,group,...rest)=>{for(const entry of group.descriptor.entries)if(entry.resource.buffer)buffers.push(entry.resource.buffer);return bind(slot,group,...rest);};return pass;};encoder.finish=()=>({...finish(),qaRepairBuffers:buffers});return encoder;};
  device.queue.submit=commands=>{for(const command of commands)for(const buffer of command.qaRepairBuffers??[])if(buffer.data.length===16)submitted.push({buffer,values:Array.from(new Float32Array(buffer.data.buffer))});return submit(commands);};
  await f.runtime.attachNativeIntentControl(f.native.controlPort);
  f.native.client.registerClockBinding(f.native.buffer,{byteOffset:4,semantic:'absolute',epoch:0});f.native.client.registerClockBinding(f.native.buffer,{byteOffset:8,semantic:'relative',epoch:ref.at,nativeRestoredWallRepair:ref});
  const first=f.native.frame(0,{clock:f.native.clock,nativeWorldBoundary:null});await f.native.present();await first;
  const read=()=>{const row=submitted.at(-1),frame=f.native.host.inspect().nativeRouteFrame,pick=captureNativeRoutePickFrame({nativeRouteFrame:frame});assert(row);assert.equal(row.values[1],frame.presentationElapsed,'generic clock must retain its own packet ceiling');assert.equal(row.values[2],pick.getRestoredWallRepairElapsed(ref));assert.equal(row.values[2],floorFloat32(Math.min(.48,frame.clockElapsed-ref.at)));assert(row.values[2]<=.48);return row.values[2];};
  assert.equal(read(),floorFloat32(at-ref.at));
  await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);await until(()=>f.native.records.some(r=>r.kind==='task-action'&&r.packet),()=>f.native.present());
  for(const reason of state.pauses)await f.runtime.submit({kind:'resume',reason});let now=performance.now();f.host.now=()=>now;await f.runtime.activateClock();
  const advance=async(ms=50)=>{const goal=f.state.elapsed+ms/1000-.001;now+=ms;await until(()=>f.state.elapsed>=goal,()=>f.native.present());await f.native.present();return read();};
  const ages=[read(),await advance()];await f.runtime.submit({kind:'pause',reason:'tutorial-action'});await f.native.present();const paused=read();now+=500;await flush();await f.native.present();assert.equal(read(),paused);await f.runtime.submit({kind:'resume',reason:'tutorial-action'});
  for(let i=0;i<10;i++)ages.push(await advance());assert.equal(ages.at(-1),floorFloat32(.48));assert(ages.every((v,i)=>!i||v>=ages[i-1]));assert.equal(f.native.host.inspect().nativeRouteFrame.clockElapsed,ref.at+.48);assert.equal(f.native.records[0].committed,false,'Action15 READY is still withheld');assert.equal(submitted.at(-1).values[1],floorFloat32(at),'local coverage cannot advance the cold generic clock');
  releaseAction();await until(()=>f.native.records.some(r=>r.kind==='task-action'&&r.committed),()=>f.native.present());await f.native.present();read();
  for(let i=0;i<10&&!f.native.records.some(r=>r.kind==='initial-idle-body'&&r.packet);i++)await advance();
  assert(f.native.records.some(r=>r.kind==='initial-idle-body'&&r.packet));assert(!f.native.records.find(r=>r.kind==='initial-idle-body').committed);read();
  releaseIdle();await until(()=>f.native.records.some(r=>r.kind==='initial-idle-body'&&r.committed),()=>f.native.present());await f.native.present();read();
  await f.runtime.submit({kind:'snapshot',visualTerrain:true});assert.equal(f.state.workers[0].nativeRouteAdmission,'native-idle');assert.deepEqual(f.state.ledger,state.ledger);assert.deepEqual(f.native.faults,[]);assert.deepEqual(f.native.errors,[]);
  t.diagnostic(JSON.stringify({savedAge,first:ages[0],last:ages.at(-1),paused,submissions:submitted.length,physicalBuffers:new Set(submitted.map(r=>r.buffer)).size,globalCeiling:floorFloat32(at)}));
 }catch(error){t.diagnostic(JSON.stringify({at:f?.state.elapsed,status:f?.native.authority.nativeIntentProductionStatus(),runtimeFault:String(f?.runtime.status().fault??'').slice(0,180),frames:f?.native.host.inspect().nativeRouteFrame,records:f?.native.records.map(r=>({kind:r.kind,committed:r.committed,packet:!!r.packet})),faults:f?.native.faults}));throw error;}finally{releaseAction?.();releaseIdle?.();await f?.close();}
});


test('hosted cold Repair without its binding retains exactly the old ceiling',async()=>{
 const state=await terminalRepairSave(.1),wall=state.structures.find(w=>w.wallPresentation?.to===1&&!w.gate),ref=restoredWallRepairReference(wall),at=state.elapsed;let release;const held=new Promise(r=>release=r);let f;
 try{
  f=await fullFixture({state,...savedNativeAuthorityOptions(JSON.stringify(state)),onReady:r=>r.kind==='task-action'?held:undefined});Object.assign(f.native.clock,{elapsed:at,safeUntil:at,paused:true,segments:[]});await f.runtime.attachNativeIntentControl(f.native.controlPort);
  f.native.client.registerClockBinding(f.native.buffer,{byteOffset:4,semantic:'absolute',epoch:0});const first=f.native.frame(0,{clock:f.native.clock,nativeWorldBoundary:null});await f.native.present();await first;
  await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);await until(()=>f.native.records.some(r=>r.packet),()=>f.native.present());for(const reason of state.pauses)await f.runtime.submit({kind:'resume',reason});let now=performance.now();f.host.now=()=>now;await f.runtime.activateClock();now+=300;await until(()=>f.state.elapsed>=at+.29,()=>f.native.present());await f.native.present();assert.equal(f.native.host.inspect().nativeRouteFrame.clockElapsed,at);assert.equal(f.native.host.inspect().nativeRouteFrame.presentationElapsed,floorFloat32(at));
 }finally{release?.();await f?.close();}
});

test('paused restored terminal Repair publishes the acquired Action15 before resuming gameplay',async t=>{
 const state=await terminalRepairSave(.10),at=state.elapsed;
 let releaseIdle,firstIdle;
 const heldIdle=new Promise(resolve=>{releaseIdle=resolve;});
 const f=await fullFixture({state,...savedNativeAuthorityOptions(JSON.stringify(state)),compactPausedAcks:true,
  onReady(record){if(record.kind==='initial-idle-body'&&!firstIdle){firstIdle=record;return heldIdle;}}
 });
 try{
  assert(state.pauses.length);
  await f.runtime.attachNativeIntentControl(f.native.controlPort);
  await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);
  await until(()=>f.native.records.some(r=>r.kind==='task-action'&&r.committed),()=>f.native.present());
  const action=f.native.records[0],worker=state.workers[0],task=state.tasks.find(t=>t.id===worker.taskId);
  const pose=w=>[w.x,w.z,w.heading,w.walkPhase,w.runPhase,w.carryPhase];
  for(let i=0;i<5;i++){
   await f.runtime.submit({kind:'snapshot',visualTerrain:true});await f.native.present();
   const current=f.state.workers.find(w=>w.id===worker.id);
   assert.equal(current.nativeRouteAdmission,'native-action');assert.equal(current.status,'acting');
   assert.equal(current.taskId,task.id);assert.equal(f.state.tasks.find(t=>t.id===task.id).workerId,current.id);
   assert.equal(current.nativeTaskAction.kind,action.resources.request.actionKind);
   assert.deepEqual(current.nativeTaskAction,worker.nativeTaskAction);assert.deepEqual(pose(current),pose(worker));
   assert.deepEqual(f.state.ledger,state.ledger);assert.equal(f.state.elapsed,at);assert.deepEqual(f.state.pauses,state.pauses);
   assert.deepEqual(f.native.records.map(r=>r.kind),['task-action']);
  }
  for(const reason of state.pauses)await f.runtime.submit({kind:'resume',reason});
  let now=performance.now();f.host.now=()=>now;await f.runtime.activateClock();
  await until(()=>firstIdle,async()=>{now+=50;await f.native.present();});
  await f.runtime.submit({kind:'pause',reason:'menu'});releaseIdle();
  await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='idle',()=>f.native.present());
  await f.runtime.submit({kind:'snapshot',visualTerrain:true});
  assert.equal(firstIdle.committed,false);assert.equal(f.state.workers[0].nativeRouteAdmission,'native-action');
  assert.deepEqual(f.state.ledger,state.ledger);
  await f.runtime.submit({kind:'resume',reason:'menu'});
  await until(()=>f.native.records.some(r=>r.kind==='initial-idle-body'&&r.committed),async()=>{now+=50;await f.native.present();});
  await f.runtime.submit({kind:'snapshot',visualTerrain:true});
  assert.equal(f.state.workers[0].nativeRouteAdmission,'native-idle');
  assert.deepEqual(f.state.ledger,state.ledger);assert.deepEqual(f.native.faults,[]);
  t.diagnostic(JSON.stringify({at,task:task.id,body:action.resources.request.bodyId,actionTicket:action.resources.worldBoundary.ticket}));
 }finally{releaseIdle();await f.close();}
});

test('paused ordinary Harvest discards late Carry READY and settles the original crop once after resume',async()=>{
 const fixture=nativeIdleCycleGameFixture({mode:'rest',remaining:5,peer:false});
 let f,firstCarry,releaseCarry;
 const held=new Promise(resolve=>{releaseCarry=resolve;});
 const acquired=[];
 try{
  const state=structuredClone(fixture.state),[worker]=state.workers;
  const center=state.structures.find(value=>value.id===worker.centerId);
  Object.assign(center,{x:worker.x-6,z:worker.z+6});
  const {x,z}=fixture.point(-4,6),crop=createPlant(`plant-${state.nextId++}`,'mijo',x,z,center.id);
  crop.growth=cropSpec(crop.species).growth_seconds-.1;
  for(const water of crop.water)water.status='manual';
  state.plants.push(crop);
  f=await fullFixture({state,
   onReady(record){if(record.kind==='task-consequence'&&!firstCarry){firstCarry=record;return held;}},
   onCommit(record,data){acquired.push({kind:record.kind,data});},
  });
  await f.runtime.attachNativeIntentControl(f.native.controlPort);
  await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);
  await until(()=>acquired.some(row=>row.kind==='initial-idle-body'),()=>f.native.present());
  let now=performance.now();f.host.now=()=>now;await f.runtime.activateClock();
  const advance=async()=>{now+=50;await f.native.present();};
  await until(()=>firstCarry,advance);
  const action=acquired.find(row=>row.kind==='task-action').data.nativeTaskActionBinding;
  const start=acquired.find(row=>row.kind==='task-start').data.nativeTaskStartBinding;
  assert.equal(start.reference.bodyId,action.reference.request.bodyId);
  await f.runtime.submit({kind:'pause',reason:'menu'});
  const at=f.state.elapsed,ledger=structuredClone(f.state.ledger);
  releaseCarry();
  await until(()=>f.native.authority.nativeIntentProductionStatus().phase==='idle',()=>f.native.present());
  await f.runtime.submit({kind:'snapshot'});
  assert.equal(firstCarry.committed,false);
  await assert.rejects(firstCarry.packet.presented,/abort|cancel|obsolete/i);
  assert(!acquired.some(row=>row.kind==='task-consequence'));
  assert.equal(f.state.elapsed,at);
  assert.equal(f.state.workers[0].nativeRouteAdmission,'native-action');
  assert(f.state.plants.find(value=>value.id===crop.id).alive);
  assert.equal(f.state.crates.length,0);
  assert.deepEqual(f.state.ledger,ledger);
  assert(!f.state.events.some(e=>e.type==='CropPicked'&&e.targetId===crop.id));
  await f.runtime.submit({kind:'resume',reason:'menu'});
  await until(()=>acquired.some(row=>row.kind==='task-settlement'),advance);
  await f.runtime.submit({kind:'snapshot'});
  const carries=acquired.filter(row=>row.kind==='task-consequence');
  assert.equal(carries.length,1);
  const carry=carries[0].data.nativeTaskConsequenceBinding.reference;
  const settled=acquired.find(row=>row.kind==='task-settlement').data.nativeTaskSettlementBinding.reference;
  assert.equal(carry.bodyId,start.reference.bodyId);
  assert.equal(settled.bodyId,carry.bodyId);
  assert(carry.worldBoundary.ticket>firstCarry.resources.worldBoundary.ticket);
  await until(()=>f.native.host.inspect().samples.some(row=>row.nativeWorldBoundary?.ticket===settled.worldBoundary.ticket),
   ()=>f.native.present());
  assert.equal(f.state.crates.length,1);
  const [crate]=f.state.crates;
  assert.equal(crate.sourcePlantId,crop.id);
  assert.equal(crate.delivered,true);
  assert.equal(f.state.events.filter(e=>e.type==='CropPicked'&&e.targetId===crop.id).length,1);
  const [deliveryEntry]=Object.keys(f.state.ledger.entries).filter(id=>!Object.hasOwn(ledger.entries,id));
  assert.equal(deliveryEntry,'deliver:'+crate.id);
  assert.deepEqual(Object.keys(f.state.ledger.entries).filter(id=>!Object.hasOwn(ledger.entries,id)),[deliveryEntry]);
  assert.equal(f.created(),1);
  assert.deepEqual(f.native.faults,[]);
 }finally{releaseCarry();await f?.close();fixture.close();}
});

function movingFarmForRecovery(){
 const origin=buildFarmFixture({peer:false});
 try{
  const state=structuredClone(origin.state),worker=state.workers[0],center=state.structures.find(row=>row.id===worker.centerId);
  const service=centerServicePoint(center,state,.8),start={x:-14,z:11.8};
  center.x+=-14-service.x;center.z+=3.2-service.z;
  Object.assign(worker,start);state.villages.find(row=>row.id===worker.villageId).entry=start;
  return state;
 }finally{origin.close();}
}

for(const initialTask of [false,true])test(`the first paid hire uses the cold native worker clock for ${initialTask?'the initial task':'Farm23'}`,async()=>{
 const scene=movingFarmForRecovery();
 const state=newGame({biome:scene.biome,culture:scene.culture,seed:scene.seed});
 state.structures=scene.structures;state.villages=scene.villages;
 state.tutorial.step='done';state.nextId=90000;
 const center=state.structures.find(s=>s.kind==='center');
 state.plants=[createPlant('plant-80000','mijo',center.x+4,center.z,center.id)];
 if(!initialTask)assert.equal(waterPlant(state.plants[0]),true);
 let release;
 const ready=new Promise(resolve=>release=resolve);
 const f=await fullFixture({state,nativeWorkerLifecycle:true,onReady:record=>record.kind==='farm-arrival'?ready:undefined});
 try{
  assert.equal(f.sourceWorker.sent[0].data.nativeWorkerLifecycle,true);
  await f.runtime.attachNativeIntentControl(f.native.controlPort);
  await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);
  assert.equal(f.native.host.inspect().nativeCausalClock.committedThrough,0);
  assert.equal(f.state.workers.length,0);
  assert.equal(f.native.records.length,0);
  await f.runtime.submit({kind:'openInitialHiring'});
  const command={kind:'hire',id:'first-native-paid-hire',selection:{youngMale:1}};
  await f.runtime.submit(command);
  await until(()=>f.native.records.some(row=>row.kind==='farm-arrival'&&row.packet),()=>f.native.present());
  const pending=f.native.records.find(row=>row.kind==='farm-arrival'),worker=f.state.workers[0];
  assert.equal(worker.nativeRouteAdmission,'pending-farm-arrival-resources');
  assert.equal(worker.path,null);
  assert.equal(pending.resources.bodyId,1);
  assert.equal(pending.committed,false);
  assert.equal(pending.resources.sourceRequest.actorId,Number(worker.id.split('-').at(-1)));
  assert.equal(f.state.events.filter(event=>event.type==='HiringConfirmed').length,1);
  assert(Object.hasOwn(f.state.ledger.entries,command.id));
  const origin=[worker.x,worker.z],at=f.state.elapsed;
  let now=performance.now();f.host.now=()=>now;
  await f.runtime.activateClock();now+=150;
  await until(()=>f.state.elapsed>at&&(!initialTask||f.state.workers[0].nativeRouteAdmission==='pending-resources'),()=>f.native.present());
  assert.equal(f.state.workers[0].nativeRouteAdmission,initialTask?'pending-resources':'pending-farm-arrival-resources');
  assert.deepEqual([f.state.workers[0].x,f.state.workers[0].z],origin);
  release();
  await until(()=>f.native.records.some(row=>row.kind===(initialTask?'task-start':'farm-arrival')&&row.committed),()=>f.native.present());
  await f.runtime.submit({kind:'snapshot'});
  now+=250;
  await until(()=>Math.hypot(f.state.workers[0].x-origin[0],f.state.workers[0].z-origin[1])>.1,()=>f.native.present());
  assert.equal(f.state.workers[0].nativeRouteAdmission,initialTask?'native-task':'native-farm-arrival');
  const clockField=initialTask?'nativeStart':'nativeFarmArrival';
  assert.equal(f.native.host.inspect().nativeRouteFrame.bindings.find(row=>row[clockField])[clockField].bodyId,1);
  if(initialTask){assert.equal(pending.aborted,true);assert.equal(pending.committed,false);}
  await f.runtime.submit(command);
  assert.equal(f.state.workers.length,1);
  assert.equal(f.state.events.filter(event=>event.type==='HiringConfirmed').length,1);
  assert.deepEqual(f.native.faults,[]);
 }finally{release();await f.close();}
});

test('the first paid hire in Savanna completes watering through Task14 and Action15',async()=>{
 const opening=await createSpatialCampaignOpening();
 const {state,nav}=opening;
 const chunkKeys=[...opening.loaded.keys()];
 try{
  assert.equal(state.biome,'sabana');
  state.tutorial.step='plant';
  const center=state.structures.find(s=>s.kind==='center');
  assert(plant(state,'first-native-crop','platano',center.x+4,center.z-7,nav));
 }finally{opening.dispose();}
 let release;
 const ready=new Promise(resolve=>release=resolve);
 const f=await fullFixture({state,chunkKeys,nativeWorkerLifecycle:true,onReady:record=>record.kind==='farm-arrival'?ready:undefined});
 try{
  await f.runtime.attachNativeIntentControl(f.native.controlPort);
  assert.equal(f.native.host.inspect().nativeCausalClock.committedThrough,0);
  await f.runtime.attachNativeResourcePreparation(f.native.resourcePort);
  await f.runtime.submit({kind:'openInitialHiring'});
  const hire={kind:'hire',id:'savanna-first-hire',selection:{youngMale:1}};
  await f.runtime.submit(hire);
  await until(()=>f.native.records.some(row=>row.kind==='farm-arrival'&&row.packet),()=>f.native.present());
  const farm=f.native.records.find(row=>row.kind==='farm-arrival'),[worker]=f.state.workers,[crop]=f.state.plants;
  const origin=[worker.x,worker.z];
  assert.equal(farm.resources.bodyId,1);
  assert.equal(crop.water[0].status,'due');
  let now=performance.now();f.host.now=()=>now;
  await f.runtime.activateClock();now+=150;
  await until(()=>f.state.workers[0].nativeRouteAdmission==='pending-resources',()=>f.native.present());
  assert.deepEqual([f.state.workers[0].x,f.state.workers[0].z],origin);
  release();
  const acquired=kind=>f.native.records.find(record=>record.kind===kind&&record.committed);
  await until(()=>acquired('task-start'),()=>f.native.present());
  assert(farm.aborted&&!farm.committed);
  const start=acquired('task-start');
  assert.equal(start.resources.bodyId,1);
  assert.equal(start.resources.targetId,Number(crop.id.split('-').at(-1)));
  await until(()=>f.native.host.inspect().nativeRouteFrame?.bindings.some(row=>row.nativeStart?.bodyId===1),()=>f.native.present());
  const advance=async()=>{now+=50;await f.native.present();};
  await until(()=>f.native.host.inspect().nativeRouteFrame?.bindings.some(row=>row.nativeAction?.request.bodyId===1),advance);
  await until(()=>f.state.plants[0].water[0].status==='manual',advance);
  const action=acquired('task-action');
  assert.equal(action?.resources.request.bodyId,1);
  assert.equal(acquired('initial-idle-body')?.resources.nativeInitialIdleBody.bodyId,1);
  assert.equal(f.state.workers[0].nativeRouteAdmission,'native-idle');
  assert.equal(f.state.events.filter(event=>event.type==='WaterSatisfied'&&event.targetId===crop.id).length,1);
  const ledger=structuredClone(f.state.ledger);
  await f.runtime.submit(hire);
  assert.equal(f.state.workers.length,1);
  assert.equal(f.state.events.filter(event=>event.type==='HiringConfirmed').length,1);
  assert(Object.hasOwn(f.state.ledger.entries,hire.id));
  assert.deepEqual(f.state.ledger,ledger);
  assert.deepEqual(f.native.faults,[]);
 }finally{release();await f.close();}
});

for(const [kind,fixtureName,clockField,bindingField,capability] of [
 [22,'Idle22','nativeStroll','nativeIdleStrollBinding','nativeIdleStrollVersion'],
 [23,'Farm23','nativeFarmArrival','nativeFarmArrivalBinding','nativeFarmArrivalVersion']
])test(`a terminal ${fixtureName} hold resumes only from the first matching submit on its replacement Draw`,async()=>{
 const chunkKeys=Array.from({length:9},(_,i)=>(i%3-1)+','+(Math.floor(i/3)-1));
 if(kind===23)chunkKeys.push('2,-1','2,0','2,1');
 const f=await sourceFixture(kind===23?{state:movingFarmForRecovery(),chunkKeys}:{chunkKeys});
 const capabilities={width:20,height:10,format:'rgba8unorm',[capability]:1};
 const terrain=new MessageChannel(),control=new MessageChannel(),resources=new MessageChannel();
 const client=createSimulationAuthorityClient({session:'s',snapshot:f.snapshot,terrainPort:terrain.port1,
   chunkKeys,workerFactory:()=>f.sourceWorker});
 const interruptedControl=new MessageChannel();
 let interrupted,replacement,endpoint;
 try{
   await client.ready;await client.submit({kind:'snapshot'}).result;
   await client.attachNativeIntentControl(f.native.controlPort);
   await client.attachNativeResourcePreparation(f.native.resourcePort);
   await until(()=>f.native.records.some(r=>r.committed),()=>f.native.present());
   await client.submit({kind:'resume',reason:'menu'}).result;
   const before=await client.submit({kind:'advance',steps:2,seconds:.05,nightFastForward:false}).result,at=before.elapsed;
   const moving=()=>f.native.host.inspect().nativeRouteFrame?.bindings.find(b=>b[clockField]&&b.relativeTime>0);
   await until(()=>!!moving(),()=>f.native.present());
   const bodyId=moving()[clockField].bodyId;
   const live=await client.quiesceNativeIntentProduction(30,{withPublicationFloor:true,forLostDraw:true});
   assert.equal(live.terminal,undefined);await client.resumeNativeIntentProduction(30,31);
   f.native.gpu.device.destroy();
   await until(()=>f.native.authority.nativeIntentControlStatus().current?.drained);
   f.native.retireResourceEndpoint();
   const cut=await client.quiesceNativeIntentProduction(32,{withPublicationFloor:true,forLostDraw:true});
   assert.equal(cut.terminal,true);
   await assert.rejects(client.resumeNativeIntentProduction(32,33),/Replacement is not ready/);
   interrupted=await createRemoteFixture({capabilities},
      {intentControl:{port:interruptedControl.port2,session:'s',recoveryHold:cut.holdId}});
   await client.attachNativeIntentControl(interruptedControl.port1,{recoveryHold:cut.holdId});
   const competing=new MessageChannel();
   try{await assert.rejects(client.attachNativeIntentControl(competing.port1,{recoveryHold:cut.holdId}),/Previous replacement is still live/);}
   finally{competing.port1.close();competing.port2.close();}
   interrupted.gpu.device.destroy();
   await until(()=>f.native.authority.nativeIntentControlStatus().current?.drained);
   replacement=await createRemoteFixture({capabilities},
      {intentControl:{port:control.port2,session:'s',recoveryHold:cut.holdId}});
   const {recoveredWorkerRoute:q}=await client.attachNativeIntentControl(control.port1,{recoveryHold:cut.holdId});
   assert.equal(q.holdId,cut.holdId);assert.equal(q.execution.executedThrough,at);
   assert.equal(q.resources.kind,kind);
   const ref=q.resources[bindingField].reference,epoch=ref.worldBoundary.effectiveTime;
   assert.equal(ref.bodyId,bodyId);
   const early=new MessageChannel();
   try{await assert.rejects(client.attachNativeResourcePreparation(early.port1,{recoveryHold:cut.holdId}),/Missing submitted/);}
   finally{early.port1.close();early.port2.close();}
   replacement.client.registerClockBinding(replacement.buffer,{byteOffset:0,epoch,semantic:'relative',
     [clockField]:ref,resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)});
   const frame=replacement.frame(77,{nativeWorldBoundary:ref.worldBoundary,
     clock:{version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}});
   await flush();await replacement.host.idle();replacement.host.present();await frame;
   assert.equal(replacement.host.inspect().nativeRouteFrame.bindings.find(b=>b[clockField])?.relativeTime,floorFloat32(at-epoch));
   endpoint=attachNativeResourcePreparationEndpoint({port:resources.port2,session:'s',isRunning:()=>true,
     prepare:async()=>{throw Error('Unexpected preparation during hold');}});
   await client.attachNativeResourcePreparation(resources.port1,{recoveryHold:cut.holdId});
   await client.resumeNativeIntentProduction(32,34);
   const next=await client.submit({kind:'advance',steps:1,seconds:.05,nightFastForward:false}).result;
   assert.equal(next.sequence,q.publicationSequence+1);assert(Math.abs(next.elapsed-at-.05)<1e-8);
 }finally{
   client.dispose();endpoint?.dispose();replacement?.client.dispose();await replacement?.host.dispose();
   interrupted?.client.dispose();await interrupted?.host.dispose();
   for(const channel of [terrain,control,resources,interruptedControl]){channel.port1.close();channel.port2.close();}
   await f.close();
 }
});
