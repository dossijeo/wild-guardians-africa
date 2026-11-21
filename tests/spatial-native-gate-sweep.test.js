import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createSpatialGateIntents} from '../src/world/wild-engine/spatial-gate-intents.js';
import {gateLeafFootprint} from '../src/world/gate-passages.js';
import {footprintDistance} from '../src/world/footprints.js';

function setup(opening=1){const f=fixture(),gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',...f.point(0,0),gateOpen:opening},
 service=createSpatialGateIntents(f.session,f.state);assert(service.register(gate));return {...f,gate,service};}
const at=(f,t)=>{f.state.elapsed=t;assert.equal(f.w.nav_intent_set_time(t),1);};
const put=(f,id,p,r=.02,kind=1)=>f.w.spatial_body_upsert(id,p.x,p.z,r,kind,1);
function unreserved(f,a,b){
 f.session.actorSectorRevision({worker:true});const ptr=f.w.nav_intent_attack_route_input_ptr(1);
 new Float32Array(f.w.memory.buffer,ptr,2).set([b.x,b.z]);
 assert.equal(f.w.nav_intent_restore_home(900011,a.x,a.z,b.x,b.z,1),1);
 const handle=f.bridge.intentChanges().at(-1).routeHandle,result=f.bridge.prepareNativeRouteMotion(handle,{radius:.28,flight:true});
 assert.equal(result.status,'prepared');f.bridge.intentChanges();return result.routeHandle;
}

