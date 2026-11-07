import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {validateConfirmedMotion} from '../src/rendering/confirmed-motion-validation.js';
import {confirmedHistoricalParticipant} from '../src/rendering/confirmed-historical-participant.js';

test('real native idle samples retain rest phase and leave gameplay unchanged',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 const initial=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString()),worker=initial.workers[0],center=initial.structures.find(s=>s.id===worker.centerId);assert.ok(center);
 Object.assign(initial,{raid:null,time:100,nightPlan:null,dayPlan:null,initialPreparation:false,workers:[worker],tasks:[]});Object.assign(worker,{x:center.x,z:center.z,status:'idle',taskId:null,path:null,idleState:null,contractDay:initial.day});for(const crop of initial.plants)crop.alive=false;
 const snapshot=serialize(initial),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),reference=createSimulationAuthority(module,snapshot,keys);let before=deserializeConfirmedState(snapshot),admitted=false;
 try{for(let sequence=1;sequence<=6&&!admitted;sequence++){
  const command={kind:'advance',sequence,seconds:.05,steps:2,nightFastForward:false,captureClockSegments:true},observed=authority.execute(command),control=reference.execute(command),after=deserializeConfirmedState(observed.snapshot);assert.equal(observed.snapshot,control.snapshot);assert.deepEqual(observed.events,control.events);validateConfirmedMotion(observed,after,before.elapsed,before);
  const preview={start:before.elapsed,end:after.elapsed,trace:observed.worldMotionTrace,clockSegments:observed.clockSegments},record=observed.worldMotionTrace.actorTickStates.actors.find(actor=>actor.actorId===worker.id),samples=record.samples;
  if(before.workers[0].idleState?.mode==='rest'&&samples.every(sample=>sample.status==='idle'&&sample.idleMode==='rest')&&!observed.events.length){assert.equal(confirmedHistoricalParticipant(preview,worker.id,before.workers[0],'worker',before.tasks),'stationary');assert.equal(samples[0].idleElapsed,before.workers[0].idleState.elapsed);assert.ok(samples.at(-1).idleElapsed>samples[0].idleElapsed);assert.equal(samples.at(-1).idleElapsed,after.workers[0].idleState.elapsed);admitted=true;}before=after;
 }assert.equal(admitted,true,'event-free rest with advancing sampled phase was observed');}finally{authority.dispose();reference.dispose();}
});
