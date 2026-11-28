import test from 'node:test';
import assert from 'node:assert/strict';
import {savedNativeIdleStroll,nativeIdleStrollRestorationSource} from './helpers/native-idle-stroll-restoration-source.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} restored WALK prepares fresh22 from executed pose without a fake20/21 or old permission`,async()=>{
 let runtime,f;try{
  const saved=savedNativeIdleStroll({profile:profile.id});if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}f=nativeIdleStrollRestorationSource(saved,{core:runtime?.core});const {w,actor,worker}=f,q=f.request(),body=f.body(1),state=structuredClone(f.state);assert(q);assert.equal(q[9],worker.x);assert.equal(q[10],worker.z);assert.deepEqual(q.slice(13,17),[worker.runPhase,worker.walkPhase,worker.carryPhase,worker.runRemaining]);assert.equal(q[24],worker.idleState.rng);assert.equal(q[25],worker.idleState.approachRetry);assert.deepEqual(q.slice(26),[worker.idleState.destination.x,worker.idleState.destination.z]);
  assert.equal(w.nav_initial_idle_request_snapshot(actor),0);assert.equal(w.nav_initial_idle_body_binding_snapshot(actor),0);assert.equal(w.nav_idle_cycle_binding_snapshot(actor),0);assert.equal(w.nav_idle_stroll_binding_snapshot(actor),0);assert.equal(w.spatial_body_count(),1);assert.equal(w.nav_intent_restore_idle_stroll(...f.args()),1);assert.deepEqual(f.request(),q);
  const first=f.prepare();assert.equal(first.semantic[1],0);assert.deepEqual(first.header.slice(8,10),[worker.x,worker.z]);assert.deepEqual(first.semantic.slice(5,10),[worker.heading,worker.runPhase,worker.walkPhase,worker.carryPhase,worker.runRemaining]);assert.equal(first.header[21],q[3]);assert.equal(first.header[22],q[4]);assert.deepEqual(f.body(1),body);assert.deepEqual(f.state,state);
  assert(w.nav_intent_execution_advance(f.state.elapsed+.2)>=0);assert.equal(w.nav_intent_clock_commit(1,0),1);assert.equal(w.nav_idle_stroll_proposal_revalidate(f.tuple()[0],first.ticket),1);const next=f.tuple();assert(next[1]>first.ticket);assert.equal(w.nav_idle_stroll_proposal_commit_bound(...next.slice(0,5),first.ticket),1);assert.equal(f.request(),null);assert.deepEqual(f.body(1),body);assert.equal(w.nav_intent_execution_begin(),1);assert.deepEqual(f.source(),q);assert.equal(w.nav_intent_clock_commit(1,0),1);assert(w.nav_intent_execution_advance(next[3]+.2)>=0);assert.notDeepEqual(f.body(1),body);assert.deepEqual(f.state,state);assert.equal(w.spatial_body_count(),1);assert.equal(w.nav_idle_stroll_binding_snapshot(actor),1);
 }finally{f?.close();await runtime?.dispose();}
});

test('a cold WALK request becomes usable only after exact first body binding and rejects replacement',()=>{
 const f=nativeIdleStrollRestorationSource(undefined,{bind:false});try{
  const {w,actor,worker}=f;assert.equal(f.request(),null);assert.equal(w.nav_idle_stroll_restore_requests_snapshot(),0);assert.equal(w.spatial_body_upsert(77,worker.x+1,worker.z,.28,0,1),1);assert.equal(w.nav_gate_bind_worker(actor,77),0);assert.equal(w.spatial_body_upsert(78,worker.x,worker.z,.28,0,3),1);assert.equal(w.nav_gate_bind_worker(actor,78),0);f.bindBody();const q=f.request();assert(q);assert.equal(w.nav_idle_stroll_restore_requests_snapshot(),1);assert.equal(w.nav_gate_bind_worker(actor,1),1);assert.deepEqual(f.request(),q);assert.equal(w.nav_gate_bind_worker(actor,77),0);
  for(const [x,z,r,kind,flags] of [[worker.x+.1,worker.z,.28,0,1],[worker.x,worker.z,.3,0,1],[worker.x,worker.z,.28,0,3]])assert.equal(w.spatial_body_upsert(1,x,z,r,kind,flags),0);assert.deepEqual(f.request(),q);assert.equal(w.spatial_body_remove(1),1);assert.equal(f.request(),null);assert.equal(f.source(),null);assert.equal(w.nav_idle_stroll_restore_requests_snapshot(),0);
 }finally{f.close();}
});

