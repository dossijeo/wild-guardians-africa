import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as turn} from 'node:timers/promises';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {validateTerrainResourceRemoval} from '../src/world/terrain-resource-removal.js';

const removal=(cx=0)=>({authority:'spatial-wasm',cx,cz:0,removed:true});
const chunk=(cx=0)=>({authority:'spatial-wasm',cx,cz:0,terrain:{positions:new Float32Array([0,1,0]),colors:new Float32Array([1,1,1]),indices:new Uint16Array([0])}});
function producer(options={}){const sent=[],port={postMessage:(message,transfer)=>sent.push({message,transfer}),start(){},close(){}},publication=createTerrainPublication({port,session:'s',epoch:'e',...options});return {sent,port,publication,ack(){const {message}=sent.at(-1);port.onmessage({data:{kind:'terrainAck',session:'s',id:message.id}});}};}
function channel(options={}){
 const sent=[],acks=[],errors=[],applied=[],retired=[],entries=new Map(),revisions=new Map(),
  a={postMessage:(message,transfer)=>sent.push({message,transfer}),start(){},close(){}},b={postMessage:m=>acks.push(m),start(){},close(){}},
  residency={replace(payload,revision){if(revision<=(revisions.get(payload.cx)??0))return false;revisions.set(payload.cx,revision);entries.set(payload.cx,payload);return true;},remove(cx,_cz,revision){if(revision<=(revisions.get(cx)??0))return false;revisions.set(cx,revision);entries.delete(cx);return true;}},
  publication=createTerrainPublication({port:a,session:'s',epoch:'e',retainRevisions:options.retainRevisions??false}),
  receiver=createConfirmedTerrainReceiver({port:b,session:'s',confirmedElapsed:0,residency,validateRevision(){},onApplied:(p,r)=>applied.push([p.cx,r]),onRemoved:(p,r,m)=>retired.push([p.cx,r,m]),onError:e=>errors.push(e),...options});
 return {publication,receiver,sent,applied,retired,errors,entries,revisions,drain(){while(sent.length||acks.length){while(sent.length)b.onmessage({data:sent.shift().message});while(acks.length)a.onmessage({data:acks.shift()});}},dispose(){receiver.dispose();publication.dispose();}};
}

test('terrain tombstones contain no replacement geometry or unversioned data',()=>{
 assert.doesNotThrow(()=>validateTerrainResourceRemoval(removal()));
 for(const delta of [{removed:false},{cx:.5},{authority:'js'},{capturedAt:-1},{terrain:{}},{instances:[]},{epoch:'guess'}]){
  const bad={...removal(),...delta};assert.throws(()=>validateTerrainResourceRemoval(bad),/removal/);
  const p=producer();try{assert.throws(()=>p.publication.stage(bad),/removal/);}finally{p.publication.dispose();}
 }
});

test('removal shares the chunk revision and transport ACK while carrying no GPU buffers',()=>{
 const p=producer();try{
  p.publication.stage(chunk(),1);p.publication.commit(1);p.ack();
  assert.equal(p.publication.stage(removal(),2),true);p.publication.commit(2);
  const {message,transfer}=p.sent.at(-1);assert.equal(message.revision,2);assert.deepEqual(message.payload,{...removal(),capturedAt:2});assert.deepEqual(transfer,[]);
  assert.deepEqual(p.publication.manifest(),{epoch:'e',chunks:[]});
  assert.deepEqual(p.publication.handoff().chunks,[{cx:0,cz:0,revision:2,removed:true,capturedAt:2}]);
  p.ack();p.publication.stage(chunk(),3);p.publication.commit(3);assert.equal(p.sent.at(-1).message.revision,3);
  assert.deepEqual(p.publication.manifest(),{epoch:'e',chunks:[{cx:0,cz:0,revision:3}]});
 }finally{p.publication.dispose();}
});

test('retirement survives handoff without presenting a tombstone as resident terrain',()=>{
 const first=producer();let next;try{
  first.publication.stage(removal(),4);first.publication.commit(4);const state=first.publication.handoff();next=producer({initialState:state});
  assert.deepEqual(next.publication.handoff(),state);assert.deepEqual(next.publication.manifest(),{epoch:'e',chunks:[]});
  next.publication.stage(chunk(),5);next.publication.commit(5);assert.equal(next.sent.at(-1).message.revision,2);
  assert.throws(()=>producer({initialState:{...state,chunks:[{...state.chunks[0],removed:false}]}}),/removal/);
 }finally{first.publication.dispose();next?.publication.dispose();}
});

test('latest-state coalescing preserves final retirement and does not reuse its revision',()=>{
 const p=producer();try{
  p.publication.stage(chunk());p.publication.commit(1);p.publication.stage(chunk());p.publication.commit(2);p.publication.stage(removal());p.publication.commit(3);
  assert.equal(p.sent.length,1);p.ack();assert.equal(p.sent.at(-1).message.revision,3);assert.equal(p.sent.at(-1).message.payload.removed,true);
  p.ack();p.publication.stage(chunk());p.publication.commit(4);assert.equal(p.sent.at(-1).message.revision,4);
 }finally{p.publication.dispose();}
});

test('discarding a staged removal preserves the current resident manifest and revision',()=>{
 const p=producer();try{p.publication.stage(chunk());p.publication.commit(1);p.ack();p.publication.stage(removal());p.publication.discard();p.publication.commit(2);
  assert.deepEqual(p.publication.manifest(),{epoch:'e',chunks:[{cx:0,cz:0,revision:1}]});assert.equal(p.sent.length,1);
 }finally{p.publication.dispose();}
});

