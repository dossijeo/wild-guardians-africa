import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {BALANCE as B} from '../src/simulation/balance.js';
import * as Game from '../src/simulation/game.js';
import {dawnMinimum} from '../src/simulation/rules.js';
import {numberOf,rational,transact} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
const G='9263721068782e19fbbe2b11f582f361fac89b8b';
function fixture(){
 const s=Game.newGame({seed:712,slotId:'center-cost-h'});Game.resume(s,'intro');s.tutorial.step='done';
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 return {s,nav};
}
test('H parameter is only center cost versus G; the functional links are exact config substitutions',()=>{
 const old=JSON.parse(execFileSync('git',['show',`${G}:content/balance/balance_confirmado.json`],{encoding:'utf8'}));
 const current=JSON.parse(readFileSync(new URL('../content/balance/balance_confirmado.json',import.meta.url),'utf8'));
 assert.equal(old.work_center.cost,800);assert.equal(current.work_center.cost,600);old.work_center.cost=600;assert.deepEqual(current,old);
 for(const [file,transform] of [['src/simulation/game.js',s=>s.replaceAll('cost:800','cost:B.work_center.cost').replace("kind==='center'?800:","kind==='center'?B.work_center.cost:")],['src/simulation/rules.js',s=>s.replace('(center?0:800)','(center?0:B.work_center.cost)')]]){
  const prior=execFileSync('git',['show',`${G}:${file}`],{encoding:'utf8'});
  assert.equal(readFileSync(new URL('../'+file,import.meta.url),'utf8'),transform(prior));
 }
 const harness=readFileSync(new URL('../tools/check_intensive_farm.mjs',import.meta.url),'utf8');
 assert.equal(harness,execFileSync('git',['show',`${G}:tools/check_intensive_farm.mjs`],{encoding:'utf8'}));
 assert.ok(harness.includes('Math.max(100,...s.structures.filter(operational)'));
});
test('Preview, actual charge, entity repair basis and reconstruction requirement use H600',()=>{
 const {s,nav}=fixture();assert.equal(B.work_center.cost,600);
 const preview=Game.previewCenter(s,{x:10,z:0},nav);assert.equal(preview.valid,true);assert.equal(preview.cost,600);
 assert.equal(dawnMinimum(s),635);Game.placeStructure(s,'center',{x:10,z:0},nav);
 assert.equal(s.structures[0].cost,600);assert.equal(numberOf(s.ledger.balance),900);assert.deepEqual(s.ledger.entries.center,rational(-600));
 assert.equal(dawnMinimum(s),35);assert.deepEqual(Game.repairCost({...s.structures[0],hp:550}),rational(50));
 assert.deepEqual(Game.repairCost({...s.structures[0],hp:0,status:'ruined'}),rational(600));
 const invalid=Game.previewCenter(s,{x:10,z:0},{...nav,placement:()=>({valid:false,reason:'fixture rejection'})});
 assert.equal(invalid.cost,600);
});
test('Original800 remains functionally equivalent when the canonical cost is restored in an isolated test',()=>{
 const previous=B.work_center.cost;try{
  B.work_center.cost=800;const {s,nav}=fixture();assert.equal(dawnMinimum(s),835);
  assert.equal(Game.previewCenter(s,{x:10,z:0},nav).cost,800);Game.placeStructure(s,'center',{x:10,z:0},nav);
  assert.equal(numberOf(s.ledger.balance),700);assert.equal(s.structures[0].cost,800);
  assert.deepEqual(Game.repairCost({...s.structures[0],hp:550}),rational(200,3));
 }finally{B.work_center.cost=previous;}
});
test('The existing hiring reserve remains30; a purchase can leave exactly the policy maintenance100',()=>{
 const {s,nav}=fixture();transact(s.ledger,'fixture-budget',rational(-800));Game.placeStructure(s,'center',{x:10,z:0},nav);assert.equal(numberOf(s.ledger.balance),100);
 const f=fixture();transact(f.s.ledger,'fixture-budget',rational(-871));const before=serialize(f.s);
 assert.throws(()=>Game.placeStructure(f.s,'center',{x:10,z:0},f.nav),e=>e.code==='hiring-reserve');assert.equal(serialize(f.s),before);
});
test('Native worker physically repairs a half-HP centre after save restoration, ceiling debit once on arrival',()=>{
 let {s,nav}=fixture();Game.placeStructure(s,'center',{x:10,z:0},nav);const center=s.structures[0];center.hp=599.5;
 Game.plant(s,'seed','mijo',20,10,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});s.dayPlan.done=true;
 assert.deepEqual(Game.repairCost(center),rational(1,2));Game.requestRepair(s,'repair',center.id);const cash=numberOf(s.ledger.balance),task=s.tasks.find(t=>t.kind==='repair');
 s=deserialize(serialize(s));nav.setState(s);assert.equal(s.structures[0].hp,599.5);assert.equal(numberOf(s.ledger.balance),cash);
 let elapsed=0;while(!s.events.some(e=>e.type==='RepairApplied')&&elapsed<180){Game.tick(s,.05,nav);elapsed+=.05;}
 assert.ok(s.events.some(e=>e.type==='RepairApplied'));assert.equal(s.structures[0].hp,600);assert.equal(numberOf(s.ledger.balance),cash-1);
 assert.deepEqual(s.ledger.entries['repair:'+task.id],rational(-1));assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,1);
});
