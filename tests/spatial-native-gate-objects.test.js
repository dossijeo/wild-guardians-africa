import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createSpatialGateIntents,readNativeGateStaticWitness} from '../src/world/wild-engine/spatial-gate-intents.js';
import {addSpatialGate} from '../src/world/wild-engine/spatial-wall-bridge.js';
import {createSpatialChunkRetention} from '../src/world/wild-engine/spatial-chunk-retention.js';
import {gateLeafFootprint,gateFrameFootprints} from '../src/world/gate-passages.js';
import {footprintDistance} from '../src/world/footprints.js';

function setup({offset=0,opening=1}={}){
 const f=fixture(),gate={id:'structure-990001',kind:'wall',gate:true,status:'intact',material:'zarzas',...f.point(offset,0),gateOpen:opening},
  service=createSpatialGateIntents(f.session,f.state);assert(service.register(gate));return {...f,gate,service};
}
const square=(p,r=.01)=>[{x:p.x-r,z:p.z-r},{x:p.x+r,z:p.z-r},{x:p.x+r,z:p.z+r},{x:p.x-r,z:p.z+r}];
const prepare=f=>f.service.prepareMotion({staticObjects:true});
const certified=f=>assert.equal(f.service.staticObjectsCertified(f.gate.id),true);
const tick=(f,t)=>{f.state.elapsed=t;assert.equal(f.w.nav_intent_set_time(t),1);};
function allProps(f){
 const core=f.session.core,selected=core.currentChunk(),props=new Map();
 for(const key of core.captureResidentChunks().keys){const [x,z]=key.split(',').map(Number);core.selectChunk(x,z);
  for(const p of core.props())if(p.group<=5)props.set(`${p.group}:${p.gx}:${p.gz}`,p);}
 if(selected)core.selectChunk(selected.cx,selected.cz);return [...props.values()];
}
const solid=p=>p.slot<=3||p.slot>=10&&p.slot<=12||p.slot>=18;
const identity=p=>({group:p.group,gx:p.gx,gz:p.gz});

test('canonical barrier contact between clear start/mid/end poses rejects static-object motor preparation',()=>{
 const f=setup();try{
  const p=f.point(.3,.9);
  for(const opening of [0,.5,1])assert(footprintDistance(gateLeafFootprint(f.gate,opening),p.x,p.z)>.01);
  assert(footprintDistance(gateLeafFootprint(f.gate,.3),p.x,p.z)<.01);
  const id=f.session.core.addOrientedBarrier(p.x,p.z,.005,.005,.73,0);assert(id>0);
  const before=f.service.read(f.gate.id),result=prepare(f);assert.equal(result.status,'blocked');
  assert.equal(result.staticWitness.kind,'barrier');assert.equal(result.staticWitness.objectId,id);
  assert.deepEqual(f.service.read(f.gate.id),before);assert.equal(f.service.staticObjectsCertified(f.gate.id),false);
 }finally{f.session.dispose();}
});

test('polygon objects participate physically for every actor passability mask',()=>{
 for(const mask of [0,1,2,3]){
  const f=setup();try{
   const id=f.session.core.addPolygon(square(f.point(.3,.9)),mask);assert(id>0);
   const result=prepare(f);assert.equal(result.status,'blocked');assert.equal(result.staticWitness.kind,'polygon');assert.equal(result.staticWitness.objectId,id);
  }finally{f.session.dispose();}
 }
});

test('a body-clear certificate is not silently presented as a static-object certificate',()=>{
 const f=setup();try{
  const p=f.point(.3,.9);assert(f.session.core.addWall(p.x,p.z,.005,.005)>0);
  assert.equal(f.service.prepareMotion().status,'prepared');assert(f.service.bodySweepCertified(f.gate.id));
  assert.equal(f.service.staticObjectsCertified(f.gate.id),false);assert.equal(prepare(f).status,'blocked');
 }finally{f.session.dispose();}
});

