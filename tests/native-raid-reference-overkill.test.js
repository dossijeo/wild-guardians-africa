import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceOverkill} from '../tools/diagnose-native-raid-reference-overkill.mjs';
const fixture=()=>({day:9,ended:true,pressureFacts:{candidateVersion:3,referenceEnvelope:{rows:[{id:'buffalo',count:1,area:1.5,cropDamage:2}]}},species:{buffalo:{generated:1,initialHitBudget:5}},potentialAgriculturalHp:15,effectiveAgriculturalHp:0,cropsDestroyed:0});
test('separates raw force from healthy HP saturation without inventing damage or casualties',()=>{
 const r=fixture(),before=JSON.stringify(r),d=referenceOverkill(r,1);
 assert.equal(d.rawForce,15);assert.equal(d.healthyReferenceHp,10);assert.equal(d.referenceOverkill,5);
 assert.equal(d.observedEffectiveHp,0);assert.equal(d.observedPlantsDestroyed,0);assert.equal(JSON.stringify(r),before);
 assert.equal(referenceOverkill(r,2).healthyReferenceHp,15);
});
test('introductory profiles are excluded and incorrect envelopes are rejected',()=>{
 assert.match(referenceOverkill({day:1,ended:true},1).excluded,/introductory/);
 for(const mutate of [r=>r.ended=false,r=>r.potentialAgriculturalHp=14,r=>r.pressureFacts.referenceEnvelope.rows[0].area=1.1,r=>r.pressureFacts.candidateVersion=4]){
  const r=fixture();mutate(r);assert.throws(()=>referenceOverkill(r,1));
 }
});
