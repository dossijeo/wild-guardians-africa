import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {rational,numberOf,transact} from '../src/simulation/money.js';
import {isMature,waterPlant,advancePlant} from '../src/simulation/crops.js';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {dailyRunMetres} from '../src/simulation/locomotion.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Funded postgame, clear-path fixtures isolate task/clock/ledger integration.
// Worker positions and task reservations are always produced by Game.tick.
const nav={placement:()=>({valid:true,suppress:[]}),wallPlacement:()=>({valid:true,suppress:[]}),
  field:{canyon:false},obstacles:[],suppressed:new Set(),propsAt:()=>[],
  forBuildingPlacement(){return {...this};},segmentClear:()=>true,
  setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function farm(){
  const s=Game.newGame({seed:712,slotId:'worker-chains'});Game.resume(s,'intro');s.ledger.balance=rational(10000);
  s.day=101;s.completedNights=100;s.postgame=true;s.initialPreparation=false;s.tutorial.step='done';
  Game.placeStructure(s,'center',{x:4,z:0},nav);return s;
}
function sow(s,x=10,z=4,species='mijo'){Game.plant(s,`seed-${s.plants.length}`,species,x,z,nav);return s.plants.at(-1);}
function hire(s,profile='olderFemale'){Game.pause(s,'hiring');Game.hire(s,`hire-${s.day}`,{[profile]:1});return s.workers.at(-1);}
function until(s,predicate,limit=300,step=.05){
  let elapsed=0;while(!predicate()&&elapsed<limit&&!s.pauses.length&&!s.result){Game.tick(s,step,nav);elapsed+=step;}
  assert.ok(predicate(),`Condition not reached after ${elapsed}s at ${s.time}`);
}
function ripePair(campaign=false){
  const s=farm();if(campaign){s.day=21;s.completedNights=20;s.postgame=false;}
  const a=sow(s),b=sow(s,16,4);hire(s);if(campaign)s.dayPlan.done=true;
  until(s,()=>a.water[0].status==='manual'&&b.water[0].status==='manual');
  Game.cast(s,'synchronise-growth','growth',b.x,b.z,nav);
  until(s,()=>isMature(a)&&isMature(b));assert.equal(s.crates.length,0);return {s,a,b};
}
test('QA-058: all four profiles release an unfinished walking reservation exactly at shift end',()=>{
  for(const [profile,end] of [['olderMale',250],['olderFemale',300],['youngMale',250],['youngFemale',300]]){
    const s=farm(),p=sow(s,400,4),w=hire(s,profile),cash=numberOf(s.ledger.balance);
    Game.tick(s,end-.05,nav);assert.equal(w.status,'walking');const task=s.tasks.find(t=>t.id===w.taskId);
    assert.equal(task.workerId,w.id);assert.ok(w.x>100&&w.x<400);
    Game.tick(s,.05,nav);assert.equal(s.time,end);assert.equal(w.status,'returning');assert.equal(w.taskId,null);assert.equal(task.workerId,null);
    Game.tick(s,1,nav);assert.equal(p.water[0].status,'due');assert.equal(p.growth,0);assert.equal(numberOf(s.ledger.balance),cash);
    assert.equal(s.events.filter(e=>e.type==='WaterSatisfied').length,0);
  }
});
test('QA-059: all four profiles finish committed physical first care after shift end then refuse the next task',()=>{
  for(const [profile,end] of [['olderMale',250],['olderFemale',300],['youngMale',250],['youngFemale',300]]){
    const s=farm(),w=hire(s,profile);Game.tick(s,end-4,nav);
    const first=sow(s,w.x+1.5,w.z),waiting=sow(s,w.x+7.5,w.z+4),cash=numberOf(s.ledger.balance);
    until(s,()=>w.status==='acting',4);assert.ok(s.time<end);assert.equal(first.water[0].status,'due');
    const taskId=w.taskId;Game.tick(s,end-s.time,nav);assert.equal(w.status,'acting');assert.equal(w.taskId,taskId);
    until(s,()=>first.water[0].status==='manual',10);assert.ok(s.time>end);assert.equal(w.taskId,null);
    Game.tick(s,.1,nav);assert.equal(w.status,'returning');assert.equal(waiting.water[0].status,'due');
    Game.tick(s,60,nav);assert.equal(w.status,'home');assert.equal(waiting.growth,0);assert.equal(numberOf(s.ledger.balance),cash);
    assert.equal(s.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===first.id).length,1);
  }
});
test('QA-056/057: actual raid cancellation and end rebuild only live needs and logically requested harvest',()=>{
  const {s,a,b}=ripePair(true),initial=sow(s,24,4),debt=sow(s,30,4,'platano');
  // Canonical biological checkpoint snapshot; this debt is not claimed as
  // worker-grown. The two mature crops above were physically attended.
  waterPlant(debt);advancePlant(debt,95);assert.equal(debt.water[1].status,'due');
  Game.harvest(s,'requested',a.id);Game.placeStructure(s,'wall',{kind:'wall',material:'adobe',x:40,z:0},nav);
  const wall=s.structures.at(-1);wall.hp-=10;Game.requestRepair(s,'repair',wall.id);const cash=numberOf(s.ledger.balance);
  spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);assert.ok(s.workers.every(w=>w.status==='fleeing'&&w.taskId===null));
  assert.ok(s.tasks.every(t=>t.kind!=='repair'));assert.equal(a.harvestRequested,true);assert.equal(b.harvestRequested,true);
  // Scripted exhausted raid tests its real exit/rebuild flow, not animal damage.
  s.raid.animals.forEach(animal=>{animal.hitsRemaining=0;});
  for(let elapsed=0;s.raid&&elapsed<10;elapsed+=.1)updateRaid(s,.1,nav);
  assert.equal(s.raid,null);
  const needs=()=>s.tasks.map(t=>`${t.kind}:${t.targetId}`).sort(),expected=[`harvest:${a.id}`,`harvest:${b.id}`,`initial:${initial.id}`,`water:${debt.id}`].sort();
  assert.deepEqual(needs(),expected);assert.ok(s.tasks.every(t=>t.workerId===null));
  for(let i=0;i<10;i++)Game.rebuildTasks(s);assert.deepEqual(needs(),expected);
  const loaded=deserialize(serialize(s));Game.rebuildTasks(loaded);assert.deepEqual(loaded.tasks.map(t=>`${t.kind}:${t.targetId}`).sort(),expected);
  assert.equal(numberOf(s.ledger.balance),cash);assert.equal(wall.hp,wall.maxHp-10);assert.equal(s.crates.length,0);
  assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,1);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
});
test('QA-056/057/064/065: unattended automatic FIFO harvest survives dawn, then physical pickups and reload settle both crates once',()=>{
  const s=farm();Game.tick(s,170,nav);const a=sow(s),b=sow(s,16,4);hire(s);
  Game.tick(s,430,nav);assert.equal(s.day,102);assert.ok([a,b].every(p=>p.water.every(w=>w.status==='manual')));
  Game.hire(s,'zero-day-102',{});until(s,()=>isMature(a)&&isMature(b),100);
  assert.equal(s.crates.length,0);assert.ok([a,b].every(p=>p.alive&&p.harvestRequested));
  Game.placeStructure(s,'wall',{kind:'wall',material:'adobe',x:40,z:0},nav);const wall=s.structures.at(-1);wall.hp-=10;Game.requestRepair(s,'repair',wall.id);
  const cash=numberOf(s.ledger.balance);s.eventPlan=null;Game.tick(s,600-s.time,nav);
  assert.equal(s.day,103);assert.equal(s.crates.length,0);assert.equal(numberOf(s.ledger.balance),cash);
  assert.deepEqual(s.tasks.map(t=>[t.kind,t.targetId]),[['harvest',a.id],['harvest',b.id]]);
  const w=hire(s,'olderMale'),paid=numberOf(s.ledger.balance);assert.equal(paid,cash-30);
  until(s,()=>s.crates.length===1);const crate=s.crates[0];assert.equal(w.status,'carrying');assert.equal(crate.delivered,false);
  assert.equal(a.alive,false);assert.equal(a.harvestRequested,false);assert.equal(b.alive,true);assert.deepEqual(crate.value,rational(54,5));
  assert.equal(crate.sourcePlantId,a.id);assert.equal(numberOf(s.ledger.balance),paid);
  let loaded=deserialize(serialize(s));Game.rebuildTasks(loaded);until(loaded,()=>loaded.crates[0].delivered,40);
  assert.equal(numberOf(loaded.ledger.balance),paid+11);assert.equal(loaded.events.filter(e=>e.type==='CrateDelivered').length,1);
  const settled=serialize(loaded);assert.equal(transact(loaded.ledger,`deliver:${crate.id}`,crate.value),false);assert.equal(serialize(loaded),settled);
  loaded=deserialize(serialize(loaded));Game.rebuildTasks(loaded);until(loaded,()=>loaded.crates.length===2&&loaded.crates.every(c=>c.delivered),100);
  assert.equal(numberOf(loaded.ledger.balance),paid+22);assert.equal(loaded.crates.length,2);assert.ok(loaded.crates.every(c=>c.delivered));
  assert.ok(!loaded.tasks.some(t=>t.kind==='crate'||t.kind==='harvest'));assert.equal(loaded.plants.find(p=>p.id===b.id).harvestRequested,false);
  const final=numberOf(loaded.ledger.balance);Game.rebuildTasks(loaded);Game.tick(loaded,1,nav);assert.equal(numberOf(loaded.ledger.balance),final);
});

