import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {cropSpec} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {microState,reserveEvent,settleEvent,disableMicroEconomy} from '../src/microevents/economy.js';
import {Microevents} from '../src/microevents/controller.js';

// A controlled task-chain fixture, NOT a campaign or balance-survival run.
// Uses the ordinary paid commands, real task scheduler, worker movement,
// harvest modifiers, crate provenance, delivery settlement and save validator.
function fixture(mode){
  const s=Game.newGame({seed:712,slotId:'microevent-harvest'}),nav=new Navigation(712,'sabana',{});
  nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
  Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'banana','platano',8,4,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  s.day=101;s.completedNights=100;s.postgame=true;s.dayPlan={done:true};s.tutorial.step='done';s.initialPreparation=false;
  const w=s.workers[0],p=s.plants[0];Object.assign(w,{contractDay:101,status:'idle',x:7.4,z:4,path:null});
  p.water.forEach(w=>{w.status='manual';});p.growth=cropSpec(p.species).growth_seconds-.05;p.harvestBonus=30;
  Game.cast(s,'multiply','multiply',p.x,p.z,nav);
  const powers=structuredClone(s.cooldowns),commands=s.commandIds.length;
  if(mode!=='baseline'){
    const m=microState(s);m.previousIncome=10000;
    const result=settleEvent(s,reserveEvent(s,'birds',p.id),'ignored');assert.equal(result.reservedLoss,1);
    if(mode==='disabled')disableMicroEconomy(s);
  }
  assert.deepEqual(s.cooldowns,powers);assert.equal(s.commandIds.length,commands);assert.equal(p.multiplyHarvest,true);
  return {s,nav};
}
function until(s,nav,condition){for(let i=0;i<1200&&!condition();i++)Game.tick(s,.05,nav);assert.ok(condition(),'ordinary worker chain reaches its checkpoint');}

for(const mode of ['baseline','loss','disabled'])for(const reloadAt of ['ripe','carrying'])test(`bird deduction uses authoritative harvest and one delivery (${mode}, reload ${reloadAt})`,()=>{
  let {s,nav}=fixture(mode);const before=numberOf(s.ledger.balance),expected=mode==='loss'?426:427;
  if(reloadAt==='ripe'){s=deserialize(serialize(s));nav.setState(s);}
  until(s,nav,()=>s.crates.length===1);
  assert.equal(s.plants[0].alive,false);assert.equal(s.plants[0].multiplyHarvest,false);
  assert.equal(s.crates[0].sourcePlantId,s.plants[0].id);assert.equal(s.crates[0].delivered,false);
  assert.equal(numberOf(s.ledger.balance),before,'physical pickup does not pay early');
  assert.equal(numberOf(s.crates[0].value),mode==='loss'?416:416.52);
  assert.equal(s.events.filter(e=>e.type==='MicroeventHarvestLossApplied').length,mode==='loss'?1:0);
  if(mode==='loss'){assert.equal(s.events.find(e=>e.type==='MicroeventHarvestLossApplied').delta,-1);assert.deepEqual(s.microevents.pendingLosses,{});}
  if(reloadAt==='carrying'){s=deserialize(serialize(s));nav.setState(s);}
  until(s,nav,()=>s.crates[0].delivered);
  const balanceAtDelivery=numberOf(s.ledger.balance);
  assert.ok(balanceAtDelivery>=before+expected);
  assert.equal(numberOf(s.ledger.entries[`deliver:${s.crates[0].id}`]),expected);
  Game.tick(s,5,nav);assert.equal(numberOf(s.ledger.balance),balanceAtDelivery);
  assert.equal(s.crates.length,1);assert.equal(s.events.filter(e=>e.type==='CrateDelivered').length,1);
  assert.equal(s.events.filter(e=>e.type==='SpellActivated').length,1);
});

for(const flag of ['microeventEconomy','microeventLosses'])test(`disabling ${flag} clears a reserved deduction before the harvest frame`,()=>{
  const {s,nav}=fixture('loss'),w=s.workers[0],before=numberOf(s.ledger.balance);
  until(s,nav,()=>w.status==='acting'&&s.tasks.find(t=>t.id===w.taskId)?.kind==='harvest');
  Game.tick(s,w.actionRemaining-.01,nav);assert.equal(s.crates.length,0);
  const controller=Object.create(Microevents.prototype);Object.assign(controller,{state:s,settings:{microevents:'adaptive',[flag]:false},director:{m:s.microevents}});
  controller.beforeSimulation();assert.deepEqual(s.microevents.pendingLosses,{});
  Game.advanceReal(s,.05,nav);assert.equal(s.crates.length,1);assert.equal(numberOf(s.crates[0].value),416.52);
  assert.equal(s.events.filter(e=>e.type==='MicroeventHarvestLossApplied').length,0);
  until(s,nav,()=>s.crates[0].delivered);assert.ok(numberOf(s.ledger.balance)>=before+417);
});
