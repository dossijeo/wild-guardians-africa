import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';

function setup(){
 const f=fixture(),a=f.worker(1,f.point(-6,0),f.point(6,0)),b=f.worker(4,f.point(-6,6),f.point(6,6));
 assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(11).status,'advanced');
 assert.equal(f.bridge.commitNativeCausalClock().status,'committed');f.bridge.intentChanges();return {...f,a,b};
}
function stage(f,kind,mode,floats=[],integers=[]){
 const fp=f.w.spatial_world_proposal_float_ptr(floats.length);if(floats.length)new Float32Array(f.w.memory.buffer,fp,floats.length).set(floats);
 const ip=f.w.spatial_world_proposal_int_ptr(integers.length);if(integers.length)new Int32Array(f.w.memory.buffer,ip,integers.length).set(integers);
 return f.w.spatial_world_proposal_stage(kind,mode,floats.length,integers.length);
}
function ticket(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
const commit=(f,t)=>f.w.spatial_world_proposal_commit(t[0],t[1],t[2],t[3],t[4]);
const ids=f=>Array.from(new Int32Array(f.w.memory.buffer,f.w.spatial_world_proposal_result_ptr(),f.w.spatial_world_proposal_result_count()));
const square=p=>[p.x-.2,p.z-.2,p.x+.2,p.z-.2,p.x+.2,p.z+.2,p.x-.2,p.z+.2];

test('staged remove/add barrier batch preserves live geometry and canonical IDs until exact commit',()=>{
 const f=setup();try{
  const old=f.point(40,40),oldId=f.session.core.addWall(old.x,old.z,.2,.2);assert(oldId>0);f.bridge.commitNativeCausalClock();
  const p=f.point(2,0),remote=f.point(42,40),values=[p.x,p.z,.15,.6,.2,0,remote.x,remote.z,.2,.2,0,0],
   before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(stage(f,2,1,values,[oldId]),1);const t=ticket(f);assert.equal(t[5],2);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteTiming(f.a));
  // The caller's writable staging buffers are not the pending native payload.
  new Float32Array(f.w.memory.buffer,f.w.spatial_world_proposal_float_ptr(values.length),values.length).fill(99);
  new Int32Array(f.w.memory.buffer,f.w.spatial_world_proposal_int_ptr(1),1)[0]=12345;
  assert.equal(commit(f,t),1);const added=ids(f);assert.equal(added.length,2);assert(added.every(id=>id>oldId));
  const snapshot=f.session.core.snapshot();assert(!snapshot.barriers.some(b=>b.id===oldId));
  assert.equal(f.bridge.nativeRouteTiming(f.a),null);assert(f.bridge.nativeRouteTiming(f.b));
  assert.deepEqual(f.bridge.intentChanges().map(e=>e.revokedRouteHandle),[f.a]);assert.equal(commit(f,t),-1);
 }finally{f.session.dispose();}
});

test('barrier batch rejects an intersecting physical body without removing another barrier or allocating IDs',()=>{
 const f=setup();try{
  const q=f.point(40,40),old=f.session.core.addWall(q.x,q.z,.2,.2);f.bridge.commitNativeCausalClock();
  const before=f.session.core.snapshot(),body=f.body(1),next=f.w.spatial_next_barrier_id();
  assert.equal(stage(f,2,1,[body.x,body.z,.2,.2,0,0],[old]),0);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.spatial_next_barrier_id(),next);assert(f.bridge.nativeRouteTiming(f.a));
 }finally{f.session.dispose();}
});

test('polygon addition and removal are separate exact-generation native transactions',()=>{
 const f=setup();try{
  const p=f.point(2,0),before=f.session.core.snapshot();assert.equal(stage(f,3,0,square(p)),1);const first=ticket(f);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(commit(f,first),1);const [id]=ids(f);assert(id>0);
  assert.equal(f.bridge.nativeRouteTiming(f.a),null);assert(f.bridge.nativeRouteTiming(f.b));
  assert.equal(f.bridge.commitNativeCausalClock().status,'committed');const added=f.session.core.snapshot();
  assert.equal(stage(f,4,0,[],[id]),1);const second=ticket(f);assert.deepEqual(f.session.core.snapshot(),added);
  assert.equal(commit(f,second),1);assert(!f.session.core.snapshot().polygons.some(p=>p.id===id));
 }finally{f.session.dispose();}
});

test('passability tightening suspends affected routes, and relaxing it cannot revive old handles',()=>{
 const f=fixture();try{
  const p=f.point(2,0),barrier=f.session.core.addBarrier(p.x,p.z,.15,.6,2);assert(barrier>0);
  const a=f.animal(f.point(-6,0),f.point(6,0)),b=f.worker(4,f.point(-6,6),f.point(6,6));
  f.bridge.beginNativeRouteExecution();f.advance(11);f.bridge.commitNativeCausalClock();f.bridge.intentChanges();
  assert.equal(stage(f,5,0,[],[barrier]),1);const t=ticket(f),before=f.session.core.snapshot();
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(commit(f,t),1);
  assert.deepEqual(f.bridge.intentChanges().map(e=>e.revokedRouteHandle),[a]);assert(f.bridge.nativeRouteTiming(b));
  f.bridge.commitNativeCausalClock();assert.equal(stage(f,5,2,[],[barrier]),1);assert.equal(commit(f,ticket(f)),1);
  assert.equal(f.bridge.nativeRouteTiming(a),null);
 }finally{f.session.dispose();}
});

test('malformed, stale, cross-kind, cancelled and concurrent proposals cannot change overlay state',()=>{
 const f=setup();try{
  const before=f.session.core.snapshot(),body=f.body(1),p=f.point(2,0);
  assert.equal(stage(f,3,0,[p.x,p.z,p.x,p.z,p.x,p.z]),-1);
  assert.equal(stage(f,4,0,[],[999999]),-1);assert.equal(stage(f,5,8,[],[1]),-1);
  assert.equal(stage(f,2,0,[body.x,body.z,.2,.2,0,0]),0);assert.deepEqual(f.session.core.snapshot(),before);
  assert.equal(stage(f,3,0,square(p)),1);const t=ticket(f);
  assert.equal(f.w.spatial_barrier_proposal_commit(t[0],t[1],t[2],t[3],t[4]),-1);
  assert.equal(f.w.spatial_barrier_proposal_stage(p.x,p.z,.2,.2,0,0),-4);
  assert.equal(f.w.nav_intent_barrier_proposal_cancel(t[0],t[1]),1);assert.equal(commit(f,t),-1);
  assert.equal(stage(f,3,0,square(p)),1);const stale=ticket(f);f.bridge.commitNativeCausalClock({paused:true});
  assert.equal(commit(f,stale),-2);assert.deepEqual(f.session.core.snapshot(),before);
 }finally{f.session.dispose();}
});
