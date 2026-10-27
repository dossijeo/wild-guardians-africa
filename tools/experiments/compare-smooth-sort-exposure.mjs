import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/smooth-sort-exposure';
const stats=v=>{assert(v.length);const a=[...v].sort((a,b)=>a-b),q=p=>a[Math.ceil(a.length*p)-1];return {n:a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:a.at(-1)};};
const rows=[];
for(const dir of ['1-baseline','2-candidate']){
 const r=JSON.parse(fs.readFileSync(`${root}/${dir}/raid-ui.json`)),c=r.casts[0],start=c.start,end=start+40000;
 assert.equal(r.ok,true);assert.deepEqual(r.errors,[]);assert.deepEqual(r.consoleErrors,[]);assert(r.smoothSort?.calls>0,'Treatment module must actually run');assert(c.captureStart>=end);assert.equal(r.readiness.pending,false);
 const cpu=r.residual.cpu.filter(x=>x.at>=start&&x.at+x.ms<=end),ids=new Set(cpu.map(x=>x.frame)),frames=r.timing.frames.filter(x=>x.t-x.ms>=start&&x.t<=end);
 rows.push({dir,source:r.smoothSortSource,sort:r.smoothSort,repackFraction:r.smoothSort.repacked/r.smoothSort.calls,bytesPerPrepare:r.smoothSort.bytes/r.smoothSort.calls,cpu:stats(cpu.map(x=>x.ms)),presentation:stats(frames.map(x=>x.ms)),gpu:stats(r.residual.gpu.samples.filter(x=>ids.has(x.frame)).map(x=>x.ms)),ready:r.readiness,uniqueChunks:new Set(c.streaming.samples.flatMap(x=>x.keys)).size,hardware:r.residual.hardware});
}
assert.deepEqual(rows[0].hardware,rows[1].hardware);
const report={rows,limits:['Single A/B is exposure evidence, not performance acceptance.','Sort counters include initialization and warmup, not only the timed traversal. Bytes represent rewritten CPU attributes marked dirty, not measured driver uploads.','Dynamic actor states and cadence differ; previous original/original runs varied substantially.','GPU query duration can include bubbles/driver scheduling.','Screenshots occur after measurement, not pixel-equivalence proof.']};
fs.writeFileSync(root+'/comparison.json',JSON.stringify(report,null,2));console.log(JSON.stringify(rows.map(({dir,sort,repackFraction,bytesPerPrepare,cpu,presentation,uniqueChunks})=>({dir,sort,repackFraction,bytesPerPrepare,cpu,presentation,uniqueChunks})),null,2));
