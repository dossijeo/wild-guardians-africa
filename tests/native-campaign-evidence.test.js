import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeCampaignEvidence} from '../tools/native-campaign-evidence.mjs';
const fixture=()=>({slotId:'qa',seed:712,biome:'sabana',culture:'mapungubwe',day:1,time:0,elapsed:0,tasks:[],events:[{id:'start',type:'DayStarted'}],ledger:{entries:{}}});
test('contract: only a unique delivered-crate settled payment becomes income, not crop maturity or refund',()=>{
 const s=fixture(),o=createNativeCampaignEvidence(s);o.decision(s,{seconds:1,otherActions:1});
 s.events.push({id:'mature',type:'CropMatured'},{id:'refund',type:'WallRemoved'});s.ledger.entries.refund={n:'20',d:'1'};
 s.elapsed=1;s.events.push({id:'delivery',type:'CrateDelivered',targetId:'crate-1',workerId:'worker'});s.ledger.entries['deliver:crate-1']={n:'11',d:'1'};o.observe(s);o.observe(s);
 const r=o.report(s);assert.equal(r.daily[0].income,11);assert.equal(r.deliveries.length,1);assert.equal(r.meaningfulActivity.daylightSeconds,1);
});
test('contract: repair time stays idle; only paid restoring completion credits the original request decision',()=>{
 const s=fixture(),o=createNativeCampaignEvidence(s);s.tasks.push({id:'task',kind:'repair',targetId:'wall'});o.decision(s,{seconds:1});
 s.time=1;s.elapsed=1;o.decision(s,{seconds:1});assert.equal(o.report(s).meaningfulActivity.unoccupiedSeconds,2);
 s.time=2;s.elapsed=2;s.ledger.entries['repair:task']={n:'-2',d:'1'};s.events.push({id:'restore',type:'RepairApplied',workerId:'worker',targetId:'wall',repair:{taskId:'task',paymentId:'repair:task',paidCoins:2,previousHp:80,restoredHp:100,maxHp:100,previousStatus:'intact'},presentation:{elapsed:2,x:1,z:2,yaw:0}});
 o.observe(s);const r=o.report(s);assert.equal(r.meaningfulActivity.unoccupiedSeconds,1);assert.equal(r.meaningfulActivity.creditedPaidRepairDecisionCount,1);assert.equal(r.repairSettlements.status,'verified');
});
test('contract: day-boundary events belong to the outgoing decision; missing event windows fail closed',()=>{
 const s=fixture(),o=createNativeCampaignEvidence(s);s.time=299.5;o.decision(s,{seconds:1,otherActions:1});s.day=2;s.time=.5;s.elapsed=1;s.events.push({id:'last-placement',type:'CropPlaced'});o.observe(s);assert.equal(o.report(s).daily[0].day,1);assert.equal(o.report(s).meaningfulActivity.daylightSeconds,.5);
 s.events=[];assert.equal(o.report(s).status,'incomplete');
});

test('every no-command daytime reason counts idle, including navigation, raid and unknown; pending clocks add zero',()=>{
 const s=fixture(),o=createNativeCampaignEvidence(s);
 for(const reason of ['navigation','incursion','unrecognised']){o.decision(s,{seconds:1,reason});s.time++;s.elapsed++;o.finishDecision(s);}
 o.decision(s,{seconds:1,reason:'navigation'});o.finishDecision(s);
 const r=o.report(s).meaningfulActivity;assert.equal(r.daylightSeconds,3);assert.equal(r.unoccupiedSeconds,3);assert.equal(r.unoccupiedFraction,1);assert.equal(r.strictBelow25,false);
});
