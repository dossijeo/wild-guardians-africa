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
 }finally{authority.dispose();opening.session.dispose();}
});