test('new barrier and polygon contacts are vetoed before native geometry, IDs or motors change',()=>{
 const f=setup();try{
  assert.equal(prepare(f).status,'prepared');certified(f);const before=f.session.core.snapshot(),motor=f.service.read(f.gate.id),p=f.point(.3,.9);
  assert.equal(f.session.core.addOrientedBarrier(p.x,p.z,.005,.005,.4,3),0);
  assert.throws(()=>f.session.core.addPolygon(square(p),0),/Invalid spatial polygon/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.service.read(f.gate.id),motor);certified(f);
 }finally{f.session.dispose();}
});

test('a rejected multi-wall batch publishes neither its safe piece nor the colliding one',()=>{
 const f=setup();try{
  prepare(f);const before=f.session.core.snapshot(),safe=f.point(30,30),bad=f.point(.3,.9);
  assert.throws(()=>f.session.core.addBarriersBatch([
   {...safe,halfX:.1,halfZ:.1,yaw:0},{...bad,halfX:.005,halfZ:.005,yaw:0},
  ]),/Could not add spatial barriers|Invalid spatial barrier/);
  assert.deepEqual(f.session.core.snapshot(),before);certified(f);
 }finally{f.session.dispose();}
});

test('the exact quarter swing allows safe objects inside its circular envelope and keeps final pose fences',()=>{
 const f=setup();try{
  prepare(f);const p=f.point(.3,-.9),id=f.session.core.addOrientedBarrier(p.x,p.z,.005,.005,.73,0);assert(id>0);certified(f);
  tick(f,10.6);const end=f.point(0,0);assert.equal(f.service.read(f.gate.id).opening,0);
  assert.equal(f.session.core.addWall(end.x,end.z,.005,.005),0);certified(f);
  assert.equal(f.session.core.removeBarrier(id),1);certified(f);
 }finally{f.session.dispose();}
});

test('distant overlay changes and time sampling extend metadata without repeating object or route checks',()=>{
 const f=setup();try{
  prepare(f);const before=[f.w.nav_gate_static_evaluations(),f.w.nav_gate_static_pairs(),f.w.nav_intent_route_queries()],p=f.point(40,40);
  const id=f.session.core.addWall(p.x,p.z,.1,.1);assert(id>0);certified(f);assert.equal(f.session.core.removeBarrier(id),1);certified(f);
  for(let i=0;i<1000;i++){tick(f,10+i/1000);f.service.read(f.gate.id);f.service.polygon(f.gate.id);}
  assert.deepEqual([f.w.nav_gate_static_evaluations(),f.w.nav_gate_static_pairs(),f.w.nav_intent_route_queries()],before);
 }finally{f.session.dispose();}
});

test('object certificates retain resident data until a native pin frontier releases them',()=>{
 const f=setup();try{
  prepare(f);const retained=createSpatialChunkRetention(f.session.core,{loaded:()=>new Map(),desired:()=>new Map()}),before=f.session.core.captureResidentChunks();
  assert.equal(retained.releaseChunk(0,0),0);assert.deepEqual(f.session.core.captureResidentChunks(),before);certified(f);
  const checks=f.w.nav_gate_static_evaluations();assert.equal(retained.setDemand([]),0);assert.equal(f.w.nav_gate_static_evaluations(),checks);
  assert(f.service.remove(f.gate.id));assert.equal(retained.setDemand([]),1);assert.equal(f.session.core.hasResidentChunk(0,0),false);
 }finally{f.session.dispose();}
});

test('current support-input changes are rejected, while distant terrain and residency edits preserve the proof',()=>{
 const f=setup();try{
  prepare(f);const before=f.session.core.snapshot(),p=f.point(5,3);
  assert.throws(()=>f.session.core.setSettlement(p.x,p.z,4,4),/Native terrain mutation rejected/);
  assert.deepEqual(f.session.core.snapshot(),before);certified(f);
  assert(Number.isFinite(f.session.core.addSettlement(1000,1000,1,1)));certified(f);
  assert(f.session.core.addChunk(4,4)>=0);certified(f);assert.equal(f.session.core.removeChunk(4,4),1);certified(f);
  tick(f,10.6);assert.equal(f.service.read(f.gate.id).opening,0);
 }finally{f.session.dispose();}
});

