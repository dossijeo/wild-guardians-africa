import {readFileSync,writeFileSync} from 'node:fs';
const root=process.argv[2];if(!root)throw Error('Expected renderer run directory');
const report=JSON.parse(readFileSync(root+'/raid-ui.json'));
const waits=JSON.parse(readFileSync(root+'/program-waits.json'));
const frames=report.timing?.frames??[];
const control=report.casts?.length>0&&report.casts.every(c=>c.kind==='control-no-cast');
const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);const p=q=>sorted.length?sorted[Math.ceil(q*sorted.length)-1]:null;return {samples:sorted.length,p50:p(.5),p95:p(.95),p99:p(.99),max:sorted.at(-1)??null};};
const summary={biome:report.biome??report.before?.state?.biome,reservationVersion:report.before?.state?.mangroveSettlementVersion,simulationElapsed:{before:report.before?.state?.elapsed,after:report.after?.state?.elapsed},runtimeProfile:report.runtimeProfile,ok:report.ok,failure:report.failure,scope:control?'Streaming control without casting; active agricultural simulation, no UI targeting or raid':report.scope,errors:report.errors,
 frameIntervals:stats(frames.map(f=>f.ms)),programWaits:{count:waits.length,totalMs:waits.reduce((s,w)=>s+w.ms,0),maxMs:Math.max(0,...waits.map(w=>w.ms))},
 casts:report.casts?.map(({streaming,...c})=>({...c,...(streaming?{streaming:{samples:streaming.samples.length,initialChunks:streaming.samples[0]?.keys.length,finalChunks:streaming.samples.at(-1)?.keys.length,uniqueChunks:new Set(streaming.samples.flatMap(s=>s.keys)).size}}:{}),activationFrames:stats(frames.filter(f=>f.t>=c.start&&f.t-f.ms<=c.start+2000).map(f=>f.ms)),programWaits:waits.filter(w=>w.start>=c.start&&w.start<=c.start+2000).map(w=>({start:w.start,ms:w.ms,draw:w.draw}))})),
 limitations:['Single instrumented renderer run; not ABAB or isolated GPU timing.','Activation window includes intervals overlapping first two seconds after command.',control?'No spells cast; matched simulation spacing, no pointer targeting test.':'Commands invoke legal Game.cast; no pointer targeting test.']};
if(['draws','hits','untracked'].every(k=>Number.isFinite(report.shadowCacheBefore?.[k])&&Number.isFinite(report.shadowCacheAfter?.[k]))){
 const delta=Object.fromEntries(['draws','hits','untracked'].map(k=>[k,report.shadowCacheAfter[k]-report.shadowCacheBefore[k]]));
 summary.shadowCache={...delta,hitFraction:delta.draws+delta.hits?delta.hits/(delta.draws+delta.hits):null,scope:'Counter differences across recorded run, not CPU or GPU timings. Untracked attempts overlap draws; do not add them to total attempts.'};
}
if(report.residual){
 const {gpu,cpu,hardware,cpuScope}=report.residual;
 summary.residual={hardware,cpuScope,cpuWorldRenderMs:stats(cpu.map(s=>s.ms)),gpuWorldRenderMs:stats(gpu.samples.map(s=>s.ms)),gpuStatus:{supported:gpu.supported,reason:gpu.reason,disjointEvents:gpu.disjointEvents,discarded:gpu.discarded,overflowSkipped:gpu.overflowSkipped,foreignQuerySkipped:gpu.foreignQuerySkipped,pendingBeforeDispose:gpu.pendingBeforeDispose,unresolvedAtDispose:gpu.unresolvedAtDispose},gpuScope:gpu.scope};
 const observedSpanMs=cpu.length?cpu.at(-1).at+cpu.at(-1).ms-cpu[0].at:0;
 const impossible=gpu.samples.filter(sample=>sample.ms>observedSpanMs);
 summary.residual.gpuSanity={observedSpanMs,impossibleSamples:impossible,usable:gpu.supported===true&&impossible.length===0,scope:'Conservative sanity bound only; passing does not independently prove timer accuracy. Raw samples are never clipped or discarded here.'};
 if(impossible.length){summary.residual.rawGpuWorldRenderMs=summary.residual.gpuWorldRenderMs;summary.residual.gpuWorldRenderMs=null;summary.limitations.push('GPU timer returned durations longer than the entire observation window; this run is invalid for GPU performance conclusions even without a reported disjoint. Raw values are retained.');}
 if(report.residual.phases?.length){
  const grouped=new Map();for(const p of report.residual.phases){if(!grouped.has(p.label))grouped.set(p.label,[]);grouped.get(p.label).push(p.ms);}
  summary.residual.phases=Object.fromEntries([...grouped].map(([label,values])=>[label,stats(values)]));
  summary.residual.droppedPhases=report.residual.droppedPhases;
  summary.residual.phaseScope='World-frame phases cover synchronous frame units. Subsystem spans are nested, include only calls >=1ms, have conditional percentiles, and must not be summed with parent phases.';
  summary.residual.slowestRenderFrames=[...cpu].sort((a,b)=>b.ms-a.ms).slice(0,10).map(c=>({...c,gpuMs:gpu.samples.find(g=>g.frame===c.frame)?.ms??null,phases:report.residual.phases.filter(p=>p.frame===c.frame)}));
 }
 summary.limitations.push('CPU World.render includes GPU-query bookkeeping; simulation/UI outside this call are excluded. GPU queries do not include asynchronous preparation outside the envelope.');
}
writeFileSync(root+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
