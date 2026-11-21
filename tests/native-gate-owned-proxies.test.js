import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';
import {spatialGateBarriers} from '../src/world/wild-engine/spatial-wall-bridge.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
async function fixture(material='zarzas',yaw=0,owned=true){let runtime,f;try{
 if(process.env.QA_GATE_PTHREAD){const {default:factory}=await import(pathToFileURL(resolve(process.env.QA_GATE_PTHREAD)).href);runtime=await createThreadedSpatialWorld(factory);}
 f=nativeGateCrossingFixture({materials:[material],yaw,install:false,core:runtime?.core??createSpatialWorld(module)});
 const gate={...f.gates[0],kind:'wall'},shapes=spatialGateBarriers(gate),ids=owned?f.session.core.addBarriersBatch(shapes):null;
 return {...f,gate,shapes,ids,install:values=>f.service.installMechanism(gate.id,gate.material,{navigationBarriers:values??ids}),async close(){f.session.dispose();await runtime?.dispose();}};
 }catch(e){f?.session.dispose();await runtime?.dispose();throw e;}}
for(const material of ['zarzas','empalizada','reforzado'])for(const yaw of [0,.73])test(`canonical own proxies retain navigation and permit ${material} mechanism (${yaw})`,async()=>{
 const f=await fixture(material,yaw);try{
  assert.equal(f.service.installMechanism(f.gate.id,material).status,'blocked','without ownership the existing proof correctly rejects self intersection');
  assert.equal(f.install().status,'installed');assert(f.service.staticObjectsCertified(f.gate.id));assert(f.bridge.nativeGateMechanismPose(f.gate.id));
  const left=f.shapes[0],far=f.point(0,-6);assert.equal(f.w.spatial_body_upsert(1,far.x,far.z,.28,0,1),1);
  assert.equal(f.w.nav_gate_mechanism_segment(Number(f.gate.id.split('-').at(-1)),1,left.x,left.z,left.x,left.z),0,'the acquired physical frame still blocks a body');
  assert.throws(()=>f.session.core.applyBarrierChanges([f.ids[0]],[]),/Invalid spatial topology transaction; no barrier was changed/,'owned proxy cannot be retired beneath a live mechanism');
 }finally{await f.close();}
});
for(const invalid of ['duplicate','neighbour','swapped'])test(`a ${invalid} proxy identity cannot grant ownership`,async()=>{
 const f=await fixture();try{let ids=[...f.ids];if(invalid==='duplicate')ids[1]=ids[0];if(invalid==='swapped')[ids[0],ids[1]]=[ids[1],ids[0]];if(invalid==='neighbour')ids[0]=f.session.core.addBarriersBatch([{...f.shapes[0],x:f.shapes[0].x+.15}])[0];
  if(invalid==='duplicate')assert.throws(()=>f.install(ids),/identities/);else assert.equal(f.install(ids).status,'invalid');assert.equal(f.bridge.nativeGateMechanismPose(f.gate.id),null);
 }finally{await f.close();}
});
test('a neighbouring obstruction still rejects installation with correct own IDs',async()=>{const f=await fixture();try{f.session.core.addBarriersBatch([{...f.shapes[0],x:f.shapes[0].x+.02}]);assert.equal(f.install().status,'blocked');assert.equal(f.bridge.nativeGateMechanismPose(f.gate.id),null);}finally{await f.close();}});
test('ownership cannot be attached after the causal clock is published',async()=>{const f=await fixture();try{f.bridge.commitNativeCausalClock();assert.equal(f.install().status,'invalid');assert.equal(f.bridge.nativeGateMechanismPose(f.gate.id),null);}finally{await f.close();}});
test('a removal batch is rejected atomically while an owned proxy remains live',async()=>{const f=await fixture();try{
 const loose=f.session.core.addBarriersBatch([{...f.shapes[0],x:f.shapes[0].x+12}])[0];assert.equal(f.install().status,'installed');
 assert.throws(()=>f.session.core.applyBarrierChanges([loose,f.ids[0]],[]),/Invalid spatial topology transaction; no barrier was changed/);
 assert.equal(f.w.spatial_remove_barrier(loose),1,'earlier unrelated removal was not partially committed');assert.equal(f.w.spatial_remove_barrier(f.ids[0]),0);
 assert(f.bridge.nativeGateMechanismPose(f.gate.id));assert(f.service.remove(f.gate.id));assert.equal(f.w.spatial_remove_barrier(f.ids[0]),1,'retirement succeeds only after its mechanism is removed');
}finally{await f.close();}});
test('unintegrated component gate still cannot grant ordinary Game execution',async()=>{const f=await fixture('zarzas',0,false);try{assert.equal(f.install().status,'installed');f.bridge.commitNativeCausalClock();assert.equal(f.w.nav_intent_game_execution_state(),-1);}finally{await f.close();}});

