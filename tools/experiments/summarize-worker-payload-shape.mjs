import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.argv[2];if(!root)throw Error('Usage: summarize-worker-payload-shape.mjs RUN_DIRECTORY');
const report=JSON.parse(readFileSync(root+'/raid-ui.json','utf8'));
assert(report.ok);assert.equal(report.regionalTail.dropped,0);
assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);
const rows=report.regionalTail.rows,pairs=[];
for(let i=0;i<rows.length;i++){
 const shape=rows[i];if(shape.label!=='worker-payload-shape')continue;
 const getter=rows[i-1];assert.equal(getter?.label,'worker-event-data');
 assert(getter.start+getter.duration<=shape.start+.01);
 pairs.push({start:getter.start,getterWallMs:getter.duration,treeCount:shape.treeCount,treeFields:shape.treeFields,groundBytes:shape.transferredGroundBytes,metadataWallMs:shape.duration});
}
assert(pairs.length,'No worker messages observed');
const start=report.casts[0].start,end=start+40000;
const stream=pairs.filter(row=>row.start>=start&&row.start<end);
const result={scope:'Instrumented baseline, not an A/B optimization benchmark',pairs,stream,window:{start,end},maxGetterWallMs:Math.max(...pairs.map(p=>p.getterWallMs)),maxMetadataWallMs:Math.max(...pairs.map(p=>p.metadataWallMs)),limits:['event.data getter synchronous wall time includes scheduling interruption and is not pure deserialization CPU.','Ground buffer size counts unique ArrayBuffers in shallow ground metadata; it is not GPU residency.','Tree field names come from the first record only. No per-record traversal or serialization-size estimation is added.','A single observed association does not establish causality.']};
writeFileSync(root+'/payload-summary.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
