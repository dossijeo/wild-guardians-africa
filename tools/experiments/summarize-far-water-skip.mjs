import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/far-water-skip-abab';
const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return {count:a.length,...Object.fromEntries([50,95,99,100].map(p=>[p===100?'max':`p${p}`,a[Math.min(a.length-1,Math.ceil(a.length*p/100)-1)]??null]))};};
const rows=[];
for(const name of ['A1','B1','A2','B2']){
 const bytes=await readFile(`${root}/${name}.json`),r=JSON.parse(bytes),q=r.result.qualityCycle,e=q.execution;
 const provenance=JSON.parse(await readFile(`${root}/${name}-provenance.json`));
 if(q.active.travelFrame!==240||q.active.advancingFrames!==240||q.active.pausedFrames!==0||q.active.stream.queued||q.active.stream.busy||q.active.stream.preparing)throw Error(`${name}: incomplete active protocol`);
 const attaches=e.farOperations.filter(x=>x.label==='attachData'&&x.slot===0);
 const overlaps=attaches.map(a=>({attachMs:a.ms,longFrames:e.longFrames.filter(f=>f.startTime<=a.at&&f.startTime+f.duration>=a.at+a.ms).map(f=>({duration:f.duration,blockingDuration:f.blockingDuration,scripts:f.scripts}))}));
 rows.push({name,provenance,sha256:createHash('sha256').update(bytes).digest('hex'),hardware:e.hardware,cpu:stats(e.frames.map(x=>x.ms)),presentation:stats(e.frames.slice(1).map((x,i)=>x.timestamp-e.frames[i].timestamp)),gpu:stats(e.gpu.samplesMs),gpuDisjoint:e.gpu.disjoint,attachments:attaches,attachmentFrames:overlaps,active:q.active,errors:r.errors});
 await writeFile(`${root}/${name}.json.gz`,gzipSync(bytes));
}
if(new Set(rows.map(r=>r.hardware)).size!==1)throw Error('Hardware mismatch');
if(rows[0].provenance.sourceHash!==rows[2].provenance.sourceHash||rows[1].provenance.sourceHash!==rows[3].provenance.sourceHash||rows[0].provenance.sourceHash===rows[1].provenance.sourceHash)throw Error('ABAB source mismatch');
await writeFile(`${root}/comparison.json`,JSON.stringify({scope:'Instrumented quality-cycle diagnostics, not a clean-console or visual-equivalence gate. CPU callback excludes asynchronous worker delivery; inspect attachment LoAF separately. GPU includes pipeline bubbles.',rows},null,2));
console.log(JSON.stringify(rows.map(({name,cpu,presentation,gpu,attachments,attachmentFrames,active,errors})=>({name,cpu,presentation,gpu,attachments,attachmentFrames,settledMs:active.settledWallMs,warnings:errors.length})),null,2));