test('QA-062/063: ordinary urgency exhausts physical running metres without changing assignments and next hire restores reserve',()=>{
  const s=farm();for(let i=0;i<3;i++)sow(s,400+i*1.5,4);const w=hire(s,'olderFemale'),origin=w.centerId;
  until(s,()=>w.runRemaining===0,249);assert.equal(w.centerId,origin);assert.equal(w.status,'walking');
  const x=w.x,z=w.z;Game.tick(s,1,nav);assert.equal(w.running,false);assert.ok(Math.abs(Math.hypot(w.x-x,w.z-z)-1.08)<1e-7);assert.equal(w.runRemaining,0);
  assert.equal(s.tasks.length,3);Game.tick(s,300-s.time,nav);s.eventPlan=null;Game.tick(s,300,nav);
  assert.equal(s.day,102);assert.ok(s.workers.includes(w));assert.equal(w.status,'returning');assert.equal(w.contractDay,101);assert.equal(w.runRemaining,dailyRunMetres());
  const fresh=hire(s,'olderFemale');assert.equal(fresh.runRemaining,dailyRunMetres());assert.equal(fresh.centerId,origin);assert.notEqual(fresh.personId,w.personId);
});
test('QA-063: two versus three queued tasks changes running but equal living plant weights keep staff quotas equal',()=>{
  const s=farm();s.structures=[];Game.placeStructure(s,'west-center',{x:-20,z:0},nav);Game.placeStructure(s,'east-center',{x:100,z:0},nav);
  for(let i=0;i<3;i++)sow(s,-32-i*1.5,4);for(let i=0;i<3;i++)sow(s,112+i*1.5,4);
  // A fully watered but still growing plant weighs one without needing work.
  // Real maturity is now tested separately as an automatic FIFO request.
  const mature=s.plants[2];mature.growth=100;mature.water.forEach(w=>{w.status='manual';});
  Game.pause(s,'hiring');Game.hire(s,'hire',{olderMale:2});const [west,east]=s.structures;
  const workers=s.workers.map(w=>({id:w.id,centerId:w.centerId}));
  assert.equal(s.tasks.filter(t=>t.centerId===west.id).length,2);assert.equal(s.tasks.filter(t=>t.centerId===east.id).length,3);
  assert.equal(s.workers.filter(w=>w.centerId===west.id).length,1);assert.equal(s.workers.filter(w=>w.centerId===east.id).length,1);
  Game.tick(s,1,nav);
  const walk=s.workers.find(w=>w.centerId===west.id),run=s.workers.find(w=>w.centerId===east.id);
  assert.equal(walk.running,false);assert.equal(walk.runRemaining,dailyRunMetres());assert.equal(run.running,true);assert.ok(run.runRemaining<dailyRunMetres());
  assert.deepEqual(s.workers.map(w=>({id:w.id,centerId:w.centerId})),workers);assert.equal(mature.harvestRequested,false);
});
