import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createSpatialGateIntents} from '../src/world/wild-engine/spatial-gate-intents.js';

function setup(){
 const f=fixture(),a=f.worker(1,f.point(-6,0),f.point(6,0)),b=f.worker(4,f.point(-6,6),f.point(6,6));
 assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(11).status,'advanced');
 assert.equal(f.bridge.commitNativeCausalClock().status,'committed');f.bridge.intentChanges();return {...f,a,b};
}
const stage=(f,p=f.point(2,0))=>f.w.spatial_barrier_proposal_stage(p.x,p.z,.15,.6,.2,0);
function ticket(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);
 return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
const commit=(f,t)=>f.w.spatial_barrier_proposal_commit(t[0],t[1],t[2],t[3],t[4]);

test('staging a prospective barrier is non-effective; exact-boundary commit revokes only its affected route once',()=>{
 const f=setup();try{
  const before=f.session.core.snapshot(),a=f.bridge.nativeRouteTiming(f.a),b=f.bridge.nativeRouteTiming(f.b),
   sequence=f.w.nav_intent_transition_sequence(),body=f.body(1);assert.equal(stage(f),1);const t=ticket(f);
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.bridge.nativeRouteTiming(f.a),a);
  assert.deepEqual(f.bridge.nativeRouteTiming(f.b),b);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(f.w.nav_intent_static_mutation_revocations(),0);assert.equal(stage(f),-4);
  assert(commit(f,t)>0);assert.deepEqual(f.body(1),body);assert.equal(f.bridge.nativeRouteTiming(f.a),null);
  assert.deepEqual(f.bridge.nativeRouteTiming(f.b),b);assert.deepEqual(f.bridge.intentChanges().map(e=>e.revokedRouteHandle),[f.a]);
  assert.equal(f.w.nav_intent_static_mutation_revocations(),1);assert.equal(commit(f,t),-1);
  assert.equal(f.advance(12).status,'advanced');assert(f.bridge.nativeRouteExecution(f.b));
 }finally{f.session.dispose();}
});

test('a body intersection rejects the proposal before allocating an ID, invalidating routes or changing the world',()=>{
 const f=setup();try{
  const before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence(),body=f.body(1);
  assert.equal(stage(f,body),0);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteTiming(f.a));
 }finally{f.session.dispose();}
});

test('body, clock, logical advance, intent and world revisions independently stale a staged proposal atomically',()=>{
 for(const change of ['body','clock','advance','intent','world']){
  const f=setup();try{
   assert.equal(stage(f),1);const t=ticket(f);
   if(change==='body'){const p=f.point(35,35);assert.equal(f.w.spatial_body_upsert(77,p.x,p.z,.2,0,1),1);}
   if(change==='clock')assert.equal(f.bridge.commitNativeCausalClock({paused:true}).status,'committed');
   if(change==='advance')assert.equal(f.advance(11.1).status,'advanced');
   if(change==='intent')assert.equal(f.w.nav_intent_cancel_home(900011),1);
   if(change==='world'){const p=f.point(40,40);assert(f.session.core.addWall(p.x,p.z,.2,.2)>0);}
   const before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence();
   assert.equal(commit(f,t),-2,change);assert.deepEqual(f.session.core.snapshot(),before,change);
   assert.equal(f.w.nav_intent_transition_sequence(),sequence,change);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
  }finally{f.session.dispose();}
 }
});

test('clock/session/ticket/time forgery and cancellation cannot commit or recycle a pending proposal',()=>{
 for(const index of [0,1,2,3,4]){
  const f=setup();try{
   const before=f.session.core.snapshot();assert.equal(stage(f),1);const t=ticket(f),bad=t.slice();bad[index]++;
   const status=commit(f,bad);assert(status===-1||status===-3,`${index}: ${status}`);
   assert.deepEqual(f.session.core.snapshot(),before);
   if(index<=1){assert.equal(f.w.nav_intent_barrier_proposal_cancel(t[0],t[1]),1);assert.equal(commit(f,t),-1);}
   else assert.equal(commit(f,t),-1);
  }finally{f.session.dispose();}
 }
 const f=setup();try{
  assert.equal(stage(f),1);const old=ticket(f);assert.equal(f.w.nav_intent_barrier_proposal_cancel(old[0],old[1]),1);
  assert.equal(stage(f),1);const current=ticket(f);assert(current[1]>old[1]);assert.equal(commit(f,old),-1);assert(commit(f,current)>0);
 }finally{f.session.dispose();}
});

test('a gate motor change invalidates a staged barrier even if world, body, clock and intent revisions remain fixed',()=>{
 const f=fixture();try{
  const gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',...f.point(0,0),gateOpen:0},
   service=createSpatialGateIntents(f.session,f.state);assert(service.register(gate));
  assert.equal(f.bridge.commitNativeCausalClock().status,'committed');assert.equal(stage(f,f.point(30,30)),1);const t=ticket(f);
  const revisions=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence(),clock=f.bridge.nativeCausalClock();
  assert.equal(service.prepareMotion({enabled:false}).status,'prepared');
  assert.deepEqual(f.session.core.snapshot(),revisions);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.deepEqual(f.bridge.nativeCausalClock(),clock);
  const before=f.session.core.snapshot();assert.equal(commit(f,t),-2);assert.deepEqual(f.session.core.snapshot(),before);
 }finally{f.session.dispose();}
});

test('proposal requires the native causal clock and is retired by a new session',()=>{
 const f=fixture();try{
  assert.equal(stage(f),-2);assert.equal(f.bridge.commitNativeCausalClock().status,'committed');assert.equal(stage(f),1);const t=ticket(f);
  f.bridge.resetFromState(f.state);assert.equal(commit(f,t),-1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{f.session.dispose();}
});
