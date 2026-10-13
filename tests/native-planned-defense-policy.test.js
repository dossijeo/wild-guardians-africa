import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {createNativeCampaignPlots} from '../tools/native-campaign-plots.mjs';
import {createNativePlannedDefensePolicy} from '../tools/native-planned-defense-policy.mjs';
import {parseNativeCampaignArgs} from '../tools/run_native_campaign.mjs';

function fixture(){
 const {s,nav}=createOpeningWorld(),center=s.structures[0];
 assert(Game.plant(s,'seed','mijo',center.x+6,center.z+1,nav));
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 let sequence=0;
 return {s,nav,center,options:{command:kind=>`planned-${kind}-${sequence++}`,reserve:160}};
}

test('persistent planned wall buys native pieces, closes with a worker gate, and survives ordinary ticks',()=>{
 const {s,nav,options}=fixture(),before=numberOf(s.ledger.balance);
 const policy=createNativePlannedDefensePolicy({startDay:1});
 let actions=0;
 for(let i=0;i<20&&!policy.report().completed;i++){
  actions+=policy.act(s,nav,options);s.elapsed+=6;
 }
 const report=policy.report(),walls=s.structures.filter(x=>x.kind==='wall');
 assert(report.completed,'native trace should be completed');
 assert.equal(report.planningCount,1);
 assert.equal(actions,report.builds);
 assert.equal(report.spent,before-numberOf(s.ledger.balance));
 assert.equal(report.spent,walls.length*10);
 assert.equal(walls.filter(w=>w.gate).length,1);
 const gate=walls.find(w=>w.gate),portals=gatePortalPoints(gate);
 assert(Math.abs(gate.z)<2,'the native automatic gate should lie on the village corridor');
 assert(nav.segmentClear(portals[0],portals[1],.28,null,true));
 const restored=deserialize(serialize(s));nav.setState(restored);
 assert.equal(restored.structures.filter(w=>w.kind==='wall').length,walls.length);
 assert.equal(restored.ledger.balance.n,s.ledger.balance.n);
});

test('an unfunded plan is retained without additional native wall placements',()=>{
 const {s,nav,options}=fixture(),policy=createNativePlannedDefensePolicy({startDay:1});
 options.reserve=numberOf(s.ledger.balance)-5;
 let placements=0;const original=nav.wallPlacement.bind(nav);
 nav.wallPlacement=(...args)=>{placements++;return original(...args);};
 assert.equal(policy.act(s,nav,options),0);
 const first=policy.report().plan;
 s.elapsed+=6;
 assert.equal(policy.act(s,nav,options),0);
 assert.equal(placements,0);
 assert.deepEqual(policy.report().plan,first);
 options.reserve=160;s.elapsed+=6;
 assert.equal(policy.act(s,nav,options),1);
 assert.equal(policy.report().plan.version,first.version);
});

test('a previously validated plot reuses access only until native geometry changes',()=>{
 const {s,nav}=fixture(),plots=createNativeCampaignPlots(nav,()=>s,{reuseAccess:true});
 const first=plots.choose();assert(first);
 const checked=plots.report().accessChecks;
 const again=plots.choose();assert.deepEqual([again.x,again.z],[first.x,first.z]);
 assert.equal(plots.report().accessChecks,checked);
 assert(plots.report().accessCacheHits>=1);
 nav.invalidateGeometryQueries();
 assert(plots.choose());
 assert(plots.report().accessChecks>checked);
});

test('campaign modes are explicit; old runner remains the persistence reference',()=>{
 const args=['--out','planned-qa','--campaign-mode','balance','--defense-policy','planned','--defense-start-day','6'];
 const planned=parseNativeCampaignArgs(args);
 assert.equal(planned.campaignMode,'balance');assert.equal(planned.defensePolicy,'planned');
 const reference=parseNativeCampaignArgs(['--out','reference-qa']);
 assert.equal(reference.campaignMode,'persistence');
 assert.throws(()=>parseNativeCampaignArgs(['--out','qa','--campaign-mode','unknown']));
});
