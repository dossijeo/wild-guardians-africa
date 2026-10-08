// Verify a future exported functional report. No WebGL and no ownership claim
// beyond the report: actual buffer identities require separate instrumentation.
import fs from 'node:fs';import assert from 'node:assert/strict';
const file=process.argv[2];if(!file)throw Error('Pass the immutable native ownership QA report path');
const report=JSON.parse(fs.readFileSync(file));
assert.equal(report.status,'WORLD_MAIZE_QA_NOT_APPROVED');assert.equal(report.visualReview.status,'HUMAN_REVIEW_PENDING');assert.equal(report.qaFlag,'front');
assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{closed:true,contextLost:true,errors:[]});
assert.ok(report.captures.length>=5,'Four cycle comparisons plus one post-restore comparison are required');
for(const capture of report.captures){assert.equal(capture.logicalUnchanged,true);assert.equal(capture.arms.length,2);const [source,candidate]=capture.arms;assert.equal(source.candidate,false);assert.equal(candidate.candidate,true);assert.deepEqual(source.cameraPosition,candidate.cameraPosition);assert.deepEqual(source.cameraTarget,candidate.cameraTarget);assert.deepEqual(source.resolution,candidate.resolution);assert.equal(candidate.adapter.closed,false);assert.equal(candidate.adapter.capacity,2048);assert.deepEqual(candidate.adapter.materialSides,[0,0,0]);assert.deepEqual(candidate.adapter.shadowSides,[2,2,2]);assert.equal(candidate.adapter.events.find(e=>e.event==='installed').liveGrowthShared,true);}
const restore=report.actions.filter(a=>a.event==='memory-save-restore');assert.ok(restore.length>=1);for(const event of restore){assert.equal(event.candidate,true);assert.equal(event.stateByteExact,true);assert.equal(event.beforeSha256,event.afterSha256);assert.equal(event.adapter.closed,false);}
console.log('PASS: exported functional comparison/save contracts; manual toggle history and actual GL buffer ownership require independent evidence.');
