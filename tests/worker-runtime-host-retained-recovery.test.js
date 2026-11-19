import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {MessageChannel} from 'node:worker_threads';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createMainSnapshotDecoder} from '../src/simulation/main-thread-snapshot-transport.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {createTemporalRecoveryReceiver} from '../src/rendering/temporal-recovery-receiver.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){const deadline=Date.now()+4000;while(!predicate()){if(Date.now()>deadline)throw Error('Retained host test timed out');await flush();}}
const effects=(sequence,elapsed)=>({sequence,presentationCheckpoint:{version:1,sequence,elapsed,...Object.fromEntries(['guardian','agriculture','blessing'].map(key=>[key,{version:1,sequence,elapsed}]))},workCheckpoint:{version:1,sequence,elapsed,effects:[]}});
function presentation(){
 const decoder=createMainSnapshotDecoder();return {sent:[],publications:[],postMessage(value){this.sent.push(value);if(value.kind!=='publication')return;const message=decoder.decode(value);this.publications.push(message.publication);queueMicrotask(()=>{this.onmessage?.({data:{kind:'publicationReceipt',session:'s',sequence:message.publication.sequence}});this.onmessage?.({data:{kind:'publicationAck',session:'s',sequence:message.publication.sequence,...(message.publication.terrainCheckpoint&&!message.skipWorkCheckpoint?effects(message.publication.sequence,message.publication.elapsed):{})}});});},start(){},close(){decoder.dispose();}};
}
const hello=port=>port.onmessage({data:{kind:'presentationTimelineHello',session:'s',version:1,maxPublications:8,maxBytes:100000000}});
let bundleId=0;
async function fixture({early=false}={}){
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'retained-host'}),snapshot=serialize(opening.state),authority=createSimulationAuthority(new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),snapshot,[...opening.loaded.keys()]);
 const saved={self:globalThis.self,postMessage:globalThis.postMessage,close:globalThis.close,harness:globalThis.__retainedHostHarness},messages=[],switches=[],inspections=[],controls=[];let sequence=0,manifest=null,switchGate=null,stale=false,handler=null;
 globalThis.self={};globalThis.postMessage=m=>{messages.push(m);if(m.kind==='publication')queueMicrotask(()=>handler?.({data:{kind:'publicationAck',session:'s',sequence:m.publication.sequence}}));};globalThis.close=()=>{};
 globalThis.__retainedHostHarness={client:options=>({ready:Promise.resolve(),terrainBlocked:()=>false,submit(command){const n=++sequence,publication=authority.execute({...command,sequence:n});if(publication.terrainCheckpoint){manifest={epoch:'retained-source',chunks:publication.terrainCheckpoint.chunks.map(c=>({cx:c.cx,cz:c.cz,revision:1}))};publication.terrainCheckpoint.terrainManifest=manifest;}return {accepted:true,sequence:n,result:Promise.resolve({...publication,session:options.session})};},inspectTerrainRecoveryHandoff(through){const value={epoch:'retained-source',lastSequence:through,chunks:manifest.chunks.map(c=>({...c,revision:stale?c.revision+1:c.revision}))};inspections.push(value);return Promise.resolve(value);},reattachTerrain(port,options){switches.push({port,options});return switchGate??Promise.resolve();},attachNativeIntentControl(port){controls.push(port);return Promise.resolve();},dispose(){},status(){return {state:'ready',inflight:null,queued:0};}})};
 const cleanup=async()=>{try{if(handler)await handler({data:{kind:'dispose',session:'s'}});}finally{authority.dispose();opening.session.dispose();globalThis.self=saved.self;globalThis.postMessage=saved.postMessage;globalThis.close=saved.close;globalThis.__retainedHostHarness=saved.harness;}};
 try{const built=await build({entryPoints:[resolve('src/simulation/worker-runtime-host.js')],bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':'{"DEV":false,"MODE":"production"}'},plugins:[{name:'retained-authority',setup(plugin){plugin.onResolve({filter:/simulation-authority-client\.js$/},()=>({path:'authority',namespace:'retained'}));plugin.onLoad({filter:/.*/,namespace:'retained'},()=>({contents:'export const createSimulationAuthorityClient=options=>globalThis.__retainedHostHarness.client(options);',loader:'js'}));}}]});
 await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64')+'#retained-host-'+bundleId++);
 handler=self.onmessage;const send=data=>handler({data:{session:'s',...data}}),initial=presentation(),history={maxPending:16,maxRetainedBytes:4096,maxBatchBytes:4096,maxBatchRevisions:8},clientOptions={snapshot,chunkKeys:[...opening.loaded.keys()],terrainHistory:history},recovery={enabled:true,work:true};
 if(early)await send({kind:'prepareAuthority',clientOptions,recovery,presentationTimeline:true,historicalRecovery:true});
 const starting=send({kind:'initialize',clientOptions,terrainPort:{},presentationPort:initial,runtimeOptions:{startupSuspended:true,presentationTimeline:true,historicalRecovery:true,visualRecovery:recovery,mainThreadProjection:true,coalescePublications:true}});await until(()=>typeof initial.onmessage==='function');hello(initial);await starting;await flush();
 assert.ok(messages.some(m=>m.kind==='started'),JSON.stringify(messages.filter(m=>m.kind==='failure')));switches.length=0;
 await send({kind:'command',id:20,command:{kind:'pause',reason:'retained-prefix'}});await flush();await send({kind:'command',id:21,command:{kind:'resume',reason:'retained-prefix'}});await flush();
 await send({kind:'markVisualLost',id:22});await send({kind:'prepareVisualRecovery',id:23});const prepared=messages.find(m=>m.kind==='visualRecoveryPrepared'&&m.id===23);assert.ok(prepared);assert.equal(prepared.checkpoint.sequence,1);
 const retained=effects(2,initial.publications.find(p=>p.sequence===2).elapsed);
 return {send,messages,switches,inspections,controls,initial,prepared,retained,setStale(value){stale=value;},gate(value){switchGate=value;},async dispose(){initial.close();await cleanup();}};
 }catch(error){await cleanup();throw error;}
}

for(const early of [false,true])test(`ordinary ${early?'prepared':'direct'} host replays only the retained suffix and resumes a fresh full/delta encoder`,async()=>{
 const f=await fixture({early}),channel=new MessageChannel(),wire=[],errors=[];let receiver,releaseCheckpoint;
 const before=f.initial.publications.find(p=>p.sequence===2),state=deserializeConfirmedState(before.snapshot),actor=state.workers[0],confirmed=createConfirmedStateReceiver(state,'s',{initialSequence:2});
 channel.port1.on('message',m=>wire.push(m));
 receiver=createTemporalRecoveryReceiver({port:channel.port2,session:'s',restoreCheckpoint:async(checkpoint,options)=>{assert.equal(checkpoint.sequence,2);assert.equal(checkpoint.snapshot,before.snapshot);assert.deepEqual(options,{retainCurrent:true});assert.deepEqual(checkpoint.events,[]);await new Promise(resolve=>{releaseCheckpoint=resolve;});return true;},applyBoundary:async boundary=>{const p=boundary.publication;assert.equal((p.unchanged===true?confirmed.acceptUnchanged(p):confirmed.accept(p)).accepted,true);return true;},onError:e=>errors.push(e.message)});
 const outgoing=channel.port1.postMessage.bind(channel.port1),sent=[];channel.port1.postMessage=m=>{sent.push(structuredClone(m));outgoing(m);};
 let releaseSwitch;f.gate(new Promise(resolve=>{releaseSwitch=resolve;}));const next=presentation(),attaching=f.send({kind:'attachVisualRecovery',id:24,terrainPort:{},presentationPort:next,recoveryPort:channel.port1,retainedCheckpoint:f.retained});
 try{
  await until(()=>f.switches.length===1);assert.deepEqual(sent,[],'no replay before terrain handoff resolves');assert.equal(f.messages.some(m=>m.id===24),false);releaseSwitch();await attaching;await until(()=>typeof releaseCheckpoint==='function');assert.equal(f.messages.some(m=>m.kind==='visualRecoveryAttached'&&m.id===24),false,'no attachment success before actual checkpoint ACK');assert.deepEqual(sent.map(m=>m.sequence),[2]);releaseCheckpoint();await until(()=>f.messages.some(m=>m.kind==='visualRecoveryAttached'&&m.id===24)||errors.length);assert.deepEqual(errors,[]);
  assert.deepEqual(sent.map(m=>[m.id,m.kind,m.sequence]),[[1,'recoveryCheckpoint',2],[2,'recoveryBoundary',3]]);assert.equal(sent[0].retainCurrent,true);assert.deepEqual(f.switches[0].options.historicalHandoff,f.inspections[0]);assert.deepEqual(f.controls,[],'retention never replaces the direct native control owner');assert.equal(confirmed.status().sequence,3);assert.equal(state.workers[0],actor);assert.equal(state.pauses.includes('retained-prefix'),false);assert.equal(f.prepared.checkpoint.sequence,1,'producer base remains original');
  hello(next);await f.send({kind:'finishVisualRecoveryConfirmed',id:25});await f.send({kind:'stageRecoveryVisibility',id:26,hidden:false});await f.send({kind:'activateVisualRecovery',id:27});assert.ok(f.messages.some(m=>m.kind==='visualRecoveryActivated'&&m.id===27));
  await f.send({kind:'command',id:28,command:{kind:'snapshot'}});await f.send({kind:'command',id:29,command:{kind:'snapshot'}});await flush();const publications=next.sent.filter(m=>m.kind==='publication');assert.equal(typeof publications[0].publication.snapshot,'string','new transport starts with a full snapshot');assert.ok(publications[1].publication.snapshotDelta,'later publications reuse the new encoder baseline');assert.deepEqual(publications.slice(0,2).map(m=>m.publication.sequence),[4,5]);
 }finally{releaseSwitch?.();releaseCheckpoint?.();await attaching;receiver.dispose();channel.port1.close();channel.port2.close();next.close();await f.dispose();}
});

for(const [name,change] of [
 ['cursor before base',x=>({...x,sequence:0})],
 ['cursor after source',x=>({...x,sequence:4})],
 ['wrong effects sequence',x=>({...x,presentationCheckpoint:{...x.presentationCheckpoint,sequence:1}})],
 ['wrong work time',x=>({...x,workCheckpoint:{...x.workCheckpoint,elapsed:x.workCheckpoint.elapsed+1}})],
 ['caller supplied handoff',x=>({...x,handoff:{epoch:'fabricated',lastSequence:3,chunks:[]}})],
])test(`ordinary host rejects ${name} before replacing terrain or emitting replay`,async()=>{
 const f=await fixture(),sent=[],replay={postMessage:m=>sent.push(m),start(){},close(){}};
 try{await f.send({kind:'attachVisualRecovery',id:24,terrainPort:{},presentationPort:presentation(),recoveryPort:replay,retainedCheckpoint:change(f.retained)});assert.ok(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===24));assert.deepEqual(f.switches,[]);assert.deepEqual(sent,[]);assert.equal(f.messages.some(m=>m.kind==='visualRecoveryAttached'&&m.id===24),false);}finally{await f.dispose();}
});

