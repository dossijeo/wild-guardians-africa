import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES} from '../src/simulation/workforce.js';
import {nativeIdleFailedCycleGraphics} from './helpers/native-idle-failed-cycle-graphics.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';

// Original GLB/banks/native authority. This adapter retags real graph nodes,
// without compiling GPU buffers; hardware counts are audited via Surface.
async function fixture(options){
 const f=await nativeIdleFailedCycleGraphics(options),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No GPU buffer compiled in this fixture');}}),parts=[];
 return {...f,parts,hook,async preparePart(value=f,{signal}={}){const part=await f.roster.prepareNativeIdleCycleProposal(value.support,{getPickAge:f.getPickAge,getPickPhaseOffset:f.getPickPhaseOffset,reuseClock:hook.reuseNativeIdleCycle,signal});parts.push(part);return part;},async dispose(){for(const part of parts.reverse())part.cancel();hook.dispose();await f.dispose();}};
}
const materials=part=>part.request.options.materialAlternatives.map(item=>item.material);

for(const profile of PROFILES)test(`${profile.id} consecutive21 reuse two actual material graphs instead of creating another family every retry`,async()=>{
 const f=await fixture({profile:profile.id,retry:.25});try{
  let prepared=f;const banks=[],actor=f.roster.get(f.actor),root=actor.root,body=f.body(1),rng=f.nativeState.rng;
  for(let i=0;i<6;i++){
   const part=await f.preparePart(prepared),value=materials(part);assert(value.length>0);if(i<2)banks.push(value);else{assert.deepEqual(value.map(m=>m.uuid),banks[i%2].map(m=>m.uuid));assert.equal(part.reused,true);}
   part.activate();part.rollback();assert(part.valid());part.activate();const data=f.commit(prepared.proposal);part.finalize(data);f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);assert.equal(f.acquires,1);assert.deepEqual(f.body(1),body);assert.equal(f.nativeState.rng,rng);
   if(i<5){f.advanceCycle();f.sync();prepared=f.prepare();}
  }assert.notDeepEqual(banks[0],banks[1]);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('a graph waiting for its existing retirement fence cannot be reused or replaced with another allocation',async()=>{
 const f=await fixture({retry:.25});let waiting;try{
  let part=await f.preparePart();const first=materials(part);part.activate();part.finalize(f.commit());f.sync();f.flush();f.advanceCycle();f.sync();const second=f.prepare();part=await f.preparePart(second);part.activate();part.finalize(f.commit(second.proposal));f.sync();
  // The fixture fence has not completed. A is still unavailable while B draws.
  f.advanceCycle();f.sync();const third=f.prepare();let settled=false;waiting=f.preparePart(third).then(p=>{settled=true;return p;});await new Promise(r=>setImmediate(r));assert.equal(settled,false);f.flush();part=await waiting;assert(part.reused);assert.deepEqual(materials(part),first);part.cancel();assert.deepEqual(f.errors,[]);
 }finally{f.flush();await waiting?.catch(()=>{});await f.dispose();}
});

test('cancelling an activated reused graph restores the current graph and does not acquire a native cycle',async()=>{
 const f=await fixture({retry:.25});try{
  let prepared=f,last;
  for(let i=0;i<2;i++){const part=await f.preparePart(prepared);part.activate();last=f.commit(prepared.proposal);part.finalize(last);f.sync();f.flush();f.advanceCycle();f.sync();prepared=f.prepare();}
  const actor=f.roster.get(f.actor),before=[];actor.root.traverse(m=>{if(m.isMesh)before.push([m,m.material,m.visible]);});const body=f.body(1),worker=structuredClone(f.worker),binding=f.planner.nativeIdleCycleBinding(f.nativeActor),part=await f.preparePart(prepared);assert(part.reused);part.activate();assert(part.cancel());f.flush();assert(f.planner.cancelNativeIdleCycleProposal(prepared.proposal.ticket));for(const [mesh,material,visible] of before){assert.equal(mesh.material,material);assert.equal(mesh.visible,visible);}assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeIdleCycleBinding(f.nativeActor),binding);assert.equal(f.roster.get(f.actor),actor);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('rebinding an inactive graph updates its typed clock nodes and preserves their identities',async()=>{
 const f=await fixture({retry:'rest-end'});try{
  let prepared=f;const graphs=[];
  for(let i=0;i<4;i++){
   const part=await f.preparePart(prepared),value=materials(part);graphs.push(value);part.activate();part.finalize(f.commit(prepared.proposal));f.sync();f.flush();if(i<3){f.advanceCycle();f.sync();prepared=f.prepare();}
  }assert.deepEqual(graphs[0],graphs[2]);assert.deepEqual(graphs[1],graphs[3]);assert.equal(f.worker.idleState.mode,'watch');assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('pthread WATCH successors reuse the original two graph identities',async()=>{
 const f=await fixture({threaded:true,retry:'rest-end'});try{
  let prepared=f;const sets=[];
  for(let i=0;i<4;i++){const part=await f.preparePart(prepared);sets.push(materials(part));part.activate();part.finalize(f.commit(prepared.proposal));f.sync();f.flush();if(i<3){f.advanceCycle();f.sync();prepared=f.prepare();}}
  assert.deepEqual(sets[0],sets[2]);assert.deepEqual(sets[1],sets[3]);assert.equal(f.worker.idleState.mode,'watch');assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('aborting while the retired graph waits for its fence leaves the current owner intact',async()=>{
 const f=await fixture({retry:.25});const controller=new AbortController();try{
  let part=await f.preparePart();part.activate();part.finalize(f.commit());f.sync();f.flush();f.advanceCycle();f.sync();const second=f.prepare();part=await f.preparePart(second);part.activate();part.finalize(f.commit(second.proposal));f.sync();f.advanceCycle();f.sync();const third=f.prepare(),body=f.body(1),worker=structuredClone(f.worker),binding=f.planner.nativeIdleCycleBinding(f.nativeActor),waiting=f.preparePart(third,{signal:controller.signal});await new Promise(r=>setImmediate(r));controller.abort();await assert.rejects(waiting,{name:'AbortError'});f.flush();assert(f.planner.cancelNativeIdleCycleProposal(third.proposal.ticket));assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeIdleCycleBinding(f.nativeActor),binding);assert.equal(f.roster.status().native,1);assert.deepEqual(f.errors,[]);
 }finally{f.flush();await f.dispose();}
});

test('a reused graph retimes its prepared reference without changing materials',async()=>{
 const f=await fixture({retry:.25});try{
  let prepared=f;
  for(let i=0;i<2;i++){const part=await f.preparePart(prepared);part.activate();part.finalize(f.commit(prepared.proposal));f.sync();f.flush();f.advanceCycle();f.sync();prepared=f.prepare();}
  const part=await f.preparePart(prepared),before=materials(part);assert(part.reused);f.advance(.3);const next=f.planner.revalidateNativeIdleCycleProposal(prepared.proposal.ticket);assert.equal(next.status,'revalidated');assert(part.retarget(f.supportFor(next.proposal),{retagClock:f.hook.retagNativeIdleCycle}));assert.deepEqual(materials(part),before);part.activate();part.finalize(f.commit(next.proposal));f.sync();f.flush();assert.equal(f.roster.status().native,1);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('withdrawal releases both warm graphs and stale handles cannot retire a reused current graph',async()=>{
 const f=await fixture({retry:.25});try{
  let prepared=f,firstPart,firstProof;
  for(let i=0;i<4;i++){const part=await f.preparePart(prepared);part.activate();const data=f.commit(prepared.proposal);part.finalize(data);if(i===0){firstPart=part;firstProof=data.nativeIdleCycleBinding;}f.sync();f.flush();if(i<3){f.advanceCycle();f.sync();prepared=f.prepare();}}
  assert.equal(firstPart.cancel(),false);assert.equal(f.roster.releaseNativeIdleCycle(f.actor,firstProof),false);assert.equal(f.roster.status().native,1);f.state.workers=[];f.roster.sync();f.flush();assert.equal(f.roster.get(f.actor),null);assert.equal(f.registry.status().owned.filter(v=>v.namespace==='motion-material').length,0);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('a changed bake owner cannot borrow the old retired graph',async()=>{
 const f=await fixture({retry:.25});try{
  let prepared=f;const original=[];
  for(let i=0;i<2;i++){const part=await f.preparePart(prepared);original.push(materials(part));part.activate();part.finalize(f.commit(prepared.proposal));f.sync();f.flush();f.advanceCycle();f.sync();prepared=f.prepare();}
  // A replacement managed-bank result is a new resource owner even when the
  // test texture is shared. Do not reuse a graph retaining the previous bake.
  f.bakes.set('Idle',{...f.bakes.get('Idle')});const part=await f.preparePart(prepared);assert.equal(part.reused,false);for(const set of original)assert.notDeepEqual(materials(part),set);part.cancel();assert(f.planner.cancelNativeIdleCycleProposal(prepared.proposal.ticket));assert.equal(f.roster.status().native,1);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});
