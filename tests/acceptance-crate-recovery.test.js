import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {isMature} from '../src/simulation/crops.js';
import {applyEvent} from '../src/simulation/events.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {hitStructure} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Funded campaign fixture, real task/clock/raid operations on clear paths.
// These tests do not certify profitability or original terrain/rendering.
const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},walkable:()=>true,terrainValid:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function tickUntil(s,predicate,limit=400){
  let time=0;while(!predicate()&&time<limit&&!s.result&&!s.pauses.length){Game.tick(s,.05,nav);time+=.05;}
  assert.ok(predicate(),`Not reached at day ${s.day}, time ${s.time}, after ${time}s`);
}
function carrying({late=false,bonus=false}={}){
  const s=Game.newGame({seed:712,slotId:'crate-recovery'});Game.resume(s,'intro');s.ledger.balance=rational(10000);
  s.day=21;s.completedNights=20;s.initialPreparation=false;s.tutorial.step='done';
  Game.placeStructure(s,'center',{x:4,z:0},nav);if(late)Game.tick(s,70,nav);Game.plant(s,'seed','mijo',10,4,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});s.dayPlan.done=true;
  const plant=s.plants[0],worker=s.workers[0];
  if(bonus){s.eventPlan={id:'fixture-fertile',kind:'fertile',magnitude:.1,negative:false};applyEvent(s);assert.equal(plant.harvestBonus,10);}
  tickUntil(s,()=>isMature(plant),249);assert.equal(plant.harvestRequested,true);
  tickUntil(s,()=>worker.status==='acting',30);
  if(bonus)Game.cast(s,'multiply','multiply',plant.x,plant.z,nav);
  const cash=numberOf(s.ledger.balance);tickUntil(s,()=>s.crates.length===1,5);
  assert.equal(worker.status,'carrying');assert.equal(numberOf(s.ledger.balance),cash);
  return {s,worker,plant,crate:s.crates[0],cash};
}
test('QA-066/067/069/071: natural raid drops cargo, never targets it, and a different profile recovers its exact original value',()=>{
  const {s,worker,crate,cash}=carrying({late:true,bonus:true}),point={x:worker.x,z:worker.z};
  assert.deepEqual(crate.value,rational(594,25));assert.equal(crate.profile,'olderMale');
  spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);
  assert.equal(worker.crateId,null);assert.equal(crate.carrierId,null);assert.equal(crate.x,point.x);assert.equal(crate.z,point.z);
  assert.equal(worker.status,'fleeing');assert.equal(numberOf(s.ledger.balance),cash);
  let raidTime=0;while(s.raid&&raidTime<400){
    assert.ok(s.raid.animals.every(a=>a.targetId!==crate.id));Game.tick(s,.05,nav);raidTime+=.05;
    assert.equal(numberOf(s.ledger.balance),cash);assert.equal(crate.x,point.x);assert.equal(crate.z,point.z);assert.equal(crate.delivered,false);
  }
  assert.equal(s.raid,null);
  assert.ok(s.time>=250);assert.ok(s.events.some(e=>e.type==='StructureHit'));assert.equal(s.structures[0].status,'intact');
  assert.equal(s.tasks.filter(t=>t.kind==='crate'&&t.targetId===crate.id).length,1);
  let loaded=deserialize(serialize(s));assert.deepEqual(loaded.crates[0].value,rational(594,25));
  // Entry now starts at the actual active border; the raid can end after dusk.
  // Advance to the next dawn rather than assuming an end before time 300.
  loaded.eventPlan=null;tickUntil(loaded,()=>loaded.day===22,600);assert.equal(loaded.day,22);
  Game.hire(loaded,'next-hire',{olderFemale:1});loaded.dayPlan.done=true;
  assert.equal(loaded.plants.filter(p=>p.alive).length,0);assert.equal(loaded.workers.length,1);assert.equal(loaded.workers[0].centerId,loaded.structures[0].id);
  const paid=numberOf(loaded.ledger.balance);tickUntil(loaded,()=>loaded.workers[0].status==='carrying',60);
  assert.equal(loaded.crates[0].profile,'olderMale');assert.deepEqual(loaded.crates[0].value,rational(594,25));assert.equal(numberOf(loaded.ledger.balance),paid);
  assert.equal(loaded.spells.length,0);loaded=deserialize(serialize(loaded));tickUntil(loaded,()=>loaded.crates[0].delivered,30);
  assert.equal(numberOf(loaded.ledger.balance),paid+24);assert.equal(loaded.events.filter(e=>e.type==='CrateDelivered').length,1);
  Game.rebuildTasks(loaded);Game.tick(loaded,5,nav);assert.equal(numberOf(loaded.ledger.balance),paid+24);
  assert.equal(loaded.plants.length,1);assert.equal(loaded.plants[0].alive,false);
});
test('QA-068: a loose box without an operational center survives reload and generates transport when a replacement is built',()=>{
  const {s,crate,cash}=carrying();spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);
  hitStructure(s.structures[0],s.structures[0].maxHp);s.raid.animals.forEach(a=>{a.hitsRemaining=0;});
  tickUntil(s,()=>s.raid===null,10);assert.equal(s.result,null);assert.ok(!s.tasks.some(t=>t.kind==='crate'));
  const point={x:crate.x,z:crate.z};let loaded=deserialize(serialize(s));Game.rebuildTasks(loaded);Game.tick(loaded,5,nav);
  assert.equal(loaded.crates[0].delivered,false);assert.deepEqual({x:loaded.crates[0].x,z:loaded.crates[0].z},point);assert.equal(numberOf(loaded.ledger.balance),cash);
  Game.placeStructure(loaded,'replacement',{x:24,z:0},nav);const center=loaded.structures.at(-1);
  assert.equal(numberOf(loaded.ledger.balance),cash-800);assert.ok(loaded.workers.some(w=>w.centerId===center.id));
  assert.equal(loaded.tasks.filter(t=>t.kind==='crate'&&t.targetId===crate.id&&t.centerId===center.id).length,1);
  tickUntil(loaded,()=>loaded.crates[0].delivered,120);assert.equal(numberOf(loaded.ledger.balance),cash-800+11);
});
test('New centers preserve an existing crate reservation, plant assignment and manual repair instead of rebuilding all queues',()=>{
  const {s,worker,crate}=carrying();spawnRaid(s,{group:['warthog']},nav);s.raid.animals.forEach(a=>{a.hitsRemaining=0;});tickUntil(s,()=>s.raid===null,10);
  tickUntil(s,()=>worker.status==='walking'&&s.tasks.find(t=>t.id===worker.taskId)?.kind==='crate',30);
  const task=s.tasks.find(t=>t.id===worker.taskId),centerId=worker.centerId;
  Game.plant(s,'next-crop','mijo',20,4,nav);Game.placeStructure(s,'wall',{kind:'wall',material:'adobe',x:35,z:4},nav);
  const wall=s.structures.at(-1);wall.hp-=10;Game.requestRepair(s,'repair',wall.id);
  const tasks=structuredClone(s.tasks),binding=s.plants.at(-1).centerId,cash=numberOf(s.ledger.balance);
  Game.placeStructure(s,'new-center',{x:24,z:0},nav);
  assert.deepEqual(s.tasks,tasks);assert.equal(worker.taskId,task.id);assert.equal(task.workerId,worker.id);assert.equal(worker.centerId,centerId);
  assert.equal(s.plants.at(-1).centerId,binding);assert.equal(s.tasks.filter(t=>t.kind==='crate'&&t.targetId===crate.id).length,1);
  assert.equal(numberOf(s.ledger.balance),cash-800);assert.equal(wall.hp,wall.maxHp-10);
});
