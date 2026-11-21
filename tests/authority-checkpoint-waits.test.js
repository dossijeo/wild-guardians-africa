import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

test('checkpoint-only raid waits leave simulation and saved bindings unchanged',async()=>{
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),opening=await createSpatialCampaignOpening({seed:716,biome:'sabana',culture:'suajili',slotId:'checkpoint-waits'});opening.state.time=400;opening.state.elapsed=400;opening.state.initialPreparation=false;opening.state.nightPlan={at:400,done:false,group:['warthog']};const snapshot=serialize(opening.state),keys=[...opening.loaded.keys()],reference=createSimulationAuthority(module,snapshot,keys),projected=createSimulationAuthority(module,snapshot,keys,{checkpointRaidWaitsOnly:true});
 try{let last;for(let sequence=1;sequence<=22;sequence++){const command=sequence===1||sequence===22?{kind:'snapshot',sequence}:{kind:'advance',sequence,seconds:.05,nightFastForward:true},a=reference.execute(command),b=projected.execute(command);assert.equal(b.snapshot,a.snapshot);assert.deepEqual(b.events,a.events);assert.equal(b.elapsed,a.elapsed);if(command.kind==='snapshot')assert.deepEqual(b.raidWaitBindings,a.raidWaitBindings);else assert.equal(Object.hasOwn(b,'raidWaitBindings'),false);last=b;}assert.ok(JSON.parse(last.snapshot).raid?.animals?.length);}
 finally{reference.dispose();projected.dispose();opening.session.dispose();}
});
