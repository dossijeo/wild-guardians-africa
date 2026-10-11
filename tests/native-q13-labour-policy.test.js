import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {q13FundedRenewalPlan,createQ13LabourPolicy} from '../tools/native-q13-labour-policy.mjs';
const plan=cash=>({staff:2,cost:60,cash,pendingRepair:0,seedCost:5,profile:'olderFemale',selection:{olderFemale:2}});
test('diagnostic late renewal retains seed capital instead of paying every affordable worker',()=>{
 const input=plan(91),original=JSON.stringify(input),p=q13FundedRenewalPlan(input,30);
 assert.equal(p.staff,1);assert.equal(p.cost,30);assert.equal(p.afterPayment,61);
 assert.equal(p.purchaseBudgetShortfall,0);assert.equal(p.fundingScreen.forecastIncomeCoins,0);
 assert.equal(JSON.stringify(input),original);
 const emergency=q13FundedRenewalPlan(plan(62),30);
 assert.equal(emergency.staff,1);assert.equal(emergency.afterPayment,32);assert.equal(emergency.risk,true);
 assert.equal(emergency.purchaseBudgetShortfall,3);
});
test('already funded crews, repair obligations and unfunded emergencies remain explicit',()=>{
 const p=plan(125);assert.equal(q13FundedRenewalPlan(p,30),p);
 const repairs=q13FundedRenewalPlan({...plan(155),pendingRepair:70},30);
 assert.equal(repairs.staff,1);assert.equal(repairs.purchaseBudgetShortfall,0);
 for(const cash of [0,29,30,34,39]){
  const next=q13FundedRenewalPlan(plan(cash),30);
  assert.equal(next.staff,cash>=30?1:0);assert.ok(next.cost<=cash);
 }
 assert.throws(()=>q13FundedRenewalPlan(plan(Number.MAX_SAFE_INTEGER+1),30));
});
test('retained native recovery state settles an actual contract and cannot charge twice on reload',()=>{
 const raw=gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/pilot-v46-passive-q10-young-female-empalizada-sabana-712-fourteen/partial-state.json.gz',import.meta.url))).toString();
 const s=deserialize(raw),before=serialize(s),p=createQ13LabourPolicy({profile:'youngFemale'});
 const proposal=p.dawn(s,{pendingRepair:0,seedCost:5});
 assert.equal(serialize(s),before);assert.equal(proposal.profile,'olderFemale');assert.equal(proposal.cost,30);
 Game.hire(s,'q13-retained-native-hire',proposal.selection);
 assert.equal(s.ledger.entries['q13-retained-native-hire'].n,'-30');
 p.hired(s,proposal.staff,{daily:true});assert.equal(p.reserve(),30);assert.equal(numberOf(s.ledger.balance),9);
 const loaded=deserialize(serialize(s)),saved=serialize(loaded);
 assert.equal(Game.hire(loaded,'q13-retained-native-hire',proposal.selection),false);assert.equal(serialize(loaded),saved);
});
