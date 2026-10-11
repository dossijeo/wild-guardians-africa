import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currentRaidCapacityAudit,currentCapacitySourceHashes} from '../tools/audit-current-raid-capacity.mjs';
import {applyCropImpact,CROP_HIT_POINTS} from '../src/simulation/crop-impact-health.js';
import {threatTier} from '../src/simulation/rules.js';

test('current descriptor evidence exactly reproduces with current one-HP planner sources',()=>{
 const saved=JSON.parse(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/current-capacity-v4-production-synchronized/capacity.json',import.meta.url)));
 const {sourceHashes,...facts}=saved;
 assert.deepEqual(sourceHashes,currentCapacitySourceHashes());assert.deepEqual(facts,currentRaidCapacityAudit());
 assert.equal(facts.cropHitPoints,1);assert.equal(facts.candidateVersion,4);
 for(const row of facts.rows){
  assert(row.animals>=1&&row.animals<=34);assert(row.waveSizes.every(n=>n>0&&n<=16));
  assert.equal(row.animals,row.waveSizes.reduce((a,b)=>a+b,0));
  assert.equal(row.animals,Object.values(row.bySpecies).reduce((a,b)=>a+b,0));
  assert(row.selectedReferenceCapacityHP<=row.referenceBudgetHP);
  if(row.introductory)assert.equal(row.animals,1);
  else for(const actor of row.actors)assert(threatTier(row.effectiveHarvestValue).unlocked_species.includes(actor.species));
 }
 assert.equal(facts.lossCase.currentHarvestValue,295);
 assert.equal(facts.lossCase.preRecoveryAnimals,19);assert.equal(facts.lossCase.animals,4);
});
test('one full native impact destroys a healthy current crop; half damage is not an invented death',()=>{
 assert.equal(CROP_HIT_POINTS,1);
 const plant={alive:true},state={plants:[plant]},half=applyCropImpact(state,plant,.5);
 assert.equal(half.destroyed,false);assert.equal(plant.alive,true);
 assert.equal(applyCropImpact(state,plant,.5).destroyed,true);
 const full={alive:true};assert.equal(applyCropImpact({plants:[full]},full,1).destroyed,true);
});