test('a stale terrain upload cannot resurrect a removed chunk on the same revision channel',()=>{
 let revision=0,present=false;const errors=[],port={postMessage(){},start(){},close(){}},receiver=createConfirmedTerrainReceiver({port,session:'s',confirmedSequence:2,
  residency:{replace(_p,r){if(r<=revision)return false;revision=r;present=true;return true;},remove(_x,_z,r){if(r<=revision)return false;revision=r;present=false;return true;}},onRemoved(){},onError:e=>errors.push(e)});
 try{
  for(const [id,r,payload] of [[1,1,chunk()],[2,2,removal()],[3,1,chunk()]])port.onmessage({data:{kind:'terrain',session:'s',epoch:'e',id,sequence:2,revision:r,payload}});
  assert.equal(present,false);assert.equal(revision,2);assert.equal(receiver.revisionGeneration(),2);assert.deepEqual(errors,[]);
 }finally{receiver.dispose();}
});

test('failed and superseded graphical retirement never acknowledges application',async()=>{
 let aborts=0;const f=channel({retainRevisions:true,prepareGraphicalBatch:async()=>({commit:()=>false,abort(){aborts++;}})});try{
  f.publication.stage(removal(),1);f.publication.commit(1);f.drain();await turn();
  assert.throws(()=>f.receiver.confirm(1,1),/commit rejected/);assert.equal(f.receiver.status().closed,true);assert.deepEqual(f.retired,[]);assert.equal(aborts,1);
 }finally{f.dispose();}
});

for(const retainRevisions of [false,true])test(`retirement waits for state confirmation and shares stale-message ordering (history=${retainRevisions})`,()=>{
 const f=channel({retainRevisions});try{
  f.publication.stage(chunk(),1);f.publication.commit(1);f.drain();f.receiver.confirm(1,1);f.drain();assert.equal(f.entries.size,1);
  f.publication.stage(removal(),2);f.publication.commit(2);f.drain();assert.equal(f.entries.size,1);assert.deepEqual(f.retired,[]);
  f.receiver.confirm(2,2);f.drain();assert.equal(f.entries.size,0);assert.deepEqual(f.retired,[[0,2,{sequence:2,epoch:'e',capturedAt:2}]]);
  f.publication.stage(chunk(),3);f.publication.commit(3);f.drain();f.receiver.confirm(3,3);f.drain();assert.equal(f.entries.size,1);assert.equal(f.revisions.get(0),3);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

for(const retainRevisions of [false,true])test(`a consumer without graphical retirement fails before changing residency (history=${retainRevisions})`,()=>{
 const f=channel({retainRevisions,onRemoved:null});try{
  f.publication.stage(chunk(),1);f.publication.commit(1);f.drain();f.receiver.confirm(1,1);f.drain();
  f.publication.stage(removal(),2);f.publication.commit(2);f.drain();if(!retainRevisions)f.receiver.confirm(2,2);
  assert.equal(f.entries.size,1);assert.equal(f.receiver.status().closed,true);assert.match(f.errors[0].message,/retirement unavailable/);
 }finally{f.dispose();}
});

test('history retains complete removal boundaries until their graphical batch is ready',async()=>{
 let resolve,commits=0,aborts=0;const batch=new Promise(r=>resolve=r),f=channel({retainRevisions:true,prepareGraphicalBatch:()=>batch});try{
  f.publication.stage(removal(),1);f.publication.commit(1);f.drain();assert.equal(f.receiver.ready(1),false);assert.deepEqual(f.retired,[]);
  resolve({commit(){commits++;return true;},abort(){aborts++;}});await turn();assert.equal(f.receiver.ready(1),true);f.receiver.confirm(1,1);f.drain();
  assert.equal(commits,1);assert.equal(aborts,0);assert.equal(f.retired.length,1);assert.equal(f.receiver.status().retainedBytes,0);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('disposing pending retirement preparation aborts its batch and never reports it applied',async()=>{
 let resolve,aborts=0,signal;const batch=new Promise(r=>resolve=r),f=channel({retainRevisions:true,prepareGraphicalBatch:(_m,o)=>{signal=o.signal;return batch;}});
 f.publication.stage(removal(),1);f.publication.commit(1);f.drain();await turn();f.dispose();assert.equal(signal.aborted,true);
 resolve({commit(){throw Error('must not commit');},abort(){aborts++;}});await turn();assert.equal(aborts,1);assert.deepEqual(f.retired,[]);
});

test('recovery replay requires agreement between tombstone payload and revision manifest',async()=>{
 const f=channel({retainRevisions:true,allowReplay:true,confirmedSequence:1,confirmedElapsed:1,prepareGraphicalBatch:async()=>({commit:()=>true,abort(){}})});
 try{
  f.receiver.beginReplay({sequence:1,epoch:'e'});const p={...removal(),capturedAt:2},manifest={epoch:'e',chunks:[{cx:0,cz:0,revision:2}]};
  assert.throws(()=>f.receiver.stageReplayBoundary(2,[{chunks:[p],terrainManifest:manifest}]),/revision/);assert.equal(f.receiver.status().retainedBytes,0);
  f.receiver.stageReplayBoundary(2,[{chunks:[p],terrainManifest:{...manifest,chunks:[{...manifest.chunks[0],removed:true}]}}]);
  await f.receiver.waitForReplayBoundary(2);f.receiver.confirm(2,2);assert.equal(f.retired.length,1);assert.deepEqual(f.applied,[]);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});
