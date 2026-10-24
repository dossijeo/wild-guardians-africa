import {readFile,writeFile} from 'node:fs/promises';
const root='docs/qa/global-visual-lab/desert-aerial-sand/dry-specular/performance';
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const long=[],paired=[],checks=[];
for(const quality of ['media','baja']){
 for(const kind of ['long','paired']){
  const file=`${quality}${kind==='paired'?'-interleaved':''}.json`,data=JSON.parse(await readFile(root+'/'+file,'utf8'));
  for(const r of data.records){
   const t=r.report.gpuTimer,n=kind==='paired'?256:180;
   const valid=t.supported&&t.samples.length===n&&t.samples.every(s=>Number.isFinite(s.ms)&&s.ms>=0)&&!t.disjointEvents&&!t.discarded&&!t.overflowSkipped&&!t.foreignQuerySkipped&&!t.allocationFailures&&!t.unresolvedAtDispose&&!t.contextLost&&!r.errors.length&&!r.report.errors.length&&r.report.simulationUnchanged&&r.report.cameraStable;
   checks.push({file,phase:r.phase,repeat:r.repeat??null,variant:r.variant??null,samples:t.samples.length,valid});
   if(!valid)throw Error('Invalid measurement '+file);
  }
  for(const phase of ['day','night']){
   const rows=data.records.filter(r=>r.phase===phase);
   if(kind==='long'){
    const groups=[0,1].map(v=>rows.filter(r=>r.variant===v));
    const gpu=groups.map(g=>mean(g.map(r=>r.report.gpuElapsedMs.mean)));
    long.push({quality,phase,gpuOriginal:gpu[0],gpuCandidate:gpu[1],delta:gpu[1]-gpu[0],blocks:groups.map(g=>g.map(r=>r.report.gpuElapsedMs.mean)),cpu:groups.map(g=>mean(g.map(r=>r.report.cpuSubmissionMs.mean))),frameInterval:groups.map(g=>mean(g.map(r=>r.report.frameIntervalMs.mean))),draws:rows.map(r=>r.report.submittedCalls.mean),triangles:rows.map(r=>r.report.submittedTriangles.mean)});
   }else for(const r of rows){
    const samples=r.report.sandInterleavedSamples,gpu=r.report.gpuTimer.samples;
    const stats=[0,1].map(v=>{const frames=samples.map((s,i)=>({...s,frame:i})).filter(s=>s.sandVariant===v),times=gpu.filter(s=>samples[s.frame].sandVariant===v);if(frames.length!==128||times.length!==128)throw Error('Unbalanced pairs');return {gpuMs:mean(times.map(s=>s.ms)),cpuMs:mean(frames.map(s=>s.cpu)),draws:[...new Set(frames.map(s=>s.calls))],triangles:[...new Set(frames.map(s=>s.triangles))]}});
    if(JSON.stringify(stats[0].draws)!==JSON.stringify(stats[1].draws)||JSON.stringify(stats[0].triangles)!==JSON.stringify(stats[1].triangles))throw Error('Unequal geometry');
    const cycles=[];for(let c=0;c<8;c++){const by=[0,1].map(v=>gpu.filter(s=>Math.floor(s.frame/32)===c&&samples[s.frame].sandVariant===v).map(s=>s.ms));cycles.push({cycle:c,delta:mean(by[1])-mean(by[0])})}
    paired.push({quality,phase,repeat:r.repeat,original:stats[0],candidate:stats[1],delta:stats[1].gpuMs-stats[0].gpuMs,cycles});
   }
  }
 }
}
await writeFile(root+'/summary.json',JSON.stringify({long,paired,checks,totalValidSamples:checks.reduce((n,c)=>n+c.samples,0),limits:'Long blocks and interleaved protocol reported separately; no cherry-picking or subtraction of unrelated phases. CPU render excludes QA toggle call but includes material program revalidation. Frame cadence instrumented, not production FPS.'},null,2)+'\n');
console.log(JSON.stringify({totalValidSamples:checks.reduce((n,c)=>n+c.samples,0),long,paired:paired.map(({cycles,...r})=>r)},null,2));
