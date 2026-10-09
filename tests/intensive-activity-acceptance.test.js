import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {intensiveActivityAcceptance,intensiveActivityMatrixAcceptance} from '../tools/intensive-activity-acceptance.mjs';

test('the current user-approved activity gate retains measured fractions and accepts the reported 20.33 percent',()=>{
 for(const [fraction,status] of [[.2033,'accepted'],[.20283,'accepted'],[.254,'not-accepted'],[.25,'not-accepted'],[.249999999,'accepted'],[0,'accepted'],[1,'not-accepted']]){
  const result=intensiveActivityAcceptance(fraction);
  assert.equal(result.status,status);assert.equal(result.measuredFraction,fraction);
  assert.equal(result.policy.maximumFraction,.25);assert.equal(result.policy.comparison,'strictly-less-than');
  assert.match(result.scope,/Activity metric only/);
 }
});
test('missing, nonnumeric or invalid activity cannot become accepted through coercion',()=>{
 for(const fraction of [null,undefined,'0.20',NaN,Infinity,-.1,1.1])assert.equal(intensiveActivityAcceptance(fraction).status,'unverified');
});
test('activity verdict identifies the exact acceptance policy without modifying it',()=>{
 const bytes=readFileSync(new URL('../docs/qa/intensive-acceptance-policy.json',import.meta.url));
 assert.equal(intensiveActivityAcceptance(.2033).policy.sha256,createHash('sha256').update(bytes).digest('hex'));
 assert.ok(Object.isFrozen(intensiveActivityAcceptance(.2).policy));
});

test('a matrix cannot approve missing, failed or inconsistent cases and exposes an observed failure of the activity gate',()=>{
 const cases=Array.from({length:30},()=>({status:'passed',activityAcceptance:intensiveActivityAcceptance(.2033)}));
 assert.equal(intensiveActivityMatrixAcceptance(cases),'accepted');
 assert.equal(intensiveActivityMatrixAcceptance(cases,{sourceConsistent:false}),'unverified');
 assert.equal(intensiveActivityMatrixAcceptance(cases.slice(1)),'unverified');
 const bad=cases.map(row=>({...row}));bad[0].activityAcceptance=intensiveActivityAcceptance(.254);
 assert.equal(intensiveActivityMatrixAcceptance(bad),'not-accepted');
 bad[0]={status:'failed'};assert.equal(intensiveActivityMatrixAcceptance(bad),'unverified');
 bad[0]={status:'passed'};assert.equal(intensiveActivityMatrixAcceptance(bad),'unverified');
});
