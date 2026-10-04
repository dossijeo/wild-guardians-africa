import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {waterPlant,isMature} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {enqueue} from '../src/simulation/tasks.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Funded, attack-free late-game fixture; straight unobstructed routes isolate
// farming/clock/task integration. These tests do not validate terrain or meshes.
const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(_start,end)=>[{x:end.x,z:end.z}]};
function farm(){
  const s=Game.newGame({seed:712,slotId:'acceptance-farming'});Game.resume(s,'intro');s.tutorial.step='center';
  Game.placeStructure(s,'center',{x:4,z:0},nav);s.ledger.balance=rational(10000);s.day=101;s.completedNights=100;s.postgame=true;s.initialPreparation=false;s.tutorial.step='done';return s;
}
function sow(s,species='mijo',x=8,z=0){Game.plant(s,`plant-${s.plants.length}`,species,x,z,nav);return s.plants.at(-1);}
function firstCare(s,p){assert.equal(waterPlant(p),true);Game.rebuildTasks(s);}
function grow(s,seconds){s.eventPlan=null;Game.tick(s,seconds,nav);}
function castGrowth(s,p){Game.cast(s,'growth','growth',p.x,p.z,nav);}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);

test('QA-017/019: eight canonical plant commands charge 309 and create only the approved checkpoints',()=>{
  const s=farm(),species=['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'];
  species.forEach((id,i)=>sow(s,id,8+i*1.5));
  assert.equal(numberOf(s.ledger.balance),9691);assert.deepEqual(s.plants.map(p=>p.species),species);
  assert.deepEqual(s.plants.map(p=>p.water.length),[2,3,2,3,2,4,2,6]);
  for(const p of s.plants){assert.equal(p.growth,0);assert.equal(p.alive,true);assert.equal(p.water[0].status,'due');}
  assert.equal(s.tasks.length,8);Game.rebuildTasks(s);Game.rebuildTasks(s);assert.equal(s.tasks.length,8);
  assert.ok(s.tasks.every(t=>t.kind==='initial'));assert.equal(numberOf(s.ledger.balance),9691);
  for(const id of ['arroz','calabaza','judias'])assert.throws(()=>sow(s,id,30,0));
  assert.equal(numberOf(s.ledger.balance),9691);assert.equal(s.plants.length,8);
});

test('QA-009/018: attended millet and banana require 140/570 daylight seconds across an accelerated night',()=>{
  for(const [species,duration,realDuration] of [['mijo',140,140],['platano',570,630]]){
    const s=farm(),p=sow(s,species);firstCare(s,p);let real=0,daylight=0;
    while(!isMature(p)&&real<700){
      while(waterPlant(p)){}s.eventPlan=null;
      if(s.pauses.includes('hiring')){if(species==='platano'&&s.completedNights===101)close(p.growth,300);Game.hire(s,`zero-${s.day}`,{});}
      const before=p.growth;Game.advanceReal(s,.05,nav);daylight+=p.growth-before;real+=.05;
    }
    assert.equal(isMature(p),true);close(p.growth,duration);close(daylight,duration);close(real,realDuration);
    assert.equal(p.water.length,cropSpec(species).total_waters);assert.ok(p.water.every(w=>w.status==='manual'));
    assert.equal(numberOf(s.ledger.balance),10000-cropSpec(species).plant_cost);
    if(species==='platano'){assert.equal(s.completedNights,101);close(s.elapsed,870);close(s.time,270);}
  }
});

test('QA-019: physical care completes exactly the canonical number of waterings for every species, with no water charge',()=>{
  for(const [species,waters] of [['mijo',2],['girasol',3],['sorgo',2],['maiz',3],['batata',2],['algodon',4],['yuca',2],['platano',6]]){
    const s=farm(),p=sow(s,species);Game.openInitialHiring(s);Game.hire(s,'hire-101',{olderFemale:1});
    for(let i=0;i<10000&&!isMature(p);i++){
      s.eventPlan=null;if(s.pauses.includes('hiring'))Game.hire(s,`hire-${s.day}`,{olderFemale:1});
      Game.advanceReal(s,.2,nav);if(p.water[0].status==='due')assert.equal(p.growth,0);
      assert.ok(s.tasks.filter(t=>['initial','water'].includes(t.kind)&&t.targetId===p.id).length<=1);
    }
    assert.equal(isMature(p),true,species);assert.equal(p.water.length,waters);
    assert.ok(p.water.every(w=>w.status==='manual'));assert.equal(s.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===p.id).length,waters);
    const wages=Object.keys(s.ledger.entries).filter(id=>id.startsWith('hire-')).length*30;
    assert.equal(numberOf(s.ledger.balance),10000-cropSpec(species).plant_cost-wages);
    assert.equal(s.crates.length,0);assert.equal(s.tasks.length,1);assert.equal(s.tasks[0].kind,'harvest');assert.equal(s.tasks[0].targetId,p.id);assert.equal(p.harvestRequested,true);
  }
});

