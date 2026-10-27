import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/seam-reuse-abab';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const stats=v=>{assert(v.length>0);const a=[...v].sort((a,b)=>a-b);return {n:a.length,p50:a[Math.floor((a.length-1)*.5)],p95:a[Math.floor((a.length-1)*.95)],p99:a[Math.floor((a.length-1)*.99)],max:a.at(-1)};};
const rows=[];let reference;
for(let i=0;i<4;i++){
 const candidate=i%2===1,dir=root+'/'+(i+1)+'-'+(candidate?'candidate':'baseline');const r=read(dir+'/report.json'),p=read(dir+'/provenance.json'),t=read(dir+'/treatment.json'),q=r.result.qualityCycle,e=q.execution;
 assert.equal(t.candidate,candidate);assert.equal(r.biome,process.argv[3]??'manglares');assert.equal(q.active.advancingFrames,240);assert.equal(q.active.pausedFrames,0);assert.equal(q.active.stream.failed,0);assert.equal(q.active.stream.queued,0);assert.equal(q.active.stream.busy,false);assert(q.active.created>0);
 assert(e.gpu.supported&&!e.gpu.disjoint&&e.gpu.samplesMs.length>20);assert(r.errors.every(s=>s.startsWith('THREE.WebGLProgram: Program Info Log:')&&s.includes('warning X4000:')&&!/error X\d/i.test(s)),'Unexpected runtime/console issue');
 const invariant={url:r.url,hardware:e.hardware,runtime:p.runtimeSha256,qualityCase:p.qualityCaseSha256};if(reference)assert.deepEqual(invariant,reference);else reference=invariant;
 if(i>=2)assert.deepEqual(t.sources,rows[i-2].sources,'Treatment changed');
 const frames=e.frames.map(x=>x.timestamp),intervals=frames.slice(1).map((v,j)=>v-frames[j]);
 rows.push({order:i+1,candidate,sources:t.sources,warnings:r.errors.length,cpu:stats(e.frames.map(x=>x.ms)),gpu:stats(e.gpu.samplesMs),callbackCadence:stats(intervals),transitionIntervals:stats(q.rows.flatMap(x=>x.frameTimes)),maxBlockingLoaf:Math.max(0,...e.longFrames.map(x=>x.blockingDuration)),slowGL:q.attribution.filter(x=>x.kind==='gl'),travelMs:q.active.travelWallMs,settledMs:q.active.settledWallMs,created:q.active.created,programCounts:q.rows.map(x=>x.programs)});
}
assert.deepEqual(rows[0].sources,rows[1].sources,'Source files changed between route treatments');
const provenance=i=>read(root+'/'+i+'-'+(i%2===0?'candidate':'baseline')+'/provenance.json');
assert.equal(provenance(1).harnessSha256,provenance(3).harnessSha256);assert.equal(provenance(2).harnessSha256,provenance(4).harnessSha256);assert.notEqual(provenance(1).harnessSha256,provenance(2).harnessSha256);

const result={invariant:reference,rows,limits:['Two repetitions per treatment; attribution instrumentation adds overhead. Not final acceptance.','One historical populated biome save only; no full-game or six-biome completion claim.','Existing X4000 compiler warnings preserved, not a clean-console claim.','GPU query durations include bubbles. CPU and callback cadence are separate.','Callback timestamp deltas cover main callbacks; transitionIntervals cover only transition windows.','240-frame travel has variable wall duration. Streaming arrivals may vary; compare useful work and total settled time.']};fs.writeFileSync(root+'/comparison.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(rows.map(({sources,slowGL,...r})=>({...r,slowGL:slowGL.map(x=>({name:x.name,ms:x.ms,key:x.program?.cacheKey}))})),null,2));
