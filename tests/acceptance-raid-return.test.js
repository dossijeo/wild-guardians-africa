import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {hitStructure,cropSpec} from '../src/simulation/rules.js';
import {rational} from '../src/simulation/money.js';
import {isMature} from '../src/simulation/crops.js';
import {SaveRepository} from '../src/persistence/snapshots.js';

function navigation(s){const n=new Navigation(712,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-48,-48,48,48];n.setState(s);return n;}
function until(s,nav,predicate,seconds=200){
 for(let i=0;!predicate()&&i<seconds*20&&!s.result&&!s.pauses.length;i++){
  const positions=s.workers.map(w=>({x:w.x,z:w.z}));Game.tick(s,.05,nav);
  for(const [j,w] of s.workers.entries())assert.ok(nav.segmentClear(positions[j],w,.28,null,true),'staff follow collision-safe physical segments');
 }
 assert.ok(predicate(),JSON.stringify({time:s.time,workers:s.workers.map(w=>w.status),raid:s.raid}));
}
function load(s){const storage=new Map(),repo=new SaveRepository({getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)});repo.save(s);return repo.load(s.slotId);}
function farm(culture){
 const s=Game.newGame({seed:712,culture,slotId:'return-'+culture});Game.resume(s,'intro');s.ledger.balance=rational(10000);const nav=navigation(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.placeStructure(s,'wall',{kind:'wall',material:'adobe',x:35,z:0},nav);
 s.day=3;s.completedNights=2;s.initialPreparation=false;s.tutorial.step='done';Game.pause(s,'hiring');Game.hire(s,'hire',{olderFemale:2});s.dayPlan={done:true};s.nightPlan={done:true};
 until(s,nav,()=>s.workers.every(w=>w.status==='idle'));return {s,nav};
}

for(const culture of Game.CULTURES)for(const kind of ['initial','water','harvest','crate'])test(`QA-104: ${culture} physical return regenerates ${kind} needs once, preserving requests but cancelling repairs`,()=>{
 let {s,nav}=farm(culture);Game.plant(s,'crop','mijo',8,4,nav);const plantId=s.plants[0].id;
 if(kind!=='initial')until(s,nav,()=>s.plants[0].water[0].status==='manual');
 if(kind==='water')until(s,nav,()=>s.plants[0].growth>=s.plants[0].water[1].at-.1);
 if(kind==='harvest'||kind==='crate'){until(s,nav,()=>isMature(s.plants[0]));Game.harvest(s,'harvest-order',plantId);}
 if(kind==='crate')until(s,nav,()=>s.workers.some(w=>w.status==='carrying'));
 const crateId=kind==='crate'?s.crates.find(c=>c.sourcePlantId===plantId).id:null;
 // Paid higher-value banana targets absorb the actual warthog budget. Neither
 // target choice, animal budget, position nor worker/crop state is overridden.
 for(let i=0;i<6;i++)Game.plant(s,'decoy-'+i,'platano',8+i*2,8,nav);
 const wall=s.structures[1];hitStructure(wall,30,s.elapsed);nav.setState(s);Game.requestRepair(s,'repair-order',wall.id);
 const repairId=s.tasks.find(t=>t.kind==='repair').id,workers=s.workers.map(w=>w.id),cash=JSON.stringify(s.ledger);
 const watersBefore=s.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===plantId).length;
 spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);const raid=s.raid,budget=raid.animals[0].hitsRemaining;
 assert.ok(s.workers.every(w=>w.status==='fleeing'&&w.taskId===null));assert.ok(!s.tasks.some(t=>t.id===repairId||t.kind==='repair'));
 until(s,nav,()=>!s.raid,100);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);assert.deepEqual(raid.reservations,{});
 assert.ok(raid.animals.every(a=>a.status==='gone'));assert.equal(s.result,null);assert.ok(s.time<300);
 assert.equal(s.events.filter(e=>e.type==='CropHit').length,budget);assert.equal(raid.animals[0].hitsRemaining,0);assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,Math.floor(budget/2));
 assert.ok(s.events.filter(e=>e.type==='CropDestroyed').every(e=>s.plants.find(p=>p.id===e.targetId).species==='platano'));
 assert.equal(s.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===plantId).length,watersBefore);
 assert.deepEqual(s.workers.map(w=>w.id),workers);assert.ok(s.workers.every(w=>w.status==='arriving'&&w.raidReturn));
 assert.equal(JSON.stringify(s.ledger),cash);assert.equal(wall.hp,wall.maxHp-30);assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,0);
 const target=s.plants.find(p=>p.id===plantId);assert.equal(target.alive,kind!=='crate');
 if(kind==='initial')assert.equal(target.growth,0);
 if(kind==='water')assert.equal(target.water[1].status,'due');
 if(kind==='harvest')assert.equal(target.harvestRequested,true);
 const taskTarget=crateId??plantId,needs=s.tasks.filter(t=>t.targetId===taskTarget);assert.equal(needs.length,1);assert.equal(needs[0].kind,kind);assert.equal(needs[0].workerId,null);
 if(crateId)assert.equal(s.crates.find(c=>c.id===crateId).carrierId,null);
 const keys=s.tasks.map(t=>t.kind+':'+t.targetId);assert.equal(new Set(keys).size,keys.length);assert.ok(!s.tasks.some(t=>t.kind==='repair'));
 // Reload while staff are physically returning. Continue with fresh navigation
 // and no caller-side queue rebuild: the original task must finish normally.
 s=load(s);nav=navigation(s);const restored=s.plants.find(p=>p.id===plantId),before=s.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===plantId).length;
 if(kind==='harvest'||kind==='crate'){
  until(s,nav,()=>s.crates.some(c=>c.sourcePlantId===plantId&&c.delivered),100);
  assert.equal(restored.harvestRequested,false);assert.equal(restored.alive,false);assert.equal(s.events.filter(e=>e.type==='CropPicked'&&e.targetId===plantId).length,1);
  const crate=s.crates.find(c=>c.sourcePlantId===plantId);assert.equal(s.events.filter(e=>e.type==='CrateDelivered'&&e.targetId===crate.id).length,1);assert.ok(Object.hasOwn(s.ledger.entries,'deliver:'+crate.id));
 }else{
  until(s,nav,()=>restored.water[kind==='initial'?0:1].status==='manual',100);
  assert.equal(s.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===plantId).length,before+1);
  if(kind==='initial'){assert.equal(restored.growth,0);Game.tick(s,.05,nav);assert.ok(restored.growth>0&&restored.growth<cropSpec('mijo').growth_seconds);}
 }
 assert.ok(!s.tasks.some(t=>t.kind==='repair'||t.targetId===taskTarget&&t.kind===kind));assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,0);
 assert.equal(s.structures.find(t=>t.id===wall.id).hp,wall.maxHp-30);assert.ok(!Object.keys(s.ledger.entries).some(k=>k.startsWith('repair:')));
 assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);assert.equal(s.events.filter(e=>e.type==='HiringConfirmed').length,1);
});
