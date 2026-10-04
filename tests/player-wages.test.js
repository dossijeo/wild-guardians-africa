import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {NPC_TYPES,hiringMarkup} from '../src/ui/native-hud.js';
import {PROFILES,hiringCost} from '../src/simulation/workforce.js';
import {HIRING_RESERVE,BUDGET_WARNING_THRESHOLD,ensurePurchaseBudget} from '../src/simulation/budget.js';
import {rational,numberOf,transact} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const nav={placement:()=>({valid:true,suppress:[]}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
test('all ages and sexes use the requested 30/40 wages in both hiring and the HUD',()=>{
 for(const id of ['olderMale','olderFemale','youngMale','youngFemale']){
  const expected=id.startsWith('older')?30:40;
  assert.equal(PROFILES.find(p=>p.id===id).wage,expected);
  assert.equal(NPC_TYPES.find(p=>p.id===id).wage,expected);
  assert.equal(hiringCost({[id]:3}),expected*3);
 }
 assert.equal(HIRING_RESERVE,30);assert.equal(BUDGET_WARNING_THRESHOLD,70);
 assert.ok(hiringMarkup({hiring:{hasPrevious:false,draft:[0,0,0,0]},day:1}).includes('Los ancianos cobran 30 monedas y los jóvenes 40.'));
});
test('a historical 100-coin debit survives reload unchanged; only the newly confirmed contract uses 30',()=>{
 const s=Game.newGame({slotId:'old-wage'});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:4,z:0},nav);
 transact(s.ledger,'historic-contract',rational(-100));s.day=2;Game.pause(s,'hiring');
 const restored=deserialize(serialize(s)),before=numberOf(restored.ledger.balance);
 assert.equal(restored.ledger.entries['historic-contract'].n,'-100');
 Game.hire(restored,'new-contract',{olderFemale:1});
 assert.equal(numberOf(restored.ledger.balance),before-30);
 assert.equal(restored.ledger.entries['historic-contract'].n,'-100');assert.equal(restored.ledger.entries['new-contract'].n,'-30');
 assert.equal(Game.hire(restored,'repeat',{olderFemale:1}),false);
});
test('optional spending can reach exactly the minimum hiring reserve but cannot consume it',()=>{
 const s=Game.newGame();s.ledger.balance=rational(35);
 assert.doesNotThrow(()=>ensurePurchaseBudget(s,5));assert.throws(()=>ensurePurchaseBudget(s,6),e=>e.code==='hiring-reserve');
 assert.equal(numberOf(s.ledger.balance),35);
});
