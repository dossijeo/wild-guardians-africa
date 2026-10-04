import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateIntensiveFarm,auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';

test('intensive native opening hires daily, expands beyond 16 crops and reinvests physical deliveries without manual harvest',()=>{
 const report=simulateIntensiveFarm({days:3,seed:712});assert.equal(report.result,null);assert.equal(report.completedNights,3);
 assert.ok(report.maximumLiving>50);assert.ok(report.counts.CropPlaced>100);assert.equal(report.counts.HiringConfirmed,3);
 assert.equal(report.counts.RaidSpawned,3);assert.equal(report.counts.RaidEnded,3);
 assert.ok(report.daily.every(r=>r.staff>0&&r.delivered>0));assert.ok(report.activity.longestIdle>0);
 assert.equal(report.policy.cameraEntry,true);assert.ok(report.reloads>0);assert.ok(auditIntensiveFarm(report));
});
test('reinvestment without growing labour or maintenance reserves can lose despite a large plantation',()=>{
 const report=simulateIntensiveFarm({days:10,seed:712,reserveLabourGrowth:false,reserveMaintenance:false,burstPlanting:true,cameraEntry:false});
 assert.equal(report.result,'defeat');assert.ok(report.completedNights<10);assert.ok(report.maximumLiving>100);
 assert.ok(report.counts.CrateDelivered>50);assert.equal(report.counts.GameOver,1);assert.equal(report.counts.CampaignWon??0,0);
 assert.ok(auditIntensiveFarm(report));
});
