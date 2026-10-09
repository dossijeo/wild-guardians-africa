import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {hitStructure,animalSpec,collapseThreshold} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf,rational} from '../src/simulation/money.js';
test('F isolated centre survives eight native half-damage rhino hits',()=>{
 const center={kind:'center',maxHp:600,hp:600,status:'intact',collapseRemaining:0};
 assert.equal(animalSpec('rhino').structure_hit_damage,30);
 for(let i=0;i<8;i++)hitStructure(center,animalSpec('rhino').structure_hit_damage,i);
 assert.equal(center.hp,360);assert.equal(center.status,'intact');assert.equal(collapseThreshold(center),126);
 assert.deepEqual(Game.repairCost({...center,cost:800}),rational(320));
});
test('F half-HP persists and physical repair charges integer ceiling on arrival',()=>{
 let s=Game.newGame({seed:712,slotId:'half-repair-fixture'});Game.resume(s,'intro');s.tutorial.step='done';
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:10,z:0},nav);Game.placeStructure(s,'wall',{kind:'wall',material:'adobe',x:35,z:0},nav);
 const id=s.structures.at(-1).id;hitStructure(s.structures.at(-1),animalSpec('hyena').structure_hit_damage,0);
 assert.equal(s.structures.at(-1).hp,287.5);assert.deepEqual(Game.repairCost(s.structures.at(-1)),rational(35,24));
 Game.plant(s,'seed','mijo',20,10,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});s.dayPlan.done=true;
 Game.requestRepair(s,'repair-order',id);assert.equal(numberOf(s.ledger.balance),630);
 s=deserialize(serialize(s));nav.setState(s);assert.equal(s.structures.find(x=>x.id===id).hp,287.5);
 const repairId=s.tasks.find(t=>t.kind==='repair').id;
 let elapsed=0;while(!s.events.some(e=>e.type==='RepairApplied')&&elapsed<180){Game.tick(s,.05,nav);elapsed+=.05;}
 assert.ok(s.events.some(e=>e.type==='RepairApplied'));
 assert.equal(s.structures.find(x=>x.id===id).hp,300);assert.equal(numberOf(s.ledger.balance),628);
 assert.deepEqual(s.ledger.entries['repair:'+repairId],rational(-2));
 assert.equal(s.ledger.balance.d,'1');assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,1);
});