test('QA-015/020/021: one large step preserves banana checkpoint debt and freezes at 23.75 daylight seconds overdue',()=>{
  const s=farm(),p=sow(s,'platano');firstCare(s,p);const before=numberOf(s.ledger.balance);
  grow(s,180);close(p.growth,118.75);close(p.water[1].at,95);close(p.water[1].wait,23.75);
  assert.equal(p.water[1].status,'due');assert.equal(p.alive,true);
  assert.equal(s.tasks.filter(t=>t.kind==='water'&&t.targetId===p.id).length,1);
  grow(s,50);close(p.growth,118.75);assert.equal(numberOf(s.ledger.balance),before);
  assert.equal(waterPlant(p),true);Game.rebuildTasks(s);grow(s,10);close(p.growth,128.75);
  assert.equal(p.water.length,6);assert.equal(numberOf(s.ledger.balance),before);
});

test('QA-022: ten seconds of remaining banana tolerance survive the full night then run out in daylight',()=>{
  const s=farm(),p=sow(s,'platano');firstCare(s,p);grow(s,108.75);
  close(p.water[1].wait,13.75);s.time=300;s.nightPlan={done:true,group:[]};const growth=p.growth;
  Game.advanceReal(s,60,nav);close(p.growth,growth);close(p.water[1].wait,13.75);
  Game.hire(s,'next-day',{});grow(s,10);close(p.water[1].wait,23.75);close(p.growth,growth+10);
  grow(s,1);close(p.growth,growth+10);assert.equal(p.alive,true);
});

test('QA-023: an automatically requested mature plant without staff remains stable through four dawns without water or deterioration',()=>{
  const s=farm(),p=sow(s);firstCare(s,p);grow(s,70);waterPlant(p);Game.rebuildTasks(s);grow(s,70);
  assert.equal(isMature(p),true);const before=JSON.stringify(p);
  for(let day=0;day<4;day++){
    s.eventPlan=null;s.nightPlan={done:true,group:[]};Game.advanceReal(s,1000,nav);
    assert.equal(JSON.stringify(p),before);assert.equal(s.pauses.includes('hiring'),true);
    Game.hire(s,`zero-${s.day}`,{});
  }
  assert.equal(s.crates.length,0);assert.equal(s.tasks.length,1);assert.equal(s.tasks[0].kind,'harvest');assert.equal(s.tasks[0].targetId,p.id);assert.equal(p.harvestRequested,true);
});

test('QA-024: first-care debt gates growth and long-tolerance cassava waits below maturity until final watering',()=>{
  const s=farm(),p=sow(s,'yuca');grow(s,200);assert.equal(p.growth,0);assert.equal(p.water.length,2);
  firstCare(s,p);grow(s,100);close(p.growth,100);
  s.eventPlan=null;Game.advanceReal(s,60,nav);Game.hire(s,'zero-day-102',{});grow(s,300);
  assert.equal(p.water[1].status,'due');close(p.water[1].wait,160);close(p.growth,400);
  s.eventPlan=null;Game.advanceReal(s,60,nav);Game.hire(s,'zero-day-103',{});grow(s,80);
  assert.equal(isMature(p),false);assert.ok(p.growth<480&&p.growth>479.99);
  assert.equal(p.water[1].status,'due');assert.ok(p.water[1].wait<288);
  waterPlant(p);Game.rebuildTasks(s);grow(s,.001);assert.equal(isMature(p),true);assert.equal(p.water.length,2);
});

