// Standalone archived schema and evidence check. No runtime/tool/asset imports.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const here=new URL('./',import.meta.url),snapshot=JSON.parse(fs.readFileSync(new URL('schema-snapshot.json',here))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [tab,expected]of Object.entries(snapshot.cases)){
 const dir=new URL('../young-front-native-'+tab+'/',here),read=name=>fs.readFileSync(new URL(name,dir)),manifest=JSON.parse(read('manifest.json'));
 assert.equal(manifest.sourceHead,snapshot.sourceHead);assert.equal(manifest.tab,Number(tab));
 for(const f of manifest.files){const b=read(f.name);assert.equal(b.length,f.bytes,f.name+' bytes');assert.equal(sha(b),f.sha256,f.name+' SHA');}
 assert.ok(['report.json','atlas.png','console.json'].every(name=>manifest.files.some(f=>f.name===name)));
 assert.equal(manifest.sourceFiles.find(f=>f.name==='tests/browser/frontside-crop-young-leaf-front-review.js').sha256,snapshot.viewerSha256);
 const r=JSON.parse(read('report.json'));assert.equal(r.status,'VISUAL_SCREEN_NOT_APPROVED');assert.equal(r.youngLeafFrontHuman,true);assert.equal(r.viewProfile,snapshot.viewProfile);assert.equal(r.archiveSha256,snapshot.archiveSha256);
 assert.deepEqual(r.sourceMapping,snapshot.sourceMapping);assert.equal(r.source,snapshot.sourceMapping.runtime);assert.equal(r.sourceOriginal,snapshot.sourceMapping.source);assert.equal(r.runtimeSource,snapshot.sourceMapping.runtime);
 assert.equal(r.viewCaseIndex,expected.index);assert.equal(r.viewCaseId,expected.value.id);assert.deepEqual(r.prospectiveCase,expected.value);
 assert.equal(r.visualAcceptancePolicyVersion,3);assert.equal(r.metricPolicyVersion,2);assert.equal(r.visualReview.status,'HUMAN_REVIEW_PENDING');assert.equal(r.visualReview.decision,null);
 assert.equal(r.campaignConditions.gpuTiming,false);assert.equal(r.cleanup.closed,true);assert.deepEqual(r.cleanup.errors,[]);assert.equal(r.contextLost,true);
 assert.equal(r.contextAttributes.antialias,false);assert.equal(r.contextAttributes.preserveDrawingBuffer,true);assert.equal(r.contextAttributes.alpha,true);
 assert.equal(r.controls.length,3);assert.ok(r.controls.every(c=>c.differentBytes===0&&c.alphaDifferences===0&&c.maxByteDifference===0));assert.equal(r.comparisons.length,3);assert.deepEqual(r.comparisons.map(c=>c.arm),[1,2,3]);assert.equal(r.comparisons[0].linearRgbMae,0);assert.equal(r.comparisons[0].alphaIoU,1);
 // Numeric results for derived arms remain diagnostics; do not assert passes.
 assert.ok(r.phaseSummary.length===4&&r.phaseSummary.every(s=>s.phase==='original'&&s.stage===1&&s.youngActive&&s.active.some(m=>m.name==='maiz_02_joven'&&m.count===1)));
 assert.deepEqual(r.materialSides.map(m=>m.sides),[[2],[2],[2],[0,0,0]]);assert.deepEqual(r.materialSides.map(m=>m.shadowSides),[[2],[2],[2],[2,2,2]]);
 const colour=r.colourDrawWitness.filter(d=>d.arm===3);assert.equal(colour.length,3);assert.deepEqual(colour.map(d=>d.group),[0,1,2]);assert.deepEqual(colour.map(d=>d.indexCount),[2808,477,477]);assert.ok(colour.every(d=>d.mesh==='maiz_02_joven'&&d.instances===1&&d.materialSide===0&&d.shadowSide===2&&d.cullEnabled===true&&d.cullFaceMode===1029&&d.frontFace===2305&&d.sourceDoubleShaderDefine===true));
 assert.equal(r.resources[1].vertices,1921);assert.equal(r.resources[1].triangles,1254);assert.equal(r.resources[1].attributeBytes+r.resources[1].indexBytes,68996);
 const png=read('atlas.png');assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.subarray(12,16).toString(),'IHDR');assert.equal(png.readUInt32BE(16),4096);assert.equal(png.readUInt32BE(20),1024);
 const logs=JSON.parse(read('console.json'));assert.ok(Array.isArray(logs));assert.equal(logs.filter(l=>l.level==='error').length,0);assert.equal(logs.length,tab==='925'?2:0);if(tab==='925')assert.ok(logs.every(l=>l.level==='warn'&&l.message.includes('f_environment4')));
 console.log('PASS native'+tab+': frozen identities/case, hashes/PNG, three actual Front/BACK/CCW colour witnesses, Double shadow isolation, exact source controls, policy3/cleanup/console.');
}
console.log('Standalone docs-only receipt validation; limited AI still screening, no human-user/category/GPU acceptance.');
