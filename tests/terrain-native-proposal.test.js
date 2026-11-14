import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';

const boundary=Object.freeze({version:1,authorityEpoch:'native-owner',nativeSession:1,ticket:1,effectiveTime:10});
const chunk=(cx,height=1)=>({authority:'spatial-wasm',cx,cz:0,terrain:{positions:new Float32Array([0,height,0]),colors:new Float32Array([1,1,1]),indices:new Uint16Array([0])},instances:Array.from({length:20},()=>[])});
const resources=(chunks=[chunk(0,2)],removed=[])=>({version:1,phase:'proposal',...boundary,kind:removed.length?7:8,chunks,removed});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let n=0;n<100;n++){if(predicate())return;await tick();}throw Error('Terrain proposal test timed out');}
async function fixture({prepareProposal,receiverOptions={},producerOptions={},transformOutgoing=null}={}){
 const {port1,port2}=new MessageChannel(),errors=[],changes=[],prepared=[],live=new Map();let prepares=0,commits=0,aborts=0;
 if(transformOutgoing){const send=port1.postMessage.bind(port1);port1.postMessage=(message,transfer)=>{transformOutgoing(message);send(message,transfer);};}
 const makeHandle=messages=>{let active=true;return {canonicalPropsUnmasked:true,valid:()=>active,commit(){assert.equal(active,true);active=false;commits++;for(const m of messages)m.payload.removed?live.delete(m.payload.cx):live.set(m.payload.cx,m.payload.terrain.positions[1]);return true;},abort(){if(!active)return false;active=false;aborts++;return true;},identityFor:p=>({publicationOrder:p.cx+100})};};
 const receiver=createConfirmedTerrainReceiver({port:port2,session:'s',confirmedElapsed:10,retainRevisions:true,autoBootstrap:true,residency:{replace(){},remove(){}},validateRevision:()=>{},onError:e=>errors.push(e),onApplied:(p,r,m)=>changes.push([p.cx,r,m]),onRemoved:(p,r,m)=>changes.push([p.cx,r,m]),prepareGraphicalBatch(messages){prepares++;return makeHandle(messages);},prepareGraphicalProposal:async(messages,options)=>{prepared.push(messages);return prepareProposal?prepareProposal(messages,options,makeHandle):makeHandle(messages);},...receiverOptions});
 const producer=createTerrainPublication({port:port1,session:'s',epoch:'e',retainRevisions:true,...producerOptions});
 producer.stage(chunk(0));producer.stage(chunk(1));producer.commit(0);await until(()=>live.size===2&&producer.status().window?.batches===0);
 const initialChanges=changes.length;
 return {producer,receiver,errors,live,changes,prepared,initialChanges,get prepares(){return prepares;},get commits(){return commits;},get aborts(){return aborts;},async dispose(){producer.dispose();receiver.dispose();await tick();}};
}

test('native delta prepares before publication and transfers its real batch once without rebuilding unchanged revisions',async()=>{
 const f=await fixture();try{
  const r=resources(),handle=await f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:r});
  assert.equal(handle.valid(),true);assert.deepEqual([...f.live],[[0,1],[1,1]]);assert.equal(f.changes.length,f.initialChanges);assert.equal(f.commits,1);
  // Preview arrays are privately owned; producer mutation cannot change the reservation.
  r.chunks[0].terrain.positions[1]=99;
  const actual=resources();f.producer.stage(actual.chunks[0],10);
  assert.equal(handle.commit({worldBoundary:boundary,resources:actual}),true);assert.equal(handle.abort(),false);
  f.producer.commit(1);await until(()=>f.receiver.ready(1));
  assert.deepEqual([...f.live],[[0,1],[1,1]],'prepared geometry is still hidden until the confirmed boundary');assert.equal(f.receiver.status().nativeProposal.phase,'adopting');assert.deepEqual(f.receiver.status().nativeProposal.worldBoundary,boundary);
  f.receiver.confirm(1,10);assert.deepEqual([...f.live],[[0,2],[1,1]]);assert.equal(f.prepares,1,'ordinary batch did not invoke the preparer again');assert.equal(f.prepared.length,1);assert.equal(f.commits,2);
  assert.equal(f.changes.length,f.initialChanges+1);assert.equal(f.changes.at(-1)[1],2);assert.equal(f.changes.at(-1)[2].publicationOrder,100);
  assert.deepEqual(f.receiver.admittedBoundary(1).nativeWorldBoundary,boundary);assert.deepEqual(f.producer.manifest().chunks,[{cx:0,cz:0,revision:2},{cx:1,cz:0,revision:1}]);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});
test('native removal consumes the prepared paired removal and preserves the unchanged chunk',async()=>{
 const f=await fixture();try{const r=resources([],[{cx:0,cz:0}]),h=await f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:r});f.producer.stage({authority:'spatial-wasm',cx:0,cz:0,removed:true},10);h.commit({worldBoundary:boundary,resources:r});f.producer.commit(1);await until(()=>f.receiver.ready(1));f.receiver.confirm(1,10);assert.deepEqual([...f.live],[[1,1]]);assert.equal(f.prepares,1);assert.equal(f.receiver.admittedBoundary(1).changes[0].removed,true);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});