test('QA-015: large real frames stop at each dawn and charge only an explicitly confirmed daily contract once',()=>{
  const s=farm();sow(s,'platano');Game.openInitialHiring(s);Game.hire(s,'hire-day-101',{olderFemale:1});
  assert.equal(numberOf(s.ledger.balance),9820);
  Game.advanceReal(s,1000,nav);assert.equal(s.day,102);assert.equal(s.pauses.includes('hiring'),true);
  assert.equal(numberOf(s.ledger.balance),9820);assert.equal(s.events.filter(e=>e.type==='Dawn').length,1);
  Game.hire(s,'hire-day-102',{olderFemale:1});assert.equal(numberOf(s.ledger.balance),9790);
  assert.equal(Game.hire(s,'repeat-day-102',{olderFemale:1}),false);
  Game.advanceReal(s,1000,nav);assert.equal(s.day,103);assert.equal(s.pauses.includes('hiring'),true);
  assert.equal(numberOf(s.ledger.balance),10030);assert.equal(s.crates.length,1);assert.equal(s.crates[0].delivered,true);assert.equal(s.events.filter(e=>e.type==='CrateDelivered').length,1);assert.equal(s.events.filter(e=>e.type==='Dawn').length,2);
  assert.equal(Object.keys(s.ledger.entries).filter(id=>id.startsWith('hire-day-')).length,2);
});

test('QA-029/031: Growth cannot cure dry pre-existing debt; manual watering resumes its 1.5 rate',()=>{
  const s=farm(),p=sow(s,'maiz');firstCare(s,p);grow(s,126);close(p.growth,126);
  castGrowth(s,p);grow(s,10);close(p.growth,126);assert.equal(p.water[1].status,'due');
  assert.equal(waterPlant(p),true);Game.rebuildTasks(s);grow(s,15);close(p.growth,148.5);
  close(s.spells[0].remaining,5);assert.equal(p.water[1].status,'manual');
  assert.equal(numberOf(s.ledger.balance),9992);
});

test('QA-024/029: Growth on a newly paid sprout never completes its initial sowing/watering task',()=>{
  const s=farm(),p=sow(s);castGrowth(s,p);grow(s,30);
  assert.equal(p.growth,0);assert.equal(p.water[0].status,'due');assert.equal(s.tasks.length,1);
  assert.equal(s.tasks[0].kind,'initial');assert.equal(s.spells.length,0);assert.equal(numberOf(s.ledger.balance),9995);
  firstCare(s,p);grow(s,1);close(p.growth,1);
});

test('QA-030/032: a checkpoint at the exact Growth expiry is satisfied once with no deferred water task',()=>{
  const s=farm(),p=sow(s,'maiz');firstCare(s,p);grow(s,45);castGrowth(s,p);grow(s,30);
  close(p.growth,90);assert.equal(p.water[1].status,'magic');assert.equal(p.water[2].status,'future');
  assert.equal(s.spells.length,0);assert.equal(s.tasks.filter(t=>t.kind==='water').length,0);
  Game.rebuildTasks(s);grow(s,1);close(p.growth,91);assert.equal(s.tasks.filter(t=>t.kind==='water').length,0);
  assert.equal(p.water.length,3);
});

test('QA-030: each canonical species satisfies only the threshold crossed within the 30-second Growth effect',()=>{
  for(const species of ['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano']){
    const s=farm(),p=sow(s,species);firstCare(s,p);const start=p.water[1].at-1;grow(s,start);
    castGrowth(s,p);grow(s,30);close(p.growth,start+45);
    assert.equal(p.water[1].status,'magic');assert.ok(p.water.slice(2).every(w=>w.status==='future'));
    assert.equal(s.spells.length,0);Game.rebuildTasks(s);assert.equal(s.tasks.length,0);
  }
});

test('QA-029/031: an actual worker waters dry sunflower during Growth, then the next checkpoint is satisfied by magic',()=>{
  const s=farm(),p=sow(s,'girasol');firstCare(s,p);grow(s,96);close(p.growth,96);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
  for(let i=0;i<600&&s.workers[0].status==='arriving';i++)grow(s,.05);
  assert.equal(s.workers[0].status,'walking');close(p.growth,96);castGrowth(s,p);
  let watered=false;
  for(let i=0;i<600&&!watered;i++){
    close(p.growth,96);grow(s,.05);watered=s.events.some(e=>e.type==='WaterSatisfied'&&e.targetId===p.id);
  }
  assert.equal(watered,true);assert.equal(p.water[1].status,'manual');assert.ok(s.spells[0]?.remaining>16);
  grow(s,16);close(p.growth,120);assert.equal(p.water[2].status,'magic');
  assert.equal(s.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===p.id).length,1);
});

