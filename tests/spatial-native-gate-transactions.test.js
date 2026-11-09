import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createSpatialGateIntents} from '../src/world/wild-engine/spatial-gate-intents.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

function setup(offset=0){
 const f=fixture(),service=createSpatialGateIntents(f.session,f.state),gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',...f.point(offset,0),gateOpen:1};
 assert(service.register(gate));return {...f,service,gate};
}
function stage(f){
 assert.equal(f.w.nav_gate_motion_stage(1),1);assert.equal(f.w.nav_gate_motion_ticket(),1);
 const [session,ticket,sequence,at,count]=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_motion_ticket_ptr(),5));
 return {session,ticket,sequence,at,count};
}
const commit=(f,p)=>f.w.nav_gate_motion_commit(p.session,p.ticket,p.sequence,p.at);
const body=(f,id,x=20)=>{const p=f.point(x,0);return f.w.spatial_body_upsert(id,p.x,p.z,.28,1,1);};
async function controlled(f){
 const {port1,port2}=new MessageChannel();let resolveFence,request,current,errors=[];
 const received=new Promise(resolve=>{resolveFence=resolve;});
 port2.onmessage=({data})=>{
  try{
   if(data.type==='IntentControlClosed'){current?.dispose();return;}
   if(data.type==='IntentControlFence'){
    assert.equal(data.sequence,current.status().sequence);assert.equal(data.effectiveTime,current.status().effectiveTime);
    request=data;resolveFence(data);return;
   }
   if(data.type==='IntentBaseline')current=createNativeRouteControl({authorityEpoch:data.authorityEpoch,
    initialSequence:data.sequence,initialTime:data.effectiveTime,routes:data.routes});
   else current.accept(data);
   port2.postMessage({type:'intent-control-applied',session:data.session,authorityEpoch:data.authorityEpoch,sequence:data.sequence,accepted:true});
  }catch(error){errors.push(error);}
 };
 const publication=createNativeIntentControlPublication({port:port1,session:'gate-transaction',observe:f.bridge.observeNativeIntentControl});
 await publication.ready;let selected=publication;
 return {publication,received,errors,getPublication:()=>selected,replace:()=>{selected=null;},
  ack:(changes={})=>port2.postMessage({...request,type:'intent-control-fenced',accepted:true,...changes}),
  dispose(){publication.dispose();port2.close();}};
}

test('native gate staging does not change motors and consumes its ticket once without repeating clearance',()=>{
 const f=setup();try{
  const safe=f.point(.3,-.9);assert.equal(f.w.spatial_body_upsert(77,safe.x,safe.z,.02,1,1),1);
  const before=f.service.read(f.gate.id),p=stage(f);assert.equal(p.count,1);
  assert(f.w.nav_gate_sweep_evaluations()>0);
  assert.deepEqual(f.service.read(f.gate.id),before);assert.equal(f.service.bodySweepCertified(f.gate.id),false);
  assert.equal(f.w.nav_gate_motion_stage(1),-4);assert.equal(f.w.nav_gate_motion_cancel(p.session,p.ticket+1),0);
  const checks=[f.w.nav_gate_worker_checks(),f.w.nav_gate_sweep_evaluations(),f.w.nav_intent_route_queries()];
  assert.equal(commit(f,p),1);assert.equal(f.service.read(f.gate.id).target,0);assert(f.service.bodySweepCertified(f.gate.id));
  assert.deepEqual([f.w.nav_gate_worker_checks(),f.w.nav_gate_sweep_evaluations(),f.w.nav_intent_route_queries()],checks);
  assert.equal(f.w.nav_gate_motion_ticket(),0);assert.equal(commit(f,p),-1);
  assert.equal(f.w.nav_intent_set_time(10.3),1);assert(Math.abs(f.service.read(f.gate.id).opening-.5)<1e-12);
 }finally{f.session.dispose();}
});

test('new bodies, body ABA, removal and registry reset invalidate staged proofs',()=>{
 for(const mutate of [f=>body(f,77),f=>{body(f,77);f.w.spatial_body_remove(77);},
  f=>f.w.spatial_body_remove(88),f=>f.w.spatial_bodies_reset()]){
  const f=setup();try{
   assert.equal(body(f,88),1);const p=stage(f),before=f.service.read(f.gate.id);mutate(f);
   assert.equal(commit(f,p),-2);assert.deepEqual(f.service.read(f.gate.id),before);assert.equal(f.w.nav_gate_motion_ticket(),0);
  }finally{f.session.dispose();}
 }
});