test('restored WALK preparation cancellation retains exact semantic source and changed declarations are rejected',()=>{
 const f=nativeIdleStrollRestorationSource();try{
  const q=f.request(),body=f.body(1);for(const index of [9,12,13,14,15,16]){const args=f.args();args[index]+=.1;assert.equal(f.w.nav_intent_restore_idle_stroll(...args),-3);assert.deepEqual(f.request(),q);}
  const first=f.prepare(),t=f.tuple();assert.equal(f.w.nav_idle_stroll_proposal_cancel(t[0],first.ticket),1);assert.deepEqual(f.request(),q);assert.deepEqual(f.body(1),body);const next=f.prepare();assert(next.ticket>first.ticket);assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),first.ticket),-9);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('restored WALK cannot replace a live physical owner',()=>{
 const f=nativeIdleStrollRestorationSource(undefined,{declare:false});try{assert.equal(f.w.nav_intent_restore_idle_stroll(...f.args()),-4);assert.equal(f.request(),null);assert.equal(f.w.spatial_body_count(),1);}finally{f.close();}
});

test('restored WALK cannot overwrite an initialized Idle declaration',()=>{
 const f=nativeIdleStrollRestorationSource(undefined,{declare:false,bind:false});try{
  const a=f.args(),w=f.w;assert.equal(w.nav_intent_request_initial_idle(a[0],a[1],0,0,0,0,0,0,0,...a.slice(12)),1);assert.equal(w.nav_intent_restore_idle_stroll(...a),-2);assert.equal(f.request(),null);assert.equal(w.spatial_body_count(),0);
 }finally{f.close();}
});

test('malformed restored WALK policy is rejected before creating any intent or physical body',()=>{
 const f=nativeIdleStrollRestorationSource(undefined,{declare:false,bind:false});try{
  const revision=f.w.nav_intent_entity_revision();for(const [index,value] of [[1,4],[2,3],[6,9],[7,0],[8,4294967296],[9,-1],[10,Infinity],[12,NaN],[13,-1],[14,-1],[15,-1],[16,-1]]){const a=f.args();a[index]=value;assert.equal(f.w.nav_intent_restore_idle_stroll(...a),-1);assert.equal(f.request(),null);assert.equal(f.w.nav_intent_entity_revision(),revision);assert.equal(f.w.spatial_body_count(),0);}
  const a=f.args();a[3]=999999;assert.equal(f.w.nav_intent_restore_idle_stroll(...a),-2);assert.equal(f.w.nav_intent_entity_revision(),revision);
 }finally{f.close();}
});

test('a restored WALK already at its actual endpoint acquires a zero-length22 before its real REST successor',()=>{
 const saved=savedNativeIdleStroll({advance:'arrival'}),f=nativeIdleStrollRestorationSource(saved);try{
  const body=f.body(1),q=f.request(),p=f.prepare();assert.equal(p.header[12],0);assert.equal(p.header[10],p.header[11]);assert.equal(f.w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket),1);assert.equal(f.w.nav_intent_execution_begin(),1);assert.equal(f.w.nav_idle_stroll_execution(f.actor),1);const view=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_idle_stroll_execution_ptr(),42));assert.equal(view[18],1);let rng=q[24];rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;assert.equal(view[39],rng>>>0);assert.equal(view[33],q[24]);assert.notEqual(view[39],q[24]);assert.deepEqual(f.source(),q);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_idle_cycle_binding_snapshot(f.actor),0);
 }finally{f.close();}
});

test('a restored WALK body stays held while an independently admitted native Home advances',()=>{
 const f=nativeIdleStrollRestorationSource(undefined,{peer:true});try{
  f.admitPeer();const body=f.body(1),peer=f.body(2),q=f.request(),w=f.w;assert.equal(w.nav_intent_execution_begin(),1);assert.equal(w.nav_intent_clock_commit(1,0),1);assert(w.nav_intent_execution_advance(f.state.elapsed+.2)>=0);assert.equal(w.nav_intent_clock_commit(1,0),1);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(2),peer);assert.deepEqual(f.request(),q);const p=f.prepare();assert.equal(w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),p.ticket),1);assert(w.nav_intent_execution_advance(f.state.elapsed+.4)>=0);assert.notDeepEqual(f.body(1),body);assert.equal(w.spatial_body_count(),2);
 }finally{f.close();}
});
