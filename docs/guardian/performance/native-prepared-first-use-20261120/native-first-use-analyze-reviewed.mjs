import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const frozen=read('.cache/native-first-use-reviewed-frozen.json');assert.equal(frozen.cases.length,5);
const rows=[];
for(const c of frozen.cases){assert.equal(c.exitCode,0);const q=read(c.output),r=q.result;
 assert.equal(q.errors.length+q.consoleErrors.length+q.httpFailures.length+q.requestFailures.length+r.errors.length+r.final.gpuErrors,0);
 assert.equal(r.adapter.vendor,'nvidia');assert(r.drained&&r.disposal.gpu.disposed&&r.disposal.sourceAliveUntilGraphicalClose);
 const retained=c.profile.startsWith('older')?576:585;assert.equal(r.resourceIdentity.retainedGeometryAndBankIds.length,retained);assert.equal(r.sharedProfileBank.after.refs,2);assert.equal(r.sharedProfileBank.after.pending,0);assert.equal(r.workers.native,2);
 if(c.followSettlement){assert.equal(r.settlement.sourceAfter.workers.find(w=>w.id===r.source.bornId).status,'idle');assert.equal(r.settlement.actual.executionEpoch,r.settlement.commit.binding.reference.worldBoundary.effectiveTime);}
 const from=r.publications.find(p=>p.born).at,samples=r.host.samples.filter(s=>s.at>=from),gaps=samples.slice(1).map((s,i)=>({from:samples[i].at,through:s.at,ms:s.at-samples[i].at})).sort((a,b)=>b.ms-a.ms);
 rows.push({...c,receiptSha256:hash(c.output),retained,bankRefs:[r.sharedProfileBank.before.refs,r.sharedProfileBank.ready.refs,r.sharedProfileBank.after.refs],firstUse:Object.fromEntries(Object.entries(r.host).filter(([k])=>k.startsWith('firstUse'))),broadGaps:gaps.slice(0,5),blocked:{preparation:r.preparationBlock,ready:r.block,task:r.taskBlock,action:r.action&&{ready:r.action.readyBlock,commit:r.action.commitBlock},consequence:r.consequence&&{ready:r.consequence.readyBlock,commit:r.consequence.commitBlock},settlement:r.settlement&&{ready:r.settlement.readyBlock,commit:r.settlement.commitBlock}},economic:r.settlement?.economic,capture:q.capture,prepared:r.resourceChanges.prepared,afterReady:r.resourceChanges.afterReady});
}
const result={frozen:'.cache/native-first-use-reviewed-frozen.json',files:frozen.files,cases:rows,cadenceAccepted:false,scope:'Functional GPU validation and cumulative first-use counters. Broad gaps are not attributed causal GPU time and are not fluency acceptance.'};
fs.writeFileSync('.cache/native-first-use-reviewed-analysis.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({label:r.label,retained:r.retained,firstUse:r.firstUse,maxBroadGapMs:r.broadGaps[0].ms,capture:r.capture.checkpoints.map(x=>x.image)}))));