test('whole-world replacement cannot bypass the gate object lease when no body is executing',()=>{
 const f=setup();try{
  prepare(f);assert.equal(f.w.nav_intent_route_reservation_count(),0);const before=f.session.core.snapshot();
  assert.throws(()=>f.session.core.generate(999,0,0,'desert'),/retire the authority/);
  assert.deepEqual(f.session.core.snapshot(),before);certified(f);
 }finally{f.session.dispose();}
});

test('missing residency and oversized unsupported envelopes cannot be certified as empty',()=>{
 const f=setup({offset:200});try{
  const before=f.service.read(f.gate.id),result=prepare(f);assert.equal(result.status,'unknown');assert.equal(result.staticWitness.reason,'missing-data');
  assert.deepEqual(f.service.read(f.gate.id),before);assert.equal(f.service.staticObjectsCertified(f.gate.id),false);
 }finally{f.session.dispose();}
 const g=fixture();try{
  const service=createSpatialGateIntents(g.session,g.state),gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',...g.point(0,0),baseScaleX:20,gateOpen:1};
  assert(service.register(gate));assert.equal(service.prepareMotion({enabled:false,staticObjects:true}).status,'unsupported');assert.equal(service.staticObjectsCertified(gate.id),false);
 }finally{g.session.dispose();}
});

test('legacy gate proxies and authored frame contacts are not skipped through a self-owner exception',()=>{
 const f=setup();try{
  assert.equal(addSpatialGate(f.session.core,f.gate).length,3);const result=prepare(f);
  assert.equal(result.status,'blocked');assert.equal(result.staticWitness.kind,'barrier');assert.equal(f.service.staticObjectsCertified(f.gate.id),false);
 }finally{f.session.dispose();}
});

test('exact authored frame polygons remain physical objects and do not receive a blanket hinge exemption',()=>{
 for(const material of ['zarzas','empalizada','reforzado']){
  const f=fixture();try{
   const gate={id:'structure-990001',gate:true,status:'intact',material,...f.point(0,0),gateOpen:1},service=createSpatialGateIntents(f.session,f.state);
   assert(service.register(gate));for(const polygon of gateFrameFootprints(gate,1).slice(0,2))assert(f.session.core.addPolygon(polygon,0)>0);
   const result=service.prepareMotion({staticObjects:true});assert.equal(result.status,'blocked',material);assert.equal(result.staticWitness.kind,'polygon');
  }finally{f.session.dispose();}
 }
});

test('a thin rotating leaf cannot miss an intermediate micrometre-scale barrier intrusion',()=>{
 const f=fixture();try{
  const p=f.point(0,0),ptr=f.w.nav_gate_input_ptr(3);new Float64Array(f.w.memory.buffer,ptr,6).set([0,0,1,-.00001,1,.00001]);
  assert.equal(f.w.nav_gate_register(990001,p.x,p.z,0,1,1,0,0,1,0,3),1);
  const angle=.5037*Math.PI/2,id=f.session.core.addWall(p.x+.9*Math.cos(angle),p.z+.9*Math.sin(angle),.000005,.000005);assert(id>0);
  const service=createSpatialGateIntents(f.session,f.state),result=service.prepareMotion({staticObjects:true});
  assert.equal(result.status,'blocked');assert.equal(result.staticWitness.objectId,id);assert(f.w.nav_gate_static_evaluations()>3);
 }finally{f.session.dispose();}
});

test('continuous leaf pairs preserve large gate identities and reject intermediate contact atomically',()=>{
 const f=fixture();try{
  const p=f.point(0,0),w=f.w;let ptr=w.nav_gate_input_ptr(3);new Float64Array(w.memory.buffer,ptr,6).set([0,0,1,-.00001,1,.00001]);
  assert.equal(w.nav_gate_register(990001,p.x,p.z,0,1,1,0,0,1,0,3),1);
  ptr=w.nav_gate_input_ptr(3);new Float64Array(w.memory.buffer,ptr,6).set([-.000005,-.000005,.000005,-.000005,0,.000005]);
  const id=2**40,angle=.5037*Math.PI/2;assert.equal(w.nav_gate_register(id,p.x+.9*Math.cos(angle),p.z+.9*Math.sin(angle),0,1,1,0,0,0,1,3),1);
  assert.equal(w.nav_gate_prepare_object_motion(1),-8);const witness=readNativeGateStaticWitness(w);
  assert.equal(witness.kind,'gate');assert.equal(witness.objectId,id);assert.equal(w.nav_gate_static_objects_certified(990001),0);
 }finally{f.session.dispose();}
});

