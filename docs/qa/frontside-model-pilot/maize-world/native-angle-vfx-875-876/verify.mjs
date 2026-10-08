import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',base)));
for(const [name,hash] of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name,base))).digest('hex'),hash,name);
assert.ok(manifest.missing.some(s=>s.startsWith('875-report.json:')));assert.equal(fs.existsSync(new URL('875-report.json',base)),false);
for(const id of [876,877]){
 const report=JSON.parse(fs.readFileSync(new URL(`${id}-report.json`,base)));assert.equal(report.visualReview.status,'HUMAN_REVIEW_PENDING');assert.equal(report.status,'WORLD_MAIZE_QA_NOT_APPROVED');assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{closed:true,contextLost:true,errors:[]});
 const focus=report.actions.filter(a=>a.event==='qa-maize-native-focus').at(-1),spell=report.actions.find(a=>a.event==='real-growth-spell-on-qa-copy');assert.equal(focus.plantId,spell.plantId);assert.equal(focus.point.theta,Math.PI/2);assert.equal(focus.point.distance,id===876?16:6);
 const capture=report.captures.at(-1);assert.equal(capture.logicalUnchanged,true);const [source,candidate]=capture.arms;assert.deepEqual(source.cameraPosition,candidate.cameraPosition);assert.deepEqual(source.cameraTarget,candidate.cameraTarget);
 for(const arm of capture.arms){assert.equal(arm.worldDepth.called,true);assert.equal(arm.worldDepth.option,true);assert.equal(arm.activeAgricultureEffects,1);}
 assert.equal(source.worldDepth.maizeDraws[0].side,2);assert.equal(candidate.worldDepth.maizeDraws.length,3);for(const draw of candidate.worldDepth.maizeDraws){assert.equal(draw.side,0);assert.equal(draw.authored,true);assert.equal(draw.materialType,'MeshDepthMaterial');}
}
console.log('PASS: immutable876/877 witnesses and hashes;875 image-only gap preserved, user review pending.');
