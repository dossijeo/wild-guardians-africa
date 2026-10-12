import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateNativeCampaign} from '../tools/native-campaign-runner.mjs';

test('a native campaign uses day-one individual agricultural magic',async()=>{
 const run=await simulateNativeCampaign({days:1,strategy:'good',nativeEvidence:false});
 assert.equal(run.completedNights,1);
 assert.ok(run.agriculturalMagic.applications>0);
 assert.ok(run.agriculturalMagic.records.every(record=>record.day===1&&record.targetPlantId));
 assert.ok(run.agriculturalMagic.records.some(record=>record.potentialBenefit));
 assert.equal(run.agriculturalMagic.additionalDeliveredIncome,
  run.agriculturalMagic.deliveredBonuses.reduce((sum,bonus)=>sum+Number(bonus.income.n)/Number(bonus.income.d),0));
 assert.equal(run.protocol.agriculturalMagic,'native individual targeted applications; no cooldown; daily shared power');
});
