import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
const start=f=>assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
function crossing(f){
 f.session.actorSectorRevision({worker:true});
 for(let z=-16;z<=16;z+=2){const a={x:17.2,z:z+.2},b={x:32.2,z:z+.2};
  if(f.w.spatial_execution_segment_clear(a.x,a.z,b.x,b.z,.28)===1)return {a,b};}
 assert.fail('native fixture needs a clear border connector');
}
function blockedEdit(f,id=1){const p=f.body(id);return ()=>f.session.core.setSettlement(p.x+5,p.z+3,4,4);}
async function prepared(core){const p=core.preparation,id=p.start(4,4);assert(id>0);
 for(let i=0;i<1000&&p.status()!==3;i++)await delay(4);assert.equal(p.status(),3);assert.equal(p.metric(0),1);return id;}

test('distant terrain edits extend native proofs without querying or replacing live routes',()=>{
 const f=fixture();try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const plan=f.bridge.nativeRouteTiming(a),checks=f.w.spatial_execution_clearance_checks();
  assert(Number.isFinite(f.session.core.addSettlement(1000,1000,1,1)));
  assert.equal(f.w.nav_intent_terrain_candidates(),0);assert.equal(f.w.nav_intent_terrain_body_checks(),0);
  assert.equal(f.w.nav_intent_terrain_recipe_chunks(),0);
  for(let i=1;i<=100;i++)assert.equal(f.advance(11+i*.02).status,'advanced');
  assert.deepEqual(f.bridge.nativeRouteTiming(a),plan);assert.equal(f.w.spatial_execution_clearance_checks(),checks);
  assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});
test('a proposal changing current support data is rejected atomically without exposing scratch terrain',()=>{
 const f=fixture();try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const before=f.session.core.snapshot(),payload=f.session.core.chunkPayload(),residency=f.session.core.captureResidentChunks(),
   revision=f.session.core.farVisualRevision(),sequence=f.w.nav_intent_transition_sequence();
  assert.throws(blockedEdit(f),/Native terrain mutation rejected/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.session.core.chunkPayload(),payload);
  assert.deepEqual(f.session.core.captureResidentChunks(),residency);assert.equal(f.session.core.farVisualRevision(),revision);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteExecution(a));
  assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});
test('current animal support is protected by the same terrain transaction',()=>{
 const f=fixture();try{
  const a=f.animal(f.point(-6,0),f.point(6,0));start(f);f.advance(11);const before=f.session.core.snapshot(),body=f.body(10);
  assert.throws(blockedEdit(f,10),/Native terrain mutation rejected/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.body(10),body);
  assert(f.bridge.nativeRouteExecution(a));assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});
test('height changes along a future corridor retire that generation while another worker continues',()=>{
 const f=fixture();try{
  const {a,b}=crossing(f),moving=f.worker(1,a,b),other=f.worker(4,f.point(-6,6),f.point(6,6));start(f);f.advance(11);
  const body=f.body(1),plan=f.bridge.nativeRouteTiming(other),heights=[-3,-1,0,1,3].map(dx=>f.w.spatial_surface(b.x+dx,b.z));
  assert(Number.isFinite(f.session.core.addSettlement(b.x,b.z,1,1)));
  assert.notDeepEqual([-3,-1,0,1,3].map(dx=>f.w.spatial_surface(b.x+dx,b.z)),heights);
  const [event]=f.bridge.intentChanges();assert.deepEqual(event.revokedRouteHandle,moving);assert.equal(event.effectiveTime,11);
  assert.equal(f.w.nav_intent_terrain_revocations(),1);assert.equal(f.advance(12).status,'advanced');
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.bridge.nativeRouteTiming(other),plan);
 }finally{f.session.dispose();}
});
test('future terrain changes revoke prepared leases before execution begins',()=>{
 const f=fixture();try{
  const {a,b}=crossing(f),handle=f.worker(1,a,b);
  f.session.core.addSettlement(b.x,b.z,1,1);
  assert.deepEqual(f.bridge.intentChanges()[0].revokedRouteHandle,handle);
  assert.equal(f.bridge.nativeRouteTiming(handle),null);assert.equal(f.bridge.beginNativeRouteExecution().status,'inactive');
 }finally{f.session.dispose();}
});
test('a remote large registered body cannot veto an edit outside its dependency bounds',()=>{
 const f=fixture();try{
  const {a,b}=crossing(f),handle=f.worker(1,a,b);start(f);
  assert.equal(f.w.spatial_body_upsert(99,1000,1000,20,0,1),1);
  assert(Number.isFinite(f.session.core.addSettlement(b.x,b.z,1,1)));
  assert.equal(f.bridge.nativeRouteExecution(handle),null);
  assert.deepEqual(f.bridge.intentChanges()[0].revokedRouteHandle,handle);
 }finally{f.session.dispose();}
});
test('whole-world generation cannot bypass a prepared terrain lease before execution starts',()=>{
 const f=fixture();try{
  const handle=f.worker(1,f.point(-6,0),f.point(6,0)),before=f.session.core.snapshot(),residency=f.session.core.captureResidentChunks();
  assert.throws(()=>f.session.core.generate(999,0,0,'desert'),/retire the authority/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.session.core.captureResidentChunks(),residency);
  assert(f.bridge.nativeRouteTiming(handle));start(f);assert.equal(f.advance(11).status,'advanced');
 }finally{f.session.dispose();}
});
test('replacing identical canonical sites does not invent a physical support change',()=>{
 const f=fixture();try{
  const handle=f.worker(1,f.point(-6,0),f.point(6,0));start(f);
  const sites=f.session.core.snapshot().settlements,plan=f.bridge.nativeRouteTiming(handle);
  f.session.core.applySettlements(sites,{replace:true});
  assert.equal(f.w.nav_intent_terrain_revocations(),0);assert.equal(f.w.nav_intent_terrain_candidates(),0);
  assert.equal(f.advance(11).status,'advanced');assert.deepEqual(f.bridge.nativeRouteTiming(handle),plan);
 }finally{f.session.dispose();}
});
test('settlement batches reject the whole proposed replacement before committing any site or actor event',()=>{
 const f=fixture();try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const p=f.body(1),before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence();
  assert.throws(()=>f.session.core.applySettlements([{x:1000,z:1000,hx:1,hz:1},
   {x:p.x+5,z:p.z+3,hx:4,hz:4}],{replace:true}),/settlement/i);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.bridge.nativeRouteExecution(a));assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});