test('retained host checks the actual authority handoff and rejects a replacement native control port',async()=>{
 const f=await fixture(),sent=[],replay={postMessage:m=>sent.push(m),start(){},close(){}};
 try{await f.send({kind:'attachVisualRecovery',id:24,terrainPort:{},presentationPort:presentation(),recoveryPort:replay,intentControlPort:{},retainedCheckpoint:f.retained});assert.ok(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===24));assert.deepEqual(f.inspections,[]);assert.deepEqual(f.controls,[]);f.setStale(true);await f.send({kind:'attachVisualRecovery',id:25,terrainPort:{},presentationPort:presentation(),recoveryPort:replay,retainedCheckpoint:f.retained});assert.equal(f.inspections.length,1);assert.deepEqual(f.switches,[]);assert.deepEqual(sent,[]);assert.ok(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===25&&/handoff mismatch/.test(m.message)));}finally{await f.dispose();}
});

test('failed terrain switch retires prepared replay and permits explicit retained retry without opening a live stream',async()=>{
 const f=await fixture(),sent=[],replay={postMessage:m=>sent.push(m),start(){},close(){}};
 try{f.gate(Promise.reject(Error('switch refused')));await f.send({kind:'attachVisualRecovery',id:24,terrainPort:{},presentationPort:presentation(),recoveryPort:replay,retainedCheckpoint:f.retained});assert.deepEqual(sent,[]);assert.equal(replay.onmessage,null);assert.ok(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===24&&m.retryable));await f.send({kind:'prepareVisualRecovery',id:25});assert.ok(f.messages.some(m=>m.kind==='visualRecoveryPrepared'&&m.id===25));f.gate(null);await f.send({kind:'attachVisualRecovery',id:26,terrainPort:{},presentationPort:presentation(),recoveryPort:replay,retainedCheckpoint:f.retained});assert.equal(sent[0]?.sequence,2);assert.equal(sent[0]?.retainCurrent,true);assert.equal(f.messages.some(m=>m.kind==='visualRecoveryAttached'&&m.id===26),false);}finally{await f.dispose();}
});

