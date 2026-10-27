import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/matrix-reuse-continuous';
const read=p=>JSON.parse(fs.readFileSync(p));
const stats=values=>{assert(values.length);const a=[...values].sort((a,b)=>a-b),q=f=>a[Math.ceil(a.length*f)-1];return {n:a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:a.at(-1)};};
const rows=[];let reference;
for(let i=0;i<4;i++){
 const candidate=i%2===1,p=`${root}/${i+1}-${candidate?'candidate':'baseline'}`,r=read(p+'/raid-ui.json'),meta=read(p+'/provenance.json');
 assert.equal(r.ok,true);assert.deepEqual(r.errors,[]);assert.equal(meta.candidate,candidate);
 assert.equal(r.casts.length,1);assert.equal(r.casts[0].kind,'control-no-cast');
 const conditions={...meta.conditions};delete conditions.WG_BEAST_QA_OUT;delete conditions.WG_DEPTH_MATRIX_REUSE;
 const invariant={sources:meta.sources,conditions,hardware:r.residual.hardware};if(reference)assert.deepEqual(invariant,reference);else reference=invariant;
 assert.equal(r.instrumentation.cpuSampling,false);assert.equal(r.instrumentation.recordVideo,false);
 assert.equal(r.residual.gpu.supported,true);assert.equal(r.residual.gpu.disjointEvents,0);
 const samples=r.casts[0].streaming.samples,unique=new Set(samples.flatMap(s=>s.keys));assert(samples.at(-1).elapsed>=40);assert(unique.size>samples[0].keys.length);
 assert(r.after.state.elapsed>r.before.state.elapsed);
 if(candidate)assert(Number.isInteger(r.matrixReuse?.reused));else assert.equal(r.matrixReuse,null);
 rows.push({candidate,matrixReuse:r.matrixReuse,cpu:stats(r.residual.cpu.map(x=>x.ms)),presentation:stats(r.timing.frames.map(x=>x.ms)),gpuQueries:stats(r.residual.gpu.samples.map(x=>x.ms)),streaming:{observations:samples.length,duration:samples.at(-1).elapsed,uniqueChunks:unique.size,initialChunks:samples[0].keys.length,finalChunks:samples.at(-1).keys.length},simulationAdvance:r.after.state.elapsed-r.before.state.elapsed,programWaits:read(p+'/program-waits.json').length,consoleErrors:r.consoleErrors});
}
const result={reference,rows,treatmentExercised:rows.filter(r=>r.candidate).every(r=>r.matrixReuse.reused>0),limitations:['One populated Manglares fixture at medium quality; no universal performance claim.','If treatmentExercised is false, timings cannot establish benefit from matrix reuse; zero reuse is a relevance failure, not an acceptance pass.','GPU query durations include pipeline bubbles, not exclusive GPU execution.','Existing instrumentation is identical across treatments; CPU includes query bookkeeping.','Camera samples every100ms; equal route duration does not ensure identical simulation timing or chunk installation times.','Screenshots during the run can affect isolated frame maxima; raw timings retained.']};
fs.writeFileSync(root+'/comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify(rows,null,2));