function ripe(p){p.growth=cropSpec(p.species).growth_seconds;p.water.forEach(w=>{w.status='manual';w.wait=0;});}
test('QA-025/026/028: mixed group harvest reserves distinct plants for two workers and pays each delivered crate once',()=>{
  const s=farm(),ps=[0,1,2,3].map(i=>sow(s,'mijo',8+i*1.5));
  ps.forEach((p,i)=>i%2===0?ripe(p):waterPlant(p));Game.rebuildTasks(s);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:2});const balance=numberOf(s.ledger.balance);
  Game.harvest(s,'harvest-a',ps[2].id);Game.harvest(s,'harvest-b',ps[0].id);
  assert.equal(s.tasks.filter(t=>t.kind==='harvest').length,2);assert.equal(ps[1].harvestRequested,false);
  let parallel=false;
  for(let i=0;i<1000&&(s.crates.length<2||s.crates.some(c=>!c.delivered));i++){
    grow(s,.05);
    const reserved=s.tasks.filter(t=>t.kind==='harvest'&&t.workerId);
    if(reserved.length===2){assert.equal(new Set(reserved.map(t=>t.workerId)).size,2);assert.equal(new Set(reserved.map(t=>t.targetId)).size,2);parallel=true;}
  }
  assert.equal(parallel,true);assert.equal(s.crates.length,2);assert.ok(s.crates.every(c=>c.delivered));assert.equal(new Set(s.crates.map(c=>c.sourcePlantId)).size,2);
  assert.equal(numberOf(s.ledger.balance),balance+22);assert.equal(s.events.filter(e=>e.type==='CropPicked').length,2);
  grow(s,1);assert.equal(numberOf(s.ledger.balance),balance+22);assert.ok(ps.filter((_,i)=>i%2).every(p=>p.alive));
});

test('QA-027: automatic maturity preserves an older watering task and adds each harvest once in creation order',()=>{
  const s=farm(),ps=[0,1,2].map(i=>sow(s,'mijo',8+i*1.5));
  const older=sow(s,'maiz',20);firstCare(s,older);older.growth=90;older.water[1].status='due';
  s.tasks=[];enqueue(s,s.structures[0].id,'water',older.id);ps.forEach(ripe);grow(s,.001);
  assert.deepEqual(s.tasks.map(t=>t.targetId),[older.id,ps[0].id,ps[1].id,ps[2].id]);
  assert.ok(s.tasks.every((t,i,a)=>i===0||t.created>a[i-1].created));
  grow(s,1);assert.equal(s.tasks.length,4);assert.ok(ps.every(p=>p.harvestRequested));
});

test('QA-033: Multiply requested before harvest does not reward a pickup after the effect expires',()=>{
  const s=farm(),p=sow(s,'mijo',70);ripe(p);Game.rebuildTasks(s);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  Game.cast(s,'multiply','multiply',p.x,p.z,nav);Game.harvest(s,'harvest',p.id);
  for(let i=0;i<2400&&s.crates.length===0;i++)grow(s,.05);
  assert.equal(s.crates.length,1);assert.equal(s.spells.length,0);close(numberOf(s.crates[0].value),10.8);
  const balance=numberOf(s.ledger.balance);for(let i=0;i<2000&&!s.crates[0].delivered;i++)grow(s,.05);assert.equal(numberOf(s.ledger.balance),balance+11);
  assert.equal(s.events.filter(e=>e.type==='CropPicked').length,1);
});

test('QA-034: male pickup within Multiply fixes one 21.6-valued crate, rounds delivery to 22 and survives reload',()=>{
  let s=farm();const p=sow(s);ripe(p);Game.rebuildTasks(s);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  Game.harvest(s,'harvest',p.id);
  for(let i=0;i<1200&&s.workers[0].status!=='acting';i++)grow(s,.05);
  assert.equal(s.workers[0].status,'acting');Game.cast(s,'multiply','multiply',p.x,p.z,nav);
  for(let i=0;i<100&&s.crates.length===0;i++)grow(s,.05);
  assert.equal(s.crates.length,1);assert.ok(s.spells[0].remaining>0);close(numberOf(s.crates[0].value),21.6);
  const value=JSON.stringify(s.crates[0].value),balance=numberOf(s.ledger.balance);
  s=deserialize(serialize(s));grow(s,30);assert.equal(s.spells.length,0);assert.equal(JSON.stringify(s.crates[0].value),value);
  assert.equal(numberOf(s.ledger.balance),balance+22);assert.equal(s.crates[0].delivered,true);
  grow(s,30);assert.equal(numberOf(s.ledger.balance),balance+22);
  assert.equal(Object.keys(s.ledger.entries).filter(id=>id.startsWith('deliver:')).length,1);
});
