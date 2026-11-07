import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {validateConfirmedMotion} from '../src/rendering/confirmed-motion-validation.js';
import {confirmedHistoricalParticipant} from '../src/rendering/confirmed-historical-participant.js';
import {confirmedWorkerFleeIdleSamples,confirmedWorkerRunningSamples} from '../src/rendering/confirmed-animation-samples.js';

test('native incapacitated return preserves authority and certifies only sampled motion',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 const initial=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString()),worker=initial.workers[0],village=initial.villages.find(v=>v.id===worker.villageId);assert.ok(village);
 const home=village.entry??village;Object.assign(initial,{raid:null,time:100,nightPlan:null,dayPlan:null,initialPreparation:false,workers:[worker],tasks:[]});Object.assign(worker,{x:home.x+12,z:home.z+10,status:'incapacitated',incapacitated:true,running:false,taskId:null,path:null,fallRemaining:0,recovery:null,recoveryExitRemaining:0,contractDay:initial.day});
 const snapshot=serialize(initial),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),reference=createSimulationAuthority(module,snapshot,keys);let before=deserializeConfirmedState(snapshot),admitted=false;
 try{for(let sequence=1;sequence<=30&&!admitted;sequence++){
  const command={kind:'advance',sequence,seconds:.05,steps:2,nightFastForward:false,captureClockSegments:true},observed=authority.execute(command),control=reference.execute(command),after=deserializeConfirmedState(observed.snapshot);assert.equal(observed.snapshot,control.snapshot);assert.deepEqual(observed.events,control.events);validateConfirmedMotion(observed,after,before.elapsed,before);
  const preview={start:before.elapsed,end:after.elapsed,trace:observed.worldMotionTrace,clockSegments:observed.clockSegments},entity=before.workers[0],participant=confirmedHistoricalParticipant(preview,worker.id,entity,'worker',before.tasks);
  if(sequence===1){assert.equal(entity.running,false);assert.equal(after.workers[0].running,true);assert.equal(participant,null,'the start transition is not extrapolated');}if(participant==='moving'&&!observed.events.length){const phases=entity.running?confirmedWorkerRunningSamples(preview,worker.id,entity):confirmedWorkerFleeIdleSamples(preview,worker.id,entity);assert.ok(phases);assert.equal(phases[0].at,before.elapsed);assert.equal(phases.at(-1).at,after.elapsed);if(entity.running){assert.equal(phases[0].phase,entity.runPhase);assert.equal(phases.at(-1).phase,after.workers[0].runPhase);}admitted=true;}before=after;
 }assert.equal(admitted,true,'observed an uninterrupted native incapacitated return');}finally{authority.dispose();reference.dispose();}
});