function routePoints(f,from,to){
 const count=f.w.spatial_world_route_cached(from.x,from.z,to.x,to.z);
 assert(count>0,`native route outcome ${count}`);
 return Array.from(new Float32Array(f.w.memory.buffer,f.w.spatial_world_route_ptr(),count*2));
}

for(const direction of [-1,1])test(`a centered zarzas route uses the registered aperture in direction ${direction}`,async()=>{
 const f=await fixture();
 try{
  f.session.actorSectorRevision({worker:true});
  f.session.core.setWorkerGatePortals([f.gate]);
  const from=[0,3.6*direction],to=[0,-5*direction];
  const origin=f.point(...from),destination=f.point(...to),gateOrigin=f.point(0,0);
  const centerline=routePoints(f,origin,destination),misses=f.w.spatial_route_cache_misses();
  assert.deepEqual(routePoints(f,origin,destination),centerline);
  assert.equal(f.w.spatial_route_cache_misses(),misses);
  assert.equal(f.install().status,'installed');

  const aperture=routePoints(f,origin,destination);
  assert(f.w.spatial_route_cache_misses()>misses);
  assert.notDeepEqual(aperture,centerline);
  const localPoints=[];
  for(let i=0;i<aperture.length;i+=2)localPoints.push([aperture[i]-gateOrigin.x,aperture[i+1]-gateOrigin.z]);
  for(const {x,z} of gatePortalPoints(f.gate)){
   assert(aperture.some((value,index)=>index%2===0&&value===Math.fround(x)&&aperture[index+1]===Math.fround(z)));
  }
  const admitted=f.admit(f.route({origin:from,points:localPoints}));
  assert.equal(admitted.status,'admitted');
  assert.deepEqual(Array.from(admitted.motionPlan.points),aperture);
  assert.equal(admitted.motionPlan.holds.length,1);
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  assert.equal(f.advance(admitted.motionPlan.endTime).status,'advanced');
  assert.equal(f.bridge.nativeRouteExecution(admitted.routeHandle).arrived,true);
 }finally{await f.close();}
});

test('restoration rejects an explicit centered path that clips the open leaf',async()=>{
 const f=await fixture();
 try{
  f.session.actorSectorRevision({worker:true});
  f.session.core.setWorkerGatePortals([f.gate]);
  assert.equal(f.install().status,'installed');
  const motor=f.service.read(f.gate.id);
  const transition=f.w.nav_intent_transition_sequence();
  const from=f.point(0,3.6),to=f.point(0,-5);
  const pointer=f.w.nav_intent_attack_route_input_ptr(1);
  new Float32Array(f.w.memory.buffer,pointer,2).set([to.x,to.z]);
  assert.equal(f.w.nav_intent_restore_home(900011,from.x,from.z,to.x,to.z,1),0);
  assert.equal(f.w.nav_intent_transition_sequence(),transition);
  assert.deepEqual(f.service.read(f.gate.id),motor);
  assert.equal(f.w.nav_intent_route_reservation_count(),0);
 }finally{await f.close();}
});

test('an unrelated route keeps its path and cache hits after the mechanism is installed',async()=>{
 const f=await fixture();
 try{
  f.session.actorSectorRevision({worker:true});
  f.session.core.setWorkerGatePortals([f.gate]);
  const from=f.point(4,-5),to=f.point(4,5),before=routePoints(f,from,to);
  assert.equal(f.install().status,'installed');
  assert.deepEqual(routePoints(f,from,to),before);
  const misses=f.w.spatial_route_cache_misses(),hits=Number(f.w.spatial_route_cache_hits());
  assert.deepEqual(routePoints(f,from,to),before);
  assert.equal(f.w.spatial_route_cache_misses(),misses);
  assert.equal(Number(f.w.spatial_route_cache_hits()),hits+1);
 }finally{await f.close();}
});
