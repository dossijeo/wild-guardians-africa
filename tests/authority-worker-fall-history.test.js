import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {confirmedHistoricalParticipant} from '../src/rendering/confirmed-historical-participant.js';

test('real WASM fall tick capture preserves the authoritative outcome',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString()),worker=state.workers[0];worker.fallRemaining=1;worker.incapacitated=true;worker.status='incapacitated';worker.downHeading=worker.heading??0;worker.path=null;const snapshot=serialize(state),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const observed=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),baseline=createSimulationAuthority(module,snapshot,keys);
 try{const previous=JSON.parse(observed.execute({kind:'snapshot',sequence:1}).snapshot);baseline.execute({kind:'snapshot',sequence:1});const cmd={kind:'advance',sequence:2,seconds:.05,steps:1,nightFastForward:false,captureClockSegments:true},a=observed.execute(cmd),b=baseline.execute(cmd),next=JSON.parse(a.snapshot);assert.equal(a.snapshot,b.snapshot);assert.deepEqual(a.events,b.events);const entity=previous.workers.find(item=>item.id===worker.id),preview={start:previous.elapsed,end:next.elapsed,clockSegments:a.clockSegments,trace:a.worldMotionTrace};assert.equal(confirmedHistoricalParticipant(preview,entity.id,entity,'worker',previous.tasks),'stationary');const samples=a.worldMotionTrace.actorTickStates.actors.find(item=>item.actorId===entity.id).samples;assert.ok(samples.at(-1).fallRemaining<samples[0].fallRemaining);samples.at(-1).fallRemaining=0;assert.equal(confirmedHistoricalParticipant(preview,entity.id,entity,'worker',previous.tasks),null);}finally{observed.dispose();baseline.dispose();}
});
