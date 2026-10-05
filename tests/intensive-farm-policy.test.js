import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateIntensiveFarm,auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from '../tools/summarize_intensive_farm.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';

test('intensive native opening hires daily, expands beyond 16 crops and reinvests physical deliveries without manual harvest',()=>{
 const report=simulateIntensiveFarm({days:3,seed:712});assert.equal(report.result,null);assert.equal(report.completedNights,3);
 assert.ok(report.maximumLiving>50);assert.ok(report.counts.CropPlaced>100);assert.equal(report.counts.HiringConfirmed,3);
 assert.equal(report.counts.RaidSpawned,3);assert.equal(report.counts.RaidEnded,3);
 assert.ok(report.daily.every(r=>r.staff>0&&r.delivered>0));assert.ok(report.activity.longestIdle>0);
 assert.equal(report.policy.cameraEntry,true);assert.ok(report.reloads>0);assert.ok(auditIntensiveFarm(report));
 const summary=summarizeIntensiveFarm(report),totals=Object.values(summary.bySpecies);
 assert.equal(summary.campaign100,'unverified');
 assert.equal(totals.reduce((n,row)=>n+row.planted,0),report.counts.CropPlaced);
 assert.equal(totals.reduce((n,row)=>n+row.delivered,0),report.counts.CrateDelivered);
 assert.equal(totals.reduce((n,row)=>n+row.destroyed,0),report.counts.CropDestroyed??0);
 assert.ok(totals.every(row=>row.planted===row.living+row.picked+row.destroyed&&row.picked===row.delivered+row.inTransit));
 assert.equal(summary.activity.unoccupiedSeconds,report.activity.unoccupiedSeconds);
 assert.equal(summary.activity.unoccupiedFraction,report.activity.unoccupiedFraction);
 assert.equal(totals.reduce((n,row)=>n+BigInt(row.income),0n),Object.entries(report.state.ledger.entries).filter(([id])=>id.startsWith('deliver:')).reduce((n,[,entry])=>n+BigInt(entry.n),0n));
 const cash=summary.cashflow;
 assert.equal(BigInt(cash.openingBalance)+BigInt(cash.harvestIncome)-BigInt(cash.seedCosts)-BigInt(cash.wageCosts)-BigInt(cash.repairCosts)-BigInt(cash.centreCosts)+BigInt(cash.otherNet),BigInt(report.state.ledger.balance.n));
 assert.equal(cash.harvestIncome,totals.reduce((n,row)=>n+BigInt(row.income),0n).toString());
});
test('recorded mixed farm attributes seed investment to live, physically picked and destroyed crops and reconciles the ledger',()=>{
 const root=new URL('../docs/qa/intensive-profile-comparison-20/',import.meta.url);
 const report=JSON.parse(readFileSync(new URL('olderMale-report.json',root),'utf8'));
 report.state=deserialize(gunzipSync(readFileSync(new URL('olderMale-state.json.gz',root))).toString('utf8'));
 const summary=summarizeIntensiveFarm(report),rows=Object.values(summary.bySpecies);
 assert.equal(rows.length,8);
 for(const row of rows){
  assert.equal(BigInt(row.seedCosts),BigInt(row.livingSeedCosts)+BigInt(row.pickedSeedCosts)+BigInt(row.destroyedSeedCosts));
  assert.equal(BigInt(row.harvestMinusSeedCosts),BigInt(row.income)-BigInt(row.seedCosts));
 }
 assert.equal(rows.reduce((sum,row)=>sum+BigInt(row.seedCosts),0n),BigInt(summary.cashflow.seedCosts));
 const banana=summary.bySpecies.platano;
 assert.equal(banana.planted,21);assert.equal(banana.delivered,0);
 assert.equal(banana.seedCosts,'3150');assert.equal(banana.livingSeedCosts,'1200');assert.equal(banana.destroyedSeedCosts,'1950');
 assert.equal(banana.harvestMinusSeedCosts,'-3150');
 // Changing a recorded debit must be rejected instead of assigning current
 // prices to historical purchases and publishing a misleading breakdown.
 const debit=Object.values(report.state.ledger.entries).find(entry=>entry.n==='-150');
 debit.n='-151';report.state.ledger.balance.n=String(BigInt(report.state.ledger.balance.n)-1n);
 assert.throws(()=>summarizeIntensiveFarm(report),/Species seed prices do not reconcile/);
});
test('reinvestment without growing labour or maintenance reserves can lose despite a large plantation',()=>{
 const report=simulateIntensiveFarm({days:10,seed:712,reserveLabourGrowth:false,reserveMaintenance:false,burstPlanting:true,cameraEntry:false});
 assert.equal(report.result,'defeat');assert.ok(report.completedNights<10);assert.ok(report.maximumLiving>100);
 assert.ok(report.counts.CrateDelivered>50);assert.equal(report.counts.GameOver,1);assert.equal(report.counts.CampaignWon??0,0);
 assert.ok(auditIntensiveFarm(report));
 assert.equal(summarizeIntensiveFarm(report).campaign100,'unverified');
});
test('optional midday hiring uses paid ordinary contracts while preserving next-day and repair reserves',()=>{
 const report=simulateIntensiveFarm({days:3,seed:712,middayHiring:true});
 assert.equal(report.completedNights,3);assert.equal(report.result,null);assert.ok(auditIntensiveFarm(report));
 assert.equal(report.policy.middayHiring,true);assert.ok(report.additionalHiring.count>0);
 assert.ok(Number.isSafeInteger(report.additionalHiring.cost)&&report.additionalHiring.cost>0);
 assert.ok(report.additionalHiring.cost<report.additionalHiring.count*30,'part-day contracts must cost less than a whole working day');
 assert.ok(report.counts.HiringConfirmed>3);
 assert.equal(report.daily.reduce((sum,day)=>sum+day.additionalStaff,0),report.additionalHiring.count);
 assert.equal(report.daily.reduce((sum,day)=>sum+day.additionalWages,0),report.additionalHiring.cost);
 const summary=summarizeIntensiveFarm(report);
 assert.equal(summary.cashflow.wageCosts,String(report.daily.reduce((sum,day)=>sum+day.wages+day.additionalWages,0)));
 assert.deepEqual(summary.additionalHiring,report.additionalHiring);
 assert.ok(report.daily.every(day=>day.delivered>0));
 for(const row of Object.values(summary.bySpecies))assert.ok(row.lostBeforeFirstWater<=row.lostWithPendingWater&&row.lostWithPendingWater<=row.destroyed);
});
