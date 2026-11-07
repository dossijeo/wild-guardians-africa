import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

// A candidate may be tested before replacing the product WASM. Once the
// native export is shipped, the same checks run against the default binary.
const path=process.env.WILD_ENGINE_FAR_VISUAL_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url);
const module=new WebAssembly.Module(readFileSync(path));
const shipped=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const available=WebAssembly.Module.exports(module).some(entry=>entry.name==='spatial_far_query_chunk');

test('far query matches native chunk generation without changing the selected world', {skip:!available},()=>{
 for(const biome of ['savanna','desert','grand_river','volcanoes','mangrove','canyons']){
  const core=createSpatialWorld(module),reference=createSpatialWorld(shipped);
  core.generate(712,0,0,biome,biome==='mangrove'?{mangroveNetwork:true}:{});
  reference.generate(712,0,0,biome,biome==='mangrove'?{mangroveNetwork:true}:{});
  core.addChunk(1,0);core.selectChunk(0,0);
  core.buildNavigation(.28,true);const selected=structuredClone(core.currentChunk()),resident=structuredClone(core.captureResidentChunks()),state=structuredClone(core.snapshot()),payload=core.chunkPayload(),navRevision=core.wasm.lazy_route_revision(),navProbe=core.routeWorld({x:0,z:0},{x:4,z:4});
  const expectedRevision=core.wasm.spatial_far_world_revision();
  for(const [cx,cz] of [[0,0],[1,0],[-3,2],[4,-2]]){
   if(reference.selectChunk(cx,cz)<0)reference.addChunk(cx,cz);
   const expected=reference.instances().map((items,slot)=>slot<4?items:[]),actual=core.queryFarVisualChunk(cx,cz,{expectedRevision});
   assert.deepEqual(actual,{cx,cz,revision:expectedRevision,instances:expected},`${biome} ${cx},${cz}`);
  }
  assert.deepEqual(core.currentChunk(),selected);assert.deepEqual(core.captureResidentChunks(),resident);assert.deepEqual(core.snapshot(),state);
  assert.deepEqual(core.chunkPayload(),payload);assert.equal(core.wasm.spatial_far_world_revision(),expectedRevision);assert.equal(core.wasm.lazy_route_revision(),navRevision);assert.deepEqual(core.routeWorld({x:0,z:0},{x:4,z:4}),navProbe);
  assert.equal(core.wasm.spatial_far_query_chunk(0,0,0),-1);assert.deepEqual(core.chunkPayload(),payload);assert.equal(core.wasm.lazy_route_revision(),navRevision);
  assert.equal(core.queryFarVisualChunk(0,0,{expectedRevision:expectedRevision+1}),null);
  assert.throws(()=>core.queryFarVisualChunk(1000001,0),/Invalid far visual query/);
 }
});

test('far query revisions invalidate old results after a confirmed spatial change', {skip:!available},()=>{
 const core=createSpatialWorld(module);core.generate(712,0,0,'savanna');
 const first=core.queryFarVisualChunk(0,0),item=first.instances.flat().find(Boolean);assert.ok(item);
 const [,group,gx,gz]=item.id.split(':');assert.equal(core.removeProp({group:Number(group),gx:Number(gx),gz:Number(gz)}),1);
 assert.equal(core.queryFarVisualChunk(0,0,{expectedRevision:first.revision}),null);
 const next=core.queryFarVisualChunk(0,0);assert.ok(next.revision>first.revision);assert.ok(!next.instances.flat().some(value=>value.id===item.id));
});

test('far queries follow settlement changes and restored mangrove layouts', {skip:!available},()=>{
 for(const options of [{mangroveChannels:true},{mangroveNetwork:true}]){
  const core=createSpatialWorld(module),reference=createSpatialWorld(shipped);core.generate(712,0,0,'mangrove',options);reference.generate(712,0,0,'mangrove',options);
  const first=core.queryFarVisualChunk(2,2);core.addSettlement(96,96,10,8);reference.addSettlement(96,96,10,8);
  assert.equal(core.queryFarVisualChunk(2,2,{expectedRevision:first.revision}),null);
  reference.addChunk(2,2);const next=core.queryFarVisualChunk(2,2);assert.deepEqual(next.instances,reference.instances().map((items,slot)=>slot<4?items:[]));
  const restored=createSpatialWorld(module);restored.restoreState(core.snapshot());const rebuilt=restored.queryFarVisualChunk(2,2);assert.deepEqual(rebuilt.instances,next.instances);
 }
});

test('authority exposes far props only at the requested confirmed sequence', {skip:!available},()=>{
 const snapshot=gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString(),authority=createSimulationAuthority(module,snapshot,['0,0']),reference=createSimulationAuthority(module,snapshot,['0,0']);
 try{
  const first=authority.queryFarVisualChunk({cx:4,cz:-2,expectedSequence:0});assert.equal(first.sequence,0);assert.ok(Number.isSafeInteger(first.revision));
  assert.equal(authority.queryFarVisualChunk({cx:4,cz:-2,expectedSequence:1}),null);
  const actual=authority.execute({kind:'snapshot',sequence:1}),expected=reference.execute({kind:'snapshot',sequence:1});assert.equal(actual.snapshot,expected.snapshot);assert.deepEqual(actual.events,expected.events);assert.deepEqual(actual.residency,expected.residency);
  assert.equal(authority.queryFarVisualChunk({cx:4,cz:-2,expectedSequence:0}),null);
  const next=authority.queryFarVisualChunk({cx:4,cz:-2,expectedSequence:1,expectedRevision:first.revision});assert.equal(next.sequence,1);assert.deepEqual(next.instances,first.instances);
 }finally{authority.dispose();reference.dispose();}
});

test('threaded preparation remains publishable while far props are queried', {skip:!process.env.WILD_ENGINE_FAR_VISUAL_THREADED},async()=>{
 const {default:factory}=await import(pathToFileURL(resolve(process.env.WILD_ENGINE_FAR_VISUAL_THREADED)).href),handle=await createThreadedSpatialWorld(factory),core=handle.core;
 try{
  core.generate(712,0,0,'mangrove',{mangroveNetwork:true});const before=structuredClone(core.captureResidentChunks()),job=core.preparation.start(1,0);assert.ok(job>0);
  const result=core.queryFarVisualChunk(2,2);assert.ok(Number.isSafeInteger(result.revision));assert.deepEqual(core.captureResidentChunks(),before);
  const started=performance.now();while(core.preparation.status()!==3){assert.ok(performance.now()-started<15000);await new Promise(resolve=>setTimeout(resolve,1));}
  assert.ok(core.preparation.publish(job,1,0)>0);core.preparation.release();assert.ok(core.selectChunk(1,0)>=0);
 }finally{await handle.dispose();}
});
