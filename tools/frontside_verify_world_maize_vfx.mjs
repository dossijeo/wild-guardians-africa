import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const folder='docs/qa/frontside-model-pilot/maize-world/native-vfx-depth-873-874';
const manifest=JSON.parse(fs.readFileSync(`${folder}/manifest.json`));
for(const [file,expected] of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`${folder}/${file}`)).digest('hex'),expected,file);
for(const id of [873,874]){
 const report=JSON.parse(fs.readFileSync(`${folder}/${id}-report.json`));
 assert.equal(report.status,'WORLD_MAIZE_QA_NOT_APPROVED');
 assert.equal(report.visualReview.status,'HUMAN_REVIEW_PENDING');
 assert.equal(report.visualReview.decision,null);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{closed:true,contextLost:true,errors:[]});
 assert.equal(report.captures.length,1);
 const capture=report.captures[0];assert.equal(capture.time,150);assert.equal(capture.logicalUnchanged,true);
 const [source,candidate]=capture.arms;assert.equal(source.candidate,false);assert.equal(candidate.candidate,true);
 assert.deepEqual(source.cameraPosition,candidate.cameraPosition);assert.deepEqual(source.cameraTarget,candidate.cameraTarget);
 for(const arm of capture.arms){assert.equal(arm.activeAgricultureEffects,1);assert.equal(arm.worldDepth.called,true);assert.equal(arm.worldDepth.option,id===874);}
 assert.equal(source.worldDepth.maizeDraws.length,1);assert.equal(source.worldDepth.maizeDraws[0].side,2);
 assert.equal(candidate.worldDepth.maizeDraws.length,3);
 for(const draw of candidate.worldDepth.maizeDraws){assert.equal(draw.side,0);assert.equal(draw.authored,id===874);assert.equal(draw.materialType,id===874?'MeshDepthMaterial':'MeshStandardMaterial');assert.ok(draw.group);}
 assert.deepEqual(candidate.adapter.shadowSides,[2,2,2]);
 const focus=report.actions.find(a=>a.event==='qa-maize-native-focus'),spell=report.actions.find(a=>a.event==='real-growth-spell-on-qa-copy');
 assert.equal(focus.plantId,spell.plantId);assert.equal(spell.elapsedSimulationAdvanced,false);
}
console.log('PASS: immutable native VFX/depth witness, cleanup and pending visual review; no GPU-benefit approval');
