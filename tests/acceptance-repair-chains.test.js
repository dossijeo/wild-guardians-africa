import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {repairRoute} from '../src/world/work-points.js';
import {numberOf,rational,transact} from '../src/simulation/money.js';
import {hitStructure} from '../src/simulation/rules.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Real Navigation and native building/wall footprints on an explicitly flat,
// prop-free terrain fixture. Workers move exclusively through Game.tick.
function fixture(){
 const s=Game.newGame({seed:712,slotId:'repair-acceptance'});Game.resume(s,'intro');s.tutorial.step='done';
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:10,z:0},nav);Game.placeStructure(s,'wall',{kind:'wall',material:'adobe',x:35,z:0},nav);
 const target=s.structures.at(-1);target.hp=219;Game.plant(s,'opening-crop','mijo',20,10,nav);
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});s.dayPlan.done=true;
 assert.equal(numberOf(s.ledger.balance),60);
 return {s,nav,target,worker:s.workers[0]};
}
function until(s,nav,condition,limit=180){
 let elapsed=0;
 while(!condition()&&elapsed<limit&&!s.result&&!s.pauses.length){
  const positions=s.workers.map(w=>({x:w.x,z:w.z})),approaches=s.workers.map(w=>{const t=s.tasks.find(t=>t.id===w.taskId),target=s.structures.find(e=>e.id===t?.targetId);return w.taskApproach?.destination??(t?.kind==='repair'&&target?repairRoute(w,target,nav)?.destination:null);}),repairs=s.events.filter(e=>e.type==='RepairApplied').length;
  Game.tick(s,.05,nav);elapsed+=.05;
  for(const [i,w] of s.workers.entries())assert.ok(nav.segmentClear(positions[i],w,.28,null,true),'worker must follow collision-safe physical segments');
  if(s.events.filter(e=>e.type==='RepairApplied').length>repairs)assert.ok(s.workers.some((w,i)=>approaches[i]&&Math.hypot(w.x-approaches[i].x,w.z-approaches[i].z)<1e-7),'restoration must occur at the physical repair service point');
 }
 assert.ok(condition(),`Unreached at ${s.time}, after ${elapsed}s`);
}
function ordered(){
 const f=fixture();Game.requestRepair(f.s,'repair-order',f.target.id);
 assert.equal(numberOf(f.s.ledger.balance),60);assert.equal(f.s.tasks.filter(t=>t.kind==='repair').length,1);
 until(f.s,f.nav,()=>f.worker.status==='walking'&&f.s.tasks.find(t=>t.id===f.worker.taskId)?.kind==='repair');
 assert.ok(Math.hypot(f.worker.x-f.target.x,f.worker.z-f.target.z)>10);
 assert.equal(numberOf(f.s.ledger.balance),60);return f;
}
function spendFiftyFive(s,nav){
 for(let i=0;i<5;i++)Game.placeStructure(s,`other-wall-${i}`,{kind:'wall',material:'zarzas',x:-20+i*4,z:15},nav);
 Game.plant(s,'other-seed','mijo',-20,30,nav);assert.equal(numberOf(s.ledger.balance),5);
}

test('QA-076/078: physical repair journey has no reserved debit and recalculates increased damage on arrival',()=>{
 const {s,nav,target}=ordered();assert.deepEqual(Game.repairCost(target),rational(189,20));
 hitStructure(target,51,s.elapsed);nav.setState(s);assert.equal(target.hp,168);assert.deepEqual(Game.repairCost(target),rational(77,5));
 until(s,nav,()=>s.events.some(e=>e.type==='RepairApplied'));
 assert.equal(target.hp,300);assert.equal(target.status,'intact');assert.equal(target.wallPresentation.to,1);assert.equal(target.wallPresentation.collapseFrom,undefined);assert.equal(numberOf(s.ledger.balance),44);
 assert.deepEqual(Object.values(s.ledger.entries).filter(v=>v.n==='-16'),[rational(-16)]);
});

test('QA-077: genuine purchases exhaust request funds; rejection adds no task, command or partial payment',()=>{
 const {s,nav,target}=fixture();spendFiftyFive(s,nav);const before=serialize(s);
 assert.throws(()=>Game.requestRepair(s,'unaffordable',target.id),/Fondos insuficientes/);
 assert.equal(serialize(s),before);assert.ok(!s.tasks.some(t=>t.kind==='repair'));
});

test('QA-080: funds spent on other defenses while walking cancel repair only at physical arrival',()=>{
 const {s,nav,target,worker}=ordered();spendFiftyFive(s,nav);
 const task=s.tasks.find(t=>t.id===worker.taskId);assert.equal(task.kind,'repair');assert.equal(task.workerId,worker.id);
 until(s,nav,()=>!s.tasks.some(t=>t.id===task.id));
 assert.equal(target.hp,219);assert.equal(target.status,'intact');assert.equal(numberOf(s.ledger.balance),5);
 assert.ok(s.messages.some(m=>m.target===target.id&&m.text.includes('fondos insuficientes')));
 assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,0);assert.ok(!Object.keys(s.ledger.entries).some(id=>id.startsWith('repair:')));
});

