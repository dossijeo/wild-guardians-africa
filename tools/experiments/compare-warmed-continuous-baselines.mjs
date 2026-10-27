import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/warmed-continuous-baselines';
const stats=v=>{assert(v.length);const a=[...v].sort((a,b)=>a-b),q=p=>a[Math.ceil(a.length*p)-1];return {n:a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:a.at(-1)};};
const rows=[];
for(let i=1;i<=2;i++){
 const r=JSON.parse(fs.readFileSync(`${root}/${i}-baseline/raid-ui.json`)),ready=r.readiness,c=r.casts[0];
 assert.equal(r.ok,true);assert.deepEqual(r.errors,[]);assert.equal(ready.stableFrames,60);assert.equal(ready.pending,false);assert.equal(c.kind,'control-no-cast');assert.equal(r.matrixReuse,null);
 assert.equal(r.warmup.target,30);assert(r.warmup.after.elapsed>=30);assert(c.captureStart>=c.start+40000,'Capture must be outside timed window');assert.deepEqual(r.consoleErrors,[]);
 const start=c.start,end=start+40000,frames=r.timing.frames.filter(x=>x.t-x.ms>=start&&x.t<=end),cpu=r.residual.cpu.filter(x=>x.at>=start&&x.at+x.ms<=end);
 const ids=new Set(cpu.map(x=>x.frame)),gpu=r.residual.gpu.samples.filter(x=>ids.has(x.frame));
 assert(c.streaming.samples.at(-1).elapsed>=40);
 rows.push({run:i,ready,warmup:r.warmup,capture:{start:c.captureStart,end:c.captureEnd},measurement:{start,end,scope:'Only intervals entirely inside the forty-second no-cast window; preflight and partial boundary intervals excluded.'},presentation:stats(frames.map(x=>x.ms)),cpu:stats(cpu.map(x=>x.ms)),gpuQuery:stats(gpu.map(x=>x.ms)),gpuDisjoint:r.residual.gpu.disjointEvents,uniqueChunks:new Set(c.streaming.samples.flatMap(x=>x.keys)).size,simulationAdvance:r.after.state.elapsed-ready.elapsed,hardware:r.residual.hardware,consoleErrors:r.consoleErrors});
}
const sameInitialKeys=JSON.stringify(rows[0].ready.keys)===JSON.stringify(rows[1].ready.keys),sameCamera=JSON.stringify(rows[0].ready.camera)===JSON.stringify(rows[1].ready.camera),sameTarget=JSON.stringify(rows[0].ready.target)===JSON.stringify(rows[1].ready.target);
assert.deepEqual(rows[0].hardware,rows[1].hardware);
const result={rows,sameInitialKeys,sameCamera,sameTarget,comparableStart:sameInitialKeys&&sameCamera&&sameTarget,limitations:['A/A reproducibility check, not optimization evidence.','Active simulation state is not forced to equality; elapsed start times are retained.','Preflight may still expose natural world changes; matching chunk keys does not imply matching actor poses.','Screenshot occurs after the timed window; it does not validate visuals throughout traversal. Warmup reaches simulation elapsed 30s, followed by the residency gate; dynamic state is still not identical.']};
fs.writeFileSync(root+'/comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
