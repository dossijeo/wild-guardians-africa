import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {rational} from '../src/simulation/money.js';
import {createQ14LabourPolicy} from '../tools/native-q14-labour-policy.mjs';
function fixture(){
 const s=Game.newGame({seed:712,slotId:'q14-unit'}),nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);
 for(let n=0;n<60;n++)assert(Game.plant(s,'p'+n,'mijo',n%10*1.5,Math.floor(n/10)*1.5,nav));
 const q=createQ14LabourPolicy();Game.openInitialHiring(s);Game.hire(s,'daily',{olderFemale:6});q.hired(s,6,{daily:true});
 return {s,nav,q};
}
test('measured unfunded hire reserves cash without changing world or granting a contract',()=>{
 const {s,nav,q}=fixture();let held=false;
 for(let i=0;i<175;i++){
  const before=serialize(s),plan=q.additional(s,{seedCost:5});assert.equal(serialize(s),before);
  if(plan?.plantingHold){
   assert.equal(plan.count,0);assert.equal(q.reserve(),plan.cost+plan.recoveryReserve);
   assert.equal(q.canSpend(s,5),false);assert.equal(s.workers.length,6);held=true;break;
  }
  Game.tick(s,1,nav);q.observe(s);
 }
 assert(held,'Real initial watering and busy native task backlog must trigger the reserve');
 const restored=deserialize(serialize(s)),restoredBefore=serialize(restored);
 assert.equal(q.canSpend(restored,5),false);q.observe(restored);q.observe(restored);
 assert.equal(serialize(restored),restoredBefore);assert(q.report().plannedHireBudget.reservation);
 const before=serialize(s);assert.throws(()=>q.canSpend(s,-1));assert.equal(serialize(s),before);
 s.time=180;assert.equal(q.canSpend(s,5),true);assert.equal(q.reserve(),180);
});
test('no saturation means no savings lock; daily renewal clears an old intention',()=>{
 const {s,q}=fixture();assert.equal(q.reserve(),180);assert(q.canSpend(s,5));
 assert.equal(q.additional(s),null);assert.equal(q.report().plannedHireBudget.reservation,null);
 s.day=2;s.time=0;s.ledger.balance=rational(700);const before=serialize(s),plan=q.dawn(s);
 assert.equal(serialize(s),before);assert.equal(plan.cost,180);assert.equal(q.report().plannedHireBudget.reservation,null);
});

test('native paid additional hire clears the intention and reserves only the actual renewed crew',()=>{
 const {s,nav,q}=fixture();let held=false;
 for(let i=0;i<175;i++){const plan=q.additional(s,{seedCost:5});if(plan?.plantingHold){held=true;break;}Game.tick(s,1,nav);q.observe(s);}
 assert(held);
 // Explicit unit funding change, not a campaign income or profitability claim.
 s.ledger.balance=rational(300);Game.tick(s,10,nav);const plan=q.additional(s,{seedCost:5});assert.equal(plan.count,1);
 const before=new Set(s.workers.map(w=>w.id));assert(Game.hireAdditional(s,'q14-paid-hire',{olderFemale:1},plan.centerId));
 q.hired(s,1,{id:'q14-paid-hire',centerId:plan.centerId,workerIds:s.workers.filter(w=>!before.has(w.id)).map(w=>w.id)});
 assert.equal(q.reserve(),210);assert.equal(q.report().plannedHireBudget.reservation,null);assert.equal(s.workers.length,7);
 assert.equal(q.report().history.at(-1).paidCoins,-Number(s.ledger.entries['q14-paid-hire'].n));
});
