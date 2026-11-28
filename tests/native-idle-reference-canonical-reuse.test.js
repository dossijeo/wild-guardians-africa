import test from 'node:test';
import assert from 'node:assert/strict';
import {copyNativeIdleCycleReference,sameNativeIdleCycleReference} from '../src/world/native-idle-cycle.js';
import {nativeIdleFailedCycleControl} from './helpers/native-idle-failed-cycle-control.js';
import {nativeIdleCycleFixture} from './helpers/native-idle-cycle.js';
import {PROFILES} from '../src/simulation/workforce.js';

function frozenTree(value){
 if(value&&typeof value==='object'){assert(Object.isFrozen(value));for(const child of Object.values(value))frozenTree(child);}
}
function freezeTree(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freezeTree(child);Object.freeze(value);}return value;}
function initialReference(){
 const f=nativeIdleCycleFixture();try{const p=f.propose();assert.equal(p.status,1);return f.planner.captureNativeIdleCycleProposal({kind:'native-idle-cycle-proposal-ticket',authorityEpoch:f.bodyBinding.reference.worldBoundary.authorityEpoch,session:f.w.nav_intent_session(),ticket:p.ticket}).nativeIdleCycle;}finally{f.close();}
}

for(const profile of PROFILES)test(`${profile.id} canonical decoding does not cache native execution permission`,async()=>{
 const f=await nativeIdleFailedCycleControl({profile:profile.id});try{
  const p=f.prepareCycle(),r=copyNativeIdleCycleReference(p.nativeIdleCycle);frozenTree(r);
  for(let i=0;i<100;i++){assert.equal(copyNativeIdleCycleReference(r),r);assert(sameNativeIdleCycleReference(r,r));}
  const lease=f.c.admitIdleCycle(r,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);
  const binding=f.commitCycle(p);assert.equal(lease.isCurrent(),false);assert.equal(f.install(binding),1);assert(lease.isCurrent());
  assert.equal(f.w.spatial_body_remove(r.bodyId),1);f.planner.commitNativeCausalClock();assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);
  assert.equal(copyNativeIdleCycleReference(r),r);assert.throws(()=>f.c.admitIdleCycle(r,{preparingWorldBoundary:r.worldBoundary}),e=>e.code==='native-idle-cycle-admission-obsolete');
 }finally{await f.dispose();}
});

test('genuine initial20 reference is deeply immutable and preserves canonical identity',()=>{
 const r=copyNativeIdleCycleReference(initialReference());assert.equal(r.version,1);frozenTree(r);assert.equal(copyNativeIdleCycleReference(r),r);
 assert.throws(()=>{r.anchor.x+=1;},TypeError);const source=r.sourceBody.reference.sourceRequest;assert.equal(typeof source.actorId,'number');assert.throws(()=>{source.actorId+=1;},TypeError);
});

test('wire clones are detached, validated again and never retained as mutable decoder keys',()=>{
 const r=initialReference(),wire=structuredClone(r),a=copyNativeIdleCycleReference(wire),b=copyNativeIdleCycleReference(wire);
 assert.notEqual(a,wire);assert.notEqual(a,b);assert.notEqual(a.sourceBody,wire.sourceBody);frozenTree(a);assert(sameNativeIdleCycleReference(a,b));
 wire.duration+=1;assert.throws(()=>copyNativeIdleCycleReference(wire));assert.equal(sameNativeIdleCycleReference(a,wire),false);assert(sameNativeIdleCycleReference(a,b));
});

test('foreign frozen lookalikes cannot assert the private canonical identity',()=>{
 const r=initialReference(),foreign=freezeTree(structuredClone(r)),decoded=copyNativeIdleCycleReference(foreign);assert.notEqual(decoded,foreign);assert(sameNativeIdleCycleReference(decoded,foreign));
 const shallow=Object.freeze(structuredClone(r));copyNativeIdleCycleReference(shallow);shallow.anchor.radius=0;assert.throws(()=>copyNativeIdleCycleReference(shallow));
 const bad=freezeTree({...structuredClone(r),bodyId:r.bodyId+1});assert.throws(()=>copyNativeIdleCycleReference(bad));assert.equal(sameNativeIdleCycleReference(bad,bad),false);
});

test('canonical equality keeps strict wire validation and normalizes property order',()=>{
 const r=initialReference(),reordered=Object.fromEntries(Object.entries(structuredClone(r)).reverse());assert(sameNativeIdleCycleReference(r,reordered));
 for(const mutate of [v=>v.duration++,v=>v.bodyId++,v=>v.profile=99,v=>v.kind='foreign',v=>v.version=99,v=>v.extra=true,v=>v.durations.rest++,v=>v.initialState.rng++,v=>v.worldBoundary.nativeSession++,v=>v.anchor.radius=0]){
  const raw=structuredClone(r);mutate(raw);for(const bad of [raw,freezeTree(structuredClone(raw))]){assert.throws(()=>copyNativeIdleCycleReference(bad));assert.equal(sameNativeIdleCycleReference(r,bad),false);assert.equal(sameNativeIdleCycleReference(bad,bad),false);}
 }
});
