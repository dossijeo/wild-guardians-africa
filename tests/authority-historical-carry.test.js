import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {validateConfirmedMotion} from '../src/rendering/confirmed-motion-validation.js';
import {confirmedHistoricalParticipant} from '../src/rendering/confirmed-historical-participant.js';
import {confirmedWorkerCarrySamples} from '../src/rendering/confirmed-animation-samples.js';
test('native carried crate movement preserves crate identity and confirmed phases',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
 const initial=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString());
 const task=initial.tasks.find(t=>t.kind==='harvest'&&initial.plants.some(p=>p.id===t.targetId&&p.alive)),plant=initial.plants.find(p=>p.id===task?.targetId),worker=initial.workers[0];assert.ok(task&&plant&&worker);const crate={id:`crate-${initial.nextId++}`,x:plant.x,z:plant.z,carrierId:worker.id,delivered:false,value:{n:'1',d:'1'},sourcePlantId:plant.id,species:plant.species,centerId:worker.centerId};plant.alive=false;initial.crates=[crate];
 Object.assign(initial,{raid:null,time:100,nightPlan:null,dayPlan:null,initialPreparation:false,workers:[worker],tasks:[]});Object.assign(worker,{x:plant.x+.6,z:plant.z,status:'carrying',crateId:crate.id,carryPhase:0,taskId:null,path:null,contractDay:initial.day,idleState:null});for(const crop of initial.plants)if(crop.alive){crop.growth=1e6;crop.harvestRequested=true;}
 const snapshot=serialize(initial),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
 const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),reference=createSimulationAuthority(module,snapshot,keys);let before=deserializeConfirmedState(snapshot),admitted=false,delivery=false;
 try{for(let sequence=1;sequence<=350&&!delivery;sequence++){
  const command={kind:'advance',sequence,seconds:.1,steps:2,nightFastForward:false,captureClockSegments:true},observed=authority.execute(command),control=reference.execute(command),after=deserializeConfirmedState(observed.snapshot);
  assert.equal(observed.snapshot,control.snapshot);assert.deepEqual(observed.events,control.events);validateConfirmedMotion(observed,after,before.elapsed,before);
  const preview={start:before.elapsed,end:after.elapsed,trace:observed.worldMotionTrace,clockSegments:observed.clockSegments},samples=observed.worldMotionTrace.actorTickStates.actors.find(actor=>actor.actorId===worker.id).samples;
  if(!admitted&&samples.every(sample=>sample.status==='carrying')&&!observed.events.length&&samples.some(sample=>sample.x!==samples[0].x||sample.z!==samples[0].z)){
   assert.ok(samples.every(sample=>sample.crateId===crate.id));if(confirmedHistoricalParticipant(preview,worker.id,before.workers[0],'worker',before.tasks)!=='moving'){before=after;continue;}const phases=confirmedWorkerCarrySamples(preview,worker.id,before.workers[0]);assert.ok(phases);assert.ok(phases.at(-1).phase>phases[0].phase);admitted=true;
   const changed=structuredClone(preview);changed.trace.actorTickStates.actors[0].samples.at(-1).crateId='another';assert.equal(confirmedWorkerCarrySamples(changed,worker.id,before.workers[0]),null);
  }
  if(observed.events.some(event=>event.type==='CrateDelivered'&&event.targetId===crate.id)){delivery=true;assert.notEqual(after.workers[0].status,'carrying');assert.equal(after.crates.find(item=>item.id===crate.id).delivered,true);assert.equal(confirmedHistoricalParticipant(preview,worker.id,before.workers[0],'worker',before.tasks),null);}
  before=after;
 }
 assert.equal(admitted,true,'real carried movement was observed');assert.equal(delivery,true,'real crate delivery was observed');
 }finally{authority.dispose();reference.dispose();}
});


test('native disabled center drops the carried crate and ends the carry state',()=>{const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),initial=deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString()),worker=initial.workers[0],center=initial.structures.find(item=>item.id===worker.centerId),plant=initial.plants.find(item=>item.alive);assert.ok(center&&plant);const crate={id:`crate-${initial.nextId++}`,x:plant.x,z:plant.z,carrierId:worker.id,delivered:false,value:{n:'1',d:'1'},sourcePlantId:plant.id,species:plant.species,centerId:worker.centerId};plant.alive=false;center.status='ruined';center.hp=0;Object.assign(initial,{raid:null,time:100,nightPlan:null,dayPlan:null,initialPreparation:false,workers:[worker],tasks:[],crates:[crate]});Object.assign(worker,{x:plant.x+.6,z:plant.z,status:'carrying',crateId:crate.id,carryPhase:.5,taskId:null,path:null,contractDay:initial.day,idleState:null});const snapshot=serialize(initial),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);const authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),reference=createSimulationAuthority(module,snapshot,keys);try{const command={kind:'advance',sequence:1,seconds:.05,steps:2,nightFastForward:false,captureClockSegments:true},observed=authority.execute(command),control=reference.execute(command),after=deserializeConfirmedState(observed.snapshot);assert.equal(observed.snapshot,control.snapshot);assert.deepEqual(observed.events,control.events);assert.ok(observed.events.some(event=>event.type==='CrateDropped'&&event.targetId===crate.id));assert.equal(after.workers[0].crateId,null);assert.equal(after.crates.find(item=>item.id===crate.id).carrierId,null);const before=deserializeConfirmedState(snapshot),preview={start:before.elapsed,end:after.elapsed,trace:observed.worldMotionTrace,clockSegments:observed.clockSegments};assert.equal(confirmedHistoricalParticipant(preview,worker.id,before.workers[0],'worker',before.tasks),null);}finally{authority.dispose();reference.dispose();}});

