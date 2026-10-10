import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base=resolve(process.argv[2]??'docs/qa/paid-enclosure-entry-risk');
const manifest=JSON.parse(readFileSync(resolve(base,'archive-manifest.json')));
for(const[p,r]of Object.entries(manifest.files)){const b=readFileSync(resolve(base,p));assert.equal(b.length,r.bytes,p);assert.equal(sha(b),r.sha256,p);}
const read=p=>JSON.parse(readFileSync(resolve(base,'native-original',p),'utf8').replace(/^\uFEFF/,''));
const before=read('paid-enclosure-entry-03.json'),r=read('paid-enclosure-entry-04.json');
assert.equal(r.sourceCount,394);assert.equal(r.stateSHA256,sha(JSON.stringify(r.snapshot)));
assert.equal(r.stateSHA256,before.stateSHA256);assert.deepEqual(r.paid,{centre:800,crop:5,walls:170,hire:30,balance:495});
assert.equal(r.snapshot.time,0);assert.equal(r.snapshot.elapsed,0);assert.equal(r.radius,1.1);
assert.equal(r.snapshotUnchangedByEntry,true);assert.equal(r.nominalAndPaidPieces,17);assert.equal(r.closedFaces,1);
assert.deepEqual(r.checks,{centerTargetInternalCameraEntry:false,centerTargetInternalPreparedEntry:false,nearFarmInternalEntry:true,outsideCameraCandidate:true,cropTargetInternalCameraEntry:true,cropTargetInternalPreparedEntry:true});
// Version03 named the centre view target `focus`; version04 distinguishes
// controls target from operational centre. Compare retained native results,
// then explicitly check the two equivalent metadata values.
for(let i=0;i<before.results.length;i++){
 const old=before.results[i],current=r.results[i];
 assert.deepEqual(old.focus,current.viewTarget);assert.deepEqual(old.focus,current.operationalCenter);
 for(const field of ['id','eye','activeBounds','radius','descriptions','preparedWarmth'])assert.deepEqual(old[field],current[field]);
}
for(const p of ['paid-enclosure-entry-first-attempt.json','paid-enclosure-entry-second-attempt.json']){const f=read(p);assert.equal(f.exitCode,1);assert.equal(f.resultPayloadWritten,false);}
const result={status:'verified',payloads:Object.keys(manifest.files).length,sourceCount:r.sourceCount,snapshotSHA256:r.stateSHA256,checks:r.checks,scope:r.scope,unknowns:r.unknowns};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
