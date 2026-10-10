import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCampaignPlots} from '../tools/audit-native-campaign-plots.mjs';
test('native plot audit uses paid commands with no time advance or projected income',()=>{
 const r=auditCampaignPlots({target:10});assert.equal(r.status,'placement-verified');assert.equal(r.paid,10);assert.equal(r.cashAfterCenter,700);assert.equal(r.cash,620);assert.equal(r.seedCoins,50);assert.equal(r.wages,30);assert.equal(r.elapsed,0);assert.equal(r.acceptedPlants.length,10);assert.equal(new Set(r.acceptedPlants.map(p=>p.x+','+p.z)).size,10);
});
test('exhausted observation budget stays incomplete and invalid limits are rejected',()=>{
 const r=auditCampaignPlots({target:60,maxDecisions:1});assert.equal(r.status,'incomplete');assert.ok(r.paid<60);assert.throws(()=>auditCampaignPlots({target:0}),/Positive/);
});