test('a leaf collision between clear endpoint poses rejects the whole motor proposal',()=>{
 const f=setup();try{
  const p=f.point(.3,.9),r=.02;
  assert(footprintDistance(gateLeafFootprint(f.gate,0),p.x,p.z)>r);
  assert(footprintDistance(gateLeafFootprint(f.gate,1),p.x,p.z)>r);
   assert(footprintDistance(gateLeafFootprint(f.gate,.5),p.x,p.z)>r);
   assert(footprintDistance(gateLeafFootprint(f.gate,.3),p.x,p.z)<r);
  assert.equal(put(f,77,p,r),1);const before=f.service.read(f.gate.id),result=f.service.prepareMotion();
  assert.equal(result.status,'blocked');assert.equal(result.witness.bodyId,77);
  assert.deepEqual(f.service.read(f.gate.id),before);assert.equal(f.service.bodySweepCertified(f.gate.id),false);
 }finally{f.session.dispose();}
});
test('clear motor certification is checked once, then sampling performs no collision work',()=>{
 const f=setup();try{
  assert.equal(f.service.prepareMotion().status,'prepared');assert(f.service.bodySweepCertified(f.gate.id));
  const evaluations=f.w.nav_gate_sweep_evaluations(),pairs=f.w.nav_gate_sweep_pairs(),plans=f.w.nav_intent_route_queries();
  for(let i=0;i<1000;i++){at(f,10+i/2000);assert(f.service.read(f.gate.id));assert(f.service.polygon(f.gate.id));}
  assert.equal(f.w.nav_gate_sweep_evaluations(),evaluations);assert.equal(f.w.nav_gate_sweep_pairs(),pairs);
  assert.equal(f.w.nav_intent_route_queries(),plans);assert.equal(f.service.read(f.gate.id).authorizedPassage,false);
 }finally{f.session.dispose();}
});
test('new bodies cannot invalidate a certified remaining swing or its final static pose',()=>{
 const f=setup();try{
  f.service.prepareMotion();const safe=f.point(.3,-.9),blocked=f.point(.3,.9);
  assert.equal(put(f,77,safe),1);const before=f.body(77);
  assert.equal(put(f,77,blocked),0);assert.deepEqual(f.body(77),before);
  at(f,10.6);assert.equal(f.service.read(f.gate.id).opening,0);
  assert.equal(put(f,88,f.point(0,0)),0);assert.equal(f.body(88),null);
 }finally{f.session.dispose();}
});
test('the exact quarter swing does not reject a body merely inside the full circular envelope',()=>{
 const f=setup();try{
  const p=f.point(.3,-.9);assert.equal(put(f,77,p),1);
  assert.equal(f.service.prepareMotion().status,'prepared');assert(f.service.bodySweepCertified(f.gate.id));
  at(f,10.6);assert.equal(f.service.read(f.gate.id).opening,0);
 }finally{f.session.dispose();}
});
test('one blocked gate cannot partially commit another gate motor',()=>{
 const f=setup();try{
  const other={...f.gate,id:'structure-990002',...f.point(20,0)};assert(f.service.register(other));
  assert.equal(put(f,77,{x:other.x+.3,z:other.z+.9}),1);
  const a=f.service.read(f.gate.id),b=f.service.read(other.id);assert.equal(f.service.prepareMotion().status,'blocked');
  assert.deepEqual(f.service.read(f.gate.id),a);assert.deepEqual(f.service.read(other.id),b);
  assert.equal(f.service.bodySweepCertified(f.gate.id),false);
 }finally{f.session.dispose();}
});
test('the same candidate path conflicts with a closing leaf but not an open one or a later closing interval',()=>{
 const f=fixture();try{
  const handle=unreserved(f,f.point(.3,-.9),f.point(.3,2)),service=createSpatialGateIntents(f.session,f.state),
   gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',...f.point(0,0),gateOpen:1};
  assert(service.register(gate));
  assert.equal(f.bridge.nativeGateRouteSweep(gate.id,handle,0).status,'blocked');
  assert.equal(f.bridge.nativeGateRouteSweep(gate.id,handle,1).status,'clear');
  at(f,12);assert.equal(f.bridge.nativeGateRouteSweep(gate.id,handle,0).status,'clear');
  assert.equal(f.bridge.reserveNativeRoute(handle,1).authorizedAutonomy,false,'read-only sweep is not admission');
 }finally{f.session.dispose();}
});
test('thin leaf intrusion missed by start/mid/end samples is rejected by interval bounds',()=>{
 const f=fixture();try{
  const p=f.point(0,0),w=f.w,ptr=w.nav_gate_input_ptr(3);
  new Float64Array(w.memory.buffer,ptr,6).set([0,0,1,-.00001,1,.00001]);
  assert.equal(w.nav_gate_register(990002,p.x,p.z,0,1,1,0,0,0,0,3),1);
  f.session.actorSectorRevision({worker:true});const path=w.nav_intent_attack_route_input_ptr(1),end=f.point(0,6),start=f.point(0,-3);
  new Float32Array(w.memory.buffer,path,2).set([end.x,end.z]);
  assert.equal(w.nav_intent_restore_home(900011,start.x,start.z,end.x,end.z,1),1);f.bridge.intentChanges();
  assert.equal(put(f,1,start,.28,0),1);const service=createSpatialGateIntents(f.session,f.state);assert(service.bindWorker('worker-900011',1));
  const fraction=.5037,a=fraction*Math.PI/2,body={x:p.x+.9*Math.cos(a),z:p.z+.9*Math.sin(a)};
  assert.equal(put(f,77,body,.000001),1);
  assert.equal(service.prepareMotion().status,'blocked');assert(w.nav_gate_sweep_evaluations()>3);
 }finally{f.session.dispose();}
});
test('gate sweep queries enforce the authority epoch even when native tuple counters repeat',()=>{
 const a=fixture(),b=fixture();try{
  const handle=unreserved(a,a.point(.3,-.9),a.point(.3,2));
  assert.equal(b.bridge.nativeGateRouteSweep('structure-990001',handle,0).status,'stale');
  assert.equal(b.w.nav_gate_sweep_pairs(),0);
 }finally{a.session.dispose();b.session.dispose();}
});
test('initial and final overlap cannot receive a continuous body certificate',()=>{
 for(const opening of [0,1]){
  const f=setup(opening);try{
   const polygon=f.service.polygon(f.gate.id),p=polygon[0];
   assert.equal(put(f,77,p,.01),1);
   const before=f.service.read(f.gate.id);assert.equal(f.service.prepareMotion().status,'blocked');
   assert.deepEqual(f.service.read(f.gate.id),before);assert.equal(f.service.bodySweepCertified(f.gate.id),false);
  }finally{f.session.dispose();}
 }
 const f=setup();try{
  assert.equal(put(f,77,f.point(0,0)),1);
  assert.equal(f.service.prepareMotion().status,'blocked');
 }finally{f.session.dispose();}
});
test('frozen leaf certification checks the current polygon and protects it after the clock advances',()=>{
 const f=setup(.3);try{
  assert.equal(put(f,77,f.point(.3,.9)),1);
  assert.equal(f.service.prepareMotion({enabled:false}).status,'blocked');
  assert.equal(f.w.spatial_body_remove(77),1);
  assert.equal(f.service.prepareMotion({enabled:false}).status,'prepared');
  at(f,11);assert.equal(f.service.read(f.gate.id).opening,.3);
  assert.equal(put(f,77,f.point(.3,.9)),0);
 }finally{f.session.dispose();}
});
test('rejecting a replacement motor preserves the previously certified schedule and fences',()=>{
 const f=setup();try{
  assert.equal(f.service.prepareMotion().status,'prepared');at(f,10.2);
  const before=f.service.read(f.gate.id),other={...f.gate,id:'structure-990002',...f.point(20,0)};
  assert(f.service.register(other));assert.equal(put(f,77,{x:other.x+.3,z:other.z+.9}),1);
  assert.equal(f.service.prepareMotion().status,'blocked');assert.deepEqual(f.service.read(f.gate.id),before);
  assert(f.service.bodySweepCertified(f.gate.id));assert.equal(put(f,88,f.point(0,0)),0);
  at(f,10.6);assert.equal(f.service.read(f.gate.id).opening,0);
 }finally{f.session.dispose();}
});
test('an undefined saved pose must be resolved before certifying physical motor continuity',()=>{
 const f=fixture();try{
  const service=createSpatialGateIntents(f.session,f.state),gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',...f.point(0,0)};
  assert(service.register(gate));const before=service.read(gate.id);
  assert.equal(service.prepareMotion().status,'incomplete-facts');assert.deepEqual(service.read(gate.id),before);
  assert.equal(service.bodySweepCertified(gate.id),false);
  assert.equal(service.reconcile().status,'updated');assert.equal(service.prepareMotion().status,'prepared');
 }finally{f.session.dispose();}
});
