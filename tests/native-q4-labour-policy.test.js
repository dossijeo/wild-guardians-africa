import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {q4DawnPlan,q4AdditionalPlan,q4RecoveryReserve} from '../tools/native-q4-labour-policy.mjs';
import {parseNativeCampaignArgs} from '../tools/run_native_campaign.mjs';
import {campaignProtocolForLabour,nativeCampaignStrategy} from '../tools/native-campaign-protocol.mjs';
function fixture(){
 const s=Game.newGame({seed:712,slotId:'q4-contract'}),nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'fixture-center',{x:-15,z:0},nav);Game.plant(s,'fixture-first','mijo',0,0,nav);return {s,nav,center:s.structures[0]};
}
test('Q4 native first contract pays30 rather than forecast240, preserving actual planting funds',()=>{
 const {s,nav}=fixture(),plan=q4DawnPlan(s);assert.equal(plan.staff,1);Game.openInitialHiring(s);Game.hire(s,'q4-daily',{olderFemale:plan.staff});assert.equal(s.ledger.entries['q4-daily'].n,'-30');
 assert.equal(numberOf(s.ledger.balance),665);assert.equal(Game.plant(s,'q4-seed','mijo',1.5,0,nav),true);assert.equal(numberOf(s.ledger.balance),660);assert.equal(q4RecoveryReserve(s,30),30);
});
test('Q4 does not consume364 as360 salary and cash35 permits native emergency wage30 with explicit risk',()=>{
 const {s}=fixture();s.ledger.balance=rational(364);assert.equal(q4DawnPlan(s).cost,30);s.ledger.balance=rational(35);const emergency=q4DawnPlan(s);assert.equal(emergency.staff,1);assert.equal(emergency.emergency,true);assert.equal(emergency.reserveShortfall,30);Game.openInitialHiring(s);Game.hire(s,'emergency',{olderFemale:emergency.staff});assert.equal(numberOf(s.ledger.balance),5);assert.equal(s.ledger.entries.emergency.n,'-30');assert.equal(s.plants[0].alive,true);assert.equal(s.tasks[0].kind,'initial');assert.equal(s.result,null);assert.equal(q4DawnPlan({...s,ledger:{...s.ledger,balance:rational(29)}}).staff,0);assert.equal(q4DawnPlan({...s,ledger:{...s.ledger,balance:rational(65)}}).staff,1);
});
test('Q4 additions use native proportional ceil, real saturated FIFO backlog, historical pending repairs and one payment',()=>{
 const {s,nav,center}=fixture();Game.openInitialHiring(s);Game.hire(s,'daily',{olderFemale:1});
 for(let n=1;n<=7;n++)Game.plant(s,'seed'+n,'mijo',n*1.5,0,nav);
 // Explicit command fixture: assigned incumbent task, not a physical travel claim.
 s.time=150;s.workers[0].taskId=s.tasks[0].id;s.tasks[0].workerId=s.workers[0].id;
 const plan=q4AdditionalPlan(s,{pendingRepair:2});assert.equal(plan.count,1);assert.equal(plan.cost,15);assert.equal(plan.required,52);assert.equal(plan.centerId,center.id);
 const before=numberOf(s.ledger.balance);assert.equal(Game.hireAdditional(s,'additional',{olderFemale:1},plan.centerId),true);assert.equal(numberOf(s.ledger.balance),before-15);assert.equal(s.ledger.entries.additional.n,'-15');assert.equal(Game.hireAdditional(s,'additional',{olderFemale:1},plan.centerId),false);assert.equal(q4AdditionalPlan(s).count,0);
 s.workers.at(-1).incapacitated=true;s.ledger.balance=rational(51);assert.equal(q4AdditionalPlan(s,{pendingRepair:2}).count,0);
 for(const t of s.tasks)t.blocked=true;assert.equal(q4AdditionalPlan(s).reason,'no saturated native backlog');
});
test('Q4 same productive labour recipe for defended and no-wall strategies; legacy protocol untouched',()=>{
 assert.equal(parseNativeCampaignArgs(['--out','fixture','--labour-policy','q4']).labourPolicy,'q4');
 assert.equal(campaignProtocolForLabour('legacy').id,'native-constant-economy-v3');assert.match(campaignProtocolForLabour('q4').id,/-q4$/);
 for(const name of ['good','expansive','no-walls'])assert.equal(nativeCampaignStrategy(name).middayHiring,true);assert.equal(nativeCampaignStrategy('bad').middayHiring,false);assert.throws(()=>campaignProtocolForLabour('fake'));
});
