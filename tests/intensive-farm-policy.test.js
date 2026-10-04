import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateIntensiveFarm,auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from '../tools/summarize_intensive_farm.mjs';

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
});
test('reinvestment without growing labour or maintenance reserves can lose despite a large plantation',()=>{
 const report=simulateIntensiveFarm({days:10,seed:712,reserveLabourGrowth:false,reserveMaintenance:false,burstPlanting:true,cameraEntry:false});
 assert.equal(report.result,'defeat');assert.ok(report.completedNights<10);assert.ok(report.maximumLiving>100);
 assert.ok(report.counts.CrateDelivered>50);assert.equal(report.counts.GameOver,1);assert.equal(report.counts.CampaignWon??0,0);
 assert.ok(auditIntensiveFarm(report));
 assert.equal(summarizeIntensiveFarm(report).campaign100,'unverified');
});