test('QA-079: still-valid order persists through full ruin and reload; real arrival reconstructs for original full cost',()=>{
 let {s,nav,target}=ordered();hitStructure(target,219);nav.setState(s);
 until(s,nav,()=>target.status==='ruined',2);
 assert.equal(target.hp,0);assert.equal(numberOf(s.ledger.balance),60);assert.ok(s.tasks.some(t=>t.kind==='repair'));
 s=deserialize(serialize(s));nav.setState(s);target=s.structures.find(t=>t.id===target.id);
 until(s,nav,()=>target.status==='intact');
 assert.equal(target.hp,300);assert.equal(target.collapseRemaining,0);assert.equal(numberOf(s.ledger.balance),25);
 assert.equal(s.events.filter(e=>e.type==='RepairApplied'&&e.targetId===target.id).length,1);
});

test('QA-082: outside an attack, full destruction just before physical arrival becomes reconstruction without canceling the surviving order',()=>{
 const {s,nav,target,worker}=ordered();until(s,nav,()=>worker.taskApproach&&Math.hypot(worker.x-worker.taskApproach.destination.x,worker.z-worker.taskApproach.destination.z)<.25);
 hitStructure(target,219);nav.setState(s);assert.equal(target.status,'collapsing');assert.equal(target.collapseRemaining,1.4);assert.equal(s.raid,null);
 until(s,nav,()=>target.status==='intact',1);
 assert.equal(numberOf(s.ledger.balance),25);assert.equal(target.hp,300);assert.equal(target.collapseRemaining,0);
 assert.ok(!s.events.some(e=>e.type==='StructureRuined'&&e.targetId===target.id));assert.ok(!s.tasks.some(t=>t.kind==='repair'));
});

test('QA-081/082: active raid cancels walking repair before any arrival; it is not regenerated after real retreat or reload',()=>{
 const {s,nav,target,worker}=ordered();spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);
 assert.equal(worker.status,'fleeing');assert.equal(worker.taskId,null);assert.ok(!s.tasks.some(t=>t.kind==='repair'));
 until(s,nav,()=>s.raid===null,180);
 assert.equal(numberOf(s.ledger.balance),60);assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,0);
 Game.rebuildTasks(s);const loaded=deserialize(serialize(s));nav.setState(loaded);Game.tick(loaded,5,nav);
 assert.ok(!loaded.tasks.some(t=>t.kind==='repair'));assert.equal(numberOf(loaded.ledger.balance),60);
 assert.equal(loaded.events.filter(e=>e.type==='RepairApplied'&&e.targetId===target.id).length,0);
});

test('QA-083 settlement: replay, repeated ticks and reload after physical repair never debit or restore twice',()=>{
 const {s,nav,target}=ordered();until(s,nav,()=>target.hp===target.maxHp);
 assert.equal(numberOf(s.ledger.balance),50);
 const repairId=Object.keys(s.ledger.entries).find(id=>id.startsWith('repair:'));assert.ok(repairId);
 assert.equal(transact(s.ledger,repairId,rational(-10)),false);Game.tick(s,5,nav);
 const loaded=deserialize(serialize(s));nav.setState(loaded);Game.tick(loaded,5,nav);
 assert.equal(numberOf(loaded.ledger.balance),50);assert.equal(loaded.events.filter(e=>e.type==='RepairApplied').length,1);
 assert.equal(loaded.structures.find(t=>t.id===target.id).hp,300);assert.ok(!loaded.tasks.some(t=>t.kind==='repair'));
});

test('QA-083: stale completion identity cannot restore later damage or emit a second repair burst',()=>{
 const {s,nav,target,worker}=ordered(),stale={...s.tasks.find(t=>t.id===worker.taskId)};
 until(s,nav,()=>target.hp===target.maxHp);assert.equal(numberOf(s.ledger.balance),50);
 hitStructure(target,20);nav.setState(s);assert.equal(target.hp,280);
 // Explicit callback replay fixture: same consumed task identity, not a new order.
 // The worker still follows the normal reservation/arrival route.
 s.tasks.push({...stale,workerId:null});
 until(s,nav,()=>!s.tasks.some(t=>t.id===stale.id));
 assert.equal(numberOf(s.ledger.balance),50);assert.equal(target.hp,280);
 assert.equal(s.events.filter(e=>e.type==='RepairApplied'&&e.targetId===target.id).length,1);
});
