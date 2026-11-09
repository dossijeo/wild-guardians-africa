import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createSpatialChunkRetention} from '../src/world/wild-engine/spatial-chunk-retention.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

const start=f=>assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
function crossing(f){
 f.session.actorSectorRevision({worker:true});
 for(let z=-16;z<=16;z+=2){
  const a={x:17.2,z:z+.2},b={x:32.2,z:z+.2};
  if(f.w.spatial_execution_segment_clear(a.x,a.z,b.x,b.z,.28)===1)return {a,b};
 }
 assert.fail('fixture needs a continuously clear native connector across the x=24 chunk boundary');
}
function retention(f){
 const retained=[],released=[];
 const service=createSpatialChunkRetention(f.session.core,{loaded:()=>new Map(),desired:()=>new Map(),
  onRetain:(x,z)=>retained.push([x,z]),onRelease:(x,z)=>released.push([x,z])});
 return {service,retained,released};
}
async function prepared(core,cx,cz){
 const p=core.preparation,id=p.start(cx,cz);assert(id>0);
 for(let i=0;i<1000&&p.status()!==3;i++)await delay(4);
 assert.equal(p.status(),3,'real pthread preparation must complete');assert.equal(p.metric(0),1);
 return id;
}

test('distant chunk publication and eviction preserve native execution without route validation',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const plan=f.bridge.nativeRouteTiming(a),checks=f.w.spatial_execution_clearance_checks(),
   queries=f.w.nav_intent_route_queries(),validations=f.w.nav_intent_route_validation_count();
  assert(f.session.core.addChunk(4,4)>=0);assert(f.session.core.hasResidentChunk(4,4));
  assert.equal(f.advance(12).status,'advanced');assert.equal(f.session.core.removeChunk(4,4),1);
  assert(!f.session.core.hasResidentChunk(4,4));assert.equal(f.advance(13).status,'advanced');
  assert.deepEqual(f.bridge.nativeRouteTiming(a),plan);assert.deepEqual(f.bridge.intentChanges(),[]);
  assert.equal(f.w.nav_intent_residency_candidates(),0);assert.equal(f.w.nav_intent_residency_segments(),0);
  assert.equal(f.w.spatial_execution_clearance_checks(),checks);assert.equal(f.w.nav_intent_route_queries(),queries);
  assert.equal(f.w.nav_intent_route_validation_count(),validations);assert.equal(f.w.nav_intent_residency_commits(),2);
 }finally{f.session.dispose();}
});

test('current-body eviction fails atomically and keeps the JS publication mirror consistent',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const before=f.session.core.captureResidentChunks(),count=f.w.spatial_chunk_count(),
   sequence=f.w.nav_intent_transition_sequence(),body=f.body(1);
  assert.equal(f.session.core.removeChunk(0,0),0);assert(f.session.core.hasResidentChunk(0,0));
  assert.deepEqual(f.session.core.captureResidentChunks(),before);assert.equal(f.w.spatial_chunk_count(),count);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.body(1),body);
  assert.equal(f.w.nav_intent_residency_rejected(),1);assert(f.bridge.nativeRouteExecution(a));
  assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});

test('residency protects slope/vertex dependencies beyond the visible body footprint',()=>{
 const f=fixture();
 try{
  const {a,b}=crossing(f),origin={x:23,z:a.z},handle=f.worker(1,origin,b);start(f);
  assert(origin.x+.28<24,'physical disc is wholly in chunk zero');
  assert.equal(f.session.core.removeChunk(1,0),0,'neighboring slope/lattice data is still pinned');
  assert(f.session.core.hasResidentChunk(1,0));assert(f.bridge.nativeRouteExecution(handle));
  assert.equal(f.w.nav_intent_residency_revocations(),0);
 }finally{f.session.dispose();}
});

test('batch eviction validates every current dependency before retiring any future route or removing any chunk',()=>{
 const f=fixture();
 try{
  assert(f.session.core.addChunk(4,4)>=0);const {a,b}=crossing(f),handle=f.worker(1,a,b);start(f);
  const before=f.session.core.captureResidentChunks(),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.session.core.removeChunks([[1,0],[4,4],[0,0]]),0);
  assert.deepEqual(f.session.core.captureResidentChunks(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.session.core.hasResidentChunk(1,0));assert(f.session.core.hasResidentChunk(4,4));
  assert(f.bridge.nativeRouteExecution(handle));assert.equal(f.w.nav_intent_residency_revocations(),0);
 }finally{f.session.dispose();}
});

