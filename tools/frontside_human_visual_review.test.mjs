import test from 'node:test';
import assert from 'node:assert/strict';
import {attachHumanVisualReview} from './lib/frontside-human-visual-review.mjs';
test('numeric failures stay diagnostic and cannot invent a human decision',()=>{
 const sample={passes:false,alphaIoU:.995,maxTileMae:.3},report={metricPolicyVersion:2,failed:true,samples:[sample]};
 attachHumanVisualReview(report);assert.equal(report.visualReview.status,'HUMAN_REVIEW_PENDING');assert.equal(report.visualReview.decision,null);assert.equal(report.visualReview.reviewer,null);assert.equal(report.diagnosticThresholdExceeded,true);assert.equal(Object.hasOwn(report,'failed'),false);assert.equal(sample.passes,false);assert.equal(sample.maxTileMae,.3);assert.equal(report.metricPolicyVersion,2);
});
test('even bit-exact numeric comparisons remain pending actual human inspection',()=>{
 const report=attachHumanVisualReview({comparisons:[{passes:true,linearRgbMae:0,alphaIoU:1}]});assert.equal(report.visualAcceptancePolicyVersion,3);assert.equal(report.visualReview.status,'HUMAN_REVIEW_PENDING');assert.equal(report.visualReview.decision,null);
});
