import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';
import {spatialGateBarriers} from '../src/world/wild-engine/spatial-wall-bridge.js';
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
