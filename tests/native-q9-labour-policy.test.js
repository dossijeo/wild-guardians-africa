import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {applyCropImpact} from '../src/simulation/crop-impact-health.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createQ8LabourPolicy} from '../tools/native-q8-labour-policy.mjs';
import {createQ9LabourPolicy} from '../tools/native-q9-labour-policy.mjs';
import {parseNativeCampaignArgs,nativeCampaignProvenance} from '../tools/run_native_campaign.mjs';
function fixture(factory=createQ9LabourPolicy){
 const s=Game.newGame({seed:712,slotId:'q9-unit-fixture'}),nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);
 for(let n=0;n<30;n++)assert(Game.plant(s,'p'+n,'mijo',n%10*1.5,Math.floor(n/10)*1.5,nav));
 const q=factory();Game.openInitialHiring(s);Game.hire(s,'daily',{olderFemale:6});assert.equal(numberOf(s.ledger.entries.daily),-180);q.hired(s,6,{daily:true});
 for(let n=0;n<11;n++){
  const id='extra'+n,centerId=s.structures[0].id,before=new Set(s.workers.map(w=>w.id));
  assert(Game.hireAdditional(s,id,{olderFemale:1},centerId));
  q.hired(s,1,{id,centerId,workerIds:s.workers.filter(w=>!before.has(w.id)).map(w=>w.id)});
 }
 // Explicit unit budget, not an economic campaign or synthetic delivery.
 s.day=2;s.time=0;s.ledger.balance=rational(653);
 return {s,nav,q};
}
test('Q9 reduces a paid17-worker crew to two for ten living plants without mutating world',()=>{
 const {s,q}=fixture();for(const p of s.plants.slice(10))applyCropImpact(s,p,1);
 const before=serialize(s),plan=q.dawn(s);assert.equal(serialize(s),before);
 assert.equal(plan.priorDesired,17);assert.equal(plan.workloadStaff,2);assert.equal(plan.staff,2);
 assert.equal(plan.cost,60);assert.equal(plan.afterPayment,593);assert.equal(plan.recoveryReserve,60);
 assert(plan.downsized);assert.equal(plan.purchaseBudgetShortfall,0);
 Game.openInitialHiring(s);Game.hire(s,'reduced-day',{olderFemale:plan.staff});q.hired(s,plan.staff,{daily:true});
 assert.equal(numberOf(s.ledger.entries['reduced-day']),-60);assert.equal(q.reserve(),60);assert(q.canSpend(s,5));
});
test('historical Q8 still renews17 at the same ten-plant unit checkpoint',()=>{
 const {s,q}=fixture(createQ8LabourPolicy);for(const p of s.plants.slice(10))applyCropImpact(s,p,1);
 const plan=q.dawn(s);assert.equal(plan.staff,17);assert.equal(plan.cost,510);assert.equal(plan.purchaseBudgetShortfall,372);
});
test('renewal heuristic does not restrict planting or native midday contracts',()=>{
 const {s,nav,q}=fixture();const plan=q.dawn(s);assert.equal(plan.staff,5);
 Game.openInitialHiring(s);Game.hire(s,'reduced',{olderFemale:5});assert.equal(numberOf(s.ledger.entries.reduced),-150);q.hired(s,5,{daily:true});
 for(let n=30;n<90;n++)assert(Game.plant(s,'expansion'+n,'mijo',n%10*1.5,Math.floor(n/10)*1.5,nav));
 const centerId=s.structures[0].id,before=new Set(s.workers.map(w=>w.id));
 assert(Game.hireAdditional(s,'native-extra',{olderFemale:1},centerId));
 q.hired(s,1,{id:'native-extra',centerId,workerIds:s.workers.filter(w=>!before.has(w.id)).map(w=>w.id)});
 assert.equal(q.reserve(),180);assert.equal(s.plants.filter(p=>p.alive).length,90);
 assert.equal(q.report().history.at(-1).paidCoins,30);
});
test('damaged structures with real pending repairs count as work and world reload preserves recommendation',()=>{
 const {s,q}=fixture();for(const p of s.plants)applyCropImpact(s,p,1);
 s.structures[0].hp=400;assert(Game.requestRepair(s,'repair',s.structures[0].id));
 const plan=q.dawn(s);assert.equal(plan.staff,1);assert.equal(plan.workload[0].pending,1);
 assert.equal(q.dawn(deserialize(serialize(s))).staff,1);
});
test('Q9 keeps six-worker opening, original wages and explicit provenance',()=>{
 const s=Game.newGame({seed:712,slotId:'q9-opening'});assert.equal(createQ9LabourPolicy().dawn(s).staff,6);
 assert.equal(createQ9LabourPolicy({profile:'youngFemale'}).dawn(s).cost,240);
 const options=parseNativeCampaignArgs(['--out','fixture','--labour-policy','q9']);assert.equal(options.labourPolicy,'q9');
 assert.equal(nativeCampaignProvenance(options).protocol.renewalWorkUnitsPerWorker,6);
 assert(nativeCampaignProvenance(options).sourceHashes['tools/native-q9-labour-policy.mjs']);
 assert.equal(parseNativeCampaignArgs(['--out','fixture']).labourPolicy,'legacy');
});