test('unchanged body writes and rejected mutations do not invalidate an otherwise current proposal',()=>{
 const f=setup();try{
  assert.equal(body(f,77),1);const p=stage(f);assert.equal(body(f,77),1);
  assert.equal(f.w.spatial_body_upsert(77,NaN,0,.28,1,1),0);assert.equal(f.w.spatial_body_remove(123456),0);
  assert.equal(commit(f,p),1);
 }finally{f.session.dispose();}
});

test('clock, world geometry and ordered entity facts invalidate proposals before publication',()=>{
 for(const mutate of [f=>f.w.nav_intent_set_time(10.1),f=>{const p=f.point(20,0);assert(f.session.core.addBarrier(p.x,p.z,.2,1,0)>0);},
  f=>f.bridge.applyEvents(f.state,[{type:'worker',entity:{...f.state.workers[0],...f.point(-7,0)}}])]){
  const f=setup();try{
   const p=stage(f),target=f.service.read(f.gate.id).target;mutate(f);
   assert.equal(commit(f,p),-2);assert.equal(f.service.read(f.gate.id).target,target);
  }finally{f.session.dispose();}
 }
});

test('a new reservation invalidates a staged sweep even without a new intent generation',()=>{
 const f=setup(20);try{
  const a=f.point(-6,0),b=f.point(6,0);f.session.actorSectorRevision({worker:true});
  const ptr=f.w.nav_intent_attack_route_input_ptr(1);new Float32Array(f.w.memory.buffer,ptr,2).set([b.x,b.z]);
  assert.equal(f.w.nav_intent_restore_home(900011,a.x,a.z,b.x,b.z,1),1);
  const handle=f.bridge.intentChanges().at(-1).routeHandle,prepared=f.bridge.prepareNativeRouteMotion(handle,{radius:.28});
  assert.equal(prepared.status,'prepared');f.bridge.intentChanges();assert.equal(f.w.spatial_body_upsert(1,a.x,a.z,.28,0,1),1);
  const p=stage(f),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.bridge.reserveNativeRoute(prepared.routeHandle,1).status,'reserved');assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(commit(f,p),-2);assert.equal(f.service.read(f.gate.id).target,1);
 }finally{f.session.dispose();}
});

test('gate changes and native reset retire proposals; a replacement ticket never repeats',()=>{
 const f=setup();try{
  const first=stage(f);assert.equal(f.service.reconcile({enabled:false}).status,'updated');assert.equal(commit(f,first),-1);
  const second=stage(f);assert(second.ticket>first.ticket);assert.equal(f.w.nav_gate_motion_cancel(second.session,second.ticket),1);
  const third=stage(f);f.bridge.resetFromState(f.state);assert.equal(commit(f,third),-1);
  assert(f.service.register(f.gate));const fourth=stage(f);assert(fourth.ticket>third.ticket);assert.notEqual(fourth.session,third.session);
  assert.equal(commit(f,third),-1);assert.equal(commit(f,fourth),1);
 }finally{f.session.dispose();}
});

test('receipt sequence/time metadata must exactly name the staged boundary',()=>{
 for(const wrong of [{sequence:100},{at:11}]){
  const f=setup();try{
   const p=stage(f),before=f.service.read(f.gate.id);assert.equal(commit(f,{...p,...wrong}),-3);
   assert.deepEqual(f.service.read(f.gate.id),before);assert.equal(commit(f,p),-1);
  }finally{f.session.dispose();}
 }
});

test('cursor projection is a native gate-policy fact and retires an older staged motor',()=>{
 const f=setup();try{
  const a=f.point(0,-3),b=f.point(0,6);f.session.actorSectorRevision({worker:true});
  const ptr=f.w.nav_intent_attack_route_input_ptr(1);new Float32Array(f.w.memory.buffer,ptr,2).set([b.x,b.z]);
  assert.equal(f.w.nav_intent_restore_home(900011,a.x,a.z,b.x,b.z,1),1);f.bridge.intentChanges();
  assert.equal(f.w.spatial_body_upsert(1,a.x,a.z,.28,0,1),1);assert(f.service.bindWorker('worker-900011',1));
  const p=stage(f);f.w.nav_intent_route_progress_input_ptr(0);
  assert.equal(f.w.nav_intent_route_progress(900011,Math.fround(b.x),Math.fround(b.z),0),1);
  assert.equal(commit(f,p),-1);assert.equal(f.service.read(f.gate.id).target,1);
 }finally{f.session.dispose();}
});