test('blocked proposal preparation leaves current resources visible and cancellation aborts a late real owner',async()=>{
 let release;const blocked=new Promise(resolve=>release=resolve);let signal;
 const f=await fixture({prepareProposal:async(messages,options,make)=>{signal=options.signal;await blocked;return make(messages);}});try{
  const controller=new AbortController(),promise=f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:resources(),signal:controller.signal});
  await until(()=>signal);assert.deepEqual([...f.live],[[0,1],[1,1]]);assert.equal(f.receiver.status().nativeProposal.phase,'preparing');controller.abort();await assert.rejects(promise,{name:'AbortError'});await until(()=>signal.aborted);release();await until(()=>f.aborts===1);assert.equal(f.receiver.status().nativeProposal,null);assert.equal(f.commits,1);assert.deepEqual(f.errors,[]);
 }finally{release();await f.dispose();}
});
test('a different physical payload or staged revision cannot consume the prepared delta',async()=>{
 const f=await fixture();try{const r=resources(),h=await f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:r});f.producer.stage(chunk(0,3),10);assert.throws(()=>h.commit({worldBoundary:boundary,resources:r}),/differs/);assert.throws(()=>h.commit({worldBoundary:{...boundary,ticket:2},resources:r}),/differs/);h.abort();await until(()=>f.aborts===1);assert.deepEqual([...f.live],[[0,1],[1,1]]);assert.equal(f.prepares,1);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});
test('ordinary publication invalidates a speculative reservation without closing the live terrain channel',async()=>{
 const f=await fixture();try{const h=await f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:resources()});f.producer.stage(chunk(1,4),10);f.producer.commit(1);await until(()=>f.receiver.ready(1));assert.equal(h.valid(),false);f.receiver.confirm(1,10);assert.deepEqual([...f.live],[[0,1],[1,4]]);assert.equal(f.aborts,1);assert.equal(f.receiver.status().closed,false);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});
test('receiver aborts a proposal whose actual GPU ticket is stale before physical admission',async()=>{
 const f=await fixture({prepareProposal:(m,o,make)=>({...make(m),valid:()=>false})});try{await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:resources()}),/GPU resources/);await until(()=>f.aborts===1);assert.equal(f.receiver.status().closed,false);assert.deepEqual([...f.live],[[0,1],[1,1]]);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});
test('empty native resource projection transfers an explicit empty applied receipt',async()=>{
 const f=await fixture();try{const r=resources([],[]),h=await f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:r});h.commit({worldBoundary:boundary,resources:r});f.producer.commit(1);await until(()=>f.receiver.ready(1));f.receiver.confirm(1,10);const receipt=f.receiver.admittedBoundary(1);assert.equal(receipt.empty,true);assert.deepEqual(receipt.nativeWorldBoundary,boundary);assert.equal(f.prepares,1);assert.equal(f.commits,2);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});
test('proposal bytes use the negotiated capacity before sending or touching graphical owners',async()=>{
 const f=await fixture({receiverOptions:{maxHistoryBytes:4000}});try{const big=chunk(0);big.terrain.positions=new Float32Array(2000);await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:resources([big])}),/capacity/);assert.equal(f.prepared.length,0);assert.equal(f.receiver.status().nativeProposal,null);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});
test('cancelling a ready proposal releases its GPU owner and the charged preview bytes',async()=>{
 const f=await fixture();try{const controller=new AbortController(),h=await f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:resources(),signal:controller.signal});assert.equal(h.valid(),true);assert.ok(f.receiver.status().retainedBytes>0);controller.abort();await until(()=>f.aborts===1);assert.equal(h.valid(),false);assert.equal(f.receiver.status().retainedBytes,0);assert.deepEqual([...f.live],[[0,1],[1,1]]);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});
test('a changed publication in transit cannot activate the prepared native revision or stamp a receipt',async()=>{
 const f=await fixture({transformOutgoing(message){if(message.kind==='terrainBatch'&&message.messages[0].sequence===1)message.messages[1].payload.terrain.colors[0]=.5;}});try{
  const r=resources(),h=await f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:r});f.producer.stage(r.chunks[0],10);h.commit({worldBoundary:boundary,resources:r});f.producer.commit(1);await until(()=>f.receiver.status().closed);assert.equal(f.receiver.admittedBoundary(1),null);assert.equal(f.commits,1);assert.equal(f.aborts,1);assert.deepEqual([...f.live],[[0,1],[1,1]]);assert.match(f.errors[0].message,/differs/);
 }finally{await f.dispose();}
});
test('canonical props masked by the presentation snapshot cannot be admitted as native resources',async()=>{
 const f=await fixture({prepareProposal:(m,o,make)=>({...make(m),canonicalPropsUnmasked:false})});try{await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:resources()}),/GPU resources/);await until(()=>f.aborts===1);assert.equal(f.receiver.admittedBoundary(1),null);assert.equal(f.commits,1);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});
test('a channel without a versioned epoch refuses native preparation before any physical effect',async()=>{
 const f=await fixture({producerOptions:{epoch:null}});try{await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:resources()}),/unavailable/);assert.equal(f.prepared.length,0);assert.equal(f.commits,1);assert.equal(f.receiver.status().closed,false);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});

test('an exception from the real validity check still aborts its already allocated GPU owner',async()=>{
 const f=await fixture({prepareProposal:(m,o,make)=>({...make(m),valid(){throw Error('actual GPU validity failure');}})});try{await assert.rejects(f.producer.prepareNativeWorldResources({proposedWorldBoundary:boundary,resources:resources()}),/actual GPU validity failure/);await until(()=>f.aborts===1);assert.equal(f.commits,1);assert.equal(f.receiver.status().nativeProposal,null);assert.deepEqual(f.errors,[]);}finally{await f.dispose();}
});
