import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';
import {serialize} from '../src/persistence/snapshots.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeProductionAuthority} from './helpers/native-production-authority.js';

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
  const result=await build({entryPoints:[resolve('src/simulation/'+entry)],bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':'{"DEV":false,"MODE":"production"}'},banner:{js:'const __nativeProductionHarness=globalThis.__nativeProductionHarness;const self=__nativeProductionHarness.self;const postMessage=(...args)=>__nativeProductionHarness.postMessage(...args);const close=()=>__nativeProductionHarness.close();const fetch=(...args)=>__nativeProductionHarness.fetch(...args);'},plugins:[{name:'native-production-creation-adapters',setup(p){
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
 const saved=nativeIdleStrollGameSave(),snapshot=serialize(saved.state);let onSourceError=()=>{},created=0;
 const native=await nativeProductionAuthority(saved.state,{...options,attach:false,transportSession:'s',onNativeIntentControlError:error=>onSourceError(error)}),wasm=readFileSync('src/world/wild-engine/spatial-savanna.wasm'),originalFetch=globalThis.fetch;
 const source={self:{},messages:[],fetch:async url=>url==='native-lifecycle-wasm'?{ok:true,arrayBuffer:async()=>wasm.buffer.slice(wasm.byteOffset,wasm.byteOffset+wasm.byteLength)}:originalFetch(url),createAuthority(...args){created++;onSourceError=args[3].onNativeIntentControlError;return native.authority;}},sourceWorker=adapter(source);
 await loadWorker('source',source);return {native,source,sourceWorker,snapshot,created:()=>created,async close(){sourceWorker.terminate();await flush();await native.close();}};
}
async function fullFixture(options={}){
 const base=await sourceFixture(options),{native,source,sourceWorker,snapshot}=base;
 const host={self:{},messages:[],fetch:globalThis.fetch,createClient:options=>createSimulationAuthorityClient({...options,workerFactory:()=>sourceWorker})},hostWorker=adapter(host),state=deserializeConfirmedState(snapshot),receiver=createConfirmedStateReceiver(state,'s');
 let runtime;
 const close=async()=>{runtime?.dispose();await flush();await flush();await base.close();};
 try{
  await loadWorker('host',host);
  runtime=createWorkerHostedRuntime({world:{createConfirmedReceiver:()=>receiver},session:'s',clientOptions:{snapshot,chunkKeys:Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`)},runtimeOptions:{startupSuspended:true},workerFactory:()=>hostWorker});
  await runtime.start();return {runtime,native,source,host,sourceWorker,hostWorker,state,created:base.created,close};
 }catch(error){await close();throw error;}
}

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
  if(rejectCommit){await assert.rejects(waiting,/commit|closed|unavailable|flush/i);assert.equal(f.source.messages.filter(m=>m.kind==='nativeIntentProductionQuiesced').length,0);assert.equal(f.native.authority.nativeResourcePreparationStatus().phase,'failed');}
  else{const receipt=await waiting;assert.equal(f.native.records[0].committed,true);assert.equal(f.native.authority.nativeResourcePreparationStatus().pending,0);await f.runtime.resumeNativeIntentProduction(receipt.holdId);assert.deepEqual(f.native.faults,[]);}
  assert.equal(f.sourceWorker.sent.filter(m=>m.data.kind==='command').at(-1).data.command.sequence,lastSequence);assert.equal(f.created(),1);
 }finally{release();releaseMessages();await f.close();}
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
