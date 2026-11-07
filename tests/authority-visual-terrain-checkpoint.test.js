import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
test('visual checkpoint captures native resident chunks at the ordered state boundary',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'terrain-checkpoint'}),state=opening.state,keys=[...opening.loaded.keys()],authority=createSimulationAuthority(module,serialize(state),keys);
 try{
  const first=authority.execute({kind:'snapshot',sequence:1,visualTerrain:true});
  assert.equal(first.terrainCheckpoint.sequence,first.sequence);assert.deepEqual(first.terrainCheckpoint.chunks.map(c=>`${c.cx},${c.cz}`),keys);
  const second=authority.execute({kind:'snapshot',sequence:2,visualTerrain:true});assert.equal(second.terrainCheckpoint.sequence,2);assert.equal(second.snapshot,first.snapshot);
  for(let i=0;i<keys.length;i++){const a=first.terrainCheckpoint.chunks[i],b=second.terrainCheckpoint.chunks[i];assert.deepEqual(a.terrain.positions,b.terrain.positions);assert.deepEqual(a.terrain.colors,b.terrain.colors);assert.deepEqual(a.groundMask,b.groundMask);assert.deepEqual(a.instances,b.instances);}
  const renewal=authority.execute({kind:'snapshot',sequence:3,visualTerrain:true,visualRecoveryOnly:true});assert.equal(renewal.terrainCheckpoint.recoveryOnly,true);assert.deepEqual(renewal.terrainCheckpoint.chunks.map(c=>`${c.cx},${c.cz}`),keys);assert.equal(renewal.snapshot,first.snapshot);assert.equal(first.terrainCheckpoint.recoveryOnly,undefined);
 }finally{authority.dispose();opening.session.dispose();}
});
test('terrain change metadata follows native chunk callbacks and survives failed commands',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'terrain-boundary'}),keys=[...opening.loaded.keys()],received=[];
 const authority=createSimulationAuthority(module,serialize(opening.state),keys,{compactViewAcks:true,onTerrainChunk:chunk=>received.push(`${chunk.cx},${chunk.cz}`)});
 try{
  const initial=received.length;assert.equal(authority.execute({kind:'snapshot',sequence:1}).terrainChanged,false);assert.equal(received.length,initial);
  const key=Array.from({length:31},(_,i)=>`${i-15},0`).find(candidate=>!keys.includes(candidate));assert.ok(key);
  const added=authority.execute({kind:'addChunk',sequence:2,key});assert.equal(added.terrainChanged,true);assert.ok(received.includes(key));
  assert.equal(authority.execute({kind:'addChunk',sequence:3,key}).terrainChanged,false);
  const view=authority.execute({kind:'setNavigationView',sequence:4,view:{bounds:[-100,-100,100,100],eye:{x:0,z:0},target:{x:0,z:0}}});assert.equal(view.unchanged,true);assert.equal(view.terrainChanged,false);
  assert.throws(()=>authority.execute({kind:'not-a-command',sequence:5}),/Unknown simulation command/);
  assert.equal(authority.execute({kind:'snapshot',sequence:5}).terrainChanged,false);
 }finally{authority.dispose();opening.session.dispose();}
});
test('a chunk callback before a failed command remains a barrier until a successful publication',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'terrain-failure-boundary'}),keys=[...opening.loaded.keys()];let fail=false;
 const authority=createSimulationAuthority(module,serialize(opening.state),keys,{onTerrainChunk:()=>{if(fail)throw Error('chunk callback failed');}});
 try{
  assert.equal(authority.execute({kind:'snapshot',sequence:1}).terrainChanged,false);
  const key=Array.from({length:31},(_,i)=>`${i-15},0`).find(candidate=>!keys.includes(candidate));assert.ok(key);fail=true;
  assert.throws(()=>authority.execute({kind:'addChunk',sequence:2,key}),/chunk callback failed/);fail=false;
  assert.equal(authority.execute({kind:'snapshot',sequence:2}).terrainChanged,true);assert.equal(authority.execute({kind:'snapshot',sequence:3}).terrainChanged,false);
 }finally{authority.dispose();opening.session.dispose();}
});
