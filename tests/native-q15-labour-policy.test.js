import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {liquidityRenewal,createQ15LabourPolicy} from '../tools/native-q15-labour-policy.mjs';
import {createQ14LabourPolicy} from '../tools/native-q14-labour-policy.mjs';
test('retained Canyon paid-plan diagnosis preserves recovery coins without inventing receipts',()=>{
 const report=JSON.parse(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/pilot-v99-q14-entry-retry-good-canyon-712-seven/report.json',import.meta.url)));
 const historical=report.labourHistory.find(p=>p.day===7&&p.kind==='daily'),before=JSON.stringify(historical);
 const candidate=liquidityRenewal(historical,30);
 assert.equal(historical.staff,10);assert.equal(historical.afterPayment,3);
 assert.equal(candidate.staff,8);assert.equal(candidate.cost,240);assert.equal(candidate.afterPayment,63);
 assert.equal(candidate.liquidityFloor,35);assert.equal(candidate.liquidityFloorShortfall,0);
 assert.equal(JSON.stringify(historical),before);assert(candidate.risk,'Full eight-worker renewal is still not funded');
});
function fixture(factory){
 const s=Game.newGame({seed:712,slotId:'q15-unit'}),nav=new Navigation(712,'sabana'),q=factory();
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);
 for(let n=0;n<60;n++)assert(Game.plant(s,'p'+n,'mijo',n%10*1.5,Math.floor(n/10)*1.5,nav));
 Game.openInitialHiring(s);Game.hire(s,'daily',{olderFemale:6});q.hired(s,6,{daily:true});
 for(let n=0;n<4;n++){
  const id='extra'+n,centerId=s.structures[0].id,before=new Set(s.workers.map(w=>w.id));
  assert(Game.hireAdditional(s,id,{olderFemale:1},centerId));
  q.hired(s,1,{id,centerId,workerIds:s.workers.filter(w=>!before.has(w.id)).map(w=>w.id)});
 }
 // Explicit isolated unit funding, not a campaign delivery or profit claim.
 s.day=2;s.time=0;s.ledger.balance=rational(303);return {s,q};
}
test('reduced renewal pays original native wages and updates reserve only after hiring',()=>{
 const {s,q}=fixture(createQ15LabourPolicy),before=serialize(s),plan=q.dawn(s);
 assert.equal(serialize(s),before);assert.equal(plan.staff,8);assert.equal(q.reserve(),300);
 assert.equal(q.dawn(deserialize(before)).staff,8);
 Game.openInitialHiring(s);Game.hire(s,'q15-renewal',{olderFemale:plan.staff});q.hired(s,plan.staff,{daily:true});
 assert.equal(numberOf(s.ledger.entries['q15-renewal']),-240);assert.equal(numberOf(s.ledger.balance),63);
 assert.equal(q.reserve(),240);assert.equal(q.report().liquidityRenewal.decisions.at(-1).retainedCashIfConfirmed,63);
});
test('historical Q14 recommendation remains ten workers at the same isolated checkpoint',()=>{
 const {s,q}=fixture(createQ14LabourPolicy);assert.equal(q.dawn(s).staff,10);assert.equal(q.dawn(s).afterPayment,3);
});
test('well-funded plans, original day-one startup, pending repairs and emergencies remain explicit',()=>{
 const plan={cash:700,staff:10,desired:10,pendingRepair:0,seedCost:5,reason:'funded'};
 assert.equal(liquidityRenewal(plan,30).staff,10);
 assert.equal(liquidityRenewal({...plan,cash:303,pendingRepair:60},30).staff,6);
 assert.equal(liquidityRenewal({...plan,cash:40},30).staff,1);
 assert.equal(liquidityRenewal({...plan,cash:40},30).liquidityFloorShortfall,25);
 assert.equal(liquidityRenewal({...plan,cash:29},30).staff,0);
 assert.equal(liquidityRenewal({...plan,cash:403},40).staff,9);
 const s=Game.newGame({seed:712,slotId:'q15-opening'});
 assert.equal(createQ15LabourPolicy().dawn(s).staff,6);
 assert.equal(createQ15LabourPolicy({profile:'youngFemale'}).dawn(s).cost,240);
 assert.throws(()=>liquidityRenewal({...plan,cash:3.5},30));assert.throws(()=>liquidityRenewal(plan,0));
});
