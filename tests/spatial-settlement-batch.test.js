import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const sites=[{x:48,z:-2,hx:5,hz:4},{x:58,z:7,hx:4,hz:3},{x:83,z:0,hx:5,hz:5}];
function world(){const c=createSpatialWorld(module);c.generate(4096,1,0,'mangrove',{mangroveNetwork:true});c.addChunk(2,0);return c;}
test('batch matches individual settlement geometry and authority across adjacent chunks',()=>{
 const a=world(),b=world();for(const s of sites)a.addSettlement(s.x,s.z,s.hx,s.hz);
 assert.equal(b.applySettlements(sites),sites.length);
 assert.deepEqual(b.terrainState(),a.terrainState());
 for(const [x,z]of [[1,0],[2,0]]){a.selectChunk(x,z);b.selectChunk(x,z);assert.deepEqual(b.chunkPayload(),a.chunkPayload());}
 for(let z=-40;z<=40;z+=3)for(let x=0;x<120;x+=3){assert.equal(b.wetlandMaskAnywhere(x,z),a.wetlandMaskAnywhere(x,z));assert.equal(b.surfaceAnywhere(x,z),a.surfaceAnywhere(x,z));}
});
test('replacement removes old reservation and invalid batches leave the world unchanged',()=>{
 const a=world(),b=world();a.applySettlements(sites);a.applySettlements([sites[2]],{replace:true});b.setSettlement(...Object.values(sites[2]));
 assert.deepEqual(a.terrainState(),b.terrainState());const before=a.terrainState();
 assert.throws(()=>a.applySettlements([sites[0],{...sites[1],hx:-1}]));assert.deepEqual(a.terrainState(),before);
 assert.throws(()=>a.applySettlements([{...sites[0],x:Infinity}]));assert.deepEqual(a.terrainState(),before);
 a.applySettlements([],{replace:true});const pristine=world();assert.deepEqual(a.terrainState(),pristine.terrainState());
});

test('pthread jobs started before a reservation batch cannot publish stale terrain',async()=>{
 const {createThreadedSpatialWorld}=await import('../src/world/wild-engine/spatial-thread-runtime.js');
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');
 const narrowSites=sites.map(s=>({...s,waterFalloff:1}));
 const handle=await createThreadedSpatialWorld(factory),c=handle.core;
 const waitReady=async()=>{const start=performance.now();while(c.preparation.status()!==3){assert(performance.now()-start<15000);await new Promise(r=>setTimeout(r,1));}};
 try{
  c.generate(4096,1,0,'mangrove',{mangroveNetwork:true});
  const old=c.preparation.start(2,0);assert(old>0);c.applySettlements(narrowSites);await waitReady();
  assert(c.preparation.publish(old,2,0)<=0);c.preparation.release();
  const current=c.preparation.start(2,0);assert(current>0);await waitReady();assert(c.preparation.publish(current,2,0)>0);c.preparation.release();
  const expected=world();expected.applySettlements(narrowSites);expected.selectChunk(2,0);c.selectChunk(2,0);
  assert.deepEqual(c.chunkPayload().water,expected.chunkPayload().water);
  assert.deepEqual(c.chunkPayload().terrain.positions,expected.chunkPayload().terrain.positions);
 }finally{await handle.dispose();}
});

test('narrow hydraulic falloff preserves center support and survives native and far snapshots',async()=>{
 const {createFarSpatialReplica}=await import('../src/rendering/spatial-far-data.js');
 const c=world(),old=world(),site={x:83,z:0,hx:5.405,hz:3.3734,waterFalloff:1};
 c.applySettlements([site]);old.addSettlement(site.x,site.z,site.hx,site.hz);
 assert(c.wetlandMaskAnywhere(89.6,4.56)>.61);assert(old.wetlandMaskAnywhere(89.6,4.56)<.61);
 assert.equal(c.wetlandMaskAnywhere(83,0),0);assert.equal(c.surfaceAnywhere(83,0),old.surfaceAnywhere(83,0));
 const snapshot=c.snapshot(),terrain=c.terrainState();assert.equal(snapshot.version,6);assert.equal(terrain.version,2);
 const {validateSpatialState,validateSpatialTerrainState}=await import('../src/world/wild-engine/spatial-state.js');
 assert.throws(()=>validateSpatialState({...snapshot,version:5}));assert.throws(()=>validateSpatialTerrainState({...terrain,version:1}));
 assert.throws(()=>validateSpatialTerrainState({...terrain,settlements:[{...site,waterFalloff:7}]}));
 const restored=createSpatialWorld(module);restored.restoreState(snapshot);const far=createFarSpatialReplica(module,terrain);
 for(let z=-15;z<15;z+=.7)for(let x=72;x<96;x+=.7){assert.equal(restored.wetlandMaskAnywhere(x,z),c.wetlandMaskAnywhere(x,z));assert.equal(far.wetlandMaskAnywhere(x,z),c.wetlandMaskAnywhere(x,z));}
 assert.throws(()=>c.applySettlements([{...site,waterFalloff:0}]));assert.deepEqual(c.snapshot(),snapshot);
});