test('a new gate cannot be registered through the remaining certified leaf sweep',()=>{
 const f=setup();try{
  prepare(f);const before=f.service.read(f.gate.id);assert.equal(f.service.register({...f.gate,id:'structure-990002'}),false);
  assert.deepEqual(f.service.read(f.gate.id),before);certified(f);
  assert(f.service.register({...f.gate,id:'structure-990003',...f.point(30,0)}));certified(f);
  assert(f.service.remove('structure-990003'));certified(f);
 }finally{f.session.dispose();}
});

test('canonical prop geometry blocks the leaf rather than being omitted from the native query',()=>{
 const f=fixture();try{
  const p=allProps(f).find(p=>solid(p)&&Math.abs(p.x)<60&&Math.abs(p.z)<60&&Math.hypot(p.x-f.point(0,0).x,p.z-f.point(0,0).z)>20);assert(p);
  const service=createSpatialGateIntents(f.session,f.state),gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',x:p.x,z:p.z,gateOpen:1};assert(service.register(gate));
  const result=service.prepareMotion({staticObjects:true});assert.equal(result.status,'blocked');assert.equal(result.staticWitness.kind,'prop');
 }finally{f.session.dispose();}
});

test('canonical prop restoration cannot introduce a solid into a certified motor sweep',()=>{
 const f=fixture();try{
  const service=createSpatialGateIntents(f.session,f.state),base=f.session.core.snapshot().removedProps,center=f.point(0,0);let selected=null;
  for(const p of allProps(f).filter(p=>solid(p)&&Math.abs(p.x)<60&&Math.abs(p.z)<60&&Math.hypot(p.x-center.x,p.z-center.z)>20)){
   assert.equal(f.session.core.removeProp(identity(p)),1);
   const gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',x:p.x,z:p.z,gateOpen:1};assert(service.register(gate));
   if(service.prepareMotion({staticObjects:true}).status==='prepared'){selected={p,gate};break;}
   assert(service.remove(gate.id));f.session.core.restoreRemovedProps(base);
  }
  assert(selected,'fixture needs a prop with an otherwise clear motor region');const before=f.session.core.snapshot();
  assert.throws(()=>f.session.core.restoreRemovedProps(base),/Could not restore removed spatial props/);
  assert.deepEqual(f.session.core.snapshot(),before);assert(service.staticObjectsCertified(selected.gate.id));
 }finally{f.session.dispose();}
});

test('a containing polygon also blocks certification of a frozen leaf without edge crossings',()=>{
 const f=setup();try{
  assert(f.session.core.addPolygon(square(f.gate,3),0)>0);
  const result=f.service.prepareMotion({enabled:false,staticObjects:true});assert.equal(result.status,'blocked');
  assert.equal(result.staticWitness.kind,'polygon');assert.equal(f.service.staticObjectsCertified(f.gate.id),false);
 }finally{f.session.dispose();}
});

test('a degenerate leaf cannot acquire an object certificate merely because the queried world is empty',()=>{
 const f=fixture();try{
  const p=f.point(0,0),w=f.w,ptr=w.nav_gate_input_ptr(3);new Float64Array(w.memory.buffer,ptr,6).set([0,0,1,0,2,0]);
  assert.equal(w.nav_gate_register(990001,p.x,p.z,0,1,1,0,0,1,0,3),1);
  const service=createSpatialGateIntents(f.session,f.state);
  assert.equal(service.prepareMotion({staticObjects:true}).status,'unsupported');assert.equal(service.staticObjectsCertified('structure-990001'),false);
 }finally{f.session.dispose();}
});
