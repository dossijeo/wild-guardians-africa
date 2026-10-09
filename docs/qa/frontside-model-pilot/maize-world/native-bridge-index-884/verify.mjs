import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url),read=name=>fs.readFileSync(new URL(name,dir)),json=name=>JSON.parse(read(name).toString('utf8').replace(/^\uFEFF/,''));
const manifest=json('manifest.json'),report=json('report.json');
for(const file of manifest.files){const bytes=read(file.path);assert.equal(bytes.length,file.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256);}
assert.equal(manifest.sourceHead,'ae075376c0184484080970aeba5dd13e74b0321d');
assert.equal(manifest.fixtureJavaScriptSha256,'517f5cd0465e50b2bc3e42480507c9b18ffc7bb4eea987e121017c63b5a1d9a9');
assert.equal(report.viewCaseIndex,0);assert.equal(report.prospectiveCase.id,'maize03-04-mid-day-training');assert.equal(report.phase.phase,'morph');
assert.equal(report.visualAcceptancePolicyVersion,3);assert.equal(report.visualReview.status,'HUMAN_REVIEW_PENDING');assert.equal(report.visualReview.decision,null);
for(const row of report.runtime.arms){assert.equal(row.materialSide,2);assert.equal(row.shadowSide,2);assert.equal(row.count,1);assert.equal(row.visible,true);}
for(const row of report.controls)assert.equal(row.changedBytes,0);assert.equal(report.comparison.changedBytes,0);
for(const key of ['liveBridgeShared','instanceMatrixShared','materialUnchanged','shadowUnchanged'])assert.equal(report.runtime.control[key],true);
assert.equal(report.runtime.control.indexCount,17844);assert.equal(report.runtime.control.indexedVertices,11124);
assert.equal(report.runtime.control.indexedStaticBytes,1014600);assert.equal(report.runtime.control.sourceStaticBytes,1570272);
assert.equal(report.drawInfo.length,2);for(const row of report.drawInfo){assert.equal(row.calls,1);assert.equal(row.triangles,5948);}
assert.ok(report.effectiveShadowDraws.some(row=>row.arm===0));assert.ok(report.effectiveShadowDraws.some(row=>row.arm===1));for(const row of report.effectiveShadowDraws)assert.equal(row.depthSide,2);
assert.equal(report.cleanup.closed,true);assert.equal(report.cleanup.contextLost,true);assert.deepEqual(report.cleanup.errors,[]);assert.deepEqual(report.errors,[]);assert.equal(report.campaignConditions.gpuTiming,false);assert.deepEqual(json('console.json'),[]);
console.log('PASS retained native original/indexed DoubleSide single-view control; no model/category/GPU approval');
