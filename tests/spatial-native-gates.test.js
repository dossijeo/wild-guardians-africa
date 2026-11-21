import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createSpatialGateIntents} from '../src/world/wild-engine/spatial-gate-intents.js';
import {gateLeafFootprint,gateSwingPolygon,gateTriggerRadius} from '../src/world/gate-passages.js';
import {advanceGateLeaves,waitForGate,GATE_MOVE_SECONDS} from '../src/simulation/gates.js';

function setup({material='zarzas',opening=0,status='intact',yaw=0,scale=1}={}){
 const f=fixture(),p=f.point(0,0),gate={id:'structure-990001',kind:'wall',gate:true,material,status,...p,yaw,baseScaleX:scale};
 if(opening!==null)gate.gateOpen=opening;
 const service=createSpatialGateIntents(f.session,f.state);assert(service.register(gate));
 return {...f,gate,service};
}
function worker(f,{z=-3,home=false,path=true}={}){
 const a=f.point(0,z),b=f.point(0,6),w=f.w;
 f.session.actorSectorRevision({worker:true});const ptr=w.nav_intent_attack_route_input_ptr(1);
 new Float32Array(w.memory.buffer,ptr,2).set([b.x,b.z]);
 assert.equal(w.nav_intent_restore_home(900011,a.x,a.z,b.x,b.z,1),1);f.bridge.intentChanges();
 assert.equal(w.spatial_body_upsert(1,a.x,a.z,.28,0,home?0:1),1);
 assert(f.service.bindWorker('worker-900011',1));
 return {id:'worker-900011',...a,radius:.28,status:home?'home':'returning',path:path?[b]:[]};
}
const time=(f,at)=>{f.state.elapsed=at;assert.equal(f.w.nav_intent_set_time(at),1);};
const close=(a,b)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert(Math.hypot(a[i].x-b[i].x,a[i].z-b[i].z)<1e-11);};