test('evicting future route data revokes only its dependent route and leaves unrelated motion alive',()=>{
 const f=fixture();
 try{
  const {a,b}=crossing(f),moving=f.worker(1,a,b),other=f.worker(4,f.point(-6,6),f.point(6,6));
  start(f);f.advance(11);const before=f.body(1),plan=f.bridge.nativeRouteTiming(other);
  assert.equal(f.session.core.removeChunk(1,0),1);
  const [event]=f.bridge.intentChanges();assert.deepEqual(event.revokedRouteHandle,moving);assert.equal(event.effectiveTime,11);
  assert.equal(f.bridge.nativeRouteExecution(moving),null);assert.equal(f.w.nav_intent_residency_revocations(),1);
  assert.equal(f.advance(12).status,'advanced');assert.deepEqual(f.body(1),before);
  assert.deepEqual(f.bridge.nativeRouteTiming(other),plan);assert(!f.session.core.hasResidentChunk(1,0));
 }finally{f.session.dispose();}
});

test('graphical release cannot revoke data reserved for a future route, including before execution starts',()=>{
 const f=fixture();
 try{
  const {a,b}=crossing(f),handle=f.worker(1,a,b),r=retention(f),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(r.service.releaseChunk(1,0),0);assert.deepEqual(r.released,[]);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteTiming(handle));
  assert(f.session.core.hasResidentChunk(1,0));start(f);assert.equal(f.advance(11).status,'advanced');
  assert.equal(r.service.setDemand([]),0);assert.equal(f.w.nav_intent_residency_revocations(),0);
  assert(f.bridge.nativeRouteExecution(handle));assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('an explicit authority eviction revokes a prepared lease rather than silently invalidating its future data',()=>{
 const f=fixture();
 try{
  const {a,b}=crossing(f),handle=f.worker(1,a,b);
  assert.equal(f.session.core.removeChunk(1,0),1);
  assert.deepEqual(f.bridge.intentChanges()[0].revokedRouteHandle,handle);
  assert.equal(f.bridge.nativeRouteTiming(handle),null);assert.equal(f.bridge.beginNativeRouteExecution().status,'inactive');
 }finally{f.session.dispose();}
});

test('native pin metadata defers resource release without rechecking footprints on quiet steps',()=>{
 const f=fixture();
 try{
  const {a,b}=crossing(f),handle=f.worker(1,{x:23,z:a.z},b),r=retention(f);start(f);
  assert.equal(r.service.releaseChunk(0,0),0);assert.deepEqual(r.released,[]);
  const rejected=f.w.nav_intent_residency_rejected(),checks=f.w.nav_intent_residency_body_checks(),
   pin=f.session.core.residencyPinRevision();
  for(let i=1;i<=100;i++){f.advance(10+i*.02);assert.equal(r.service.setDemand([]),0);}
  assert.equal(f.session.core.residencyPinRevision(),pin);assert.equal(f.w.nav_intent_residency_rejected(),rejected);
  assert.equal(f.w.nav_intent_residency_body_checks(),checks,'only metadata is observed, no periodic collision/route checks');
  f.advance(14);assert(f.session.core.residencyPinRevision()>pin);
  assert.equal(r.service.setDemand([]),1);assert.deepEqual(r.released,[[0,0]]);
  assert.equal(r.service.summary().retained,0);assert(!f.session.core.hasResidentChunk(0,0));
  assert.equal(f.advance(14.2).status,'advanced');assert(f.bridge.nativeRouteExecution(handle));
 }finally{f.session.dispose();}
});

test('a stopped native body keeps terrain pinned until the body is retired, not merely its route',()=>{
 const f=fixture();
 try{
  f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);const body=f.body(1),r=retention(f);
  assert.equal(f.advance(12).status,'inactive');assert.equal(r.service.releaseChunk(0,0),0);
  assert.deepEqual(r.released,[]);assert.equal(f.session.core.addWall(body.x,body.z,.2,.2),0,
   'ending a route must not disable physical ownership either');
  assert.equal(f.w.spatial_body_remove(1),1);
  assert.equal(r.service.setDemand([]),1);assert.deepEqual(r.released,[[0,0]]);
  assert(!f.session.core.hasResidentChunk(0,0));
 }finally{f.session.dispose();}
});

test('registered non-executing bodies participate in data pins and activity changes release their pin revision',()=>{
 const f=fixture();
 try{
  const {a,b}=crossing(f);f.worker(1,{x:28,z:a.z},b);start(f);
  const p=f.point(0,0);assert.equal(f.w.spatial_body_upsert(99,p.x,p.z,.28,0,1),1);
  const r=retention(f);assert.equal(r.service.releaseChunk(0,0),0);const pin=f.session.core.residencyPinRevision();
  assert.equal(f.w.spatial_body_upsert(99,p.x,p.z,.28,0,0),1);assert(f.session.core.residencyPinRevision()>pin);
  assert.equal(r.service.setDemand([]),1);assert.equal(f.advance(11).status,'advanced');
 }finally{f.session.dispose();}
});

test('returning graphical ownership drops a deferred request without reporting a native release',()=>{
 const f=fixture();
 try{
  f.worker(1,f.point(-6,0),f.point(6,0));start(f);
  const loaded=new Map(),released=[],service=createSpatialChunkRetention(f.session.core,{
   loaded:()=>loaded,desired:()=>new Map(),onRelease:(x,z)=>released.push([x,z])});
  assert.equal(service.releaseChunk(0,0),0);loaded.set('0,0',{});
  assert.equal(service.setDemand([]),0);assert.equal(service.summary().retained,0);
  assert.deepEqual(released,[]);assert(f.session.core.hasResidentChunk(0,0));
  loaded.clear();assert.equal(service.releaseChunk(0,0),0);assert.equal(service.summary().retained,1);
  f.w.spatial_bodies_reset();assert.equal(service.setDemand([]),1);assert.deepEqual(released,[[0,0]]);
 }finally{f.session.dispose();}
});

test('disposing graphical retention cannot remove the native terrain of a still-live body',()=>{
 const f=fixture();
 try{
  f.worker(1,f.point(-6,0),f.point(6,0));start(f);const r=retention(f);
  assert.equal(r.service.releaseChunk(0,0),0);r.service.dispose();r.service.dispose();
  assert.deepEqual(r.released,[]);assert(f.session.core.hasResidentChunk(0,0));
  assert.equal(f.advance(11).status,'advanced');f.w.spatial_bodies_reset();
  assert.equal(r.service.releaseChunk(0,0),1);assert.deepEqual(r.released,[[0,0]]);
 }finally{f.session.dispose();}
});

test('adding neighboring deterministic data preserves boundary samples and an already-proven native route',()=>{
 const f=fixture();
 try{
  const {a}=crossing(f);assert.equal(f.session.core.removeChunk(1,0),1);
  const origin={x:21.8,z:a.z},end={x:22,z:a.z},handle=f.worker(1,origin,end);start(f);
  const before=[-1,0,1].map(d=>f.w.spatial_surface(24,a.z+d)),plan=f.bridge.nativeRouteTiming(handle);
  assert(f.session.core.addChunk(1,0)>=0);
  assert.deepEqual([-1,0,1].map(d=>f.w.spatial_surface(24,a.z+d)),before);
  assert.deepEqual(f.bridge.nativeRouteTiming(handle),plan);assert.deepEqual(f.bridge.intentChanges(),[]);
  assert.equal(f.advance(10.1).status,'advanced');
 }finally{f.session.dispose();}
});

test('a rejected world replacement preserves the proof used by a residency transaction',()=>{
 const f=fixture();
 try{
  f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);const before=f.body(1),p=f.point(100,100);
  assert.throws(()=>f.session.core.generate(999,0,0,'desert'),/retire the authority/);
  assert.deepEqual(f.body(1),before);assert(f.session.core.addChunk(4,4)>=0);
  assert.equal(f.advance(12).status,'advanced');assert.equal(f.w.nav_intent_effective_time(),12);
 }finally{f.session.dispose();}
});

