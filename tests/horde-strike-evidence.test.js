import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {updateWorkerEncounters} from '../src/simulation/encounters.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {auditHordeStrikeEvidence,STRIKE_EVENT_TYPES} from '../tools/horde-strike-evidence.mjs';

let original;
test('Actual Game.tick spawn boundary records allocation before an immediate worker encounter',async()=>{
 const {s,nav}=createOpeningWorld({seed:712,slotId:'same-tick-allocation'}),c=s.structures[0];
 Game.plant(s,'paid-seed','mijo',c.x+5,c.z+6,nav);Game.openInitialHiring(s);Game.hire(s,'paid-hire',{olderFemale:1});
 s.tutorial.step='done';s.initialPreparation=false;s.time=399.95;s.dayPlan={done:true};s.nightPlan={at:400,group:['rhino'],done:false};
 const eye={x:c.x+16,z:c.z+20};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,c);
 const p=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('Native same-tick fixture');}});
 try{
  let slices=0;while(!p.ready){p.update(s);assert.ok(++slices<20000);assert.equal(p.cooperativeError,undefined);await new Promise(resolve=>setImmediate(resolve));}
  const point=p.ready.entry.entries[0],w=s.workers[0];w.x=point.x;w.z=point.z;w.status='fleeing';w.fallRemaining=10;
  Game.tick(s,.15,nav);const allocation=s.events.find(e=>e.type==='RaidSpawned'),hit=s.events.find(e=>e.type==='WorkerHit');
  assert.ok(allocation&&hit,'Native same-tick spawn/encounter facts must both exist');
  assert.equal(hit.raidId,allocation.raidId);assert.equal(hit.animalId,allocation.animals[0].id);
  assert.ok(s.events.indexOf(allocation)<s.events.indexOf(hit));assert.equal(s.raid.animals[0].hitsRemaining,allocation.animals[0].hitsAllocated-1);
 }finally{p.dispose();}
});
async function fixture(){
 const opening=createOpeningWorld({seed:712,slotId:'strike-evidence'});let s=opening.s;const nav=opening.nav,c=s.structures[0];
 assert.equal(Game.plant(s,'paid-seed','mijo',c.x+5,c.z+6,nav),true);Game.openInitialHiring(s);Game.hire(s,'paid-hire',{olderFemale:1});
 s.tutorial.step='done';s.initialPreparation=false;s.time=400;s.dayPlan={done:true};s.nightPlan={at:400,group:['rhino'],done:false};
 const eye={x:c.x+16,z:c.z+20};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,c);
 const p=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('Unit fixture cooperative preparation');}});
 try{
  let slices=0;while(!p.ready){p.update(s);assert.ok(++slices<20000);assert.equal(p.cooperativeError,undefined);await new Promise(resolve=>setImmediate(resolve));}
  assert.equal(spawnRaid(s,s.nightPlan,nav),'spawned');
 }finally{p.dispose();}
 const allocation=s.events.find(e=>e.type==='RaidSpawned'),initial=allocation.animals[0];assert.ok(initial.hitsAllocated>=5);
 // Controlled encounter poses test accounting; they are not a travel benchmark
 // or campaign command. The spawn, budget, damage and emits are real production.
 let a=s.raid.animals[0],w=s.workers[0];w.x=a.x;w.z=a.z;updateWorkerEncounters(s,nav);
 assert.equal(s.events.at(-1).type,'WorkerHit');assert.equal(a.hitsRemaining,initial.hitsAllocated-1);
 w.x=a.x+20;w.z=a.z+20;updateWorkerEncounters(s,nav);w.x=a.x;w.z=a.z;updateWorkerEncounters(s,nav);
 assert.equal(s.events.at(-1).type,'WorkerIncapacitated');assert.equal(a.hitsRemaining,initial.hitsAllocated-2);
 assert.equal(s.events.at(-1).raidId,s.raid.id);assert.equal(s.events.at(-1).animalId,a.id);
 s=deserialize(serialize(s));nav.setState(s);a=s.raid.animals[0];
 const plant=s.plants[0],clip='Right_Hand_Sword_Slash',duration=ANIMAL_ACTIONS.animals.rhino.clips[clip].duration;
 Object.assign(a,{status:'attacking',targetId:plant.id,reservation:null,animation:clip,attackId:'native-crop-attack',hitApplied:false,attackDuration:duration,attackRemaining:duration});
 updateRaid(s,duration,nav);assert.equal(plant.attackHits,1);assert.equal(a.hitsRemaining,initial.hitsAllocated-3);
 Object.assign(a,{status:'attacking',targetId:'missing-target',animation:clip,attackId:'native-missing-attack',hitApplied:false,attackRemaining:duration});
 updateRaid(s,duration,nav);assert.equal(a.hitsRemaining,initial.hitsAllocated-4);
 const facts=s.events.filter(e=>e.type==='RaidSpawned'||STRIKE_EVENT_TYPES.includes(e.type));
 assert.deepEqual(facts.map(e=>e.type),['RaidSpawned','WorkerHit','WorkerIncapacitated','AnimalLogicalHit','AnimalLogicalMiss']);
 const counts=Object.fromEntries(['RaidSpawned',...STRIKE_EVENT_TYPES].map(t=>[t,facts.filter(e=>e.type===t).length]));
 return {raidFacts:facts,counts,raids:[{id:s.raid.id,lastAnimals:s.raid.animals.map(a=>({id:a.id,species:a.species,hitsRemaining:a.hitsRemaining}))}]};
}
test('Native allocation before same-elapsed encounters, reload, crop hit and miss reconciles all four consumers',async()=>{
 original=await fixture();const audit=auditHordeStrikeEvidence(original);assert.equal(audit.spentStrikes,4);assert.equal(audit.strikeEvidenceMatches,true);
 assert.deepEqual(audit.counts,{AnimalLogicalHit:1,AnimalLogicalMiss:1,WorkerHit:1,WorkerIncapacitated:1});assert.equal(audit.raids[0].actors[0].events.length,4);
});
test('Omitted consumer is rejected even when aggregate counts are also edited',()=>{
 const r=structuredClone(original);r.raidFacts=r.raidFacts.filter(e=>e.type!=='WorkerHit');r.counts.WorkerHit=0;assert.throws(()=>auditHordeStrikeEvidence(r),/Actual spent strikes mismatch/);
});
test('Duplicated event ID and duplicated committed attack are rejected',()=>{
 const r=structuredClone(original);r.raidFacts.push(structuredClone(r.raidFacts.find(e=>e.type==='WorkerHit')));assert.throws(()=>auditHordeStrikeEvidence(r),/Duplicate native raid fact/);
 const repeated=structuredClone(original),hit=repeated.raidFacts.find(e=>e.type==='AnimalLogicalHit');repeated.raidFacts.push({...hit,id:'different-event-same-attack'});repeated.counts.AnimalLogicalHit++;repeated.raids[0].lastAnimals[0].hitsRemaining--;assert.throws(()=>auditHordeStrikeEvidence(repeated),/committed attack consumed twice/);
});
test('Unknown allocation, zero budget, missing actor, malformed remaining and changed raid ID reject coverage',()=>{
 for(const mutate of [r=>{r.raidFacts[0].animals[0].hitsAllocated=0;},r=>{delete r.raidFacts[0].animals[0].hitsAllocated;},r=>{r.raidFacts.find(e=>e.type==='WorkerHit').animalId='unknown';},r=>{r.raids[0].lastAnimals=[];},r=>{r.raids[0].lastAnimals[0].hitsRemaining=-1;},r=>{r.raidFacts.find(e=>e.type==='WorkerHit').raidId='other';}]){
  const r=structuredClone(original);mutate(r);assert.throws(()=>auditHordeStrikeEvidence(r));
 }
});
