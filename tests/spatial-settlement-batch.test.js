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
 const handle=await createThreadedSpatialWorld(factory),c=handle.core;
 const waitReady=async()=>{const start=performance.now();while(c.preparation.status()!==3){assert(performance.now()-start<15000);await new Promise(r=>setTimeout(r,1));}};
 try{
  c.generate(4096,1,0,'mangrove',{mangroveNetwork:true});
  const old=c.preparation.start(2,0);assert(old>0);c.applySettlements(sites);await waitReady();
  assert(c.preparation.publish(old,2,0)<=0);c.preparation.release();
  const current=c.preparation.start(2,0);assert(current>0);await waitReady();assert(c.preparation.publish(current,2,0)>0);c.preparation.release();
  const expected=world();expected.applySettlements(sites);expected.selectChunk(2,0);c.selectChunk(2,0);
  assert.deepEqual(c.chunkPayload().water,expected.chunkPayload().water);
  assert.deepEqual(c.chunkPayload().terrain.positions,expected.chunkPayload().terrain.positions);
 }finally{await handle.dispose();}
});
