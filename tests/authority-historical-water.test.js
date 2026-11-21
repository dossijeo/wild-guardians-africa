import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {validateConfirmedMotion} from '../src/rendering/confirmed-motion-validation.js';
import {confirmedHistoricalParticipant} from '../src/rendering/confirmed-historical-participant.js';

// Real WASM authority over a saved campaign; the watering task is arranged so
// the test observes both an action-only publication and WaterSatisfied completion.
test('native watering preserves task until authoritative completion',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 const initial=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString());
 const task=initial.tasks.find(t=>t.kind==='water'&&initial.plants.some(p=>p.id===t.targetId&&p.alive)),plant=initial.plants.find(p=>p.id===task?.targetId),worker=initial.workers[0];assert.ok(task&&plant&&worker);
 Object.assign(initial,{raid:null,time:100,nightPlan:null,dayPlan:null,initialPreparation:false,workers:[worker],tasks:[task]});Object.assign(worker,{x:plant.x+.6,z:plant.z,status:'acting',taskId:task.id,actionRemaining:.16,path:null,contractDay:initial.day,idleState:null});task.workerId=worker.id;for(const crop of initial.plants)if(crop.alive&&crop!==plant){crop.growth=1e6;crop.harvestRequested=true;}
 const snapshot=serialize(initial),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),reference=createSimulationAuthority(module,snapshot,keys);let before=deserializeConfirmedState(snapshot),completion=false,admitted=false;
 try{for(let sequence=1;sequence<=4&&!completion;sequence++){
  const command={kind:'advance',sequence,seconds:.05,steps:2,nightFastForward:false,captureClockSegments:true},observed=authority.execute(command),control=reference.execute(command),after=deserializeConfirmedState(observed.snapshot);
  assert.equal(observed.snapshot,control.snapshot);assert.deepEqual(observed.events,control.events);validateConfirmedMotion(observed,after,before.elapsed,before);
  const preview={start:before.elapsed,end:after.elapsed,trace:observed.worldMotionTrace,clockSegments:observed.clockSegments},record=observed.worldMotionTrace.actorTickStates.actors.find(actor=>actor.actorId===worker.id),samples=record.samples;
  assert.equal(observed.worldMotionTrace.actorTickStates.complete,true);
  if(observed.events.some(event=>event.type==='WaterSatisfied')){completion=true;assert.notEqual(after.workers[0].taskId,task.id);assert.equal(confirmedHistoricalParticipant(preview,worker.id,before.workers[0],'worker',before.tasks),null);assert.notEqual(samples.at(-1).status,'acting');}
  else if(samples.every(sample=>sample.status==='acting')&&!observed.events.length){assert.equal(confirmedHistoricalParticipant(preview,worker.id,before.workers[0],'worker',before.tasks),'stationary');assert.ok(samples.every(sample=>sample.actionTaskKind==='water'&&sample.actionTargetId===plant.id));admitted=true;}
  before=after;
 }
 assert.equal(admitted,true,'a real event-free watering interval was admitted');assert.equal(completion,true,'the authority completed and confirmed watering');
 }finally{authority.dispose();reference.dispose();}
});
import {awakeningState} from '../src/simulation/awakenings.js';
test('real blessing interrupts an active watering task without changing authority results',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 const initial=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString());
 const task=initial.tasks.find(t=>t.kind==='water'&&initial.plants.some(p=>p.id===t.targetId&&p.alive)),plant=initial.plants.find(p=>p.id===task?.targetId),worker=initial.workers[0];assert.ok(task&&plant&&worker);
 Object.assign(initial,{raid:null,time:100,nightPlan:null,dayPlan:null,initialPreparation:false,workers:[worker],tasks:[task]});Object.assign(worker,{x:plant.x+.6,z:plant.z,status:'acting',taskId:task.id,actionRemaining:2,path:null,contractDay:initial.day,idleState:null});task.workerId=worker.id;awakeningState(initial).progress=100;
 const snapshot=serialize(initial),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),reference=createSimulationAuthority(module,snapshot,keys);
 try{const command={kind:'bless',sequence:1,id:'water-interruption',targetId:plant.id},result=authority.execute(command),control=reference.execute(command);assert.equal(result.snapshot,control.snapshot);assert.deepEqual(result.events,control.events);assert.equal(result.value,true);const before=deserializeConfirmedState(result.snapshot);assert.ok(before.plants.find(item=>item.id===plant.id).blessing);const tick={kind:'advance',sequence:2,seconds:.05,steps:2,nightFastForward:false,captureClockSegments:true},observed=authority.execute(tick),comparison=reference.execute(tick),after=deserializeConfirmedState(observed.snapshot);assert.equal(observed.snapshot,comparison.snapshot);assert.deepEqual(observed.events,comparison.events);validateConfirmedMotion(observed,after,before.elapsed,before);const preview={start:before.elapsed,end:after.elapsed,trace:observed.worldMotionTrace,clockSegments:observed.clockSegments};assert.notEqual(after.workers[0].taskId,task.id);assert.equal(confirmedHistoricalParticipant(preview,worker.id,before.workers[0],'worker',before.tasks),null);
 }finally{authority.dispose();reference.dispose();}
});
