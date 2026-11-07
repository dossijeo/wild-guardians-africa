import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {hiringCost} from '../src/simulation/workforce.js';
import {createQ5LabourPolicy} from '../tools/native-q5-labour-policy.mjs';
import {campaignProtocolForLabour,nativeCampaignStrategy} from '../tools/native-campaign-protocol.mjs';
import {parseNativeCampaignArgs} from '../tools/run_native_campaign.mjs';
function fixture(){
 const s=Game.newGame({seed:712,slotId:'q5-contract'}),nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);Game.plant(s,'first','mijo',0,0,nav);
 const q=createQ5LabourPolicy(),plan=q.dawn(s);Game.openInitialHiring(s);Game.hire(s,'daily',{olderFemale:plan.staff});q.hired(s,plan.staff,{daily:true});return{s,nav,q};
}
test('Q5 full renewal and dawn continuity use actual paid incremental contracts',()=>{
 const {s,q}=fixture();s.time=150;s.elapsed=150;
 assert.equal(Game.hireAdditional(s,'add',{olderFemale:2},s.structures[0].id),true);q.hired(s,2);
 assert.equal(s.ledger.entries.add.n,'-30');assert.equal(q.reserve(),90);
 s.day=2;s.time=0;const plan=q.dawn(s);assert.equal(plan.staff,3);assert.equal(plan.recoveryReserve,90);
 Game.openInitialHiring(s); // Native daily hiring pause; no fabricated payment.
 Game.hire(s,'day-two',{olderFemale:plan.staff});q.hired(s,plan.staff,{daily:true});
 assert.equal(s.ledger.entries['day-two'].n,'-90');assert.equal(q.reserve(),90);
});
test('Q5 observations do not mistake reserved travelling tasks for completed service, and evaluate once per10s',()=>{
 const {s,nav,q}=fixture();for(let n=1;n<=9;n++)Game.plant(s,'seed'+n,'mijo',n*1.5,0,nav);
 // Controlled reservation-only observation: no completion events or fake income.
 s.workers[0].taskId=s.tasks[0].id;s.tasks[0].workerId=s.workers[0].id;
 s.elapsed=1;s.time=1;assert.equal(q.additional(s),null);s.elapsed=10;s.time=10;
 const p=q.additional(s);assert.equal(p.count,0);assert.equal(p.reason,'no measured service saturation');assert.equal(q.additional(s),null);assert.equal(q.reserve(),30);
});
test('Q5 completed native watering permits only a funded incremental hire, then awaits new service',()=>{
 const {s,nav,q}=fixture();for(let n=1;n<=16;n++)Game.plant(s,'seed'+n,'mijo',n*1.5,0,nav);
 let plan;for(let n=0;n<110;n++){Game.tick(s,1,nav);q.observe(s);const p=q.additional(s);if(p?.count){plan=p;break;}}
 assert.ok(plan,'bounded physical service fixture must produce measured saturation');assert.ok(plan.measurement.completed>0);assert.ok(plan.measurement.backlogRatio>6);
 assert.equal(plan.recoveryReserve,60);const before=numberOf(s.ledger.balance);
 s.ledger.balance=rational(plan.recoveryReserve+5);s.elapsed+=10;s.time+=10;
 const unfunded=q.additional(s);assert.equal(unfunded.count,0);assert.equal(unfunded.reason,'cash reserved for full renewal');
 s.ledger.balance=rational(before);
 const charge=hiringCost({olderFemale:1},{time:s.time});assert.equal(Game.hireAdditional(s,'measured',{olderFemale:1},plan.centerId),true);q.hired(s,1);
 assert.equal(before-numberOf(s.ledger.balance),charge);assert.equal(q.reserve(),60);
 s.elapsed+=10;s.time+=10;assert.equal(q.additional(s).count,0);assert.equal(q.reserve(),60);
 // Existing ledger and command id remain native/idempotent.
 assert.equal(Game.hireAdditional(s,'measured',{olderFemale:1},plan.centerId),false);
});
test('Q5 cash-limited dawn discloses lost capacity; native emergency does not manufacture recovery',()=>{
 const {s,q}=fixture();q.hired(s,2);s.ledger.balance=rational(364);assert.equal(q.dawn(s).staff,3);
 s.ledger.balance=rational(100);const reduced=q.dawn(s);assert.equal(reduced.staff,1);assert.equal(reduced.capacityReduced,true);
 s.ledger.balance=rational(35);const emergency=q.dawn(s);assert.equal(emergency.staff,1);assert.equal(emergency.emergency,true);assert.equal(emergency.reserveShortfall,30);
 s.ledger.balance=rational(29);assert.equal(q.dawn(s).staff,0);assert.equal(s.result,null);
});
test('Q5 opt-in/provenance remains comparable A/B/D/E; legacy and Q4 kept',()=>{
 assert.equal(parseNativeCampaignArgs(['--out','fixture','--labour-policy','q5']).labourPolicy,'q5');assert.match(campaignProtocolForLabour('q5').id,/-q5$/);
 assert.equal(campaignProtocolForLabour('legacy').id,'native-constant-economy-v3');assert.match(campaignProtocolForLabour('q4').id,/-q4$/);
 for(const strategy of ['expansive','good','no-walls','no-shield'])assert.equal(nativeCampaignStrategy(strategy).middayHiring,true);
 const {shield:d,...D}=nativeCampaignStrategy('no-walls'),{shield:e,...E}=nativeCampaignStrategy('no-shield');assert.deepEqual(D,E);assert.equal(d,true);assert.equal(e,false);
});