test('native leaf and circumscribed swing use the authored polygons, yaw and nonuniform scale',()=>{
 for(const material of ['zarzas','empalizada','reforzado'])for(const yaw of [0,.73]){
  const f=setup({material,yaw,scale:1.3,opening:.37});try{
   close(f.service.polygon(f.gate.id),gateLeafFootprint(f.gate,.37));
   close(f.service.polygon(f.gate.id,1),gateSwingPolygon(f.gate));
   assert(Math.abs(f.service.read(f.gate.id).triggerRadius-gateTriggerRadius(f.gate))<1e-12);
   assert.equal(f.service.read(f.gate.id).authorizedPassage,false);
  }finally{f.session.dispose();}
 }
});
test('native request, opening duration and waiting match legacy movement rules',()=>{
 const f=setup();try{
  const actor=worker(f),legacy={workers:[actor],structures:[structuredClone(f.gate)],pauses:[],initialPreparation:false};
  assert.equal(f.service.reconcile().status,'updated');assert.equal(GATE_MOVE_SECONDS,.6);
  for(let i=1;i<=30;i++){
   advanceGateLeaves(legacy,.02);time(f,10+i*.02);
   assert(Math.abs(f.service.read(f.gate.id).opening-legacy.structures[0].gateOpen)<1e-12);
   assert.equal(f.service.waiting(actor.id),waitForGate(actor,legacy.structures));
  }
  assert.equal(f.service.read(f.gate.id).opening,1);
 }finally{f.session.dispose();}
});
test('an occupied legacy save without an explicit opening starts open, not through a standing worker',()=>{
 const f=setup({opening:null});try{
  const actor=worker(f,{z:0}),legacy={workers:[actor],structures:[structuredClone(f.gate)]};
  advanceGateLeaves(legacy,.02);assert.equal(f.service.reconcile().status,'updated');time(f,10.02);
  assert.equal(legacy.structures[0].gateOpen,1);assert.equal(f.service.read(f.gate.id).opening,1);
  assert.equal(f.service.read(f.gate.id).occupied,true);
 }finally{f.session.dispose();}
});
test('native occupancy holds an open gate without a route request and closes only after the worker leaves',()=>{
 const f=setup({opening:1});try{
  worker(f,{z:0});assert.equal(f.w.nav_intent_cancel_home(900011),1);f.bridge.intentChanges();
  f.service.reconcile();time(f,10.3);assert.equal(f.service.read(f.gate.id).opening,1);
  assert.equal(f.service.read(f.gate.id).requested,false);assert.equal(f.service.read(f.gate.id).occupied,true);
  const p=f.point(0,-6);assert.equal(f.w.spatial_body_upsert(1,p.x,p.z,.28,0,1),1);
  f.service.reconcile();time(f,10.6);assert(Math.abs(f.service.read(f.gate.id).opening-.5)<1e-12);
  time(f,10.9);assert.equal(f.service.read(f.gate.id).opening,0);
 }finally{f.session.dispose();}
});
test('home/inactive bodies do not request gates and missing nearby body identity freezes the boundary atomically',()=>{
 const f=setup({opening:.4});try{
  worker(f,{z:0,home:true});f.service.reconcile();assert.equal(f.service.read(f.gate.id).occupied,false);
  const other=f.state.workers[1];other.x=f.gate.x;other.z=f.gate.z;
  f.bridge.applyEvents(f.state,[{type:'worker',entity:other}]);
  const before=f.service.read(f.gate.id),boundaries=f.w.nav_gate_boundaries();
  assert.equal(f.service.reconcile().status,'incomplete-facts');
  assert.equal(f.service.read(f.gate.id).opening,before.opening);assert.equal(f.service.read(f.gate.id).target,before.opening);
  assert.equal(f.w.nav_gate_boundaries(),boundaries);
 }finally{f.session.dispose();}
});
test('pause freezes the native gate trajectory and collapsing/ruined states preserve their legacy rules',()=>{
 const f=setup();try{
  worker(f);f.service.reconcile();time(f,10.15);f.service.reconcile({enabled:false});
  const before=f.service.read(f.gate.id).opening;time(f,11);assert.equal(f.service.read(f.gate.id).opening,before);
  f.service.reconcile();time(f,11.6);assert.equal(f.service.read(f.gate.id).opening,1);
 }finally{f.session.dispose();}
 for(const [status,expected] of [['collapsing',.4],['ruined',0]]){
  const f=setup({status,opening:.4});try{f.service.reconcile();time(f,11);assert.equal(f.service.read(f.gate.id).opening,expected);}finally{f.session.dispose();}
 }
});
test('sampling gate geometry and time never plans, checks workers again or emits route positions',()=>{
 const f=setup();try{
  worker(f);f.service.reconcile();const plans=f.w.nav_intent_route_queries(),checks=f.w.nav_gate_worker_checks(),
   prefixes=f.w.nav_gate_prefix_segments(),sequence=f.w.nav_intent_transition_sequence();
  for(let i=0;i<1000;i++){time(f,10+i/2000);assert(f.service.read(f.gate.id));assert(f.service.polygon(f.gate.id));}
  assert.equal(f.w.nav_intent_route_queries(),plans);assert.equal(f.w.nav_gate_worker_checks(),checks);
  assert.equal(f.w.nav_gate_prefix_segments(),prefixes);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
 }finally{f.session.dispose();}
});
test('unimplemented native gate passages fail closed and cannot be installed over already admitted curves',()=>{
 const f=setup();try{
  worker(f);f.session.actorSectorRevision({worker:true});const a=f.point(0,-3),b=f.point(0,6);
  assert.equal(f.w.spatial_execution_segment_clear(a.x,a.z,b.x,b.z,.28),-2);
 }finally{f.session.dispose();}
 const g=fixture();try{
  const handle=g.worker(1,g.point(0,-6),g.point(0,6)),p=g.point(0,0),service=createSpatialGateIntents(g.session,g.state),sequence=g.w.nav_intent_transition_sequence();
  assert.equal(service.register({id:'structure-990001',gate:true,status:'intact',material:'zarzas',...p}),false);
  assert(g.bridge.nativeRouteTiming(handle));assert.equal(g.w.nav_intent_transition_sequence(),sequence);
 }finally{g.session.dispose();}
});
test('body bindings cannot be recycled after registry reset or across worker identities',()=>{
 const f=setup();try{
  worker(f);assert.equal(f.service.bindWorker('worker-900012',1),false);
  f.w.spatial_bodies_reset();assert.equal(f.service.waiting('worker-900011'),null);
  const p=f.point(0,0);assert.equal(f.w.spatial_body_upsert(1,p.x,p.z,.28,1,9),1);
  assert.equal(f.service.bindWorker('worker-900011',1),false);
 }finally{f.session.dispose();}
});
test('an unbound physical worker near a gate cannot be hidden by a distant or missing entity projection',()=>{
 const f=setup();try{
  worker(f);const p=f.point(0,0);assert.equal(f.w.spatial_body_upsert(77,p.x,p.z,.28,0,1),1);
  const before=f.service.read(f.gate.id);assert.equal(f.service.reconcile().status,'incomplete-facts');
  assert.deepEqual(f.service.read(f.gate.id),before);assert.equal(f.w.spatial_body_remove(77),1);
  assert.equal(f.service.reconcile().status,'updated');
 }finally{f.session.dispose();}
});
test('incomplete facts stop a previously running motor rather than merely rejecting a new target',()=>{
 const f=setup({opening:1});try{
  worker(f,{home:true});f.service.reconcile();time(f,10.2);const opening=f.service.read(f.gate.id).opening;
  const p=f.point(0,0);assert.equal(f.w.spatial_body_upsert(77,p.x,p.z,.28,0,1),1);
  assert.equal(f.service.reconcile().status,'incomplete-facts');time(f,11);
  assert.equal(f.service.read(f.gate.id).opening,opening);assert.equal(f.service.read(f.gate.id).target,opening);
 }finally{f.session.dispose();}
});
