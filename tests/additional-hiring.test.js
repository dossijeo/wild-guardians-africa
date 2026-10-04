import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {hiringCost} from '../src/simulation/workforce.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
function ready(){
 const s=Game.newGame();Game.resume(s,'intro');const nav=new Navigation(712,'sabana',{});
 nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);
 Game.openInitialHiring(s);Game.hire(s,'morning',{olderFemale:1});return {s,nav};
}
test('additional wages use the remaining profile shift and round the complete charge up',()=>{
 assert.equal(hiringCost({olderMale:1},{time:125}),15);
 assert.equal(hiringCost({youngFemale:1},{time:150}),20);
 assert.equal(hiringCost({olderMale:1,youngFemale:1},{time:125}),39);
 assert.equal(hiringCost({youngFemale:2},{time:299}),1);
 assert.throws(()=>hiringCost({olderMale:1},{time:250}),/terminado/);
 assert.throws(()=>hiringCost({olderFemale:1},{time:300}),/terminado/);
});
test('midday hires preserve existing employees, FIFO assignments and daily plans, and survive reload',()=>{
 const {s,nav}=ready();Game.tick(s,20,nav);s.time=150;
 const existing=JSON.stringify(s.workers),tasks=JSON.stringify(s.tasks),plan=JSON.stringify(s.dayPlan),money=numberOf(s.ledger.balance);
 assert.equal(Game.hireAdditional(s,'afternoon',{youngFemale:1},s.structures[0].id),true);
 assert.equal(numberOf(s.ledger.balance),money-20);
 assert.equal(JSON.stringify(s.workers.slice(0,1)),existing);assert.equal(JSON.stringify(s.tasks),tasks);assert.equal(JSON.stringify(s.dayPlan),plan);
 assert.equal(s.workers[1].contractDay,s.day);assert.equal(s.workers[1].centerId,s.structures[0].id);
 assert.notEqual(s.workers[0].personId,s.workers[1].personId);
 const saved=serialize(s),loaded=deserialize(saved);assert.equal(serialize(loaded),saved);
 assert.equal(Game.hireAdditional(loaded,'afternoon',{youngFemale:1},s.structures[0].id),false);assert.equal(serialize(loaded),saved);
});
test('additional hires reject invalid centres, unaffordable counts, raids and ended shifts without charging',()=>{
 for(const scenario of ['centre','money','raid','shift']){
  const {s}=ready();s.time=150;let centre=s.structures[0].id,selection={youngFemale:1};
  if(scenario==='centre')centre='missing';if(scenario==='money')selection={youngFemale:100};if(scenario==='raid')s.raid={animals:[]};if(scenario==='shift')s.time=300;
  const before=JSON.stringify(s);assert.throws(()=>Game.hireAdditional(s,'invalid',selection,centre));assert.equal(JSON.stringify(s),before);
 }
});
test('the optional menu and a guided tutorial action do not block paid additional hiring',()=>{
 const {s}=ready();s.time=150;Game.pause(s,'tutorial-action');Game.pause(s,'menu');
 assert.equal(Game.hireAdditional(s,'guided-hire',{olderFemale:1},s.structures[0].id),true);
 assert.deepEqual(s.pauses,['tutorial-action','menu']);assert.equal(s.workers.length,2);
});
