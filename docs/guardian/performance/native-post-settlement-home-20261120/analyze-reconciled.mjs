import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const frozen=read('.cache/native-post-settlement-home-reconciled-frozen.json');
assert.equal(frozen.cases.length,5);assert(frozen.cases.every(c=>c.exitCode===0));
const rows=[];
for(const c of frozen.cases){
 const q=read(c.output),r=q.result;
 assert.equal(q.errors.length+q.consoleErrors.length+q.httpFailures.length+q.requestFailures.length+r.errors.length+r.final.gpuErrors,0);
 assert.equal(r.adapter.vendor,'nvidia');assert(r.drained&&r.disposal.gpu.disposed&&r.disposal.sourceAliveUntilGraphicalClose);
 const retained=r.resourceIdentity.retainedGeometryAndBankIds.length;assert(retained>0);
 assert.equal(r.resourceIdentity.retainedGeometryAndBankIds.length,retained);assert.equal(r.sharedProfileBank.after.refs,2);assert.equal(r.sharedProfileBank.after.pending,0);assert.equal(r.workers.native,2);
 assert(r.settlement);assert.equal(r.settlement.sourceAfter.workers.find(w=>w.id===r.source.bornId).status,'idle');
 let home=null;
 if(c.followHome){
  assert(r.home);assert(r.home.sourceAfter.workers.every(w=>w.status==='home'));assert.equal(r.home.notSelectableIds.length,2);assert.deepEqual(r.home.retainedIds,r.resourceIdentity.retainedGeometryAndBankIds);assert.equal(r.home.retirements.length,2);
  assert.equal(r.home.commit.binding.reference.bodyId,r.settlement.commit.binding.reference.bodyId);
  assert.equal(r.home.arrival.commit.binding.reference.bodyId,r.home.commit.binding.reference.bodyId);
  assert(r.home.arrival.notSelectable);assert.equal(r.home.after.inspectionGeneration,r.home.before.inspectionGeneration);
  home={commit:r.home.commit,arrivalCommit:r.home.arrival.commit,retirements:r.home.retirements,notSelectableIds:r.home.notSelectableIds,drawFrames:r.home.drawFrames,absenceDrawFrames:r.home.arrival.drawFrames,blocks:[r.home.readyBlock,r.home.commitBlock,r.home.arrival.readyBlock,r.home.arrival.commitBlock],finalWorkers:r.home.sourceAfter.workers.map(w=>({id:w.id,status:w.status,nativeRouteAdmission:w.nativeRouteAdmission})),scope:r.home.scope};
 }else assert(!r.home);
 const from=r.publications.find(p=>p.born).at,consumer=r.home?.after.drawExecution.consumer??r.host,samples=consumer.samples.filter(s=>s.at>=from),gaps=samples.slice(1).map((s,i)=>({from:samples[i].at,through:s.at,ms:s.at-samples[i].at})).sort((a,b)=>b.ms-a.ms);
 rows.push({...c,receiptSha256:hash(c.output),retained,bankRefs:[r.sharedProfileBank.before.refs,r.sharedProfileBank.ready.refs,r.sharedProfileBank.after.refs],home,broadGaps:gaps.slice(0,5),capture:q.capture,economic:r.settlement.economic,scope:'Functional ordinary lifecycle and identity, not global cadence or 3123 recovery acceptance.'});
}
const result={frozen:'.cache/native-post-settlement-home-reconciled-frozen.json',files:frozen.files,cases:rows,cadenceAccepted:false,fullMigrationComplete:false};
fs.writeFileSync('.cache/native-post-settlement-home-reconciled-analysis.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({label:r.label,retained:r.retained,retired:r.home?.retirements.length,maxBroadGapMs:r.broadGaps[0]?.ms,images:r.capture.checkpoints.map(c=>c.image)}))));
