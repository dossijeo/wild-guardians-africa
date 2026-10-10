import test from 'node:test';
import assert from 'node:assert/strict';
import {commitAgriculturalPower,settleMultiplyPower,consumeGrowthPower,agriculturalPowerReport,validateAgriculturalPower} from '../src/simulation/agricultural-power.js';
import {numberOf,compare,rational} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
import {createPlant,waterPlant,advancePlant} from '../src/simulation/crops.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {cropSpec} from '../src/simulation/rules.js';
const state=()=>({day:1,plants:[],crates:[],spells:[]});
test('200 distinct applications retain measurable declining marginal power without exceeding either budget',()=>{
 for(const [kind,reference,budget] of [['growth',15,180],['multiply',11,132]]){
  const s=state();let prior=Infinity;
  for(let i=1;i<=200;i++){
   const p={id:'p'+i};s.plants.push(p);const power=commitAgriculturalPower(s,p,kind,reference),amount=numberOf(power.amount);
   assert.ok(amount>0&&amount<prior);prior=amount;
   const report=agriculturalPowerReport(s)[kind];assert.ok(compare(report.committed,rational(budget))<0);
   assert.ok(Math.abs(numberOf(report.committed)-budget*i/(12+i))<1e-9);validateAgriculturalPower(s);
  }
 }
});
test('aggregate entitlement is order invariant for cheap and expensive crops; repeat touches cannot mint another harvest bonus',()=>{
 const run=prices=>{const s=state();for(const price of prices){const p={};commitAgriculturalPower(s,p,'multiply',price);const before=JSON.stringify(s.agriculturalPower.days[1].multiply.committed);assert.equal(commitAgriculturalPower(s,p,'multiply',price).benefited,false);assert.equal(JSON.stringify(s.agriculturalPower.days[1].multiply.committed),before);}return agriculturalPowerReport(s).multiply.committed;};
 assert.equal(compare(run([11,400,27]),run([27,11,400])),0);
});
test('fractional payouts cannot exploit ceil: paid whole coins equal floor of delivered entitlements and settlement is idempotent',()=>{
 const s=state();let paid=0;
 for(let i=0;i<200;i++){const p={};const power=commitAgriculturalPower(s,p,'multiply',11),crate={multiplyPower:{day:power.day,amount:power.amount}};s.crates.push(crate);paid+=numberOf(settleMultiplyPower(s,crate));assert.equal(numberOf(settleMultiplyPower(s,crate)),0);}
 assert.equal(paid,124);assert.ok(paid<=132);validateAgriculturalPower(s);
});
test('day rollover does not refund commitments or increase one plant lifetime growth cap',()=>{
 const s=state(),p={};s.plants.push(p);
 for(let day=1;day<=100;day++){s.day=day;commitAgriculturalPower(s,p,'growth',11);assert.ok(numberOf(p.growthPowerCommitted)<=15);}
 assert.ok(numberOf(p.growthPowerCommitted)>14.99);validateAgriculturalPower(s);
 const first=JSON.stringify(s.agriculturalPower.days[1]);s.day=101;commitAgriculturalPower(s,{},'growth',11);assert.equal(JSON.stringify(s.agriculturalPower.days[1]),first);
});
test('execution records actual growth only; unused power remains committed',()=>{
 const s=state(),p={},power=commitAgriculturalPower(s,p,'growth',11),spell={power};
 consumeGrowthPower(s,spell,2);assert.equal(numberOf(agriculturalPowerReport(s).growth.consumed),2);
 consumeGrowthPower(s,spell,100);assert.equal(compare(agriculturalPowerReport(s).growth.consumed,power.amount),0);
});
test('fractional Growth does not grant a free watering checkpoint; legacy full-strength snapshots retain their old behavior',()=>{
 const p=createPlant('a','mijo',0,0,null),legacy=createPlant('b','mijo',0,0,null);waterPlant(p);waterPlant(legacy);
 advancePlant(p,100,.01);advancePlant(legacy,100,true);
 assert.ok(p.water.some(w=>w.status==='due'));assert.ok(legacy.water.some(w=>w.status==='magic'));
});
test('native casts, active powers and pending harvest entitlement survive reload without replenishment',()=>{
 const nav={placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};let s=Game.newGame({slotId:'power-save',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);Game.plant(s,'seed','mijo',6,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 const p=s.plants[0];waterPlant(p);Game.cast(s,'multiply','multiply',p.x,p.z,nav,p.id);
 const before=JSON.stringify(s.agriculturalPower);s=deserialize(serialize(s));assert.equal(JSON.stringify(s.agriculturalPower),before);
 Game.tick(s,15,nav);Game.cast(s,'duplicate','multiply',p.x,p.z,nav,p.id);assert.equal(s.events.at(-1).benefited,false);assert.equal(numberOf(s.plants[0].multiplyPower.amount),132/13);
 const corrupt=JSON.parse(serialize(s));corrupt.agriculturalPower.days[1].multiply.committed=rational(133);assert.throws(()=>deserialize(JSON.stringify(corrupt)),/espiritual/);
});
test('one expensive harvest cannot absorb the whole daily budget and composition does not inflate the reference capacity',()=>{
 const s=state(),power=commitAgriculturalPower(s,{},'multiply',100000);
 assert.ok(numberOf(power.amount)<11);assert.ok(power.intensity<.00011);
 assert.equal(numberOf(agriculturalPowerReport(s).multiply.budget),132);
 assert.equal(compare(power.amount,commitAgriculturalPower(state(),{},'multiply',11).amount),0);
});
test('fractional Growth preserves agricultural event water penalties at the next real checkpoint',()=>{
 const p=createPlant('penalty','mijo',0,0,null);waterPlant(p);p.nextTolerancePenalty=.5;
 advancePlant(p,p.water[1].at/1.25,.5);
 assert.equal(p.water[1].status,'due');assert.equal(p.nextTolerancePenalty,0);
 assert.ok(Math.abs(p.water[1].wait-cropSpec('mijo').derived_tolerance_seconds*.5)<1e-7);
});
test('expired and destroyed commitments are forfeited, never incorrectly reported as pending or refunded',()=>{
 const s=state(),p={id:'expired',alive:true};s.plants.push(p);
 const power=commitAgriculturalPower(s,p,'growth',11);s.spells.push({kind:'growth',targetPlantId:p.id,remaining:30,power});
 assert.equal(compare(agriculturalPowerReport(s).growth.pending,power.amount),0);
 s.spells[0].remaining=0;assert.equal(numberOf(agriculturalPowerReport(s).growth.pending),0);
 assert.equal(compare(agriculturalPowerReport(s).growth.forfeited,power.amount),0);
 const m=commitAgriculturalPower(s,p,'multiply',11);p.alive=false;
 assert.equal(numberOf(agriculturalPowerReport(s).multiply.pending),0);
 assert.equal(compare(agriculturalPowerReport(s).multiply.forfeited,m.amount),0);
 assert.equal(compare(agriculturalPowerReport(s).multiply.available,rational(132)), -1);
});
test('the native worker must harvest and deliver before any committed Multiply income enters the ledger',()=>{
 const nav={placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
 let s=Game.newGame({slotId:'power-delivery',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);Game.plant(s,'seed','mijo',6,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});s.tutorial.step='done';s.dayPlan={done:true};
 const p=s.plants[0],balance=numberOf(s.ledger.balance);Game.cast(s,'multiply','multiply',p.x,p.z,nav,p.id);assert.equal(numberOf(s.ledger.balance),balance);
 s=deserialize(serialize(s));Game.tick(s,299,nav);
 const crate=s.crates.find(c=>c.delivered);assert.ok(crate);assert.ok(s.events.some(e=>e.type==='CropPicked'));
 assert.equal(numberOf(crate.multiplyIncome),10);assert.equal(numberOf(s.ledger.entries['deliver:'+crate.id]),cropSpec('mijo').base_harvest_value+10);
 assert.equal(numberOf(s.ledger.balance),balance+21);assert.equal(numberOf(agriculturalPowerReport(s).multiply.liquidated),132/13);
 s=deserialize(serialize(s));const paid=s.agriculturalPower.days[1].multiply.paid;assert.equal(numberOf(settleMultiplyPower(s,s.crates[0])),0);assert.equal(s.agriculturalPower.days[1].multiply.paid,paid);
});
