import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const root=process.argv[2];assert(root,'Expected completed A/B/A/B directory');
const read=p=>JSON.parse(readFileSync(p));
const stats=values=>{const s=values.slice().sort((a,b)=>a-b),p=q=>s.length?s[Math.ceil(q*s.length)-1]:null;return {samples:s.length,p50:p(.5),p95:p(.95),p99:p(.99),max:s.at(-1)??null};};
const rows=[];
for(const [i,candidate] of [false,true,false,true].entries()){
 const directory=`${root}/${i+1}-${candidate?'candidate':'baseline'}`;
 const r=read(directory+'/raid-ui.json'),s=read(directory+'/summary.json'),p=read(directory+'/provenance.json');
 assert(r.ok,`${directory}: failed run`);assert.equal(p.candidate,candidate);assert.equal(p.order,i+1);assert.deepEqual(r.errors,[]);
 assert.equal(r.consoleErrors?.length??0,0,'Console errors require review');assert.equal(r.failedRequests?.length??0,0,'Failed requests require review');
 if(candidate)assert(r.runtimeOverride?.loads?.['spatial-threaded.wasm']>0);
 const releases=r.residual.phases.filter(x=>x.label==='subsystem:spatialRelease');
 const releaseFrames=new Set(releases.map(x=>x.frame));
 rows.push({order:i+1,candidate,provenance:p,hardware:s.residual.hardware,frameIntervals:s.frameIntervals,cpuWorldRenderMs:s.residual.cpuWorldRenderMs,gpuWorldRenderMs:s.residual.gpuWorldRenderMs,gpuSanity:s.residual.gpuSanity,releaseCallsAtLeast1ms:stats(releases.map(x=>x.ms)),renderFramesWithReleaseAtLeast1ms:stats(r.residual.cpu.filter(x=>releaseFrames.has(x.frame)).map(x=>x.ms)),cpuRenderOver33ms:r.residual.cpu.filter(x=>x.ms>33.333).length,presentationOver50ms:r.timing.frames.filter(x=>x.ms>50).length,presentationOver100ms:r.timing.frames.filter(x=>x.ms>100).length,streaming:s.casts.map(x=>x.streaming),programWaits:s.programWaits});
}
for(const row of rows){assert.deepEqual(row.hardware,rows[0].hardware,'Hardware/resolution mismatch');assert.equal(row.provenance.fixtureSha256,rows[0].provenance.fixtureSha256,'Fixture mismatch');assert.equal(row.provenance.harnessSha256,rows[0].provenance.harnessSha256,'Harness mismatch');}
const result={rows,limits:['Two runs per configuration are evidence for this scene only; no automatic acceptance threshold.','Simulation and asynchronous residency remain active; chunk arrival timings can differ.','Release spans record calls >=1ms only. Their counts and percentiles are conditional, not all releases.','World.render CPU excludes simulation/UI outside that call; presentation intervals include all frame delays.','GPU sanity is a rejection check, not independent proof of timer accuracy.','Inspect captures and concurrency validation before adopting.']};
writeFileSync(root+'/comparison.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows.map(({provenance,hardware,gpuSanity,...row})=>row),null,2));
