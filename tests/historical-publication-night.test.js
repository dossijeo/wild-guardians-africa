import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {HISTORICAL_MAX_REAL_DURATION} from '../src/simulation/historical-publication-limits.js';

test('real authority keeps two-step real horizon through night fast-forward transition',async()=>{
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'historical-horizon'});
 opening.state.time=299.99;opening.state.elapsed=299.99;
 const authority=createSimulationAuthority(module,serialize(opening.state),[...opening.loaded.keys()]);
 try{const p=authority.execute({kind:'advance',sequence:1,seconds:.05,steps:2,nightFastForward:true,captureClockSegments:true});
  assert.equal(p.stepsExecuted,2);assert.equal(p.clockSegments.complete,true);assert.deepEqual(p.clockSegments.segments.map(s=>s.rate),[1,5]);
  assert.ok(p.clockSegments.segments.reduce((sum,s)=>sum+s.realDuration,0)<=HISTORICAL_MAX_REAL_DURATION+1e-9);
 }finally{authority.dispose();opening.session.dispose();}
});