test('malformed settlement inputs fail before staging or altering native proof revisions',()=>{
 const f=fixture();try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);
  const before=f.session.core.snapshot(),recipes=f.w.nav_intent_terrain_recipe_chunks(),sequence=f.w.nav_intent_transition_sequence();
  assert.throws(()=>f.session.core.applySettlements([{x:NaN,z:0,hx:1,hz:1}],{replace:true}));
  assert.equal(f.w.spatial_set_settlement(0,0,0,1),-1);assert.equal(f.w.spatial_add_settlement(0,0,101,1),-1);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_terrain_recipe_chunks(),recipes);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteExecution(a));
 }finally{f.session.dispose();}
});
test('stopped bodies retain terrain ownership and world generation cannot bypass authority retirement',()=>{
 const f=fixture();try{
  f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);f.bridge.intentChanges();
  const before=f.session.core.snapshot(),residency=f.session.core.captureResidentChunks();
  assert.throws(blockedEdit(f),/Native terrain mutation rejected/);
  assert.throws(()=>f.session.core.generate(555,0,0,'desert'),/retire the authority/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.session.core.captureResidentChunks(),residency);
 }finally{f.session.dispose();}
});
test('removing clearing habitat cannot regrow a solid through a body even when its support heights are unchanged',()=>{
 const f=fixture();try{
  const core=f.session.core,base=core.snapshot().settlements;let chosen;
  for(const key of core.captureResidentChunks().keys){const [cx,cz]=key.split(',').map(Number);core.selectChunk(cx,cz);
   for(const p of core.props().filter(p=>p.group<=5&&(p.slot<=3||p.slot>=10&&p.slot<=12||p.slot>=18))){
    core.applySettlements(base,{replace:true});core.addSettlement(p.x-p.radius-12,p.z,1,1);
    f.session.actorSectorRevision({worker:true});
    if(f.w.spatial_execution_segment_clear(p.x,p.z,p.x+.25,p.z,.28)===1){chosen=p;break;}}
   if(chosen)break;}
  assert(chosen);const p=chosen,handle=f.worker(1,p,{x:p.x+.25,z:p.z});start(f);
  const before=core.snapshot();assert.throws(()=>core.applySettlements(base,{replace:true}),/settlement/i);
  assert.deepEqual(core.snapshot(),before);assert(f.bridge.nativeRouteExecution(handle));assert.equal(f.advance(10.1).status,'advanced');
 }finally{f.session.dispose();}
});
test('rejected terrain preserves a real pthread result and native execution',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);const id=await prepared(f.session.core);
  assert.throws(blockedEdit(f),/Native terrain mutation rejected/);
  assert(f.session.core.preparation.publish(id,4,4)>0);assert.equal(f.session.core.preparation.release(),1);
  assert.equal(f.advance(11).status,'advanced');assert(f.bridge.nativeRouteExecution(a));
 }finally{f.session.dispose();await runtime.dispose();}
});
test('accepted terrain invalidates old pthread inputs without blocking unrelated execution',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);const id=await prepared(f.session.core);
  f.session.core.addSettlement(1000,1000,1,1);
  assert.equal(f.session.core.preparation.publish(id,4,4),-2);assert.equal(f.session.core.preparation.release(),1);
  assert(!f.session.core.hasResidentChunk(4,4));assert.equal(f.advance(11).status,'advanced');assert(f.bridge.nativeRouteExecution(a));
 }finally{f.session.dispose();await runtime.dispose();}
});