test('hosted runtime forwards retained effects/cursor as data and transfers only the three transport endpoints',async()=>{
 const messages=[],worker={postMessage(message,transfer){messages.push({message,transfer});},terminate(){}},runtime=createWorkerHostedRuntime({world:{createConfirmedReceiver:()=>({accept:()=>({accepted:true}),acceptUnchanged:()=>({accepted:true}),status:()=>({sequence:1,lastElapsed:0})})},session:'s',clientOptions:{snapshot:'{}',chunkKeys:[],terrainHistory:{maxPending:16,maxRetainedBytes:4096,maxBatchBytes:4096,maxBatchRevisions:8}},runtimeOptions:{presentationTimeline:true,historicalRecovery:true,visualRecovery:{enabled:true,work:true}},workerFactory:()=>worker});
 try{const starting=runtime.start({terrainPort:{},presentationPort:{}});worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0,events:[]}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await starting;const terrainPort={},presentationPort={},recoveryPort={},retainedCheckpoint=effects(2,0),attached=runtime.attachVisualRecovery({terrainPort,presentationPort,recoveryPort,retainedCheckpoint}),last=messages.at(-1);assert.deepEqual(last.transfer,[terrainPort,presentationPort,recoveryPort]);assert.equal(last.message.retainedCheckpoint,retainedCheckpoint);assert.equal(last.message.intentControlPort,undefined);worker.onmessage({data:{kind:'visualRecoveryAttached',session:'s',id:last.message.id,sequence:3}});assert.equal((await attached).sequence,3);}finally{runtime.dispose();}
});