test('a blocked preflight creates no pending ticket and leaves every live motor unchanged',()=>{
 const f=setup();try{
  const p=f.point(.3,.9);assert.equal(f.w.spatial_body_upsert(77,p.x,p.z,.02,1,1),1);
  const before=f.service.read(f.gate.id);assert.equal(f.w.nav_gate_motion_stage(1),-3);
  assert.equal(f.w.nav_gate_motion_ticket(),0);assert.deepEqual(f.service.read(f.gate.id),before);
 }finally{f.session.dispose();}
});

test('the authority bridge holds a real WASM proposal until a fresh direct GPU receipt arrives',async()=>{
 const f=setup(),c=await controlled(f);try{
  const before=f.service.read(f.gate.id),pending=f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:c.getPublication});
  await c.received;assert.equal(f.w.nav_gate_motion_ticket(),1);assert.deepEqual(f.service.read(f.gate.id),before);
  assert.equal((await f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:c.getPublication})).status,'busy');
  c.ack();const result=await pending;assert.equal(result.status,'committed');assert.equal(result.authorizedPassage,false);
  assert.equal(result.authorizedAutonomy,false);assert.equal(f.service.read(f.gate.id).target,0);assert.equal(f.w.nav_gate_motion_ticket(),0);
  assert.deepEqual(c.errors,[]);
 }finally{c.dispose();f.session.dispose();}
});

test('body mutation or logical time advancement while a GPU receipt is pending aborts the commit',async()=>{
 for(const mutate of [f=>body(f,77),f=>{f.state.elapsed=10.1;},f=>f.w.nav_intent_set_time(10.1)]){
  const f=setup(),c=await controlled(f);try{
   const pending=f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:c.getPublication});await c.received;mutate(f);c.ack();
   assert.equal((await pending).status,'stale');assert.equal(f.service.read(f.gate.id).target,1);assert.equal(f.w.nav_gate_motion_ticket(),0);
  }finally{c.dispose();f.session.dispose();}
 }
});

test('pause, result and preparation policy changes during the receipt wait cannot apply an old motor',async()=>{
 for(const mutate of [f=>{f.state.pauses=['test'];},f=>{f.state.result={kind:'test'};},f=>{f.state.initialPreparation=true;}]){
  const f=setup(),c=await controlled(f);try{
   const pending=f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:c.getPublication});await c.received;mutate(f);c.ack();
   assert.equal((await pending).status,'stale');assert.equal(f.service.read(f.gate.id).target,1);assert.equal(f.w.nav_gate_motion_ticket(),0);
  }finally{c.dispose();f.session.dispose();}
 }
});

test('consumer replacement or retirement cannot apply a proposal using the predecessor receipt',async()=>{
 for(const retire of [false,true]){
  const f=setup(),c=await controlled(f);try{
   const pending=f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:c.getPublication});await c.received;
   if(retire)c.publication.dispose('replaced');else{c.replace();c.ack();}
   assert.equal((await pending).status,retire?'control-failed':'control-replaced');
   assert.equal(f.service.read(f.gate.id).target,1);assert.equal(f.w.nav_gate_motion_ticket(),0);
  }finally{c.dispose();f.session.dispose();}
 }
});

test('a GPU fence cannot invent an unpublished clock or cross an authority epoch',async()=>{
 const a=setup(),b=setup(),c=await controlled(a);try{
  assert.equal((await b.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:c.getPublication})).status,'control-unavailable');
  a.state.elapsed=10.1;assert.equal((await a.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:c.getPublication})).status,'control-boundary-mismatch');
  assert.equal(a.w.nav_gate_motion_ticket(),0);assert.equal(b.w.nav_gate_motion_ticket(),0);
 }finally{c.dispose();a.session.dispose();b.session.dispose();}
});

test('cleanup of an old asynchronous receipt cannot cancel a replacement native-session proposal',async()=>{
 const f=setup(),c=await controlled(f);try{
  const pending=f.bridge.prepareNativeGateMotionAfterGpuFence({getPublication:c.getPublication});await c.received;
  f.bridge.resetFromState(f.state);assert(f.service.register(f.gate));const replacement=stage(f);
  assert.equal((await pending).status,'control-failed');assert.equal(f.w.nav_gate_motion_ticket(),1);
  assert.equal(commit(f,replacement),1);assert.equal(f.w.nav_gate_motion_ticket(),0);
 }finally{c.dispose();f.session.dispose();}
});
