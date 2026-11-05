import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createPresentationWorkerHeadings} from '../src/simulation/presentation-worker-headings.js';

test('real Wild Engine authority publishes presentation yaw without changing game state',()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),workers=state.workers.filter(w=>w.status!=='home').slice(0,3);assert.ok(workers.length);const seed=workers.map((worker,index)=>({id:worker.id,yaw:.31+index})),wasm=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),snapshot=serialize(state),keys=['0,0'],reference=createSimulationAuthority(wasm,snapshot,keys),tracked=createSimulationAuthority(wasm,snapshot,keys,{presentationWorkerHeadingSeed:seed});
 try{const a=reference.execute({kind:'snapshot',sequence:1}),b=tracked.execute({kind:'snapshot',sequence:1}),expected=createPresentationWorkerHeadings(seed).capture(state);assert.equal(b.snapshot,a.snapshot);assert.deepEqual(b.events,a.events);assert.deepEqual(b.residency,a.residency);assert.deepEqual(b.presentationWorkerHeadings??[],expected);assert.equal(a.presentationWorkerHeadings,undefined);}
 finally{reference.dispose();tracked.dispose();}
});
