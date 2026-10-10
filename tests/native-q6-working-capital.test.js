import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {cropSpec} from '../src/simulation/rules.js';
import {createQ6LabourPolicy} from '../tools/native-q6-labour-policy.mjs';
import {createQ5LabourPolicy} from '../tools/native-q5-labour-policy.mjs';
import {campaignProtocolForLabour,nativeCampaignStrategy} from '../tools/native-campaign-protocol.mjs';
import {parseNativeCampaignArgs} from '../tools/run_native_campaign.mjs';
function fixture(){
 const s=Game.newGame({seed:712,slotId:'q6-contract'}),nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);
 for(let n=0;n<14;n++)Game.plant(s,'seed'+n,'mijo',n%7*1.5,Math.floor(n/7)*1.5,nav);
 const q=createQ6LabourPolicy();Game.openInitialHiring(s);Game.hire(s,'previous-crew',{olderFemale:6});q.hired(s,6,{daily:true});
 // Controlled retained-liquidity boundary, not invented in a campaign.
 s.day=2;s.time=0;s.ledger.balance=rational(238);
 return{s,nav,q};
}
test('Q6 pays native crew6 atcash238 and blocks purchases/increments until physical delivery replenishes reserve180',()=>{
 const {s,nav,q}=fixture(),plan=q.dawn(s);assert.equal(plan.staff,6);assert.equal(plan.cost,180);assert.equal(plan.afterPayment,58);assert.equal(plan.workingCapitalShortfall,122);assert.equal(plan.risk,true);
 Game.openInitialHiring(s);Game.hire(s,'today',{olderFemale:plan.staff});q.hired(s,plan.staff,{daily:true});assert.equal(numberOf(s.ledger.balance),58);assert.equal(s.ledger.entries.today.n,'-180');assert.equal(q.reserve(),180);
 const plant=()=>q.canSpend(s,5)&&Game.plant(s,'new','mijo',13,4,nav);
 assert.equal(plant(),false);assert.equal(s.ledger.entries.new,undefined);
 s.elapsed+=10;s.time+=10;assert.equal(q.additional(s).reason,'working capital awaiting settled income');assert.equal(s.workers.filter(w=>w.contractDay===s.day).length,6);
 // Explicit ready-crop fixture. Native workers still harvest, carry and deliver;
 // no credit is assigned and no projected payout counts as cash.
 for(const p of s.plants){p.growth=cropSpec(p.species).growth_seconds;p.water.forEach(w=>w.status='manual');}
 Game.rebuildTasks(s);const openingCash=numberOf(s.ledger.balance),initialRng=s.rng;
 let ticks=0;while(!q.canSpend(s,5)&&ticks++<180){Game.tick(s,1,nav);q.observe(s);}
 assert.ok(ticks<=180,'bounded native delivery fixture replenishes working capital');
 const deliveries=s.events.filter(e=>e.type==='CrateDelivered');assert.ok(deliveries.length>=12);
 const realIncome=deliveries.reduce((n,e)=>n+numberOf(s.ledger.entries['deliver:'+e.targetId]),0);
 assert.equal(numberOf(s.ledger.balance),openingCash+realIncome);assert.equal(q.workingCapital(s).workingCapitalShortfall,0);assert.equal(s.rng,initialRng);
 assert.equal(plant(),true);assert.equal(s.ledger.entries.new.n,'-5');assert.ok(numberOf(s.ledger.balance)>=180);
});
test('Q6 does not require tomorrow twice at dawn; Q5 original negative rule stays intact',()=>{
 const {s,q}=fixture(),q5=createQ5LabourPolicy();q5.hired(s,6,{daily:true});assert.equal(q5.dawn(s).staff,3);assert.equal(q.dawn(s).staff,6);
 s.ledger.balance=rational(180);assert.equal(q.dawn(s).staff,6);assert.equal(q.dawn(s).workingCapitalShortfall,180);
 s.ledger.balance=rational(179);assert.equal(q.dawn(s).staff,5);assert.equal(q.dawn(s).capacityReduced,true);
 s.ledger.balance=rational(29);assert.equal(q.dawn(s).staff,0);assert.equal(s.result,null);
});
test('Q6 opt-in shares Q5 service settings and A/B/D/E comparability without changing Shield permissions',()=>{
 assert.equal(parseNativeCampaignArgs(['--out','fixture','--labour-policy','q6']).labourPolicy,'q6');const q6=campaignProtocolForLabour('q6'),q5=campaignProtocolForLabour('q5');
 for(const key of ['evaluationSeconds','serviceWindowSeconds','backlogPerWorker','maximumClearanceSeconds'])assert.equal(q6[key],q5[key]);
 for(const name of ['expansive','good','no-walls','no-shield'])assert.equal(nativeCampaignStrategy(name).middayHiring,true);
 assert.equal(nativeCampaignStrategy('no-walls').shield,true);assert.equal(nativeCampaignStrategy('no-shield').shield,false);assert.match(q6.id,/-q6$/);
});
