import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCampaignPlots} from '../tools/audit-native-campaign-plots.mjs';
import {createNativeCampaignPlots,sampledPlotFluidClearance} from '../tools/native-campaign-plots.mjs';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
test('explicit inland preference samples water but does not modify production placement',()=>{
 const nav={field:{fluidInside:(x,z)=>x>1&&Math.abs(z)<.3}},p={x:0,z:0};
 assert.equal(sampledPlotFluidClearance(nav,p,0),true);assert.equal(sampledPlotFluidClearance(nav,p,1.5),false);
 assert.equal(sampledPlotFluidClearance(nav,{x:-3,z:0},1.5),true);
 assert.throws(()=>sampledPlotFluidClearance(nav,p,Infinity),/clearance/);
});
test('native canyon inland policy can purchase sixty routed crops without income or size quota',()=>{
 const {s,nav}=createOpeningWorld({seed:712,biome:'gran-canon',culture:'saheliana'}),policy=createNativeCampaignPlots(nav,()=>s,{fluidClearance:1.5});let bought=0;
 for(let i=0;i<800&&bought<60;i++){
  const p=policy.choose();if(!p)continue;assert(sampledPlotFluidClearance(nav,p,1.5));
  assert(Game.plant(s,'inland-native-'+bought,'mijo',p.x,p.z,nav));bought++;
  if(bought===1){Game.openInitialHiring(s);Game.hire(s,'inland-paid-hire',{olderFemale:1});}
 }
 assert.equal(bought,60);assert.equal(s.elapsed,0);assert.equal(numberOf(s.ledger.balance),370);assert.equal(s.plants.filter(p=>p.alive).length,60);
 assert.equal(policy.report().fluidClearance,1.5);assert(policy.report().fluidClearanceRejected>0);
 assert.equal(policy.report().plots,60);
});
test('native plot audit uses paid commands with no time advance or projected income',()=>{
 const r=auditCampaignPlots({target:10});assert.equal(r.status,'placement-verified');assert.equal(r.paid,10);assert.equal(r.cashAfterCenter,700);assert.equal(r.cash,620);assert.equal(r.seedCoins,50);assert.equal(r.wages,30);assert.equal(r.elapsed,0);assert.equal(r.acceptedPlants.length,10);assert.equal(new Set(r.acceptedPlants.map(p=>p.x+','+p.z)).size,10);
});
test('exhausted observation budget stays incomplete and invalid limits are rejected',()=>{
 const r=auditCampaignPlots({target:60,maxDecisions:1});assert.equal(r.status,'incomplete');assert.ok(r.paid<60);assert.throws(()=>auditCampaignPlots({target:0}),/Positive/);
});