test('duplicates and absent eviction requests cannot corrupt publication counts or acknowledge extra revisions',()=>{
 const f=fixture();
 try{
  f.worker(1,f.point(-6,0),f.point(6,0));start(f);assert(f.session.core.addChunk(4,4)>=0);
  assert.equal(f.session.core.removeChunks([[4,4],[4,4],[8,8]]),1);
  assert.equal(f.session.core.removeChunks([[4,4],[8,8]]),0);
  assert(f.session.core.captureResidentChunks().keys.length>0);assert.equal(f.w.nav_intent_residency_commits(),2);
  assert.equal(f.advance(11).status,'advanced');
 }finally{f.session.dispose();}
});

test('real pthread publication extends the live cohort without inheriting a presentation clock',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');
 const runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});
 try{
  const handle=f.worker(1,f.point(-6,0),f.point(6,0));start(f);
  const id=await prepared(f.session.core,4,4);assert.equal(f.advance(11).status,'advanced');
  assert(f.session.core.preparation.publish(id,4,4)>0);assert.equal(f.session.core.preparation.release(),1);
  assert(f.session.core.hasResidentChunk(4,4));assert.equal(f.advance(12).status,'advanced');
  assert(f.bridge.nativeRouteExecution(handle));assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();await runtime.dispose();}
});

test('stale pthread results cannot publish or restamp residency after another authority transaction',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');
 const runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});
 try{
  f.worker(1,f.point(-6,0),f.point(6,0));start(f);
  const id=await prepared(f.session.core,4,4);assert(f.session.core.addChunk(5,5)>=0);
  const before=f.session.core.captureResidentChunks();
  assert.equal(f.session.core.preparation.publish(id,4,4),-2);assert.equal(f.session.core.preparation.release(),1);
  assert.deepEqual(f.session.core.captureResidentChunks(),before);assert(!f.session.core.hasResidentChunk(4,4));
  assert.equal(f.advance(11).status,'advanced');
 }finally{f.session.dispose();await runtime.dispose();}
});
